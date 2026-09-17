import { describe, expect, it } from 'vitest';
import { activationPollSchema, activationStartSchema, normalizeActivationCode } from './foundry';

describe('normalizeActivationCode', () => {
	it('strips separators and uppercases an 8-character code', () => {
		expect(normalizeActivationCode('ab-cd-ef-gh')).toBe('ABCDEFGH');
		expect(normalizeActivationCode('abcd-efgh')).toBe('ABCDEFGH');
	});
});

describe('activation payload schemas', () => {
	it('accepts a Core activation start body', () => {
		const parsed = activationStartSchema.parse({
			productSlug: 'morelord-core',
			worldName: 'West Marches',
			foundryVersion: '13.346'
		});
		expect(parsed.productSlug).toBe('morelord-core');
	});

	it('rejects an invalid product slug', () => {
		expect(() => activationStartSchema.parse({ productSlug: 'Not A Slug' })).toThrow();
	});

	it('requires a UUID activation id and a device secret', () => {
		expect(() => activationPollSchema.parse({ activationId: 'nope', deviceSecret: 'x' })).toThrow();
		expect(
			activationPollSchema.parse({
				activationId: '2c9b1f7a-3d44-4a1f-9c0e-7a6b5d4c3b2a',
				deviceSecret: 'device-secret-value-32'
			}).activationId
		).toBe('2c9b1f7a-3d44-4a1f-9c0e-7a6b5d4c3b2a');
	});
});
