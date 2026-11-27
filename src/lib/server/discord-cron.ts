import {
	DISCORD_CATCHUP_BATCH_SIZE,
	DISCORD_CATCHUP_MAX_RETRIES
} from '$lib/server/discord-sync-logic';
import { logDiscordSync } from '$lib/server/discord-log';
import { syncDiscordRoles, type DiscordSyncBatchResult } from '$lib/server/discord';

export async function syncNotInServerDiscordBatch(d1: D1Database): Promise<DiscordSyncBatchResult> {
	const rows = await d1
		.prepare(
			`SELECT user_id AS userId, discord_user_id AS discordUserId
       FROM discord_connections
       WHERE role_sync_status = 'not_in_server'
       ORDER BY COALESCE(last_synced_at, updated_at) ASC
       LIMIT ?1`
		)
		.bind(DISCORD_CATCHUP_BATCH_SIZE)
		.all<{ userId: string; discordUserId: string }>();

	const result: DiscordSyncBatchResult = {
		attempted: rows.results.length,
		synced: 0,
		stillNotInServer: 0,
		errors: 0,
		rateLimited: false,
		details: []
	};

	for (const row of rows.results) {
		let attempt = 0;
		let done = false;
		while (attempt < DISCORD_CATCHUP_MAX_RETRIES && !done) {
			attempt += 1;
			try {
				const status = await syncDiscordRoles(d1, row.userId);
				done = true;
				if (status.status === 'synced') result.synced += 1;
				else if (status.status === 'not_in_server') result.stillNotInServer += 1;
				else if (status.status === 'error') {
					result.errors += 1;
					result.details.push(`${row.userId}: ${status.message}`);
				}
			} catch (cause) {
				const message = cause instanceof Error ? cause.message : String(cause);
				if (message.includes('(429)')) {
					result.rateLimited = true;
					result.details.push('Discord rate limit reached; remaining batch deferred.');
					logDiscordSync('cron-rate-limited', { attempt, userId: row.userId });
					return result;
				}
				if (attempt >= DISCORD_CATCHUP_MAX_RETRIES) {
					result.errors += 1;
					result.details.push(`${row.userId}: ${message}`);
					done = true;
				}
			}
		}
	}

	logDiscordSync('cron-batch-complete', result);
	return result;
}