import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProviderInterface } from 'lib/types';
import {
	classifyEndpointStatus,
	validateHealthCheckUrl,
} from 'lib/monitoring';
import MonitoringDashboard from '../renderer/components/MonitoringDashboard';

const checkEndpoint = jest.fn();

const provider = {
	fullName: 'Test Provider',
	shortName: 'Test',
	webviewId: 'test-provider',
	url: 'https://chat.openai.com/',
} as ProviderInterface;

describe('provider endpoint validation', () => {
	it('accepts configured provider URLs and local Oobabooga', () => {
		expect(validateHealthCheckUrl(provider.url)).toBe(provider.url);
		expect(validateHealthCheckUrl('http://127.0.0.1:7860/')).toBe(
			'http://127.0.0.1:7860/',
		);
	});

	it.each([
		'file:///etc/passwd',
		'http://chat.openai.com/',
		'https://127.0.0.1/',
		'https://example.com/',
		'http://127.0.0.1:3000/',
		'https://user:password@chat.openai.com/',
	])('rejects unsafe or unsupported URL %s', (url) => {
		expect(() => validateHealthCheckUrl(url)).toThrow(TypeError);
	});

	it('classifies HTTP responses and rejects invalid status codes', () => {
		expect(classifyEndpointStatus(204)).toBe('online');
		expect(classifyEndpointStatus(401)).toBe('degraded');
		expect(classifyEndpointStatus(503)).toBe('offline');
		expect(() => classifyEndpointStatus(99)).toThrow(RangeError);
	});
});

describe('MonitoringDashboard', () => {
	beforeEach(() => {
		checkEndpoint.mockReset();
		checkEndpoint.mockResolvedValue({
			status: 'online',
			statusCode: 200,
			latencyMs: 42,
			checkedAt: Date.now(),
		});
		Object.defineProperty(window, 'electron', {
			configurable: true,
			value: { monitoring: { checkEndpoint } },
		});
	});

	it('shows live page and endpoint health and supports manual checks', async () => {
		render(
			<MonitoringDashboard
				providers={[provider]}
				webviewHealth={{
					[provider.webviewId]: { status: 'online', updatedAt: Date.now() },
				}}
			/>,
		);

		fireEvent.click(
			screen.getByRole('button', {
				name: 'Open provider monitoring dashboard',
			}),
		);

		expect(await screen.findByText('Page: Online')).toBeInTheDocument();
		expect(await screen.findByText('Endpoint: Online (200)')).toBeInTheDocument();
		expect(checkEndpoint).toHaveBeenCalledWith(provider.url);
	});

	it('surfaces endpoint check errors in the dashboard', async () => {
		checkEndpoint.mockRejectedValueOnce(new Error('Request timed out.'));
		render(<MonitoringDashboard providers={[provider]} webviewHealth={{}} />);
		fireEvent.click(
			screen.getByRole('button', {
				name: 'Open provider monitoring dashboard',
			}),
		);

		expect(await screen.findByText('Request timed out.')).toBeInTheDocument();
	});
});
