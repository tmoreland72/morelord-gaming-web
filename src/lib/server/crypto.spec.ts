import { describe, expect, it } from 'vitest';
import { bearerTokenMatches, timingSafeEqual } from './crypto';

describe('timingSafeEqual', () => {
	it('accepts identical strings', () => {
		expect(timingSafeEqual('secret-token', 'secret-token')).toBe(true);
	});

	it('rejects different strings of the same length', () => {
		expect(timingSafeEqual('secret-token', 'secret-tokem')).toBe(false);
	});

	it('rejects different lengths without throwing', () => {
		expect(timingSafeEqual('short', 'much-longer-value')).toBe(false);
	});
});

describe('bearerTokenMatches', () => {
	it('accepts a matching Bearer token', () => {
		expect(bearerTokenMatches('Bearer abc123', 'abc123')).toBe(true);
	});

	it('rejects a missing or malformed header', () => {
		expect(bearerTokenMatches(null, 'abc123')).toBe(false);
		expect(bearerTokenMatches('abc123', 'abc123')).toBe(false);
		expect(bearerTokenMatches('Bearer abc123', undefined)).toBe(false);
	});

	it('rejects a different token', () => {
		expect(bearerTokenMatches('Bearer abc123', 'abc124')).toBe(false);
	});
});
