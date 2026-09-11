import { describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';
import { listStripeSubscriptionsForAudit } from '$lib/server/stripe';

vi.mock('$env/dynamic/private', () => ({ env: { STRIPE_SECRET_KEY: 'test' } }));
vi.mock('$lib/server/stripe', () => ({
	getPlanFromPriceId: (priceId: string) =>
		['premium-monthly', 'premium-annual', 'champion-monthly', 'champion-annual'].find(
			(plan) => priceId === `price_${plan}`
		) ?? null,
	listStripeSubscriptionsForAudit: vi.fn()
}));

async function audit(plan: string, status = 'active', localStatus = status, keys: string[] = []) {
	const stripe = {
		id: 'sub_test',
		customerId: 'cus_test',
		customerName: null,
		customerEmail: null,
		priceId: `price_${plan}`,
		productId: 'prod_test',
		productName: null,
		status,
		currentPeriodEnd: 1_800_000_000,
		cancelAtPeriodEnd: false,
		promotionCode: null,
		promotionCodeId: null,
		promotionCouponDeleted: false
	};
	vi.mocked(listStripeSubscriptionsForAudit).mockResolvedValue([stripe]);
	const local = {
		id: stripe.id,
		stripeSubscriptionId: stripe.id,
		stripeCustomerId: stripe.customerId,
		plan,
		priceId: stripe.priceId,
		status: localStatus,
		currentPeriodEnd: stripe.currentPeriodEnd * 1000,
		cancelAtPeriodEnd: 0,
		updatedAt: 0,
		email: null,
		name: null
	};
	const db = {
		prepare: (sql: string) => ({
			all: async () => ({
				results: sql.includes('FROM subscriptions')
					? [local]
					: keys.map((lookupKey) => ({
							stripeCustomerId: stripe.customerId,
							lookupKey,
							displayName: null,
							updatedAt: 0
						}))
			})
		})
	};
	return await load({ platform: { env: { DB: db } } } as unknown as Parameters<typeof load>[0]);
}

describe('subscription audit', () => {
	it('accepts synchronized paid memberships without optional Stripe entitlements', async () => {
		for (const plan of [
			'premium-monthly',
			'premium-annual',
			'champion-monthly',
			'champion-annual'
		]) {
			for (const status of ['active', 'trialing', 'past_due']) {
				const result = await audit(plan, status);
				expect(result?.summary).toEqual({ total: 1, healthy: 1, warnings: 0, errors: 0 });
				expect(result?.records[0].issues).toEqual([]);
			}
		}
	});

	it('still reports a real Stripe/website status mismatch', async () => {
		const result = await audit('champion-annual', 'canceled', 'active');
		expect(result?.records[0].severity).toBe('error');
		expect(result?.records[0].issues).toContainEqual({
			severity: 'error',
			message: 'Website status active does not match Stripe status canceled.'
		});
	});

	it('displays additional customer grants without treating them as subscription mismatches', async () => {
		const result = await audit('premium-annual', 'active', 'active', ['champion-access']);
		expect(result?.records[0].severity).toBe('healthy');
		expect(result?.records[0].entitlements).toEqual([
			expect.objectContaining({ lookupKey: 'champion-access' })
		]);
	});
});
