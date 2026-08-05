import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBillingSummary, getOrCreateStripeCustomer } from '$lib/server/billing';
import { createCheckoutSession, getPriceId, type StripePlan } from '$lib/server/stripe';

const validPlans = new Set<StripePlan>([
	'premium-monthly',
	'premium-annual',
	'champion-monthly',
	'champion-annual'
]);
const managedStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);

export const POST: RequestHandler = async ({ locals, platform, request, url }) => {
	if (!locals.user) redirect(303, `/login?returnTo=${encodeURIComponent('/pricing')}`);
	if (!platform?.env?.DB) error(500, 'D1 database binding is unavailable.');

	const existing = await getBillingSummary(platform.env.DB, locals.user.id);
	if (existing.subscription && managedStatuses.has(existing.subscription.status)) {
		redirect(303, '/account?billing=manage');
	}

	const form = await request.formData();
	const plan = String(form.get('plan') ?? '') as StripePlan;
	if (!validPlans.has(plan)) error(400, 'Invalid subscription plan.');
	const priceId = getPriceId(plan);
	if (!priceId) error(503, 'This membership option is not configured yet.');

	const customerId = await getOrCreateStripeCustomer(platform.env.DB, locals.user);
	const session = await createCheckoutSession({
		customerId,
		priceId,
		userId: locals.user.id,
		plan,
		successUrl: `${url.origin}/account?checkout=success`,
		cancelUrl: `${url.origin}/pricing?checkout=cancelled`
	});
	if (!session.url) error(502, 'Stripe did not return a Checkout URL.');
	redirect(303, session.url);
};
