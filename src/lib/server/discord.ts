import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { discordConnections } from '$lib/server/db/schema';
import { getBillingSummary } from '$lib/server/billing';

const DISCORD_API = 'https://discord.com/api/v10';

function required(name: string): string {
	const value = env[name];
	if (!value) throw new Error(`${name} is not configured.`);
	return value;
}

export type DiscordProfile = {
	id: string;
	username: string;
	global_name?: string | null;
	avatar?: string | null;
};

export function discordOAuthConfigured(): boolean {
	return Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.DISCORD_REDIRECT_URI);
}

export function discordRoleSyncConfigured(): boolean {
	return Boolean(env.DISCORD_BOT_TOKEN && env.DISCORD_GUILD_ID);
}

export function getDiscordAuthorizeUrl(state: string): string {
	if (!discordOAuthConfigured()) throw new Error('Discord OAuth is not configured.');
	const url = new URL('https://discord.com/oauth2/authorize');
	url.searchParams.set('client_id', required('DISCORD_CLIENT_ID'));
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('redirect_uri', required('DISCORD_REDIRECT_URI'));
	url.searchParams.set('scope', 'identify');
	url.searchParams.set('state', state);
	url.searchParams.set('prompt', 'consent');
	return url.toString();
}

export async function exchangeDiscordCode(code: string): Promise<string> {
	const body = new URLSearchParams({
		client_id: required('DISCORD_CLIENT_ID'),
		client_secret: required('DISCORD_CLIENT_SECRET'),
		grant_type: 'authorization_code',
		code,
		redirect_uri: required('DISCORD_REDIRECT_URI')
	});
	const response = await fetch(`${DISCORD_API}/oauth2/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!response.ok) throw new Error(`Discord token exchange failed (${response.status}).`);
	const payload = (await response.json()) as { access_token?: string };
	if (!payload.access_token) throw new Error('Discord did not return an access token.');
	return payload.access_token;
}

export async function fetchDiscordProfile(accessToken: string): Promise<DiscordProfile> {
	const response = await fetch(`${DISCORD_API}/users/@me`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!response.ok) throw new Error(`Discord profile request failed (${response.status}).`);
	return (await response.json()) as DiscordProfile;
}

export async function saveDiscordConnection(d1: D1Database, userId: string, profile: DiscordProfile) {
	const db = getDb(d1);
	const now = new Date();
	await db
		.insert(discordConnections)
		.values({
			userId,
			discordUserId: profile.id,
			username: profile.username,
			globalName: profile.global_name ?? null,
			avatar: profile.avatar ?? null,
			roleSyncStatus: 'pending',
			roleSyncMessage: 'Discord connected. Role synchronization has not run yet.',
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: discordConnections.userId,
			set: {
				discordUserId: profile.id,
				username: profile.username,
				globalName: profile.global_name ?? null,
				avatar: profile.avatar ?? null,
				updatedAt: now
			}
		});
}

export async function getDiscordConnection(d1: D1Database, userId: string) {
	return getDb(d1).query.discordConnections.findFirst({
		where: eq(discordConnections.userId, userId)
	});
}

export async function disconnectDiscord(d1: D1Database, userId: string) {
	await getDb(d1).delete(discordConnections).where(eq(discordConnections.userId, userId));
}

function desiredManagedRoles(plan: string | null | undefined): Set<string> {
	const roles = new Set<string>();
	if (env.DISCORD_ROLE_COMMUNITY) roles.add(env.DISCORD_ROLE_COMMUNITY);
	if (plan?.startsWith('premium') && env.DISCORD_ROLE_PREMIUM) roles.add(env.DISCORD_ROLE_PREMIUM);
	if (plan?.startsWith('champion')) {
		if (env.DISCORD_ROLE_PREMIUM) roles.add(env.DISCORD_ROLE_PREMIUM);
		if (env.DISCORD_ROLE_CHAMPION) roles.add(env.DISCORD_ROLE_CHAMPION);
	}
	return roles;
}

function configuredManagedRoles(): string[] {
	return [env.DISCORD_ROLE_COMMUNITY, env.DISCORD_ROLE_PREMIUM, env.DISCORD_ROLE_CHAMPION].filter(
		(value): value is string => Boolean(value)
	);
}

async function setRole(discordUserId: string, roleId: string, add: boolean): Promise<void> {
	const response = await fetch(
		`${DISCORD_API}/guilds/${required('DISCORD_GUILD_ID')}/members/${discordUserId}/roles/${roleId}`,
		{
			method: add ? 'PUT' : 'DELETE',
			headers: {
				Authorization: `Bot ${required('DISCORD_BOT_TOKEN')}`,
				'X-Audit-Log-Reason': 'Morelord Tools membership synchronization'
			}
		}
	);
	if (!response.ok && response.status !== 204) {
		throw new Error(`Discord role update failed (${response.status}).`);
	}
}

export async function syncDiscordRoles(d1: D1Database, userId: string) {
	const connection = await getDiscordConnection(d1, userId);
	if (!connection) throw new Error('Connect Discord before synchronizing roles.');
	if (!discordRoleSyncConfigured()) {
		return updateSyncStatus(d1, userId, 'not_configured', 'Discord is connected, but automatic role synchronization is not configured yet.');
	}

	const memberResponse = await fetch(
		`${DISCORD_API}/guilds/${required('DISCORD_GUILD_ID')}/members/${connection.discordUserId}`,
		{ headers: { Authorization: `Bot ${required('DISCORD_BOT_TOKEN')}` } }
	);
	if (memberResponse.status === 404) {
		const inviteMessage = env.DISCORD_INVITE_URL
			? `Join the Morelord Gaming Discord, then synchronize again: ${env.DISCORD_INVITE_URL}`
			: 'Join the Morelord Gaming Discord, then synchronize again.';
		return updateSyncStatus(d1, userId, 'not_in_server', inviteMessage);
	}
	if (!memberResponse.ok) {
		return updateSyncStatus(d1, userId, 'error', `Discord member lookup failed (${memberResponse.status}).`);
	}

	const member = (await memberResponse.json()) as { roles?: string[] };
	const current = new Set(member.roles ?? []);
	const billing = await getBillingSummary(d1, userId);
	const desired = desiredManagedRoles(billing.subscription?.plan);

	for (const roleId of configuredManagedRoles()) {
		if (desired.has(roleId) && !current.has(roleId)) await setRole(connection.discordUserId, roleId, true);
		if (!desired.has(roleId) && current.has(roleId)) await setRole(connection.discordUserId, roleId, false);
	}

	const label = billing.subscription?.plan?.startsWith('champion')
		? 'Champion'
		: billing.subscription?.plan?.startsWith('premium')
			? 'Premium'
			: 'Community';
	return updateSyncStatus(d1, userId, 'synced', `${label} Discord roles are synchronized.`);
}

async function updateSyncStatus(d1: D1Database, userId: string, status: string, message: string) {
	const db = getDb(d1);
	const now = new Date();
	await db
		.update(discordConnections)
		.set({ roleSyncStatus: status, roleSyncMessage: message, lastSyncedAt: now, updatedAt: now })
		.where(eq(discordConnections.userId, userId));
	return { status, message, lastSyncedAt: now };
}
