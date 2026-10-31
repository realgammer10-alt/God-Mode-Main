import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import App from '../renderer/App';

jest.mock('../renderer/layout', () => () => null);

describe('App', () => {
	it('should render', () => {
		expect(render(<App />)).toBeTruthy();
	});
});
