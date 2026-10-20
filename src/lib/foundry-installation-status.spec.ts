import { describe, expect, it } from 'vitest';
import { FIRST_VALIDATION_WAIT_MS, awaitingFirstValidation } from './foundry-installation-status';

const now = Date.parse('2026-10-20T18:49:48.000Z');

describe('awaitingFirstValidation', () => {
	it('keeps watching an installation approved before Core checks in', () => {
		expect(
			awaitingFirstValidation([{ createdAt: new Date(now - 5_000), lastValidatedAt: null }], now)
		).toBe(true);
	});

	it('stops once the check-in timestamp is stored', () => {
		expect(
			awaitingFirstValidation(
				[{ createdAt: new Date(now - 5_000), lastValidatedAt: new Date(now) }],
				now
			)
		).toBe(false);
	});

	it('does not poll installations that never checked in after the wait', () => {
		expect(
			awaitingFirstValidation(
				[{ createdAt: now - FIRST_VALIDATION_WAIT_MS, lastValidatedAt: null }],
				now
			)
		).toBe(false);
	});

	it('still watches a new installation when the browser clock is a couple of minutes off', () => {
		expect(
			awaitingFirstValidation([{ createdAt: now - 2 * 60_000, lastValidatedAt: null }], now)
		).toBe(true);
		expect(
			awaitingFirstValidation([{ createdAt: now + 2 * 60_000, lastValidatedAt: null }], now)
		).toBe(true);
	});

	it('ignores a created time that cannot be read', () => {
		expect(awaitingFirstValidation([{ createdAt: 'not-a-date', lastValidatedAt: null }], now)).toBe(
			false
		);
	});
});
