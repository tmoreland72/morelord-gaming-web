import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { activeEntitlements, subscriptions, webhookEvents } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	getPlanFromPriceId,
	listActiveEntitlements,
	retrieveEntitlementFeature,
	verifyStripeWebhook,
	type StripeActiveEntitlement
} from '$lib/server/stripe';

type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

function stringValue(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function timestampMs(value: unknown): Date | null {
	return typeof value === 'number' ? new Date(value * 1000) : null;
}

function currentPeriodEnd(object: Record<string, unknown>): Date | null {
	const items = object.items as { data?: Array<Record<string, unknown>> } | undefined;
	const itemEnds = (items?.data ?? [])
		.map((item) => (typeof item.current_period_end === 'number' ? item.current_period_end : null))
		.filter((value): value is number => value !== null);
	if (itemEnds.length) return timestampMs(Math.max(...itemEnds));
	return timestampMs(object.current_period_end);
}

function summaryEntitlements(object: Record<string, unknown>): StripeActiveEntitlement[] {
	const summary = object.active_entitlements as { data?: StripeActiveEntitlement[] } | undefined;
	return summary?.data ?? [];
}

async function replaceEntitlements(
	db: ReturnType<typeof getDb>,
	customerId: string,
	entitlements: StripeActiveEntitlement[]
): Promise<void> {
	await db.delete(activeEntitlements).where(eq(activeEntitlements.stripeCustomerId, customerId));

	const featureNames = new Map<string, string>();
	for (const entitlement of entitlements) {
		if (!entitlement.lookup_key) continue;

		const featureId =
			typeof entitlement.feature === 'string' ? entitlement.feature : entitlement.feature?.id ?? null;
		let displayName =
			typeof entitlement.feature === 'object' && entitlement.feature?.name
				? entitlement.feature.name
				: null;

		if (!displayName && featureId) {
			displayName = featureNames.get(featureId) ?? null;
			if (!displayName) {
				try {
					const feature = await retrieveEntitlementFeature(featureId);
					displayName = feature.name;
					featureNames.set(featureId, feature.name);
				} catch (cause) {
					console.warn(`Could not retrieve Stripe feature ${featureId}.`, cause);
				}
			}
		}

		await db.insert(activeEntitlements).values({
			id: entitlement.id || crypto.randomUUID(),
			stripeCustomerId: customerId,
			lookupKey: entitlement.lookup_key,
			displayName,
			stripeFeatureId: featureId
		});
	}
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

	let event: StripeEvent;
	try {
		event = JSON.parse(rawBody) as StripeEvent;
	} catch {
		return json({ error: 'Invalid JSON payload' }, { status: 400 });
	}

	const db = getDb(platform.env.DB);
	const seen = await db.query.webhookEvents.findFirst({ where: eq(webhookEvents.id, event.id) });
	if (seen) return json({ received: true, duplicate: true });

	const object = event.data.object;
	try {
		if (event.type.startsWith('customer.subscription.')) {
			const subscriptionId = stringValue(object.id);
			const customerId = stringValue(object.customer);
			if (subscriptionId && customerId) {
				const items = object.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
				const priceId = items?.data?.[0]?.price?.id ?? null;
				const plan = getPlanFromPriceId(priceId);
				await db
					.insert(subscriptions)
					.values({
						id: subscriptionId,
						stripeSubscriptionId: subscriptionId,
						stripeCustomerId: customerId,
						status: stringValue(object.status) ?? 'unknown',
						plan,
						priceId,
						currentPeriodEnd: currentPeriodEnd(object),
						cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
						isCurrent: event.type !== 'customer.subscription.deleted'
					})
					.onConflictDoUpdate({
						target: subscriptions.stripeSubscriptionId,
						set: {
							status: stringValue(object.status) ?? 'unknown',
							plan,
							priceId,
							currentPeriodEnd: currentPeriodEnd(object),
							cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
							isCurrent: event.type !== 'customer.subscription.deleted',
							updatedAt: new Date()
						}
					});
			}
		}

		if (event.type === 'entitlements.active_entitlement_summary.updated') {
			const customerId = stringValue(object.customer);
			if (customerId) {
				let entitlements = summaryEntitlements(object);
				try {
					entitlements = await listActiveEntitlements(customerId);
				} catch (cause) {
					console.warn('Could not retrieve the full Stripe entitlement list; using webhook summary.', cause);
				}
				await replaceEntitlements(db, customerId, entitlements);
			}
		}

		await db.insert(webhookEvents).values({ id: event.id, provider: 'stripe', eventType: event.type });
		return json({ received: true });
	} catch (cause) {
		console.error(`Stripe webhook ${event.id} failed`, cause);
		return json({ error: 'Webhook processing failed' }, { status: 500 });
	}
};
