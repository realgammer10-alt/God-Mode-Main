module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	moduleNameMapper: {
		'\\.(css|scss)$': 'identity-obj-proxy',
		'^components/(.*)$': '<rootDir>/src/components/$1',
		'^lib/(.*)$': '<rootDir>/src/lib/$1',
		'^providers/(.*)$': '<rootDir>/src/providers/$1',
		'^renderer/(.*)$': '<rootDir>/src/renderer/$1',
	},
};
