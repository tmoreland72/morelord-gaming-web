import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { activeEntitlements, subscriptions, webhookEvents } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyStripeWebhook } from '$lib/server/stripe';

type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

function stringValue(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function timestampMs(value: unknown): Date | null {
	return typeof value === 'number' ? new Date(value * 1000) : null;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.DB) return json({ error: 'D1 unavailable' }, { status: 500 });
	const signature = request.headers.get('stripe-signature');
	if (!signature) return json({ error: 'Missing Stripe-Signature' }, { status: 400 });
	const rawBody = await request.text();

	try {
		await verifyStripeWebhook(rawBody, signature);
	} catch (cause) {
		return json({ error: cause instanceof Error ? cause.message : 'Invalid webhook' }, { status: 400 });
	}

	const event = JSON.parse(rawBody) as StripeEvent;
	const db = getDb(platform.env.DB);
	const seen = await db.query.webhookEvents.findFirst({ where: eq(webhookEvents.id, event.id) });
	if (seen) return json({ received: true, duplicate: true });

	const object = event.data.object;
	if (event.type.startsWith('customer.subscription.')) {
		const subscriptionId = stringValue(object.id);
		const customerId = stringValue(object.customer);
		if (subscriptionId && customerId) {
			const items = object.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
			const metadata = (object.metadata ?? {}) as Record<string, string>;
			await db.insert(subscriptions).values({
				id: subscriptionId,
				stripeSubscriptionId: subscriptionId,
				stripeCustomerId: customerId,
				status: stringValue(object.status) ?? 'unknown',
				plan: metadata.morelord_plan ?? null,
				priceId: items?.data?.[0]?.price?.id ?? null,
				currentPeriodEnd: timestampMs(object.current_period_end),
				cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
				isCurrent: event.type !== 'customer.subscription.deleted'
			}).onConflictDoUpdate({
				target: subscriptions.stripeSubscriptionId,
				set: {
					status: stringValue(object.status) ?? 'unknown',
					plan: metadata.morelord_plan ?? null,
					priceId: items?.data?.[0]?.price?.id ?? null,
					currentPeriodEnd: timestampMs(object.current_period_end),
					cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
					isCurrent: event.type !== 'customer.subscription.deleted',
					updatedAt: new Date()
				}
			});
		}
	}

	if (event.type === 'entitlements.active_entitlement_summary.updated') {
		const customerId = stringValue(object.customer);
		const entitlements = (object.entitlements as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];
		if (customerId) {
			await db.delete(activeEntitlements).where(eq(activeEntitlements.stripeCustomerId, customerId));
			for (const entitlement of entitlements) {
				const lookupKey = stringValue(entitlement.lookup_key);
				if (!lookupKey) continue;
				const feature = entitlement.feature as Record<string, unknown> | string | undefined;
				await db.insert(activeEntitlements).values({
					id: stringValue(entitlement.id) ?? crypto.randomUUID(),
					stripeCustomerId: customerId,
					lookupKey,
					stripeFeatureId: typeof feature === 'string' ? feature : stringValue(feature?.id)
				});
			}
		}
	}

	await db.insert(webhookEvents).values({ id: event.id, provider: 'stripe', eventType: event.type });
	return json({ received: true });
};
