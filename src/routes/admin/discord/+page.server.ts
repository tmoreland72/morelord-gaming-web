import { env } from '$env/dynamic/private';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdminEmail } from '$lib/server/admin';
import { backfillDiscordConnectionsFromAuthAccounts } from '$lib/server/discord-auth-link';
import {
	checkDiscordConfiguration,
	discordRoleSyncConfigured,
	getDiscordBotInstallUrl,
	getDiscordSettings,
	saveDiscordSettings,
	syncDiscordRoles
} from '$lib/server/discord';

type ConnectionRow = {
	userId: string;
	email: string | null;
	name: string | null;
	discordUserId: string;
	username: string;
	globalName: string | null;
	roleSyncStatus: string;
	roleSyncMessage: string | null;
	lastSyncedAt: number | null;
	plan: string | null;
};

async function requireAdmin(locals: App.Locals, returnTo: string) {
	if (!locals.user) redirect(303, `/login?returnTo=${encodeURIComponent(returnTo)}`);
	if (!isAdminEmail(locals.user.email)) error(403, 'Administrator access required.');
}

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	await requireAdmin(locals, '/admin/discord');
	if (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');

	const db = platform.env.DB;
	const settings = await getDiscordSettings(db);
	let check = null;
	if (env.DISCORD_BOT_TOKEN && settings.guildId) {
		check = await checkDiscordConfiguration(db);
	}
	const connections = await db.prepare(`
		SELECT dc.user_id AS userId, u.email, u.name, dc.discord_user_id AS discordUserId,
			dc.username, dc.global_name AS globalName, dc.role_sync_status AS roleSyncStatus,
			dc.role_sync_message AS roleSyncMessage, dc.last_synced_at AS lastSyncedAt,
			s.plan
		FROM discord_connections dc
		LEFT JOIN user u ON u.id = dc.user_id
		LEFT JOIN stripe_customers sc ON sc.user_id = dc.user_id
		LEFT JOIN subscriptions s ON s.stripe_customer_id = sc.stripe_customer_id AND s.is_current = 1
		ORDER BY COALESCE(dc.last_synced_at, dc.created_at) DESC
	`).all<ConnectionRow>();

	const statusSummary = await platform.env.DB.prepare(`
		SELECT role_sync_status AS status, COUNT(*) AS total
		FROM discord_connections
		GROUP BY role_sync_status
	`).all<{ status: string; total: number }>();

	const missingAuthLinks = await platform.env.DB.prepare(`
		SELECT COUNT(*) AS total FROM account a
		LEFT JOIN discord_connections dc ON dc.user_id = a.user_id
		WHERE a.provider_id = 'discord' AND dc.user_id IS NULL
	`).first<{ total: number }>();

	return {
		settings,
		check,
		connections: connections.results as ConnectionRow[],
		roleSyncConfigured: await discordRoleSyncConfigured(db),
		syncStatusCounts: Object.fromEntries(
			statusSummary.results.map((row) => [row.status, row.total])
		),
		missingAuthLinks: Number(missingAuthLinks?.total ?? 0),
		configuration: {
			signInRedirectUri: `${url.origin}/api/auth/callback/discord`,
			clientId: Boolean(env.DISCORD_CLIENT_ID?.trim()),
			clientSecret: Boolean(env.DISCORD_CLIENT_SECRET?.trim()),
			botToken: Boolean(env.DISCORD_BOT_TOKEN?.trim()),
			redirectUri: env.DISCORD_REDIRECT_URI || (env.ORIGIN ? `${env.ORIGIN.replace(/\/$/, '')}/api/discord/callback` : null)
		},
		botInstallUrl: getDiscordBotInstallUrl(),
		saveSuccess: url.searchParams.get('saved') === '1'
	};
};

function optional(form: FormData, name: string): string | null {
	const value = String(form.get(name) ?? '').trim();
	return value || null;
}

export const actions: Actions = {
	save: async ({ locals, platform, request }) => {
		await requireAdmin(locals, '/admin/discord');
		if (!platform?.env?.DB) return fail(503, { discordAdminError: 'D1 database binding is unavailable.' });
		const form = await request.formData();
		await saveDiscordSettings(platform.env.DB, {
			guildId: optional(form, 'guildId'),
			roleToolsId: optional(form, 'roleToolsId'),
			roleAdventuresId: optional(form, 'roleAdventuresId'),
			rolePremiumId: optional(form, 'rolePremiumId'),
			roleChampionId: optional(form, 'roleChampionId'),
			inviteUrl: optional(form, 'inviteUrl'),
			announcementsChannelId: optional(form, 'announcementsChannelId')
		});
		redirect(303, '/admin/discord?saved=1');
	},
	test: async ({ locals, platform }) => {
		await requireAdmin(locals, '/admin/discord');
		if (!platform?.env?.DB) return fail(503, { discordAdminError: 'D1 database binding is unavailable.' });
		const check = await checkDiscordConfiguration(platform.env.DB);
		if (check.errors.length) return fail(400, { discordAdminError: check.errors.join(' ') });
		return { discordAdminSuccess: `Discord connection verified${check.guildName ? ` for ${check.guildName}` : ''}.` };
	},
	syncOne: async ({ locals, platform, request }) => {
		await requireAdmin(locals, '/admin/discord');
		if (!platform?.env?.DB) return fail(503, { discordAdminError: 'D1 database binding is unavailable.' });
		const form = await request.formData();
		const userId = String(form.get('userId') ?? '').trim();
		if (!userId) return fail(400, { discordAdminError: 'User ID is required.' });
		try {
			const result = await syncDiscordRoles(platform.env.DB, userId);
			return { discordAdminSuccess: result.message };
		} catch (cause) {
			return fail(400, { discordAdminError: cause instanceof Error ? cause.message : 'Discord synchronization failed.' });
		}
	},
	syncAll: async ({ locals, platform }) => {
		await requireAdmin(locals, '/admin/discord');
		if (!platform?.env?.DB) return fail(503, { discordAdminError: 'D1 database binding is unavailable.' });
		await backfillDiscordConnectionsFromAuthAccounts(platform.env.DB, 200);
		const rows = await platform.env.DB.prepare('SELECT user_id AS userId FROM discord_connections').all<{ userId: string }>();
		let synced = 0;
		let failed = 0;
		const failureNotes: string[] = [];
		for (const row of rows.results) {
			try {
				const result = await syncDiscordRoles(platform.env.DB, row.userId);
				if (result.status === 'synced') synced += 1;
				else {
					failed += 1;
					failureNotes.push(`${row.userId}: ${result.status} — ${result.message}`);
				}
			} catch (cause) {
				failed += 1;
				const message = cause instanceof Error ? cause.message : 'Discord synchronization failed.';
				failureNotes.push(`${row.userId}: error — ${message}`);
				console.error(`Discord bulk sync failed for ${row.userId}`, cause);
			}
		}
		const preview =
			failureNotes.length > 0
				? ` First issues: ${failureNotes.slice(0, 3).join(' | ')}`
				: '';
		return {
			discordAdminSuccess: `Discord synchronization complete: ${synced} synced${failed ? `, ${failed} need attention` : ''}.${preview}`
		};
	},
	backfillAuthDiscord: async ({ locals, platform }) => {
		await requireAdmin(locals, '/admin/discord');
		if (!platform?.env?.DB) return fail(503, { discordAdminError: 'D1 database binding is unavailable.' });
		const result = await backfillDiscordConnectionsFromAuthAccounts(platform.env.DB, 100);
		return {
			discordAdminSuccess: `Backfill processed ${result.processed} Discord sign-in accounts: ${result.linked} newly linked, ${result.synced} synchronized, ${result.failed} failed.`
		};
	}
};
