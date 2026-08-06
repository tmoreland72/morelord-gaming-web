import { env } from '$env/dynamic/private';

const STRIPE_API = 'https://api.stripe.com/v1';

export type StripePlan = 'premium-monthly' | 'premium-annual' | 'champion-monthly' | 'champion-annual';

export type StripePrice = {
	id: string;
	active: boolean;
	currency: string;
	unit_amount: number | null;
	recurring: { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } | null;
	product: string | { id: string; name?: string };
};

export type StripeEntitlementFeature = {
	id: string;
	name: string;
	lookup_key: string;
};

export type StripeActiveEntitlement = {
	id: string;
	lookup_key: string;
	feature: string | StripeEntitlementFeature;
};

const priceEnvironmentKeys: Record<StripePlan, string> = {
	'premium-monthly': 'STRIPE_PRICE_PREMIUM_MONTHLY',
	'premium-annual': 'STRIPE_PRICE_PREMIUM_ANNUAL',
	'champion-monthly': 'STRIPE_PRICE_CHAMPION_MONTHLY',
	'champion-annual': 'STRIPE_PRICE_CHAMPION_ANNUAL'
};

function requireSecret(): string {
	const secret = env.STRIPE_SECRET_KEY?.trim();
	if (!secret) throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.');
	return secret;
}

function formEncode(values: Record<string, string | undefined>): URLSearchParams {
	const body = new URLSearchParams();
	for (const [key, value] of Object.entries(values)) if (value !== undefined) body.set(key, value);
	return body;
}

export async function stripeRequest<T>(
	path: string,
	options: { method?: 'GET' | 'POST'; body?: URLSearchParams; query?: URLSearchParams } = {}
): Promise<T> {
	const query = options.query?.toString();
	const response = await fetch(`${STRIPE_API}${path}${query ? `?${query}` : ''}`, {
		method: options.method ?? 'GET',
		headers: {
			Authorization: `Bearer ${requireSecret()}`,
			...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {})
		},
		body: options.body
	});

	const payload = (await response.json()) as T & { error?: { message?: string } };
	if (!response.ok) throw new Error(payload.error?.message ?? `Stripe request failed (${response.status}).`);
	return payload;
}

export function isStripeConfigured(): boolean {
	return Boolean(env.STRIPE_SECRET_KEY?.trim() && env.STRIPE_WEBHOOK_SECRET?.trim());
}

export function getPriceId(plan: StripePlan): string | null {
	return env[priceEnvironmentKeys[plan]]?.trim() || null;
}

export function allStripePricesConfigured(): boolean {
	return (Object.keys(priceEnvironmentKeys) as StripePlan[]).every((plan) => Boolean(getPriceId(plan)));
}

export function getPlanFromPriceId(priceId: string | null | undefined): StripePlan | null {
	if (!priceId) return null;
	for (const plan of Object.keys(priceEnvironmentKeys) as StripePlan[]) {
		if (getPriceId(plan) === priceId) return plan;
	}
	return null;
}

export async function retrieveEntitlementFeature(featureId: string): Promise<StripeEntitlementFeature> {
	return stripeRequest<StripeEntitlementFeature>(
		`/entitlements/features/${encodeURIComponent(featureId)}`
	);
}

export async function retrievePrice(priceId: string): Promise<StripePrice> {
	return stripeRequest<StripePrice>(`/prices/${encodeURIComponent(priceId)}`, {
		query: new URLSearchParams({ 'expand[]': 'product' })
	});
}

export async function getConfiguredPrices(): Promise<Partial<Record<StripePlan, StripePrice>>> {
	const result: Partial<Record<StripePlan, StripePrice>> = {};
	await Promise.all(
		(Object.keys(priceEnvironmentKeys) as StripePlan[]).map(async (plan) => {
			const id = getPriceId(plan);
			if (id) result[plan] = await retrievePrice(id);
		})
	);
	return result;
}

export async function createStripeCustomer(input: {
	email: string;
	name?: string | null;
	userId: string;
}): Promise<{ id: string }> {
	return stripeRequest('/customers', {
		method: 'POST',
		body: formEncode({
			email: input.email,
			name: input.name ?? undefined,
			'metadata[morelord_user_id]': input.userId
		})
	});
}

export async function createCheckoutSession(input: {
	customerId: string;
	priceId: string;
	userId: string;
	plan: StripePlan;
	successUrl: string;
	cancelUrl: string;
}): Promise<{ url: string | null }> {
	return stripeRequest('/checkout/sessions', {
		method: 'POST',
		body: formEncode({
			mode: 'subscription',
			customer: input.customerId,
			'line_items[0][price]': input.priceId,
			'line_items[0][quantity]': '1',
			success_url: input.successUrl,
			cancel_url: input.cancelUrl,
			client_reference_id: input.userId,
			allow_promotion_codes: 'true',
			billing_address_collection: 'auto',
			'metadata[morelord_user_id]': input.userId,
			'metadata[morelord_plan]': input.plan,
			'subscription_data[metadata][morelord_user_id]': input.userId,
			'subscription_data[metadata][morelord_plan]': input.plan
		})
	});
}

export async function createPortalSession(input: {
	customerId: string;
	returnUrl: string;
}): Promise<{ url: string }> {
	return stripeRequest('/billing_portal/sessions', {
		method: 'POST',
		body: formEncode({ customer: input.customerId, return_url: input.returnUrl })
	});
}

export async function listActiveEntitlements(customerId: string): Promise<StripeActiveEntitlement[]> {
	const collected: StripeActiveEntitlement[] = [];
	let startingAfter: string | undefined;

	do {
		const query = new URLSearchParams({ customer: customerId, limit: '100' });
		if (startingAfter) query.set('starting_after', startingAfter);
		const page = await stripeRequest<{ data: StripeActiveEntitlement[]; has_more: boolean }>(
			'/entitlements/active_entitlements',
			{ query }
		);
		collected.push(...page.data);
		startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
	} while (startingAfter);

	return collected;
}

function parseStripeSignature(header: string): { timestamp: string; signatures: string[] } {
	const values = header.split(',').map((part) => part.trim().split('='));
	const timestamp = values.find(([key]) => key === 't')?.[1];
	const signatures = values.filter(([key]) => key === 'v1').map(([, value]) => value);
	if (!timestamp || signatures.length === 0) throw new Error('Invalid Stripe-Signature header.');
	return { timestamp, signatures };
}

function timingSafeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	let mismatch = 0;
	for (let index = 0; index < left.length; index++) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
	return mismatch === 0;
}

export async function verifyStripeWebhook(rawBody: string, signatureHeader: string): Promise<void> {
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
	if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET.');
	const { timestamp, signatures } = parseStripeSignature(signatureHeader);
	const age = Math.abs(Date.now() / 1000 - Number(timestamp));
	if (!Number.isFinite(age) || age > 300) throw new Error('Stripe webhook timestamp is outside the allowed tolerance.');

	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(webhookSecret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
	const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
	if (!signatures.some((signature) => timingSafeEqual(signature, expected))) throw new Error('Invalid Stripe webhook signature.');
}

export type StripeCoupon = {
	id: string;
	deleted?: false;
	name: string | null;
	percent_off: number | null;
	duration: 'forever' | 'once' | 'repeating';
	valid: boolean;
	metadata?: Record<string, string>;
};

export type StripeDeletedCoupon = {
	id: string;
	deleted: true;
};

export type StripePromotionCode = {
	id: string;
	active: boolean;
	code: string;
	created: number;
	expires_at: number | null;
	max_redemptions: number | null;
	times_redeemed: number;
	metadata?: Record<string, string>;
	promotion?: {
		type: 'coupon';
		coupon: string | StripeCoupon | StripeDeletedCoupon;
	};
};

export type StripePromotionRedemption = {
	subscriptionId: string;
	status: string;
	created: number;
	currentPeriodEnd: number | null;
	cancelAtPeriodEnd: boolean;
	customerId: string | null;
	customerName: string | null;
	customerEmail: string | null;
};

export type StripePromotionCodeWithRedemptions = StripePromotionCode & {
	redemptions: StripePromotionRedemption[];
};

type StripeDiscount = {
	id: string;
	promotion_code?: string | { id: string } | null;
};

type StripeCustomerSummary = {
	id: string;
	name?: string | null;
	email?: string | null;
	deleted?: boolean;
};

type StripeSubscriptionSummary = {
	id: string;
	status: string;
	created: number;
	customer: string | StripeCustomerSummary;
	cancel_at_period_end?: boolean;
	current_period_end?: number | null;
	discounts?: Array<string | StripeDiscount>;
	items?: {
		data?: Array<{
			current_period_end?: number | null;
			discounts?: Array<string | StripeDiscount>;
		}>;
	};
};

function promotionCodeId(discount: string | StripeDiscount): string | null {
	if (typeof discount === 'string') return null;
	const promotionCode = discount.promotion_code;
	if (!promotionCode) return null;
	return typeof promotionCode === 'string' ? promotionCode : promotionCode.id;
}

function subscriptionPromotionCodeIds(subscription: StripeSubscriptionSummary): Set<string> {
	const ids = new Set<string>();
	for (const discount of subscription.discounts ?? []) {
		const id = promotionCodeId(discount);
		if (id) ids.add(id);
	}
	for (const item of subscription.items?.data ?? []) {
		for (const discount of item.discounts ?? []) {
			const id = promotionCodeId(discount);
			if (id) ids.add(id);
		}
	}
	return ids;
}

async function listSubscriptionPromotionRedemptions(): Promise<Map<string, StripePromotionRedemption[]>> {
	const byPromotionCode = new Map<string, StripePromotionRedemption[]>();
	let startingAfter: string | undefined;

	do {
		const query = new URLSearchParams({ limit: '100', status: 'all' });
		query.append('expand[]', 'data.customer');
		query.append('expand[]', 'data.discounts.promotion_code');
		query.append('expand[]', 'data.items.data.discounts.promotion_code');
		if (startingAfter) query.set('starting_after', startingAfter);
		const page = await stripeRequest<{ data: StripeSubscriptionSummary[]; has_more: boolean }>(
			'/subscriptions',
			{ query }
		);

		for (const subscription of page.data) {
			const customer = typeof subscription.customer === 'string' ? null : subscription.customer;
			const currentPeriodEnd =
				subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end ?? null;
			const redemption: StripePromotionRedemption = {
				subscriptionId: subscription.id,
				status: subscription.status,
				created: subscription.created,
				currentPeriodEnd,
				cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
				customerId: customer?.id ?? (typeof subscription.customer === 'string' ? subscription.customer : null),
				customerName: customer && !customer.deleted ? customer.name ?? null : null,
				customerEmail: customer && !customer.deleted ? customer.email ?? null : null
			};

			for (const codeId of subscriptionPromotionCodeIds(subscription)) {
				const current = byPromotionCode.get(codeId) ?? [];
				current.push(redemption);
				byPromotionCode.set(codeId, current);
			}
		}

		startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
	} while (startingAfter);

	return byPromotionCode;
}

export async function createFriendsAndFamilyCode(input: {
	code: string;
	label: string;
	productIds: string[];
	tier: 'premium' | 'champion' | 'both';
	maxRedemptions: number;
	expiresAt?: number;
}): Promise<StripePromotionCode> {
	const couponValues: Record<string, string | undefined> = {
		name: input.label,
		percent_off: '100',
		duration: 'forever',
		'metadata[morelord_kind]': 'friends-family',
		'metadata[morelord_tier]': input.tier
	};
	input.productIds.forEach((productId, index) => {
		couponValues[`applies_to[products][${index}]`] = productId;
	});

	const coupon = await stripeRequest<StripeCoupon>('/coupons', {
		method: 'POST',
		body: formEncode(couponValues)
	});

	try {
		return await stripeRequest<StripePromotionCode>('/promotion_codes', {
			method: 'POST',
			body: formEncode({
				code: input.code,
				'promotion[type]': 'coupon',
				'promotion[coupon]': coupon.id,
				max_redemptions: String(input.maxRedemptions),
				expires_at: input.expiresAt ? String(input.expiresAt) : undefined,
				'metadata[morelord_kind]': 'friends-family',
				'metadata[morelord_tier]': input.tier,
				'metadata[morelord_label]': input.label
			})
		});
	} catch (cause) {
		// Avoid leaving an unused coupon behind if promotion-code creation fails.
		await stripeRequest(`/coupons/${encodeURIComponent(coupon.id)}`, {
			method: 'POST',
			body: formEncode({ name: `${input.label} (creation failed)` })
		}).catch(() => undefined);
		throw cause;
	}
}

export async function listFriendsAndFamilyCodes(): Promise<StripePromotionCodeWithRedemptions[]> {
	const result: StripePromotionCode[] = [];
	let startingAfter: string | undefined;

	do {
		const query = new URLSearchParams({ limit: '100' });
		query.append('expand[]', 'data.promotion.coupon');
		if (startingAfter) query.set('starting_after', startingAfter);
		const page = await stripeRequest<{ data: StripePromotionCode[]; has_more: boolean }>(
			'/promotion_codes',
			{ query }
		);
		result.push(...page.data.filter((code) => code.metadata?.morelord_kind === 'friends-family'));
		startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
	} while (startingAfter);

	const redemptions = result.some((code) => code.times_redeemed > 0)
		? await listSubscriptionPromotionRedemptions()
		: new Map<string, StripePromotionRedemption[]>();

	return result
		.map((code) => ({
			...code,
			redemptions: (redemptions.get(code.id) ?? []).sort((left, right) => right.created - left.created)
		}))
		.sort((left, right) => right.created - left.created);
}


export async function retrievePromotionCode(id: string): Promise<StripePromotionCode> {
	return stripeRequest<StripePromotionCode>(`/promotion_codes/${encodeURIComponent(id)}`, {
		query: new URLSearchParams({ 'expand[]': 'promotion.coupon' })
	});
}

export function promotionCodeCouponDeleted(code: StripePromotionCode): boolean {
	const coupon = code.promotion?.coupon;
	return typeof coupon === 'object' && coupon.deleted === true;
}

export async function setPromotionCodeActive(id: string, active: boolean): Promise<StripePromotionCode> {
	return stripeRequest<StripePromotionCode>(`/promotion_codes/${encodeURIComponent(id)}`, {
		method: 'POST',
		body: formEncode({ active: active ? 'true' : 'false' })
	});
}

export type StripeAuditSubscription = {
	id: string;
	status: string;
	customerId: string;
	customerName: string | null;
	customerEmail: string | null;
	priceId: string | null;
	productId: string | null;
	productName: string | null;
	currentPeriodEnd: number | null;
	cancelAtPeriodEnd: boolean;
	promotionCode: string | null;
	promotionCodeId: string | null;
	promotionCouponDeleted: boolean;
};

type StripeAuditDiscount = {
	promotion_code?: string | {
		id: string;
		code?: string;
		promotion?: { coupon?: string | StripeCoupon | StripeDeletedCoupon };
	} | null;
};

type StripeAuditRawSubscription = {
	id: string;
	status: string;
	customer: string | StripeCustomerSummary;
	cancel_at_period_end?: boolean;
	current_period_end?: number | null;
	discounts?: Array<string | StripeAuditDiscount>;
	items?: {
		data?: Array<{
			current_period_end?: number | null;
			price?: {
				id: string;
				product?: string | { id: string; name?: string | null };
			};
			discounts?: Array<string | StripeAuditDiscount>;
		}>;
	};
};

function expandedPromotion(subscription: StripeAuditRawSubscription): {
	code: string | null;
	id: string | null;
	couponDeleted: boolean;
} {
	const discounts = [
		...(subscription.discounts ?? []),
		...(subscription.items?.data?.flatMap((item) => item.discounts ?? []) ?? [])
	];
	for (const discount of discounts) {
		if (typeof discount === 'string' || !discount.promotion_code) continue;
		const promotionCode = discount.promotion_code;
		if (typeof promotionCode === 'string') return { code: null, id: promotionCode, couponDeleted: false };
		const coupon = promotionCode.promotion?.coupon;
		return {
			code: promotionCode.code ?? null,
			id: promotionCode.id,
			couponDeleted: typeof coupon === 'object' && 'deleted' in coupon && coupon.deleted === true
		};
	}
	return { code: null, id: null, couponDeleted: false };
}

export async function listStripeSubscriptionsForAudit(): Promise<StripeAuditSubscription[]> {
	const result: StripeAuditSubscription[] = [];
	let startingAfter: string | undefined;

	do {
		const query = new URLSearchParams({ limit: '100', status: 'all' });
		query.append('expand[]', 'data.customer');
		query.append('expand[]', 'data.items.data.price.product');
		query.append('expand[]', 'data.discounts.promotion_code');
		query.append('expand[]', 'data.items.data.discounts.promotion_code');
		if (startingAfter) query.set('starting_after', startingAfter);

		const page = await stripeRequest<{ data: StripeAuditRawSubscription[]; has_more: boolean }>(
			'/subscriptions',
			{ query }
		);

		for (const subscription of page.data) {
			const customer = typeof subscription.customer === 'string' ? null : subscription.customer;
			const item = subscription.items?.data?.[0];
			const product = item?.price?.product;
			const promotion = expandedPromotion(subscription);
			result.push({
				id: subscription.id,
				status: subscription.status,
				customerId: customer?.id ?? (typeof subscription.customer === 'string' ? subscription.customer : ''),
				customerName: customer && !customer.deleted ? customer.name ?? null : null,
				customerEmail: customer && !customer.deleted ? customer.email ?? null : null,
				priceId: item?.price?.id ?? null,
				productId: typeof product === 'string' ? product : product?.id ?? null,
				productName: typeof product === 'object' ? product.name ?? null : null,
				currentPeriodEnd: item?.current_period_end ?? subscription.current_period_end ?? null,
				cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
				promotionCode: promotion.code,
				promotionCodeId: promotion.id,
				promotionCouponDeleted: promotion.couponDeleted
			});
		}

		startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
	} while (startingAfter);

	const promotionIds = [...new Set(result.map((subscription) => subscription.promotionCodeId).filter((id): id is string => Boolean(id)))];
	if (promotionIds.length) {
		const promotions = await Promise.all(
			promotionIds.map(async (id) => {
				try { return await retrievePromotionCode(id); }
				catch { return null; }
			})
		);
		const byId = new Map(promotions.filter((code): code is StripePromotionCode => Boolean(code)).map((code) => [code.id, code]));
		for (const subscription of result) {
			if (!subscription.promotionCodeId) continue;
			const code = byId.get(subscription.promotionCodeId);
			if (!code) continue;
			subscription.promotionCode = code.code;
			subscription.promotionCouponDeleted = promotionCodeCouponDeleted(code);
		}
	}

	return result;
}
