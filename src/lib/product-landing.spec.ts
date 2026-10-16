import { describe, expect, it } from 'vitest';
import { getProductLanding, productCallToAction, publicFeatureTiers } from './product-landing';

const slugs = [
	'morelord-core',
	'morelord-character-export',
	'morelord-craftworks',
	'morelord-downtime',
	'morelord-encounters',
	'morelord-journeys',
	'morelord-marketplace'
];

describe('product landing copy', () => {
	it('gives every product a benefit headline and a subhead', () => {
		for (const slug of slugs) {
			const landing = getProductLanding(slug, { name: 'Fallback', summary: 'Fallback summary' });
			expect(landing.headline.length).toBeGreaterThan(12);
			expect(landing.subhead.length).toBeGreaterThan(12);
			expect(landing.headline).not.toBe('Fallback');
		}
	});

	it('uses the ad headlines and demo videos for Character Export and Journeys', () => {
		expect(getProductLanding('morelord-character-export', { name: '', summary: '' }).headline).toBe(
			'View and share your Foundry character anywhere.'
		);
		expect(
			getProductLanding('morelord-character-export', { name: '', summary: '' }).youtubeId
		).toBe('FkbDyflfSpU');
		expect(getProductLanding('morelord-journeys', { name: '', summary: '' }).headline).toBe(
			"Camp, keep watch and rest, even when the party isn't traveling."
		);
		expect(getProductLanding('morelord-journeys', { name: '', summary: '' }).youtubeId).toBe(
			'wuTtNGgRsxc'
		);
	});

	it('hides premium and standard cards that have no real features', () => {
		expect(publicFeatureTiers('morelord-character-export', []).premium).toEqual([]);
		expect(publicFeatureTiers('morelord-journeys', []).premium).toEqual([]);
		expect(publicFeatureTiers('morelord-core', []).premium).toEqual([]);
		expect(publicFeatureTiers('morelord-downtime', []).standard).toEqual([]);
		expect(publicFeatureTiers('morelord-marketplace', []).premium.length).toBeGreaterThan(0);
		expect(publicFeatureTiers('morelord-craftworks', []).champion.length).toBeGreaterThan(0);
		expect(publicFeatureTiers('morelord-downtime', []).premium.length).toBeGreaterThan(0);
	});

	it('falls back to catalog rows for a product without landing copy', () => {
		const tiers = publicFeatureTiers('morelord-future', [
			{
				key: 'future.basic',
				name: 'Future tool',
				description: 'Does a real thing.',
				tier: 'standard'
			},
			{ key: 'future.blank', name: '   ', description: 'Skip', tier: 'premium' }
		]);
		expect(tiers.standard).toEqual([{ name: 'Future tool', description: 'Does a real thing.' }]);
		expect(tiers.premium).toEqual([]);
	});
});

describe('productCallToAction', () => {
	it('sends a logged-out visitor to account creation', () => {
		expect(
			productCallToAction({
				loggedIn: false,
				hasPremium: false,
				returnTo: '/tools/morelord-journeys'
			})
		).toEqual({
			label: 'Create your free account',
			href: '/login?returnTo=%2Ftools%2Fmorelord-journeys'
		});
	});

	it('sends a free member to the existing upgrade page', () => {
		expect(
			productCallToAction({ loggedIn: true, hasPremium: false, returnTo: '/tools/morelord-core' })
		).toEqual({ label: 'Unlock premium features', href: '/pricing' });
	});

	it('does not upsell Premium or Champion members', () => {
		expect(
			productCallToAction({ loggedIn: true, hasPremium: true, returnTo: '/tools/morelord-core' })
		).toBeNull();
	});
});
