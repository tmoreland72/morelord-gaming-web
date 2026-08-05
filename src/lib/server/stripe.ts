import { env } from '$env/dynamic/private';

const STRIPE_API = 'https://api.stripe.com/v1';

export type StripePlan = 'premium-monthly' | 'premium-annual' | 'champion-monthly' | 'champion-annual';

const priceEnvironmentKeys: Record<StripePlan, string> = {
	'premium-monthly': 'STRIPE_PRICE_PREMIUM_MONTHLY',
	'premium-annual': 'STRIPE_PRICE_PREMIUM_ANNUAL',
	'champion-monthly': 'STRIPE_PRICE_CHAMPION_MONTHLY',
	'champion-annual': 'STRIPE_PRICE_CHAMPION_ANNUAL'
};

function requireSecret(): string {
	if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.');
	return env.STRIPE_SECRET_KEY;
}

function formEncode(values: Record<string, string | undefined>): URLSearchParams {
	const body = new URLSearchParams();
	for (const [key, value] of Object.entries(values)) if (value !== undefined) body.set(key, value);
	return body;
}

export async function stripeRequest<T>(
	path: string,
	options: { method?: 'GET' | 'POST'; body?: URLSearchParams } = {}
): Promise<T> {
	const response = await fetch(`${STRIPE_API}${path}`, {
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
	return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}

export function getPriceId(plan: StripePlan): string | null {
	return env[priceEnvironmentKeys[plan]] || null;
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
			'billing_address_collection': 'auto',
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
	if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('Missing STRIPE_WEBHOOK_SECRET.');
	const { timestamp, signatures } = parseStripeSignature(signatureHeader);
	const age = Math.abs(Date.now() / 1000 - Number(timestamp));
	if (!Number.isFinite(age) || age > 300) throw new Error('Stripe webhook timestamp is outside the allowed tolerance.');

	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
	const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
	if (!signatures.some((signature) => timingSafeEqual(signature, expected))) throw new Error('Invalid Stripe webhook signature.');
}
