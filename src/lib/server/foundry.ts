import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import {
	catalogTiersFor,
	resolveMembershipTier,
	selectCurrentSubscription
} from '$lib/server/billing';
import { sha256 } from '$lib/server/crypto';
import { getDb } from '$lib/server/db';
import {
	activeEntitlements,
	features,
	foundryActivationRequests,
	foundryInstallations,
	foundryProductActivity,
	productFeatures,
	products,
	stripeCustomers,
	subscriptions
} from '$lib/server/db/schema';
import { AppError } from '$lib/server/errors';
import { z } from 'zod';

const ACTIVATION_MINUTES = 15;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const optionalLabel = z.string().trim().max(120).optional();

export const activationStartSchema = z.object({
	productSlug: z
		.string()
		.trim()
		.min(1)
		.max(80)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	installationLabel: optionalLabel,
	worldId: z.string().trim().max(120).optional(),
	worldName: optionalLabel,
	foundryVersion: z.string().trim().max(40).optional(),
	moduleVersion: z.string().trim().max(40).optional()
});

export const activationPollSchema = z.object({
	activationId: z.string().uuid(),
	deviceSecret: z.string().min(16).max(128)
});

function randomText(
	length: number,
	alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
) {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export { sha256 };

export function normalizeActivationCode(value: string) {
	return value
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 8);
}

export async function createActivationRequest(
	d1: D1Database,
	input: z.infer<typeof activationStartSchema>
) {
	const db = getDb(d1);
	const [product] = await db
		.select()
		.from(products)
		.where(and(eq(products.slug, input.productSlug), eq(products.status, 'active')))
		.limit(1);
	if (!product) throw new AppError('Unknown or inactive Morelord product.');

	const id = crypto.randomUUID();
	const deviceSecret = randomText(48);
	let userCode = '';
	for (let attempts = 0; attempts < 8; attempts += 1) {
		userCode = `${randomText(4, CODE_ALPHABET)}-${randomText(4, CODE_ALPHABET)}`;
		const existing = await db
			.select({ id: foundryActivationRequests.id })
			.from(foundryActivationRequests)
			.where(eq(foundryActivationRequests.userCode, userCode))
			.limit(1);
		if (!existing.length) break;
	}
	if (!userCode) throw new AppError('Unable to create an activation code.', 500, false);

	const expiresAt = new Date(Date.now() + ACTIVATION_MINUTES * 60_000);
	await db.insert(foundryActivationRequests).values({
		id,
		productId: product.id,
		userCode,
		deviceSecretHash: await sha256(deviceSecret),
		installationLabel:
			input.installationLabel?.trim() || input.worldName?.trim() || `${product.name} installation`,
		worldId: input.worldId?.trim() || null,
		worldName: input.worldName?.trim() || null,
		foundryVersion: input.foundryVersion?.trim() || null,
		moduleVersion: input.moduleVersion?.trim() || null,
		expiresAt
	});

	return { activationId: id, deviceSecret, userCode, expiresAt, pollIntervalSeconds: 5 };
}

export async function approveActivation(d1: D1Database, userId: string, code: string) {
	const db = getDb(d1);
	const normalized = normalizeActivationCode(code);
	const formatted =
		normalized.length === 8 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
	const [request] = await db
		.select()
		.from(foundryActivationRequests)
		.where(eq(foundryActivationRequests.userCode, formatted))
		.limit(1);
	if (!request) throw new AppError('Activation code was not found.');
	if (request.status !== 'pending')
		throw new AppError('This activation code is no longer pending.');
	if (request.expiresAt.getTime() <= Date.now()) {
		await db
			.update(foundryActivationRequests)
			.set({ status: 'expired' })
			.where(
				and(
					eq(foundryActivationRequests.id, request.id),
					eq(foundryActivationRequests.status, 'pending')
				)
			);
		throw new AppError('This activation code has expired. Start activation again in Foundry.');
	}

	const token = `mlt_${randomText(64)}`;
	const installationId = crypto.randomUUID();
	await db.batch([
		db.insert(foundryInstallations).values({
			id: installationId,
			userId,
			productId: request.productId,
			label: request.installationLabel,
			worldId: request.worldId,
			worldName: request.worldName,
			foundryVersion: request.foundryVersion,
			moduleVersion: request.moduleVersion,
			tokenHash: await sha256(token)
		}),
		db
			.update(foundryActivationRequests)
			.set({
				status: 'approved',
				approvedByUserId: userId,
				installationId,
				issuedToken: token,
				approvedAt: new Date()
			})
			.where(
				and(
					eq(foundryActivationRequests.id, request.id),
					eq(foundryActivationRequests.status, 'pending')
				)
			)
	]);

	const [approved] = await db
		.select({
			status: foundryActivationRequests.status,
			installationId: foundryActivationRequests.installationId
		})
		.from(foundryActivationRequests)
		.where(eq(foundryActivationRequests.id, request.id))
		.limit(1);
	if (approved?.status !== 'approved' || approved.installationId !== installationId) {
		await db.delete(foundryInstallations).where(eq(foundryInstallations.id, installationId));
		throw new AppError('This activation code is no longer pending.');
	}
	return installationId;
}

export async function pollActivation(d1: D1Database, activationId: string, deviceSecret: string) {
	const hash = await sha256(deviceSecret);
	const now = Date.now();
	const consumed = await d1
		.prepare(
			`UPDATE foundry_activation_requests
			SET status = 'consumed', consumed_at = ?1
			WHERE id = ?2
				AND status = 'approved'
				AND device_secret_hash = ?3
				AND issued_token IS NOT NULL
			RETURNING issued_token, installation_id`
		)
		.bind(now, activationId, hash)
		.first<{ issued_token: string; installation_id: string }>();

	if (consumed?.issued_token && consumed.installation_id) {
		await d1
			.prepare('UPDATE foundry_activation_requests SET issued_token = NULL WHERE id = ?1')
			.bind(activationId)
			.run();
		return {
			status: 'approved' as const,
			installationId: consumed.installation_id,
			token: consumed.issued_token
		};
	}

	const request = await d1
		.prepare(
			`SELECT status, expires_at AS expiresAt, device_secret_hash AS deviceSecretHash
			FROM foundry_activation_requests WHERE id = ?1`
		)
		.bind(activationId)
		.first<{ status: string; expiresAt: number; deviceSecretHash: string }>();

	if (!request || request.deviceSecretHash !== hash) return { status: 'invalid' as const };

	if (request.status === 'pending' && Number(request.expiresAt) <= now) {
		await d1
			.prepare(
				`UPDATE foundry_activation_requests SET status = 'expired'
				WHERE id = ?1 AND status = 'pending'`
			)
			.bind(activationId)
			.run();
		return { status: 'expired' as const };
	}

	if (request.status === 'approved') return { status: 'invalid' as const };
	if (
		request.status === 'pending' ||
		request.status === 'denied' ||
		request.status === 'expired' ||
		request.status === 'consumed'
	) {
		return { status: request.status };
	}
	return { status: 'invalid' as const };
}

export async function listUserInstallations(d1: D1Database, userId: string) {
	return getDb(d1)
		.select({
			id: foundryInstallations.id,
			label: foundryInstallations.label,
			worldName: foundryInstallations.worldName,
			foundryVersion: foundryInstallations.foundryVersion,
			moduleVersion: foundryInstallations.moduleVersion,
			lastValidatedAt: foundryInstallations.lastValidatedAt,
			createdAt: foundryInstallations.createdAt,
			productName: products.name,
			productSlug: products.slug
		})
		.from(foundryInstallations)
		.innerJoin(products, eq(foundryInstallations.productId, products.id))
		.where(and(eq(foundryInstallations.userId, userId), isNull(foundryInstallations.revokedAt)))
		.orderBy(asc(foundryInstallations.createdAt));
}

export async function revokeInstallation(d1: D1Database, userId: string, installationId: string) {
	await getDb(d1)
		.update(foundryInstallations)
		.set({ revokedAt: new Date(), updatedAt: new Date() })
		.where(
			and(eq(foundryInstallations.id, installationId), eq(foundryInstallations.userId, userId))
		);
}

export async function validateInstallationToken(
	d1: D1Database,
	token: string,
	requestedProductSlug?: string,
	client?: { foundryVersion?: string; coreVersion?: string }
) {
	const db = getDb(d1);
	const tokenHash = await sha256(token);
	const [installation] = await db
		.select({
			id: foundryInstallations.id,
			userId: foundryInstallations.userId,
			productId: foundryInstallations.productId,
			label: foundryInstallations.label,
			productSlug: products.slug
		})
		.from(foundryInstallations)
		.innerJoin(products, eq(foundryInstallations.productId, products.id))
		.where(
			and(eq(foundryInstallations.tokenHash, tokenHash), isNull(foundryInstallations.revokedAt))
		)
		.limit(1);
	if (!installation) return null;

	const targetSlug = requestedProductSlug?.trim() || installation.productSlug;
	if (installation.productSlug !== 'morelord-core' && targetSlug !== installation.productSlug) {
		throw new AppError('This installation token cannot request another product.');
	}

	const [targetProduct] = await db
		.select({ id: products.id, slug: products.slug, name: products.name })
		.from(products)
		.where(and(eq(products.slug, targetSlug), eq(products.status, 'active')))
		.limit(1);
	if (!targetProduct) throw new AppError('Unknown or inactive Morelord product.');

	const customer = await db.query.stripeCustomers.findFirst({
		where: eq(stripeCustomers.userId, installation.userId)
	});
	const subscriptionRows = customer
		? await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.stripeCustomerId, customer.stripeCustomerId))
		: [];
	const subscription = selectCurrentSubscription(subscriptionRows);
	const stripeFeatureRows = customer
		? await db
				.select({ key: activeEntitlements.lookupKey })
				.from(activeEntitlements)
				.where(eq(activeEntitlements.stripeCustomerId, customer.stripeCustomerId))
		: [];
	const entitlementKeys = stripeFeatureRows.map((row) => row.key);
	const tier = resolveMembershipTier(subscription, entitlementKeys);
	const allowedTiers = catalogTiersFor(tier);

	const productFeatureRows = await db
		.select({ key: features.key })
		.from(productFeatures)
		.innerJoin(features, eq(productFeatures.featureId, features.id))
		.where(
			and(
				eq(productFeatures.productId, targetProduct.id),
				inArray(productFeatures.tier, allowedTiers)
			)
		);
	// Keep Stripe lookup keys in the payload so existing Core builds that check
	// `premium-modules` / `champion-access` continue to work.
	const featureKeys = [
		...new Set([...productFeatureRows.map((row) => row.key), ...entitlementKeys])
	];

	const validatedAt = new Date();
	const expiresAt = new Date(validatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
	await db.batch([
		db
			.update(foundryInstallations)
			.set({
				lastValidatedAt: validatedAt,
				updatedAt: validatedAt,
				...(client?.foundryVersion ? { foundryVersion: client.foundryVersion.slice(0, 40) } : {}),
				...(client?.coreVersion ? { moduleVersion: client.coreVersion.slice(0, 40) } : {})
			})
			.where(eq(foundryInstallations.id, installation.id)),
		db
			.insert(foundryProductActivity)
			.values({
				installationId: installation.id,
				productId: targetProduct.id,
				firstSeenAt: validatedAt,
				lastSeenAt: validatedAt
			})
			.onConflictDoUpdate({
				target: [foundryProductActivity.installationId, foundryProductActivity.productId],
				set: { lastSeenAt: validatedAt }
			})
	]);
	return {
		installationId: installation.id,
		productSlug: targetProduct.slug,
		productName: targetProduct.name,
		label: installation.label,
		tier,
		features: featureKeys,
		validatedAt,
		expiresAt,
		refreshAfterSeconds: 86_400
	};
}
