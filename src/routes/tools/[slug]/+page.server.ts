import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProductBySlug } from '$lib/server/catalog';
import { getBillingSummary, hasPremiumAccess, membershipTierFromSubscription } from '$lib/server/billing';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	const db = platform!.env.DB;
	const result = await getProductBySlug(db, params.slug);
	if (!result || result.product.status !== 'active') error(404, 'Product not found');
	const billing = locals.user ? await getBillingSummary(db, locals.user.id) : null;
	const membershipTier = membershipTierFromSubscription(billing?.subscription);
	return { ...result, user: locals.user ?? null, membershipTier, hasPremiumEntitlement: hasPremiumAccess(billing) };
};
