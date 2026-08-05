import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({
	user: locals.user ?? null,
	billingReady: Boolean(
		env.STRIPE_SECRET_KEY &&
		(env.STRIPE_PRICE_PREMIUM_MONTHLY || env.STRIPE_PRICE_PREMIUM_ANNUAL) &&
		(env.STRIPE_PRICE_CHAMPION_MONTHLY || env.STRIPE_PRICE_CHAMPION_ANNUAL)
	),
	plans: {
		premiumMonthly: Boolean(env.STRIPE_PRICE_PREMIUM_MONTHLY),
		premiumAnnual: Boolean(env.STRIPE_PRICE_PREMIUM_ANNUAL),
		championMonthly: Boolean(env.STRIPE_PRICE_CHAMPION_MONTHLY),
		championAnnual: Boolean(env.STRIPE_PRICE_CHAMPION_ANNUAL)
	}
});
