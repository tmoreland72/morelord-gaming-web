import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import { allStripePricesConfigured, getConfiguredPrices, type StripePlan, type StripePrice } from '$lib/server/stripe';
import { getBillingSummary, membershipLabel, membershipTierFromSubscription } from '$lib/server/billing';

export const load: PageServerLoad = async ({ locals, url, platform }) => {
	let prices: Partial<Record<StripePlan, StripePrice>> = {};
	let priceError: string | null = null;
	if (env.STRIPE_SECRET_KEY?.trim()) {
		try {
			prices = await getConfiguredPrices();
		} catch (cause) {
			priceError = cause instanceof Error ? cause.message : 'Stripe prices could not be loaded.';
		}
	}

	const billing = locals.user && platform?.env?.DB ? await getBillingSummary(platform.env.DB, locals.user.id) : null;
	const membershipTier = membershipTierFromSubscription(billing?.subscription);

	return {
		user: locals.user ?? null,
		membershipTier,
		membershipLabel: membershipLabel(membershipTier),
		subscriptionStatus: billing?.stripeDetails?.status ?? billing?.subscription?.status ?? null,
		cancelAtPeriodEnd: billing?.stripeDetails?.cancelAtPeriodEnd ?? billing?.subscription?.cancelAtPeriodEnd ?? false,
		billingReady: Boolean(env.STRIPE_SECRET_KEY?.trim() && env.STRIPE_WEBHOOK_SECRET?.trim() && allStripePricesConfigured()),
		prices,
		priceError,
		checkoutCancelled: url.searchParams.get('checkout') === 'cancelled'
	};
};
