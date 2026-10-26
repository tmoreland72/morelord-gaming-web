export const SOCIAL_SHARE_SOURCES = [
	'x',
	'facebook',
	'reddit',
	'bluesky',
	'copy_link',
	'native_share'
] as const;

export type SocialShareSource = (typeof SOCIAL_SHARE_SOURCES)[number];
export type ShareSource = SocialShareSource | 'email_share';
export type SocialNetwork = 'x' | 'facebook' | 'reddit' | 'bluesky';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isToolSlug(slug: string): boolean {
	return slug.length > 0 && slug.length <= 80 && SLUG_PATTERN.test(slug);
}

/** Canonical tool-page URL with the campaign tagged for the share channel. */
export function sharePageUrl(input: { origin: string; slug: string; source: ShareSource }): string {
	const url = new URL(input.origin);
	url.pathname = `/tools/${encodeURIComponent(input.slug)}`;
	url.search = '';
	url.hash = '';
	if (input.source === 'email_share') {
		url.searchParams.set('utm_source', 'email_share');
		url.searchParams.set('utm_medium', 'email');
	} else {
		url.searchParams.set('utm_source', input.source);
		url.searchParams.set('utm_medium', 'social_share');
	}
	url.searchParams.set('utm_campaign', input.slug);
	return url.toString();
}

/** Opens the visitor's own account on that network. The shared URL already carries UTM tags. */
export function socialShareHref(network: SocialNetwork, pageUrl: string, title: string): string {
	const url = encodeURIComponent(pageUrl);
	const text = encodeURIComponent(title);
	switch (network) {
		case 'x':
			return `https://x.com/intent/post?url=${url}&text=${text}`;
		case 'facebook':
			return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
		case 'reddit':
			return `https://www.reddit.com/submit?url=${url}&title=${text}`;
		case 'bluesky':
			return `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${pageUrl}`)}`;
	}
}
