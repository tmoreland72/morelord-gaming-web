import { and, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { activeEntitlements, stripeCustomers, subscriptions } from '$lib/server/db/schema';
import { createStripeCustomer, getStripeSubscriptionBillingDetails } from '$lib/server/stripe';

export type MembershipTier = 'standard' | 'premium' | 'champion';

const paidSubscriptionStatuses = new Set(['active', 'trialing', 'past_due']);

export function membershipTierFromSubscription(
	subscription: { plan?: string | null; status?: string | null } | null | undefined
): MembershipTier {
	if (!subscription || !paidSubscriptionStatuses.has(subscription.status ?? '')) return 'standard';
	if (subscription.plan?.startsWith('champion')) return 'champion';
	if (subscription.plan?.startsWith('premium')) return 'premium';
	return 'standard';
}

export function membershipLabel(tier: MembershipTier): string {
	if (tier === 'champion') return 'Tools Champion';
	if (tier === 'premium') return 'Tools Premium';
	return 'Standard';
}

export function hasPremiumAccess(
	summary:
		| {
				subscription?: { plan?: string | null; status?: string | null } | null;
				entitlements?: Array<{ lookupKey: string }>;
		  }
		| null
		| undefined
): boolean {
	if (!summary) return false;
	if (membershipTierFromSubscription(summary.subscription) !== 'standard') return true;
	return (summary.entitlements ?? []).some((entitlement) =>
		['premium-modules', 'champion-access'].includes(entitlement.lookupKey)
	);
}

export async function getOrCreateStripeCustomer(
	d1: D1Database,
	user: { id: string; email: string; name?: string | null }
): Promise<string> {
	const db = getDb(d1);
	const existing = await db.query.stripeCustomers.findFirst({
		where: eq(stripeCustomers.userId, user.id)
	});
	if (existing) return existing.stripeCustomerId;

	const customer = await createStripeCustomer({
		userId: user.id,
		email: user.email,
		name: user.name
	});
	await db.insert(stripeCustomers).values({ userId: user.id, stripeCustomerId: customer.id });
	return customer.id;
}

export async function getBillingSummary(
	d1: D1Database,
	userId: string,
	options: { retrieveStripeDetails?: boolean } = {}
) {
	const db = getDb(d1);
	const customer = await db.query.stripeCustomers.findFirst({
		where: eq(stripeCustomers.userId, userId)
	});
	const subscription = customer
		? await db.query.subscriptions.findFirst({
				where: and(
					eq(subscriptions.stripeCustomerId, customer.stripeCustomerId),
					eq(subscriptions.isCurrent, true)
				)
			})
		: null;
	const entitlements = customer
		? await db
				.select()
				.from(activeEntitlements)
				.where(eq(activeEntitlements.stripeCustomerId, customer.stripeCustomerId))
		: [];

	let stripeDetails: {
		promotionCode: string | null;
		isFriendsAndFamily: boolean;
		status: string;
		cancelAtPeriodEnd: boolean;
		currentPeriodEnd: number | null;
	} | null = null;
	if (options.retrieveStripeDetails !== false && subscription?.stripeSubscriptionId) {
		try {
			stripeDetails = await getStripeSubscriptionBillingDetails(subscription.stripeSubscriptionId);
		} catch {
			// Billing status from D1 remains usable even if Stripe is temporarily unavailable.
		}
	}

	return { customer, subscription, entitlements, stripeDetails };
}
