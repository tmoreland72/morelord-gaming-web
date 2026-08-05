import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdminEmail } from '$lib/server/admin';
import {
	createFriendsAndFamilyCode,
	getConfiguredPrices,
	listFriendsAndFamilyCodes,
	setPromotionCodeActive,
	type StripePlan,
	type StripePrice
} from '$lib/server/stripe';

const tiers = new Set(['premium', 'champion', 'both']);

function requireAdmin(locals: App.Locals): void {
	if (!locals.user) redirect(303, '/login?returnTo=/admin/discount-codes');
	if (!isAdminEmail(locals.user.email)) error(403, 'Administrator access required.');
}

function productId(price: StripePrice | undefined): string | null {
	if (!price) return null;
	return typeof price.product === 'string' ? price.product : price.product.id;
}

function selectedProductIds(
	prices: Partial<Record<StripePlan, StripePrice>>,
	tier: 'premium' | 'champion' | 'both'
): string[] {
	const ids = new Set<string>();
	if (tier === 'premium' || tier === 'both') {
		for (const plan of ['premium-monthly', 'premium-annual'] as StripePlan[]) {
			const id = productId(prices[plan]);
			if (id) ids.add(id);
		}
	}
	if (tier === 'champion' || tier === 'both') {
		for (const plan of ['champion-monthly', 'champion-annual'] as StripePlan[]) {
			const id = productId(prices[plan]);
			if (id) ids.add(id);
		}
	}
	return [...ids];
}

function normalizeCode(value: string): string {
	return value.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	try {
		const [codes, prices] = await Promise.all([listFriendsAndFamilyCodes(), getConfiguredPrices()]);
		return { codes, stripeReady: Object.keys(prices).length === 4, stripeError: null };
	} catch (cause) {
		return {
			codes: [],
			stripeReady: false,
			stripeError: cause instanceof Error ? cause.message : 'Stripe could not be reached.'
		};
	}
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const code = normalizeCode(String(form.get('code') ?? ''));
		const label = String(form.get('label') ?? '').trim() || `Friends & Family — ${code}`;
		const tierValue = String(form.get('tier') ?? 'premium');
		const maxRedemptions = Number(form.get('maxRedemptions') ?? 1);
		const expiresValue = String(form.get('expiresAt') ?? '').trim();

		if (code.length < 4) return fail(400, { message: 'Enter a code containing at least four characters.' });
		if (!tiers.has(tierValue)) return fail(400, { message: 'Choose a valid membership tier.' });
		if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 1000) {
			return fail(400, { message: 'Maximum redemptions must be between 1 and 1,000.' });
		}

		let expiresAt: number | undefined;
		if (expiresValue) {
			const timestamp = new Date(expiresValue).getTime();
			if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
				return fail(400, { message: 'Expiration must be a valid future date and time.' });
			}
			expiresAt = Math.floor(timestamp / 1000);
		}

		try {
			const prices = await getConfiguredPrices();
			const tier = tierValue as 'premium' | 'champion' | 'both';
			const productIds = selectedProductIds(prices, tier);
			const expectedProducts = tier === 'both' ? 2 : 1;
			if (productIds.length !== expectedProducts) {
				return fail(503, { message: 'The Stripe products for that tier are not fully configured.' });
			}
			await createFriendsAndFamilyCode({ code, label, productIds, tier, maxRedemptions, expiresAt });
		} catch (cause) {
			return fail(502, { message: cause instanceof Error ? cause.message : 'Unable to create the code.' });
		}
		redirect(303, '/admin/discount-codes?created=1');
	},
	setActive: async ({ locals, request }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const active = String(form.get('active') ?? '') === 'true';
		if (!id.startsWith('promo_')) return fail(400, { message: 'Invalid Stripe promotion code.' });
		try {
			await setPromotionCodeActive(id, active);
		} catch (cause) {
			return fail(502, { message: cause instanceof Error ? cause.message : 'Unable to update the code.' });
		}
		redirect(303, '/admin/discount-codes');
	}
};
