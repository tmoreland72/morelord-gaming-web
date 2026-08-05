import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import { allStripePricesConfigured, getConfiguredPrices, type StripePlan, type StripePrice } from '$lib/server/stripe';

export const load: PageServerLoad = async ({ locals, url }) => {
	let prices: Partial<Record<StripePlan, StripePrice>> = {};
	let priceError: string | null = null;
	if (env.STRIPE_SECRET_KEY?.trim()) {
		try {
			prices = await getConfiguredPrices();
		} catch (cause) {
			priceError = cause instanceof Error ? cause.message : 'Stripe prices could not be loaded.';
		}
	}

	return {
		user: locals.user ?? null,
		billingReady: Boolean(env.STRIPE_SECRET_KEY?.trim() && env.STRIPE_WEBHOOK_SECRET?.trim() && allStripePricesConfigured()),
		prices,
		priceError,
		checkoutCancelled: url.searchParams.get('checkout') === 'cancelled'
	};
};
