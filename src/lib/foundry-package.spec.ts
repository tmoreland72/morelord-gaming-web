import { describe, expect, it } from 'vitest';
import { foundryPackagePageUrl } from './foundry-package';

describe('foundry package pages', () => {
	it('links each published module to its Foundry package page', () => {
		expect(foundryPackagePageUrl('morelord-core')).toBe(
			'https://foundryvtt.com/packages/morelord-core'
		);
		expect(foundryPackagePageUrl('morelord-journeys')).toBe(
			'https://foundryvtt.com/packages/morelord-journeys'
		);
		expect(foundryPackagePageUrl('morelord-encounters')).toBe(
			'https://foundryvtt.com/packages/morelord-encounters'
		);
		expect(foundryPackagePageUrl('morelord-character-export')).toBe(
			'https://foundryvtt.com/packages/morelord-character-export'
		);
		expect(foundryPackagePageUrl('morelord-craftworks')).toBe(
			'https://foundryvtt.com/packages/morelord-craftworks'
		);
	});

	it('omits modules that do not have a verified package page', () => {
		expect(foundryPackagePageUrl('morelord-downtime')).toBeNull();
		expect(foundryPackagePageUrl('morelord-marketplace')).toBeNull();
		expect(foundryPackagePageUrl('not-a-module')).toBeNull();
	});
});
