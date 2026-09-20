import { registerTelemetryCredential, authenticateTelemetry } from './telemetry-credentials';
import { describe, it, expect, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { storeTelemetry, telemetrySchema, consumeTelemetryLimit } from './telemetry';
import { snapshotDownloads } from './github-downloads';
vi.mock('$lib/server/admin', () => ({
	isAdminEmail: (email: string) => email === 'admin@example.test'
}));
import { load, actions } from '../../routes/admin/telemetry/+page.server';

function database() {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec(readFileSync('migrations/0020_foundry_telemetry.sql', 'utf8'));
	sqlite.exec(readFileSync('migrations/0021_telemetry_credentials.sql', 'utf8'));
	const db = {
		prepare(sql: string) {
			let values: unknown[] = [];
			return {
				bind(...args: unknown[]) {
					values = args;
					return this;
				},
				async run() {
					return {
						meta: { changes: Number(sqlite.prepare(sql).run(...(values as never[])).changes) }
					};
				},
				async first() {
					return sqlite.prepare(sql).get(...(values as never[])) ?? null;
				},
				async all() {
					return { results: sqlite.prepare(sql).all(...(values as never[])) };
				}
			};
		},
		async batch(statements: { run: () => Promise<unknown> }[]) {
			sqlite.exec('BEGIN');
			try {
				const results = await Promise.all(statements.map((statement) => statement.run()));
				sqlite.exec('COMMIT');
				return results;
			} catch (error) {
				sqlite.exec('ROLLBACK');
				throw error;
			}
		}
	} as unknown as D1Database;
	return { db, sqlite };
}
describe('telemetry storage and reports', () => {
	it('deduplicates retries and counts worlds separately from events and availability', async () => {
		const { db, sqlite } = database();
		try {
			const base = {
				at: new Date().toISOString(),
				module: 'morelord-core',
				moduleVersion: '0.3.9',
				foundryVersion: '14.368',
				system: 'dnd5e',
				systemVersion: '6.0.3',
				role: 'gm',
				kind: 'usage'
			};
			const payload = telemetrySchema.parse({
				schemaVersion: 1,
				world: crypto.randomUUID(),
				events: [
					{ ...base, id: crypto.randomUUID(), event: 'module.available' },
					{ ...base, id: crypto.randomUUID(), event: 'dashboard.opened' },
					{ ...base, id: crypto.randomUUID(), event: 'dashboard.opened', role: 'player' },
					{
						...base,
						id: crypto.randomUUID(),
						kind: 'error',
						event: 'test',
						type: 'TypeError',
						frames: ['morelord-core/scripts/main.js:1:2'],
						recent: []
					}
				]
			});
			await storeTelemetry(db, payload);
			await storeTelemetry(db, payload);
			const result = (await load({
				platform: { env: { DB: db } },
				locals: { user: { email: 'admin@example.test' } },
				url: new URL('https://example.test/admin/telemetry')
			} as never)) as {
				modules: {
					module: string;
					worlds: number;
					available: number;
					actions: number;
					errors: number;
				}[];
				features: { module: string; event: string; count: number }[];
				failures: { count: number; worlds: number }[];
			};
			expect(result.modules.find((row) => row.module === 'morelord-core')).toEqual({
				module: 'morelord-core',
				worlds: 1,
				available: 1,
				actions: 2,
				errors: 1
			});
			expect(result.modules.find((row) => row.module === 'morelord-downtime')?.worlds).toBe(0);
			expect(result.features.find((row) => row.module === 'morelord-core')?.count).toBe(2);
			expect(
				result.features.find(
					(row) => row.module === 'morelord-downtime' && row.event === 'dashboard.opened'
				)?.count
			).toBe(0);
			expect(result.failures[0].worlds).toBe(1);
		} finally {
			sqlite.close();
		}
	});
	it('protects both loads and snapshot actions without relying on the parent layout', async () => {
		await expect(
			load({ locals: {}, url: new URL('https://example.test') } as never)
		).rejects.toMatchObject({ status: 403 });
		await expect(actions.downloads({ locals: {} } as never)).rejects.toMatchObject({ status: 403 });
	});
	it('snapshots only release ZIPs, preserves a baseline and marks failures rather than zero', async () => {
		const { db, sqlite } = database();
		try {
			const fetcher = vi.fn(async (url: string | URL | Request) => {
				if (String(url).includes('morelord-downtime')) return new Response('', { status: 503 });
				return Response.json([
					{
						tag_name: 'v1',
						draft: false,
						assets: [
							{ id: 1, name: 'module.zip', download_count: 42 },
							{ id: 2, name: 'module.json', download_count: 900 }
						]
					}
				]);
			});
			const results = await snapshotDownloads(db, fetcher as typeof fetch);
			expect(results.find((row) => row.module === 'morelord-core')?.downloads).toBe(42);
			expect(results.find((row) => row.module === 'morelord-downtime')?.downloads).toBeUndefined();
			expect(results.some((row) => row.module === 'morelord-compendium')).toBe(false);
			expect(
				sqlite.prepare('SELECT COUNT(*) AS count FROM github_download_snapshots').get()?.count
			).toBe(6);
		} finally {
			sqlite.close();
		}
	});
});

describe('public ingestion rate limits', () => {
	it('consumes a bounded quota atomically under concurrent requests', async () => {
		const { db, sqlite } = database();
		try {
			sqlite.exec('CREATE TABLE rate_limit_events (key TEXT NOT NULL,created_at INTEGER NOT NULL)');
			const results = await Promise.all(
				Array.from({ length: 10 }, () => consumeTelemetryLimit(db, 'test', 3, 60000))
			);
			expect(results.filter(Boolean)).toHaveLength(3);
			expect(sqlite.prepare('SELECT COUNT(*) count FROM rate_limit_events').get()?.count).toBe(3);
		} finally {
			sqlite.close();
		}
	});
	it('does not allow ingestion when rate-limit storage fails', async () => {
		const db = {
			prepare() {
				throw new Error('storage unavailable');
			}
		} as unknown as D1Database;
		await expect(consumeTelemetryLimit(db, 'test', 3, 60000)).rejects.toThrow(
			'storage unavailable'
		);
	});
});

describe('account-independent reporting credentials', () => {
	it('stores only a hash and rejects unknown and revoked credentials', async () => {
		const { db, sqlite } = database();
		try {
			const credential = await registerTelemetryCredential(db);
			expect(credential.token).toMatch(/^mlt_[a-f0-9]{64}$/);
			expect(
				JSON.stringify(sqlite.prepare('SELECT * FROM foundry_telemetry_credentials').get())
			).not.toContain(credential.token);
			expect(await authenticateTelemetry(db, 'Bearer ' + credential.token)).toBe(credential.world);
			expect(await authenticateTelemetry(db, null)).toBeNull();
			expect(await authenticateTelemetry(db, 'Bearer mlt_' + 'f'.repeat(64))).toBeNull();
			sqlite
				.prepare('UPDATE foundry_telemetry_credentials SET revoked_at=? WHERE world=?')
				.run(Date.now(), credential.world);
			expect(await authenticateTelemetry(db, 'Bearer ' + credential.token)).toBeNull();
		} finally {
			sqlite.close();
		}
	});
});
