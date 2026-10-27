import { describe, expect, it } from 'vitest';
import {
	getProductLanding,
	moduleInstallerBlurb,
	productCallToAction,
	publicFeatureTiers
} from './product-landing';

const slugs = [
	'morelord-core',
	'morelord-character-export',
	'morelord-craftworks',
	'morelord-downtime',
	'morelord-encounters',
	'morelord-game-master',
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

	it('explains each product in two or three paragraphs and keeps the installer blurb exact', () => {
		expect(moduleInstallerBlurb).toBe(
			'Morelord Gaming modules can be installed directly from the Foundry native module installer. Just search for "morelord".'
		);
		for (const slug of slugs) {
			const landing = getProductLanding(slug, { name: 'Fallback', summary: 'Fallback summary' });
			expect(landing.description.length).toBeGreaterThanOrEqual(2);
			expect(landing.description.length).toBeLessThanOrEqual(3);
			for (const paragraph of landing.description) {
				expect(paragraph.trim().length).toBeGreaterThan(40);
				expect(paragraph).not.toContain(moduleInstallerBlurb);
			}
		}
	});

	it('uses the ad headlines and the channel-manager demo videos', () => {
		const fallback = { name: '', summary: '' };
		expect(getProductLanding('morelord-character-export', fallback).headline).toBe(
			'View and share your Foundry characters anywhere.'
		);
		expect(getProductLanding('morelord-journeys', fallback).headline).toBe(
			"Camp, keep watch and rest, even when the party isn't traveling."
		);
		expect(getProductLanding('morelord-character-export', fallback).youtubeId).toBe('FkbDyflfSpU');
		expect(getProductLanding('morelord-character-export', fallback).benefit).toBe(
			'Create a free account to import characters that you or your GM exported with Morelord Character Export. See every detail of your sheet in any browser, and share it with anyone.'
		);
		expect(getProductLanding('morelord-character-export', fallback).freeAccount).toContain(
			'My Characters'
		);
		expect(getProductLanding('morelord-character-export', fallback).requirements?.body).toContain(
			'needs no Morelord account'
		);
		expect(getProductLanding('morelord-journeys', fallback).benefit).toBeUndefined();
		expect(getProductLanding('morelord-journeys', fallback).sheetPreview).toBeUndefined();
		expect(getProductLanding('morelord-journeys', fallback).youtubeId).toBe('T4_9GPdveBw');
		expect(getProductLanding('morelord-marketplace', fallback).youtubeId).toBe('jLHKF39rGjM');
		expect(getProductLanding('morelord-craftworks', fallback).youtubeId).toBe('qmcmKaunt40');
		expect(getProductLanding('morelord-encounters', fallback).youtubeId).toBe('xADXldd1oRE');
		expect(getProductLanding('morelord-core', fallback).youtubeId).toBe('2advzIa3o9Q');
		expect(getProductLanding('morelord-downtime', fallback).youtubeId).toBe('kubQ5qZ6B0I');
		expect(getProductLanding('morelord-game-master', fallback).youtubeId).toBe('4zSk2jdiglM');
		for (const slug of slugs) {
			expect(getProductLanding(slug, fallback).youtubeId).not.toBe('0d4kaqyP4OI');
		}
	});

	it('adds Road to Phandalin below the product demo where the campaign shows that module', () => {
		const fallback = { name: '', summary: '' };
		const campaign = {
			youtubeId: 'kubQ5qZ6B0I',
			caption: 'See it in a full campaign: Road to Phandalin'
		};
		for (const slug of ['morelord-marketplace', 'morelord-encounters', 'morelord-craftworks']) {
			const landing = getProductLanding(slug, fallback);
			expect(landing.secondaryVideos).toEqual([campaign]);
			expect(landing.youtubeId).not.toBe(campaign.youtubeId);
		}
		const journeys = getProductLanding('morelord-journeys', fallback);
		expect(journeys.youtubeId).toBe('T4_9GPdveBw');
		expect(journeys.secondaryVideos).toEqual([
			{
				youtubeId: 'wuTtNGgRsxc',
				caption: 'Camping without traveling: a short use-case demo'
			},
			campaign
		]);
		expect(journeys.youtubeId).not.toBe('wuTtNGgRsxc');
		expect(getProductLanding('morelord-downtime', fallback).secondaryVideos).toBeUndefined();
		expect(
			getProductLanding('morelord-character-export', fallback).secondaryVideos
		).toBeUndefined();
		expect(getProductLanding('morelord-core', fallback).secondaryVideos).toBeUndefined();
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
