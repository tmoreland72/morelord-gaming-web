import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

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


export const stripeCustomers = sqliteTable('stripe_customers', {
	userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
	stripeCustomerId: text('stripe_customer_id').notNull().unique(),
	...timestamps
});

export const subscriptions = sqliteTable('subscriptions', {
	id: text('id').primaryKey(),
	stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
	stripeCustomerId: text('stripe_customer_id').notNull(),
	status: text('status').notNull(),
	plan: text('plan'),
	priceId: text('price_id'),
	currentPeriodEnd: integer('current_period_end', { mode: 'timestamp_ms' }),
	cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).notNull().default(false),
	isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(true),
	...timestamps
}, (table) => [uniqueIndex('subscriptions_customer_idx').on(table.stripeCustomerId, table.stripeSubscriptionId)]);

export const activeEntitlements = sqliteTable('active_entitlements', {
	id: text('id').primaryKey(),
	stripeCustomerId: text('stripe_customer_id').notNull(),
	lookupKey: text('lookup_key').notNull(),
	displayName: text('display_name'),
	stripeFeatureId: text('stripe_feature_id'),
	updatedAt: timestamps.updatedAt
}, (table) => [uniqueIndex('active_entitlements_customer_key_unique').on(table.stripeCustomerId, table.lookupKey)]);


export const foundryInstallations = sqliteTable('foundry_installations', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
	label: text('label').notNull(),
	worldId: text('world_id'),
	worldName: text('world_name'),
	foundryVersion: text('foundry_version'),
	moduleVersion: text('module_version'),
	tokenHash: text('token_hash').notNull().unique(),
	lastValidatedAt: integer('last_validated_at', { mode: 'timestamp_ms' }),
	revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
	...timestamps
});


export const foundryProductActivity = sqliteTable('foundry_product_activity', {
	installationId: text('installation_id').notNull().references(() => foundryInstallations.id, { onDelete: 'cascade' }),
	productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
	firstSeenAt: integer('first_seen_at', { mode: 'timestamp_ms' }).notNull(),
	lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull()
}, (table) => [primaryKey({ columns: [table.installationId, table.productId] })]);

export const foundryActivationRequests = sqliteTable('foundry_activation_requests', {
	id: text('id').primaryKey(),
	productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
	userCode: text('user_code').notNull().unique(),
	deviceSecretHash: text('device_secret_hash').notNull(),
	installationLabel: text('installation_label').notNull(),
	worldId: text('world_id'),
	worldName: text('world_name'),
	foundryVersion: text('foundry_version'),
	moduleVersion: text('module_version'),
	status: text('status', { enum: ['pending', 'approved', 'denied', 'expired', 'consumed'] }).notNull().default('pending'),
	approvedByUserId: text('approved_by_user_id').references(() => user.id, { onDelete: 'set null' }),
	installationId: text('installation_id').references(() => foundryInstallations.id, { onDelete: 'set null' }),
	issuedToken: text('issued_token'),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
	approvedAt: integer('approved_at', { mode: 'timestamp_ms' }),
	consumedAt: integer('consumed_at', { mode: 'timestamp_ms' }),
	createdAt: timestamps.createdAt
});




export const discordSettings = sqliteTable('discord_settings', {
	id: text('id').primaryKey(),
	guildId: text('guild_id'),
	roleToolsId: text('role_tools_id'),
	rolePremiumId: text('role_premium_id'),
	roleChampionId: text('role_champion_id'),
	inviteUrl: text('invite_url'),
	announcementsChannelId: text('announcements_channel_id'),
	...timestamps
});
export const discordConnections = sqliteTable('discord_connections', {
	userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
	discordUserId: text('discord_user_id').notNull().unique(),
	username: text('username').notNull(),
	globalName: text('global_name'),
	avatar: text('avatar'),
	roleSyncStatus: text('role_sync_status').notNull().default('pending'),
	roleSyncMessage: text('role_sync_message'),
	lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }),
	...timestamps
});

export const characters = sqliteTable('characters', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	foundryActorId: text('foundry_actor_id'),
	name: text('name').notNull(),
	contentJson: text('content_json').notNull(),
	...timestamps
}, (table) => [
	uniqueIndex('characters_user_foundry_actor_unique').on(table.userId, table.foundryActorId)
]);
