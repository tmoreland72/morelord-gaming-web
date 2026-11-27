import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		DISCORD_BOT_TOKEN: 'test-bot-token',
		DISCORD_GUILD_ID: '1398006260682719252',
		DISCORD_ROLE_TOOLS: '1535401700729557042',
		DISCORD_ROLE_ADVENTURES: '1535402163818209420',
		DISCORD_ROLE_PREMIUM: 'premium-role',
		DISCORD_ROLE_CHAMPION: 'champion-role'
	}
}));

import {
	discordRoleSyncConfigured,
	saveDiscordConnection,
	syncDiscordRoles,
	syncNotInServerDiscordBatch
} from '$lib/server/discord';
import { createTestD1 } from '$lib/server/test-d1';

let sqlite: DatabaseSync;
let fetchMock: ReturnType<typeof vi.fn>;

function applyMigrations(db: DatabaseSync) {
	for (const file of [
		'0000_initial.sql',
		'0002_billing.sql',
		'0004_discord.sql',
		'0010_discord_role_sync.sql',
		'0027_discord_adventures_role.sql'
	]) {
		db.exec(readFileSync(`migrations/${file}`, 'utf8'));
	}
	db.exec(`
		INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
		VALUES ('u1', 'Test', 'test@example.com', 1, 1000, 1000);
	`);
}

beforeEach(() => {
	sqlite = new DatabaseSync(':memory:');
	applyMigrations(sqlite);
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	sqlite.close();
	vi.unstubAllGlobals();
});

function d1(): D1Database {
	return createTestD1(sqlite);
}

describe('syncDiscordRoles', () => {
	it('adds Tools and Adventures for a standard member', async () => {
		const db = d1();
		expect(await discordRoleSyncConfigured(db)).toBe(true);
		await saveDiscordConnection(db, 'u1', {
			id: 'discord-1',
			username: 'member',
			global_name: 'Member'
		});

		const rolesAdded: string[] = [];
		fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
			if (url.includes('/members/discord-1') && (!init || init.method === undefined)) {
				return new Response(JSON.stringify({ roles: [] }), { status: 200 });
			}
			if (init?.method === 'PUT') {
				const match = url.match(/roles\/([^/]+)$/);
				if (match) rolesAdded.push(match[1]);
				return new Response(null, { status: 204 });
			}
			return new Response('not found', { status: 404 });
		});

		const result = await syncDiscordRoles(db, 'u1');
		expect(result.status).toBe('synced');
		expect(rolesAdded.sort()).toEqual(['1535401700729557042', '1535402163818209420'].sort());
	});

	it('re-syncs not_in_server connections in a batch', async () => {
		const db = d1();
		sqlite.exec(`
			INSERT INTO discord_connections (user_id, discord_user_id, username, role_sync_status, created_at, updated_at)
			VALUES ('u1', 'discord-batch', 'member', 'not_in_server', 1000, 1000);
		`);
		fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
			if (url.includes('/members/discord-batch') && (!init || init.method === undefined)) {
				return new Response(JSON.stringify({ roles: [] }), { status: 200 });
			}
			if (init?.method === 'PUT') return new Response(null, { status: 204 });
			return new Response(null, { status: 204 });
		});
		const result = await syncNotInServerDiscordBatch(db);
		expect(result.attempted).toBe(1);
		expect(result.synced).toBe(1);
	});

	it('reports not_in_server without throwing', async () => {
		const db = d1();
		await saveDiscordConnection(db, 'u1', { id: 'discord-2', username: 'away' });
		fetchMock.mockResolvedValue(new Response('missing', { status: 404 }));
		const result = await syncDiscordRoles(db, 'u1');
		expect(result.status).toBe('not_in_server');
	});

});