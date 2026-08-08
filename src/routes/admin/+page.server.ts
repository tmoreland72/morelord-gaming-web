import { env } from '$env/dynamic/private';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isAdminEmail } from '$lib/server/admin';
import { getDiscordSettings } from '$lib/server/discord';

function configured(value: string | undefined): boolean {
	return Boolean(value?.trim());
}

async function count(db: D1Database, table: string): Promise<number> {
	const allowed = new Set([
		'products',
		'releases',
		'user',
		'subscriptions',
		'active_entitlements',
		'foundry_installations',
		'discord_connections',
		'webhook_events'
	]);
	if (!allowed.has(table)) throw new Error('Unsupported diagnostics table.');
	const row = await db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).first<{ total: number }>();
	return Number(row?.total ?? 0);
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) redirect(303, '/login?returnTo=/admin');
	if (!isAdminEmail(locals.user.email)) error(403, 'Administrator access required.');
	if (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');

	const db = platform.env.DB;
	const discordSettings = await getDiscordSettings(db);
	const [
		products,
		releases,
		users,
		subscriptions,
		entitlements,
		installations,
		discordConnections,
		webhookEvents,
		latestRelease,
		latestWebhook
	] = await Promise.all([
		count(db, 'products'),
		count(db, 'releases'),
		count(db, 'user'),
		count(db, 'subscriptions'),
		count(db, 'active_entitlements'),
		count(db, 'foundry_installations'),
		count(db, 'discord_connections'),
		count(db, 'webhook_events'),
		db.prepare(`SELECT r.version, r.title, r.published_at AS publishedAt, p.name AS productName
			FROM releases r INNER JOIN products p ON p.id = r.product_id
			ORDER BY r.published_at DESC LIMIT 1`).first<{
			version: string;
			title: string;
			publishedAt: number;
			productName: string;
		}>(),
		db.prepare(`SELECT provider, event_type AS eventType, processed_at AS processedAt
			FROM webhook_events ORDER BY processed_at DESC LIMIT 1`).first<{
			provider: string;
			eventType: string;
			processedAt: number;
		}>()
	]);

	return {
		user: locals.user,
		counts: {
			products,
			releases,
			users,
			subscriptions,
			entitlements,
			installations,
			discordConnections,
			webhookEvents
		},
		latestRelease: latestRelease ?? null,
		latestWebhook: latestWebhook ?? null,
		configuration: {
			authSecret: configured(env.BETTER_AUTH_SECRET),
			googleOAuth: configured(env.GOOGLE_CLIENT_ID) && configured(env.GOOGLE_CLIENT_SECRET),
			githubOAuth: configured(env.GITHUB_CLIENT_ID) && configured(env.GITHUB_CLIENT_SECRET),
			stripe: configured(env.STRIPE_SECRET_KEY) && configured(env.STRIPE_WEBHOOK_SECRET),
			stripePrices:
				configured(env.STRIPE_PRICE_PREMIUM_MONTHLY) &&
				configured(env.STRIPE_PRICE_PREMIUM_ANNUAL) &&
				configured(env.STRIPE_PRICE_CHAMPION_MONTHLY) &&
				configured(env.STRIPE_PRICE_CHAMPION_ANNUAL),
			discordOAuth: configured(env.DISCORD_CLIENT_ID) && configured(env.DISCORD_CLIENT_SECRET),
			discordRoles:
				configured(env.DISCORD_BOT_TOKEN) &&
				Boolean(discordSettings.guildId && discordSettings.roleToolsId && discordSettings.rolePremiumId && discordSettings.roleChampionId),
			releasePublishing: configured(env.RELEASE_PUBLISH_TOKEN),
			adminAccess: configured(env.ADMIN_EMAILS)
		}
	};
};
