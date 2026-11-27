import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/discord', () => ({
	syncDiscordRoles: vi.fn(async () => ({ status: 'synced', message: 'ok', lastSyncedAt: new Date() }))
}));

import { syncNotInServerDiscordBatch } from '$lib/server/discord-cron';
import { syncDiscordRoles } from '$lib/server/discord';

describe('syncNotInServerDiscordBatch', () => {
	beforeEach(() => {
		vi.mocked(syncDiscordRoles).mockReset();
		vi.mocked(syncDiscordRoles).mockResolvedValue({
			status: 'synced',
			message: 'ok',
			lastSyncedAt: new Date()
		});
	});

	it('processes only not_in_server rows', async () => {
		const db = {
			prepare: (sql: string) => ({
				bind: (...args: unknown[]) => ({
					all: async () => {
						if (sql.includes('not_in_server')) {
							return { results: [{ userId: 'u1', discordUserId: 'd1' }] };
						}
						return { results: [] };
					}
				})
			})
		} as unknown as D1Database;

		const result = await syncNotInServerDiscordBatch(db);
		expect(result.attempted).toBe(1);
		expect(result.synced).toBe(1);
		expect(syncDiscordRoles).toHaveBeenCalledWith(db, 'u1');
	});

	it('stops the batch on Discord rate limits', async () => {
		vi.mocked(syncDiscordRoles).mockRejectedValueOnce(new Error('Discord role update failed (429)'));
		const db = {
			prepare: () => ({
				bind: () => ({
					all: async () => ({
						results: [
							{ userId: 'u1', discordUserId: 'd1' },
							{ userId: 'u2', discordUserId: 'd2' }
						]
					})
				})
			})
		} as unknown as D1Database;
		const result = await syncNotInServerDiscordBatch(db);
		expect(result.rateLimited).toBe(true);
		expect(result.attempted).toBe(2);
		expect(syncDiscordRoles).toHaveBeenCalledTimes(1);
	});
});