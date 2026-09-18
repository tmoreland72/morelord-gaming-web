import { describe, expect, it } from 'vitest';
import { releaseInputSchema } from './releases';

describe('releaseInputSchema', () => {
	it('accepts a typical module release payload', () => {
		const parsed = releaseInputSchema.parse({
			productSlug: 'morelord-marketplace',
			version: '1.2.3',
			title: 'Merchant refinements',
			summary: 'Smaller buying flow.',
			githubReleaseUrl: 'https://github.com/tmoreland72/morelord-marketplace/releases/tag/1.2.3',
			changes: [{ category: 'fix', description: 'Corrected actor selection.' }]
		});
		expect(parsed.version).toBe('1.2.3');
	});

	it('rejects a non-semantic version and a non-https URL', () => {
		expect(() =>
			releaseInputSchema.parse({
				productSlug: 'morelord-marketplace',
				version: 'v1',
				title: 'Bad'
			})
		).toThrow();
		expect(() =>
			releaseInputSchema.parse({
				productSlug: 'morelord-marketplace',
				version: '1.0.0',
				title: 'Bad URL',
				downloadUrl: 'ftp://example.com/mod.zip'
			})
		).toThrow();
	});
});
