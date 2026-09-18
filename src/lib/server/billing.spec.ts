import { describe, expect, it } from 'vitest';
import {
	catalogTiersFor,
	hasPremiumAccess,
	membershipTierFromSubscription,
	resolveMembershipTier,
	selectCurrentSubscription
} from './billing';

describe('membershipTierFromSubscription', () => {
	it('returns standard when there is no paid subscription', () => {
		expect(membershipTierFromSubscription(null)).toBe('standard');
		expect(membershipTierFromSubscription({ plan: 'premium-annual', status: 'canceled' })).toBe(
			'standard'
		);
	});

	it('returns champion for paid champion plans', () => {
		expect(membershipTierFromSubscription({ plan: 'champion-monthly', status: 'active' })).toBe(
			'champion'
		);
	});

	it('treats any other paid subscription as premium, including an unmapped price', () => {
		expect(membershipTierFromSubscription({ plan: 'premium-annual', status: 'past_due' })).toBe(
			'premium'
		);
		expect(membershipTierFromSubscription({ plan: null, status: 'active' })).toBe('premium');
	});
});

describe('resolveMembershipTier', () => {
	it('elevates a standard subscription when Stripe entitlements grant access', () => {
		expect(resolveMembershipTier(null, ['champion-access'])).toBe('champion');
		expect(
			resolveMembershipTier({ plan: 'premium-annual', status: 'canceled' }, ['premium-modules'])
		).toBe('premium');
	});

	it('does not lower a paid champion plan because of extra entitlement keys', () => {
		expect(
			resolveMembershipTier({ plan: 'champion-annual', status: 'active' }, ['premium-modules'])
		).toBe('champion');
	});
});

describe('hasPremiumAccess', () => {
	it('matches the resolved membership tier', () => {
		expect(hasPremiumAccess({ subscription: { plan: 'premium-monthly', status: 'active' } })).toBe(
			true
		);
		expect(hasPremiumAccess({ entitlements: [{ lookupKey: 'premium-modules' }] })).toBe(true);
		expect(
			hasPremiumAccess({ subscription: { plan: 'premium-monthly', status: 'canceled' } })
		).toBe(false);
	});
});

describe('catalogTiersFor', () => {
	it('includes every catalog tier at or below the membership', () => {
		expect(catalogTiersFor('standard')).toEqual(['standard']);
		expect(catalogTiersFor('premium')).toEqual(['standard', 'premium']);
		expect(catalogTiersFor('champion')).toEqual(['standard', 'premium', 'champion']);
	});
});

describe('selectCurrentSubscription', () => {
	it('prefers an active paid subscription over a current-but-canceled row', () => {
		const selected = selectCurrentSubscription([
			{
				id: 'old',
				stripeSubscriptionId: 'sub_old',
				status: 'canceled',
				plan: 'premium-monthly',
				isCurrent: true,
				currentPeriodEnd: 9_000
			},
			{
				id: 'new',
				stripeSubscriptionId: 'sub_new',
				status: 'active',
				plan: 'champion-annual',
				isCurrent: false,
				currentPeriodEnd: 8_000
			}
		]);
		expect(selected?.id).toBe('new');
	});

	it('prefers active over past_due when both are paid', () => {
		const selected = selectCurrentSubscription([
			{ id: 'past', status: 'past_due', isCurrent: true, currentPeriodEnd: 20 },
			{ id: 'live', status: 'active', isCurrent: false, currentPeriodEnd: 10 }
		]);
		expect(selected?.id).toBe('live');
	});
});
