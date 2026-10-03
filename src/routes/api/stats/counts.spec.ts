import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import { GET as accounts } from './accounts/+server';
import { GET as characters } from './characters/+server';

it('returns current aggregate counts and handles unavailable databases', async () => {
	const sqlite = new DatabaseSync(':memory:');
	try {
		sqlite.exec(`
			CREATE TABLE user (id TEXT PRIMARY KEY);
			CREATE TABLE account (id TEXT, user_id TEXT);
			CREATE TABLE characters (id TEXT PRIMARY KEY, imported_at TEXT);
			INSERT INTO user VALUES ('one'), ('two');
			INSERT INTO account VALUES ('email', 'one'), ('discord', 'one'), ('email-two', 'two');
			INSERT INTO characters VALUES ('first', NULL), ('second', '2026-10-03'), ('third', '2026-10-03');
		`);
		const db = { prepare: (sql: string) => ({ first: async () => sqlite.prepare(sql).get() }) };
		for (const [handler, expected] of [
			[accounts, { registeredAccounts: 2 }],
			[characters, { importedCharacters: 3 }]
		] as const) {
			const event = { platform: { env: { DB: db } } } as unknown as Parameters<typeof accounts>[0] &
				Parameters<typeof characters>[0];
			const response = await handler(event);
			expect(response.status).toBe(200);
			expect(await response.json()).toEqual(expected);
			expect(response.headers.get('cache-control')).toBe('no-store');
			const unavailable = await handler({ platform: undefined } as Parameters<typeof accounts>[0] &
				Parameters<typeof characters>[0]);
			expect(unavailable.status).toBe(503);
		}
		sqlite.exec('DELETE FROM characters; DELETE FROM user;');
		for (const handler of [accounts, characters]) {
			const event = { platform: { env: { DB: db } } } as unknown as Parameters<typeof accounts>[0] &
				Parameters<typeof characters>[0];
			expect(
				Object.values((await (await handler(event)).json()) as Record<string, number>)
			).toEqual([0]);
		}
		sqlite.exec('DROP TABLE user; DROP TABLE characters;');
		for (const handler of [accounts, characters]) {
			const event = { platform: { env: { DB: db } } } as unknown as Parameters<typeof accounts>[0] &
				Parameters<typeof characters>[0];
			const response = await handler(event);
			expect(response.status).toBe(500);
			expect(await response.json()).toEqual({
				error: handler === accounts ? 'Account stats unavailable' : 'Character stats unavailable'
			});
		}
	} finally {
		sqlite.close();
	}
});
