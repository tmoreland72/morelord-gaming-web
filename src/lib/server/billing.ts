import { and, desc, eq, ne } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { activeEntitlements, stripeCustomers, subscriptions } from '$lib/server/db/schema';
import { createStripeCustomer, getStripeSubscriptionBillingDetails } from '$lib/server/stripe';

export type MembershipTier = 'standard' | 'premium' | 'champion';

const paidSubscriptionStatuses = new Set(['active', 'trialing', 'past_due']);
const premiumEntitlementKeys = new Set(['premium-modules', 'champion-access']);
const membershipRank: Record<MembershipTier, number> = {
	standard: 0,
	premium: 1,
	champion: 2
};

export type SubscriptionRecord = {
	id?: string;
	stripeSubscriptionId?: string;
	plan?: string | null;
	status?: string | null;
	isCurrent?: boolean | null;
	currentPeriodEnd?: Date | number | null;
};

export function membershipTierFromSubscription(
	subscription: { plan?: string | null; status?: string | null } | null | undefined
): MembershipTier {
	if (!subscription || !paidSubscriptionStatuses.has(subscription.status ?? '')) return 'standard';
	if (subscription.plan?.startsWith('champion')) return 'champion';
	// Treat any other paid subscription as Premium, including a missing plan mapping,
	// so a rotated Stripe price cannot lock a paying customer out of modules.
	return 'premium';
}

export function membershipLabel(tier: MembershipTier): string {
	if (tier === 'champion') return 'Tools Champion';
	if (tier === 'premium') return 'Tools Premium';
	return 'Standard';
}

export function membershipTierFromEntitlements(lookupKeys: string[]): MembershipTier {
	if (lookupKeys.includes('champion-access')) return 'champion';
	if (lookupKeys.some((key) => premiumEntitlementKeys.has(key))) return 'premium';
	return 'standard';
}

export function resolveMembershipTier(
	subscription: { plan?: string | null; status?: string | null } | null | undefined,
	lookupKeys: string[] = []
): MembershipTier {
	const fromSubscription = membershipTierFromSubscription(subscription);
	const fromEntitlements = membershipTierFromEntitlements(lookupKeys);
	return membershipRank[fromEntitlements] > membershipRank[fromSubscription]
		? fromEntitlements
		: fromSubscription;
}

export function catalogTiersFor(tier: MembershipTier): Array<'standard' | 'premium' | 'champion'> {
	if (tier === 'champion') return ['standard', 'premium', 'champion'];
	if (tier === 'premium') return ['standard', 'premium'];
	return ['standard'];
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
	return (
		resolveMembershipTier(
			summary.subscription,
			(summary.entitlements ?? []).map((entitlement) => entitlement.lookupKey)
		) !== 'standard'
	);
}

const statusRank: Record<string, number> = {
	active: 0,
	trialing: 1,
	past_due: 2,
	unpaid: 3,
	paused: 4
};

function periodEndValue(value: Date | number | null | undefined): number {
	if (value instanceof Date) return value.getTime();
	if (typeof value === 'number') return value;
	return 0;
}

export function selectCurrentSubscription<T extends SubscriptionRecord>(records: T[]): T | null {
	if (!records.length) return null;
	return [...records].sort((left, right) => {
		const leftPaid = paidSubscriptionStatuses.has(left.status ?? '') ? 0 : 1;
		const rightPaid = paidSubscriptionStatuses.has(right.status ?? '') ? 0 : 1;
		if (leftPaid !== rightPaid) return leftPaid - rightPaid;

		const leftStatus = statusRank[left.status ?? ''] ?? 50;
		const rightStatus = statusRank[right.status ?? ''] ?? 50;
		if (leftStatus !== rightStatus) return leftStatus - rightStatus;

		const leftCurrent = left.isCurrent ? 0 : 1;
		const rightCurrent = right.isCurrent ? 0 : 1;
		if (leftCurrent !== rightCurrent) return leftCurrent - rightCurrent;

		return periodEndValue(right.currentPeriodEnd) - periodEndValue(left.currentPeriodEnd);
	})[0];
}

export async function upsertStripeSubscription(
	d1: D1Database,
	input: {
		subscriptionId: string;
		customerId: string;
		status: string;
		plan: string | null;
		priceId: string | null;
		currentPeriodEnd: Date | null;
		cancelAtPeriodEnd: boolean;
		deleted: boolean;
	}
): Promise<void> {
	const db = getDb(d1);
	const now = new Date();
	await db
		.insert(subscriptions)
		.values({
			id: input.subscriptionId,
			stripeSubscriptionId: input.subscriptionId,
			stripeCustomerId: input.customerId,
			status: input.status,
			plan: input.plan,
			priceId: input.priceId,
			currentPeriodEnd: input.currentPeriodEnd,
			cancelAtPeriodEnd: input.cancelAtPeriodEnd,
			isCurrent: !input.deleted,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: subscriptions.stripeSubscriptionId,
			set: {
				status: input.status,
				plan: input.plan,
				priceId: input.priceId,
				currentPeriodEnd: input.currentPeriodEnd,
				cancelAtPeriodEnd: input.cancelAtPeriodEnd,
				isCurrent: !input.deleted,
				updatedAt: now
			}
		});

	if (!input.deleted) {
		await db
			.update(subscriptions)
			.set({ isCurrent: false, updatedAt: now })
			.where(
				and(
					eq(subscriptions.stripeCustomerId, input.customerId),
					ne(subscriptions.stripeSubscriptionId, input.subscriptionId)
				)
			);
		return;
	}

	const others = await db
		.select()
		.from(subscriptions)
		.where(
			and(
				eq(subscriptions.stripeCustomerId, input.customerId),
				ne(subscriptions.stripeSubscriptionId, input.subscriptionId)
			)
		);
	const next = selectCurrentSubscription(others);
	if (next) {
		await db
			.update(subscriptions)
			.set({ isCurrent: true, updatedAt: now })
			.where(eq(subscriptions.stripeSubscriptionId, next.stripeSubscriptionId));
	}
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
	try {
		await db.insert(stripeCustomers).values({ userId: user.id, stripeCustomerId: customer.id });
		return customer.id;
	} catch {
		const raced = await db.query.stripeCustomers.findFirst({
			where: eq(stripeCustomers.userId, user.id)
		});
		if (raced) return raced.stripeCustomerId;
		throw new Error('Could not store the Stripe customer for this account.');
	}
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
	const subscriptionRows = customer
		? await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.stripeCustomerId, customer.stripeCustomerId))
				.orderBy(desc(subscriptions.updatedAt))
		: [];
	const subscription = selectCurrentSubscription(subscriptionRows);
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
