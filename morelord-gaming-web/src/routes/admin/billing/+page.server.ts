import { env } from '$env/dynamic/private';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isAdminEmail } from '$lib/server/admin';
import { getConfiguredPrices, type StripePlan, type StripePrice } from '$lib/server/stripe';

type SubscriptionRow = {
	status: string;
	plan: string | null;
	priceId: string | null;
	currentPeriodEnd: number | null;
	cancelAtPeriodEnd: number | boolean;
	updatedAt: number;
	email: string | null;
	name: string | null;
};

type WebhookRow = { id: string; eventType: string; processedAt: number };

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) redirect(303, '/login?returnTo=/admin/billing');
	if (!isAdminEmail(locals.user.email)) error(403, 'Administrator access required.');
	if (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');

	const db = platform.env.DB;
	const [subscriptions, webhooks] = await Promise.all([
		db.prepare(`SELECT s.status, s.plan, s.price_id AS priceId, s.current_period_end AS currentPeriodEnd,
			s.cancel_at_period_end AS cancelAtPeriodEnd, s.updated_at AS updatedAt, u.email, u.name
			FROM subscriptions s
			LEFT JOIN stripe_customers c ON c.stripe_customer_id = s.stripe_customer_id
			LEFT JOIN user u ON u.id = c.user_id
			ORDER BY s.updated_at DESC LIMIT 50`).all<SubscriptionRow>(),
		db.prepare(`SELECT id, event_type AS eventType, processed_at AS processedAt
			FROM webhook_events WHERE provider = 'stripe' ORDER BY processed_at DESC LIMIT 25`).all<WebhookRow>()
	]);

	let prices: Partial<Record<StripePlan, StripePrice>> = {};
	let stripeError: string | null = null;
	if (env.STRIPE_SECRET_KEY?.trim()) {
		try { prices = await getConfiguredPrices(); }
		catch (cause) { stripeError = cause instanceof Error ? cause.message : 'Stripe API unavailable.'; }
	}

	return {
		prices,
		stripeError,
		subscriptions: subscriptions.results as SubscriptionRow[],
		webhooks: webhooks.results as WebhookRow[],
		configuration: {
			secretKey: Boolean(env.STRIPE_SECRET_KEY?.trim()),
			webhookSecret: Boolean(env.STRIPE_WEBHOOK_SECRET?.trim()),
			premiumMonthly: Boolean(env.STRIPE_PRICE_PREMIUM_MONTHLY?.trim()),
			premiumAnnual: Boolean(env.STRIPE_PRICE_PREMIUM_ANNUAL?.trim()),
			championMonthly: Boolean(env.STRIPE_PRICE_CHAMPION_MONTHLY?.trim()),
			championAnnual: Boolean(env.STRIPE_PRICE_CHAMPION_ANNUAL?.trim())
		}
	};
};
