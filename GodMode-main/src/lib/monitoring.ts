export const HEALTH_CHECK_INTERVAL_MS = 60_000;
export const HEALTH_CHECK_TIMEOUT_MS = 8_000;

export type WebviewStatus = 'unknown' | 'loading' | 'online' | 'offline';
export type EndpointStatus = 'checking' | 'online' | 'degraded' | 'offline';

export interface WebviewHealth {
	status: WebviewStatus;
	error?: string;
	updatedAt: number;
}

export interface EndpointHealthResult {
	status: EndpointStatus;
	statusCode: number;
	latencyMs: number;
	checkedAt: number;
}

const allowedHttpsHosts = new Set([
	'bing.com',
	'bard.google.com',
	'console.anthropic.com',
	'llama2.lepton.run',
	'pi.ai',
	'huggingface.co',
	'tiiuae-falcon-180b-demo.hf.space',
	'openrouter.ai',
	'claude.ai',
	'chat.openai.com',
	'www.phind.com',
	'www.perplexity.ai',
	'poe.com',
	'smoltalk.vercel.app',
	'chat.stability.ai',
	'api.together.xyz',
	'you.com',
	'chat.vercel.ai',
]);

export function validateHealthCheckUrl(value: unknown): string {
	if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
		throw new TypeError('A valid provider URL is required.');
	}

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new TypeError('The provider URL is invalid.');
	}

	const isLocalOobabooga =
		url.protocol === 'http:' &&
		url.hostname === '127.0.0.1' &&
		url.port === '7860';
	const isApprovedHttpsEndpoint =
		url.protocol === 'https:' &&
		allowedHttpsHosts.has(url.hostname) &&
		(url.port === '' || url.port === '443');

	if (
		url.username ||
		url.password ||
		url.hash ||
		(!isLocalOobabooga && !isApprovedHttpsEndpoint)
	) {
		throw new TypeError('Health checks are not allowed for this provider URL.');
	}

	return url.toString();
}

export function classifyEndpointStatus(statusCode: number): EndpointStatus {
	if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
		throw new RangeError('The endpoint returned an invalid HTTP status code.');
	}
	if (statusCode < 400) return 'online';
	if (statusCode < 500) return 'degraded';
	return 'offline';
}
