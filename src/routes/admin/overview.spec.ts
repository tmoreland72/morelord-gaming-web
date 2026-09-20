import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$lib/server/admin', () => ({ isAdminEmail: () => true }));
vi.mock('$lib/server/discord', () => ({ getDiscordSettings: async () => ({}) }));

import { load } from './+page.server';

describe('overview record counts', () => {
	it('counts each record category and excludes revoked installations', async () => {
		const sqlite = new DatabaseSync(':memory:');
		try {
			sqlite.exec(`
				CREATE TABLE products (id TEXT, name TEXT, status TEXT);
				INSERT INTO products VALUES ('p1', 'Published', 'active'), ('p2', 'Draft', 'draft'), ('p3', 'Retired', 'retired');
				CREATE TABLE releases (product_id TEXT, version TEXT, title TEXT, published_at INTEGER);
				INSERT INTO releases VALUES ('p1', '1.0', 'First', 1), ('p1', '2.0', 'Second', 2);
				CREATE TABLE user (id TEXT);
				INSERT INTO user VALUES ('u1'), ('u2'), ('u3'), ('u4');
				CREATE TABLE subscriptions (is_current INTEGER);
				INSERT INTO subscriptions VALUES (1), (1), (1), (0);
				CREATE TABLE active_entitlements (stripe_customer_id TEXT, lookup_key TEXT);
				INSERT INTO active_entitlements VALUES ('c1', 'premium'), ('c1', 'extra');
				CREATE TABLE foundry_installations (revoked_at INTEGER);
				INSERT INTO foundry_installations VALUES (NULL), (NULL), (123);
				CREATE TABLE discord_connections (user_id TEXT, role_sync_status TEXT);
				INSERT INTO discord_connections VALUES ('u1', 'pending'), ('u2', 'error'), ('u3', 'synced');
				CREATE TABLE webhook_events (provider TEXT, event_type TEXT, processed_at INTEGER);
				INSERT INTO webhook_events VALUES ('stripe', 'created', 1), ('stripe', 'updated', 2);
				CREATE TABLE support_requests (status TEXT);
				INSERT INTO support_requests VALUES ('open'), ('in_progress'), ('resolved');
			`);
			const db = {
				prepare: (sql: string) => ({ first: async () => sqlite.prepare(sql).get() ?? null })
			};
			const result = await load({
				locals: { user: { email: 'admin@example.com' } },
				platform: { env: { DB: db } }
			} as unknown as Parameters<typeof load>[0]);
			expect(result?.counts).toEqual({
				products: 3,
				releases: 2,
				users: 4,
				subscriptions: 3,
				entitlements: 2,
				installations: 2,
				discordConnections: 3,
				webhookEvents: 2,
				supportRequests: 3
			});
			expect(result?.latestRelease?.title).toBe('Second');
			expect(result?.latestWebhook?.eventType).toBe('updated');
		} finally {
			sqlite.close();
		}
	});

	it('counts three current subscriptions while preserving a fourth historical record', async () => {
		const sqlite = new DatabaseSync(':memory:');
		try {
			sqlite.exec(`CREATE TABLE subscriptions (is_current INTEGER);
				INSERT INTO subscriptions VALUES (1), (1), (1), (0);`);
			const db = {
				prepare: (sql: string) => ({
					first: async () =>
						sql.includes('FROM subscriptions') ? sqlite.prepare(sql).get() : { total: 0 }
				})
			};
			const result = await load({
				locals: { user: { email: 'admin@example.com' } },
				platform: { env: { DB: db } }
			} as unknown as Parameters<typeof load>[0]);
			expect(result?.counts.subscriptions).toBe(3);
			expect(sqlite.prepare('SELECT COUNT(*) AS total FROM subscriptions').get()?.total).toBe(4);
		} finally {
			sqlite.close();
		}
	});
});
