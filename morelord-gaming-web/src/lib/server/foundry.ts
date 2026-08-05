import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import {
	activeEntitlements,
	features,
	foundryActivationRequests,
	foundryInstallations,
	productFeatures,
	products,
	stripeCustomers,
	subscriptions
} from '$lib/server/db/schema';

const ACTIVATION_MINUTES = 15;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomText(length: number, alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export async function sha256(value: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function normalizeActivationCode(value: string) {
	return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export async function createActivationRequest(d1: D1Database, input: {
	productSlug: string;
	installationLabel?: string;
	worldId?: string;
	worldName?: string;
	foundryVersion?: string;
	moduleVersion?: string;
}) {
	const db = getDb(d1);
	const [product] = await db.select().from(products).where(and(eq(products.slug, input.productSlug), eq(products.status, 'active'))).limit(1);
	if (!product) throw new Error('Unknown or inactive Morelord product.');

	const id = crypto.randomUUID();
	const deviceSecret = randomText(48);
	let userCode = '';
	for (let attempts = 0; attempts < 8; attempts += 1) {
		userCode = `${randomText(4, CODE_ALPHABET)}-${randomText(4, CODE_ALPHABET)}`;
		const existing = await db.select({ id: foundryActivationRequests.id }).from(foundryActivationRequests).where(eq(foundryActivationRequests.userCode, userCode)).limit(1);
		if (!existing.length) break;
	}
	if (!userCode) throw new Error('Unable to create an activation code.');

	const expiresAt = new Date(Date.now() + ACTIVATION_MINUTES * 60_000);
	await db.insert(foundryActivationRequests).values({
		id,
		productId: product.id,
		userCode,
		deviceSecretHash: await sha256(deviceSecret),
		installationLabel: input.installationLabel?.trim() || input.worldName?.trim() || `${product.name} installation`,
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
	const formatted = normalized.length === 8 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
	const [request] = await db.select().from(foundryActivationRequests).where(eq(foundryActivationRequests.userCode, formatted)).limit(1);
	if (!request) throw new Error('Activation code was not found.');
	if (request.status !== 'pending') throw new Error('This activation code is no longer pending.');
	if (request.expiresAt.getTime() <= Date.now()) {
		await db.update(foundryActivationRequests).set({ status: 'expired' }).where(eq(foundryActivationRequests.id, request.id));
		throw new Error('This activation code has expired. Start activation again in Foundry.');
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
		db.update(foundryActivationRequests).set({
			status: 'approved',
			approvedByUserId: userId,
			installationId,
			issuedToken: token,
			approvedAt: new Date()
		}).where(eq(foundryActivationRequests.id, request.id))
	]);
	return installationId;
}

export async function pollActivation(d1: D1Database, activationId: string, deviceSecret: string) {
	const db = getDb(d1);
	const [request] = await db.select().from(foundryActivationRequests).where(eq(foundryActivationRequests.id, activationId)).limit(1);
	if (!request || request.deviceSecretHash !== await sha256(deviceSecret)) return { status: 'invalid' as const };
	if (request.status === 'pending' && request.expiresAt.getTime() <= Date.now()) {
		await db.update(foundryActivationRequests).set({ status: 'expired' }).where(eq(foundryActivationRequests.id, request.id));
		return { status: 'expired' as const };
	}
	if (request.status !== 'approved' || !request.issuedToken || !request.installationId) {
		const status = request.status === 'approved' ? 'invalid' : request.status;
		return { status: status as 'pending' | 'denied' | 'expired' | 'consumed' | 'invalid' };
	}

	const token = request.issuedToken;
	await db.update(foundryActivationRequests).set({ status: 'consumed', issuedToken: null, consumedAt: new Date() }).where(eq(foundryActivationRequests.id, request.id));
	return { status: 'approved' as const, installationId: request.installationId, token };
}

export async function listUserInstallations(d1: D1Database, userId: string) {
	return getDb(d1).select({
		id: foundryInstallations.id,
		label: foundryInstallations.label,
		worldName: foundryInstallations.worldName,
		foundryVersion: foundryInstallations.foundryVersion,
		moduleVersion: foundryInstallations.moduleVersion,
		lastValidatedAt: foundryInstallations.lastValidatedAt,
		createdAt: foundryInstallations.createdAt,
		productName: products.name,
		productSlug: products.slug
	}).from(foundryInstallations)
		.innerJoin(products, eq(foundryInstallations.productId, products.id))
		.where(and(eq(foundryInstallations.userId, userId), isNull(foundryInstallations.revokedAt)))
		.orderBy(asc(foundryInstallations.createdAt));
}

export async function revokeInstallation(d1: D1Database, userId: string, installationId: string) {
	await getDb(d1).update(foundryInstallations).set({ revokedAt: new Date(), updatedAt: new Date() })
		.where(and(eq(foundryInstallations.id, installationId), eq(foundryInstallations.userId, userId)));
}

export async function validateInstallationToken(
	d1: D1Database,
	token: string,
	requestedProductSlug?: string
) {
	const db = getDb(d1);
	const tokenHash = await sha256(token);
	const [installation] = await db.select({
		id: foundryInstallations.id,
		userId: foundryInstallations.userId,
		productId: foundryInstallations.productId,
		label: foundryInstallations.label,
		productSlug: products.slug
	}).from(foundryInstallations)
		.innerJoin(products, eq(foundryInstallations.productId, products.id))
		.where(and(eq(foundryInstallations.tokenHash, tokenHash), isNull(foundryInstallations.revokedAt)))
		.limit(1);
	if (!installation) return null;

	const targetSlug = requestedProductSlug?.trim() || installation.productSlug;
	if (installation.productSlug !== 'morelord-core' && targetSlug !== installation.productSlug) {
		throw new Error('This installation token cannot request another product.');
	}

	const [targetProduct] = await db.select({ id: products.id, slug: products.slug, name: products.name })
		.from(products)
		.where(and(eq(products.slug, targetSlug), eq(products.status, 'active')))
		.limit(1);
	if (!targetProduct) throw new Error('Unknown or inactive Morelord product.');

	const customer = await db.query.stripeCustomers.findFirst({ where: eq(stripeCustomers.userId, installation.userId) });
	const subscription = customer ? await db.query.subscriptions.findFirst({
		where: and(eq(subscriptions.stripeCustomerId, customer.stripeCustomerId), eq(subscriptions.isCurrent, true))
	}) : null;
	const paid = subscription && ['active', 'trialing', 'past_due'].includes(subscription.status);
	const tier = subscription?.plan?.startsWith('champion') ? 'champion' : paid ? 'premium' : 'standard';
	const allowedTiers: Array<'standard' | 'premium' | 'champion'> = tier === 'champion'
		? ['standard', 'premium', 'champion']
		: tier === 'premium' ? ['standard', 'premium'] : ['standard'];

	const productFeatureRows = await db.select({ key: features.key })
		.from(productFeatures)
		.innerJoin(features, eq(productFeatures.featureId, features.id))
		.where(and(eq(productFeatures.productId, targetProduct.id), inArray(productFeatures.tier, allowedTiers)));
	const stripeFeatureRows = customer ? await db.select({ key: activeEntitlements.lookupKey })
		.from(activeEntitlements).where(eq(activeEntitlements.stripeCustomerId, customer.stripeCustomerId)) : [];
	const featureKeys = [...new Set([...productFeatureRows.map((row) => row.key), ...stripeFeatureRows.map((row) => row.key)])];

	const validatedAt = new Date();
	const expiresAt = new Date(validatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
	await db.update(foundryInstallations).set({ lastValidatedAt: validatedAt, updatedAt: validatedAt }).where(eq(foundryInstallations.id, installation.id));
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
