import { and, eq, isNull } from 'drizzle-orm';
import { account } from '$lib/server/db/auth.schema';
import { discordConnections } from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';
import { logDiscordSync } from '$lib/server/discord-log';
import {
	fetchDiscordProfile,
	getDiscordConnection,
	saveDiscordConnection,
	syncDiscordRoles,
	type DiscordProfile
} from '$lib/server/discord';

export async function ensureDiscordConnectionFromAuthAccount(
	d1: D1Database,
	userId: string
): Promise<'linked' | 'absent' | 'unchanged'> {
	const db = getDb(d1);
	const discordAccount = await db.query.account.findFirst({
		where: and(eq(account.userId, userId), eq(account.providerId, 'discord'))
	});
	if (!discordAccount) return 'absent';

	const existing = await getDiscordConnection(d1, userId);
	let profile: DiscordProfile = {
		id: discordAccount.accountId,
		username: existing?.username ?? `user-${discordAccount.accountId.slice(-4)}`,
		global_name: existing?.globalName ?? null,
		avatar: existing?.avatar ?? null
	};

	if (discordAccount.accessToken) {
		try {
			profile = await fetchDiscordProfile(discordAccount.accessToken);
		} catch (cause) {
			logDiscordSync('auth-profile-fetch-failed', {
				userId,
				discordUserId: discordAccount.accountId,
				error: cause instanceof Error ? cause.message : String(cause)
			});
		}
	}

	const unchanged =
		existing &&
		existing.discordUserId === profile.id &&
		existing.username === profile.username &&
		existing.globalName === (profile.global_name ?? null) &&
		existing.avatar === (profile.avatar ?? null);

	if (unchanged) return 'unchanged';

	await saveDiscordConnection(d1, userId, profile);
	logDiscordSync('auth-connection-upserted', { userId, discordUserId: profile.id });
	return 'linked';
}

export async function onDiscordSignInSession(d1: D1Database, userId: string): Promise<void> {
	const linkResult = await ensureDiscordConnectionFromAuthAccount(d1, userId);
	if (linkResult === 'absent') return;
	try {
		await syncDiscordRoles(d1, userId);
	} catch (cause) {
		logDiscordSync('auth-sign-in-sync-failed', {
			userId,
			error: cause instanceof Error ? cause.message : String(cause)
		});
	}
}

export type BackfillDiscordLinkResult = {
	processed: number;
	linked: number;
	synced: number;
	failed: number;
	errors: string[];
};

export async function backfillDiscordConnectionsFromAuthAccounts(
	d1: D1Database,
	limit = 50
): Promise<BackfillDiscordLinkResult> {
	const db = getDb(d1);
	const rows = await db
		.select({
			userId: account.userId,
			accountId: account.accountId,
			accessToken: account.accessToken
		})
		.from(account)
		.leftJoin(discordConnections, eq(discordConnections.userId, account.userId))
		.where(and(eq(account.providerId, 'discord'), isNull(discordConnections.userId)))
		.limit(limit);

	const result: BackfillDiscordLinkResult = {
		processed: rows.length,
		linked: 0,
		synced: 0,
		failed: 0,
		errors: []
	};

	for (const row of rows) {
		try {
			const link = await ensureDiscordConnectionFromAuthAccount(d1, row.userId);
			if (link === 'linked') result.linked += 1;
			await syncDiscordRoles(d1, row.userId);
			result.synced += 1;
		} catch (cause) {
			result.failed += 1;
			const message = cause instanceof Error ? cause.message : 'Backfill failed.';
			result.errors.push(`${row.userId}: ${message}`);
			logDiscordSync('backfill-failed', { userId: row.userId, error: message });
		}
	}

	return result;
}