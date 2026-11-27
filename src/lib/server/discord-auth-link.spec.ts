import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		DISCORD_BOT_TOKEN: 'test-bot-token',
		DISCORD_GUILD_ID: 'guild',
		DISCORD_ROLE_TOOLS: 'tools',
		DISCORD_ROLE_ADVENTURES: 'adventures',
		DISCORD_ROLE_PREMIUM: 'premium',
		DISCORD_ROLE_CHAMPION: 'champion'
	}
}));

import { createTestD1 } from '$lib/server/test-d1';
import {
	backfillDiscordConnectionsFromAuthAccounts,
	ensureDiscordConnectionFromAuthAccount
} from '$lib/server/discord-auth-link';

let sqlite: DatabaseSync;

beforeEach(() => {
	sqlite = new DatabaseSync(':memory:');
	for (const file of [
		'0000_initial.sql',
		'0002_billing.sql',
		'0004_discord.sql',
		'0010_discord_role_sync.sql',
		'0027_discord_adventures_role.sql'
	]) {
		sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'));
	}
	sqlite.exec(`
		INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
		VALUES ('u1', 'Test', 'test@example.com', 1, 1000, 1000);
		INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at)
		VALUES ('a1', 'discord-user-1', 'discord', 'u1', 1000, 1000);
	`);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			if (url.includes('/members/discord-user-1')) {
				return new Response(JSON.stringify({ roles: [] }), { status: 200 });
			}
			if (init?.method === 'PUT') return new Response(null, { status: 204 });
			return new Response(null, { status: 204 });
		})
	);
});

afterEach(() => {
	sqlite.close();
	vi.unstubAllGlobals();
});

function d1(): D1Database {
	return createTestD1(sqlite);
}

describe('discord-auth-link', () => {
	it('creates discord_connections from a Discord auth account', async () => {
		const result = await ensureDiscordConnectionFromAuthAccount(d1(), 'u1');
		expect(result).toBe('linked');
		const row = sqlite.prepare('SELECT discord_user_id FROM discord_connections WHERE user_id = ?').get('u1') as {
			discord_user_id: string;
		};
		expect(row.discord_user_id).toBe('discord-user-1');
	});

	it('backfills missing connections', async () => {
		const summary = await backfillDiscordConnectionsFromAuthAccounts(d1(), 10);
		expect(summary.processed).toBe(1);
		expect(summary.linked).toBe(1);
	});
});