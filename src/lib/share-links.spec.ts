import { expect, it } from 'vitest';
import {
	SOCIAL_SHARE_SOURCES,
	sharePageUrl,
	socialShareHref,
	type SocialNetwork
} from './share-links';

const origin = 'https://morelordgaming.com';
const slug = 'morelord-journeys';

it('tags email shares with the email campaign', () => {
	const url = new URL(sharePageUrl({ origin, slug, source: 'email_share' }));
	expect(url.origin).toBe(origin);
	expect(url.pathname).toBe(`/tools/${slug}`);
	expect(url.searchParams.get('utm_source')).toBe('email_share');
	expect(url.searchParams.get('utm_medium')).toBe('email');
	expect(url.searchParams.get('utm_campaign')).toBe(slug);
});

it('tags each social, copy, and native channel with its own source', () => {
	for (const source of SOCIAL_SHARE_SOURCES) {
		const url = new URL(sharePageUrl({ origin: `${origin}/`, slug, source }));
		expect(url.pathname).toBe(`/tools/${slug}`);
		expect(url.searchParams.get('utm_source')).toBe(source);
		expect(url.searchParams.get('utm_medium')).toBe('social_share');
		expect(url.searchParams.get('utm_campaign')).toBe(slug);
		expect(url.hash).toBe('');
	}
});

it('puts the tagged page URL into each network share link', () => {
	const title = 'Camp, keep watch and rest';
	const networks: SocialNetwork[] = ['x', 'facebook', 'reddit', 'bluesky'];
	for (const network of networks) {
		const pageUrl = sharePageUrl({ origin, slug, source: network });
		const href = socialShareHref(network, pageUrl, title);
		const shared = new URL(href);
		expect(
			shared.origin.endsWith(
				network === 'x' ? 'x.com' : network === 'bluesky' ? 'bsky.app' : `${network}.com`
			)
		).toBe(true);
		const embedded = decodeURIComponent(href);
		expect(embedded).toContain(pageUrl);
		expect(embedded).toContain(`utm_source=${network}`);
		expect(embedded).toContain('utm_medium=social_share');
		expect(embedded).toContain(`utm_campaign=${slug}`);
	}
});
