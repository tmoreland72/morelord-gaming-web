import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPlanFromPriceId, listStripeSubscriptionsForAudit, type StripeAuditSubscription } from '$lib/server/stripe';

type LocalSubscription = {
	id: string;
	stripeSubscriptionId: string;
	stripeCustomerId: string;
	status: string;
	plan: string | null;
	priceId: string | null;
	currentPeriodEnd: number | null;
	cancelAtPeriodEnd: number | boolean;
	updatedAt: number;
	email: string | null;
	name: string | null;
};

type LocalEntitlement = {
	stripeCustomerId: string;
	lookupKey: string;
	displayName: string | null;
	updatedAt: number;
};

type AuditIssue = { severity: 'error' | 'warning'; message: string };

function normalizedPlan(priceId: string | null): string | null {
	return getPlanFromPriceId(priceId);
}

function expectedEntitlements(plan: string | null, status: string): string[] {
	if (!['active', 'trialing', 'past_due'].includes(status)) return [];
	if (plan?.startsWith('champion')) return ['premium-modules', 'champion-access'];
	if (plan?.startsWith('premium')) return ['premium-modules'];
	return [];
}

function compare(local: LocalSubscription | null, stripe: StripeAuditSubscription | null, entitlementKeys: string[]): AuditIssue[] {
	const issues: AuditIssue[] = [];
	if (!local && stripe) {
		issues.push({ severity: 'error', message: 'Subscription exists in Stripe but has no synchronized website record.' });
		return issues;
	}
	if (local && !stripe) {
		issues.push({ severity: 'error', message: 'Website subscription record is missing from Stripe.' });
		return issues;
	}
	if (!local || !stripe) return issues;

	const stripePlan = normalizedPlan(stripe.priceId);
	if (!stripePlan) issues.push({ severity: 'error', message: `Stripe price ${stripe.priceId ?? 'unknown'} is not mapped to a configured membership.` });
	if (local.priceId !== stripe.priceId) issues.push({ severity: 'error', message: 'Website price ID does not match Stripe.' });
	if (local.plan !== stripePlan) issues.push({ severity: 'error', message: `Website membership ${local.plan ?? 'unknown'} does not match Stripe membership ${stripePlan ?? 'unknown'}.` });
	if (local.status !== stripe.status) issues.push({ severity: 'error', message: `Website status ${local.status} does not match Stripe status ${stripe.status}.` });
	if (Boolean(local.cancelAtPeriodEnd) !== stripe.cancelAtPeriodEnd) issues.push({ severity: 'warning', message: 'Cancellation-at-period-end state does not match Stripe.' });

	const localEnd = local.currentPeriodEnd ? Math.floor(local.currentPeriodEnd / 1000) : null;
	if (localEnd !== stripe.currentPeriodEnd) issues.push({ severity: 'warning', message: 'Current billing period end does not match Stripe.' });

	const expected = expectedEntitlements(stripePlan, stripe.status);
	for (const key of expected) {
		if (!entitlementKeys.includes(key)) issues.push({ severity: 'error', message: `Required entitlement ${key} is missing.` });
	}
	if (!expected.includes('champion-access') && entitlementKeys.includes('champion-access')) {
		issues.push({ severity: 'error', message: 'Champion entitlement is active for a non-Champion subscription.' });
	}
	if (expected.length === 0 && entitlementKeys.some((key) => key === 'premium-modules' || key === 'champion-access')) {
		issues.push({ severity: 'error', message: 'Paid entitlements remain active for a subscription without paid access.' });
	}
	if (stripe.promotionCouponDeleted) issues.push({ severity: 'warning', message: 'The applied promotion code references a deleted coupon.' });
	return issues;
}

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');
	if (!env.STRIPE_SECRET_KEY?.trim()) error(503, 'Stripe is not configured.');

	const db = platform.env.DB;
	const [localRows, entitlementRows, stripeSubscriptions] = await Promise.all([
		db.prepare(`SELECT s.id, s.stripe_subscription_id AS stripeSubscriptionId,
			s.stripe_customer_id AS stripeCustomerId, s.status, s.plan, s.price_id AS priceId,
			s.current_period_end AS currentPeriodEnd, s.cancel_at_period_end AS cancelAtPeriodEnd,
			s.updated_at AS updatedAt, u.email, u.name
			FROM subscriptions s
			LEFT JOIN stripe_customers c ON c.stripe_customer_id = s.stripe_customer_id
			LEFT JOIN user u ON u.id = c.user_id
			WHERE s.is_current = 1
			ORDER BY s.updated_at DESC`).all<LocalSubscription>(),
		db.prepare(`SELECT stripe_customer_id AS stripeCustomerId, lookup_key AS lookupKey,
			display_name AS displayName, updated_at AS updatedAt
			FROM active_entitlements ORDER BY stripe_customer_id, lookup_key`).all<LocalEntitlement>(),
		listStripeSubscriptionsForAudit()
	]);

	const locals = localRows.results as LocalSubscription[];
	const entitlements = entitlementRows.results as LocalEntitlement[];
	const localBySubscription = new Map(locals.map((row) => [row.stripeSubscriptionId, row]));
	// Ignore old canceled Stripe history unless the website still considers that subscription current.
	const relevantStripeSubscriptions = stripeSubscriptions.filter(
		(row) => localBySubscription.has(row.id) || !['canceled', 'incomplete_expired'].includes(row.status)
	);
	const stripeBySubscription = new Map(relevantStripeSubscriptions.map((row) => [row.id, row]));
	const ids = new Set([...localBySubscription.keys(), ...stripeBySubscription.keys()]);

	const records = [...ids].map((id) => {
		const local = localBySubscription.get(id) ?? null;
		const stripe = stripeBySubscription.get(id) ?? null;
		const customerId = stripe?.customerId || local?.stripeCustomerId || '';
		const customerEntitlements = entitlements.filter((row) => row.stripeCustomerId === customerId);
		const issues = compare(local, stripe, customerEntitlements.map((row) => row.lookupKey));
		const severity: 'error' | 'warning' | 'healthy' = issues.some(
			(issue) => issue.severity === 'error'
		)
			? 'error'
			: issues.length
				? 'warning'
				: 'healthy';

		return {
			id,
			customerId,
			name: stripe?.customerName ?? local?.name ?? null,
			email: stripe?.customerEmail ?? local?.email ?? null,
			stripe,
			local,
			entitlements: customerEntitlements,
			issues,
			severity
		};
	}).sort((a, b) => {
		const rank = { error: 0, warning: 1, healthy: 2 } as const;
		return rank[a.severity] - rank[b.severity] || (a.email ?? a.name ?? a.id).localeCompare(b.email ?? b.name ?? b.id);
	});

	return {
		records,
		summary: {
			total: records.length,
			healthy: records.filter((record) => record.severity === 'healthy').length,
			warnings: records.filter((record) => record.severity === 'warning').length,
			errors: records.filter((record) => record.severity === 'error').length
		},
		checkedAt: Date.now()
	};
};
