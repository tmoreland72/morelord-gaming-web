import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { products, productFeatures, features, releases, releaseChanges, subscriptionTiers } from '$lib/server/db/schema';

export type CatalogProduct = {
	id: string;
	slug: string;
	name: string;
	summary: string;
	status: 'draft' | 'active' | 'retired';
	githubRepository: string | null;
	manifestUrl: string | null;
};

export async function listActiveProducts(d1: D1Database): Promise<CatalogProduct[]> {
	const db = getDb(d1);
	return db.select({
		id: products.id,
		slug: products.slug,
		name: products.name,
		summary: products.summary,
		status: products.status,
		githubRepository: products.githubRepository,
		manifestUrl: products.manifestUrl
	}).from(products).where(eq(products.status, 'active')).orderBy(asc(products.name));
}

export async function getProductBySlug(d1: D1Database, slug: string) {
	const db = getDb(d1);
	const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
	if (!product) return null;

	const featureRows = await db
		.select({
			key: features.key,
			name: features.name,
			description: features.description,
			tier: productFeatures.tier
		})
		.from(productFeatures)
		.innerJoin(features, eq(productFeatures.featureId, features.id))
		.where(eq(productFeatures.productId, product.id))
		.orderBy(asc(productFeatures.tier), asc(features.name));

	const releaseRows = await db
		.select()
		.from(releases)
		.where(eq(releases.productId, product.id))
		.orderBy(desc(releases.publishedAt))
		.limit(10);

	return { product, features: featureRows, releases: releaseRows };
}

export async function listReleases(d1: D1Database) {
	const db = getDb(d1);
	const releaseRows = await db
		.select({
			id: releases.id,
			version: releases.version,
			title: releases.title,
			summary: releases.summary,
			publishedAt: releases.publishedAt,
			githubReleaseUrl: releases.githubReleaseUrl,
			downloadUrl: releases.downloadUrl,
			manifestUrl: releases.manifestUrl,
			productName: products.name,
			productSlug: products.slug
		})
		.from(releases)
		.innerJoin(products, eq(releases.productId, products.id))
		.orderBy(desc(releases.publishedAt));

	return Promise.all(releaseRows.map(async (release) => ({
		...release,
		changes: await db
			.select()
			.from(releaseChanges)
			.where(eq(releaseChanges.releaseId, release.id))
			.orderBy(asc(releaseChanges.sortOrder))
	})));
}

export async function listActiveTiers(d1: D1Database) {
	return getDb(d1).select().from(subscriptionTiers).where(eq(subscriptionTiers.active, true)).orderBy(asc(subscriptionTiers.id));
}
