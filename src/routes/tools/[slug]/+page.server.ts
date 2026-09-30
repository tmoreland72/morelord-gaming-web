import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProductBySlug } from '$lib/server/catalog';
import { getBillingSummary, hasPremiumAccess, membershipTierFromSubscription } from '$lib/server/billing';

const PRODUCT_SLUG_PREFIX = 'morelord-';

export const load: PageServerLoad = async ({ params, platform, locals, url }) => {
	const db = platform!.env.DB;
	const result = await getProductBySlug(db, params.slug);
	if (!result || result.product.status !== 'active') {
		// Short URLs like /tools/core permanently redirect to /tools/morelord-core (query string preserved).
		if (!params.slug.startsWith(PRODUCT_SLUG_PREFIX)) {
			const fullSlug = `${PRODUCT_SLUG_PREFIX}${params.slug}`;
			const target = await getProductBySlug(db, fullSlug);
			if (target && target.product.status === 'active') {
				redirect(301, `/tools/${encodeURIComponent(fullSlug)}${url.search}`);
			}
		}
		error(404, 'Product not found');
	}
	const billing = locals.user ? await getBillingSummary(db, locals.user.id) : null;
	const membershipTier = membershipTierFromSubscription(billing?.subscription);
	return { ...result, user: locals.user ?? null, membershipTier, hasPremiumEntitlement: hasPremiumAccess(billing) };
};
