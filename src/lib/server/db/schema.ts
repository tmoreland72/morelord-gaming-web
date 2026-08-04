import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date())
};

export const products = sqliteTable('products', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	summary: text('summary').notNull(),
	status: text('status', { enum: ['draft', 'active', 'retired'] }).notNull().default('draft'),
	githubRepository: text('github_repository'),
	manifestUrl: text('manifest_url'),
	...timestamps
});

export const features = sqliteTable('features', {
	id: text('id').primaryKey(),
	key: text('key').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	...timestamps
});

export const productFeatures = sqliteTable('product_features', {
	productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
	featureId: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
	tier: text('tier', { enum: ['standard', 'premium', 'champion'] }).notNull().default('standard')
}, (table) => [primaryKey({ columns: [table.productId, table.featureId] })]);

export const subscriptionTiers = sqliteTable('subscription_tiers', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	stripeProductId: text('stripe_product_id'),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	...timestamps
});

export const tierFeatures = sqliteTable('tier_features', {
	tierId: text('tier_id').notNull().references(() => subscriptionTiers.id, { onDelete: 'cascade' }),
	featureId: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' })
}, (table) => [primaryKey({ columns: [table.tierId, table.featureId] })]);

export const releases = sqliteTable('releases', {
	id: text('id').primaryKey(),
	productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
	version: text('version').notNull(),
	title: text('title').notNull(),
	summary: text('summary'),
	publishedAt: integer('published_at', { mode: 'timestamp_ms' }).notNull(),
	githubReleaseUrl: text('github_release_url'),
	downloadUrl: text('download_url'),
	manifestUrl: text('manifest_url'),
	createdAt: timestamps.createdAt
}, (table) => [uniqueIndex('releases_product_version_unique').on(table.productId, table.version)]);

export const releaseChanges = sqliteTable('release_changes', {
	id: text('id').primaryKey(),
	releaseId: text('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
	category: text('category', { enum: ['feature', 'improvement', 'fix', 'breaking', 'security'] }).notNull(),
	tier: text('tier', { enum: ['standard', 'premium', 'champion'] }).notNull().default('standard'),
	description: text('description').notNull(),
	sortOrder: integer('sort_order').notNull().default(0)
});

export const webhookEvents = sqliteTable('webhook_events', {
	id: text('id').primaryKey(),
	provider: text('provider').notNull(),
	eventType: text('event_type').notNull(),
	processedAt: integer('processed_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date())
});

export * from './auth.schema';
