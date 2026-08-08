import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { discordConnections, discordSettings, stripeCustomers } from '$lib/server/db/schema';
import { getBillingSummary } from '$lib/server/billing';

const DISCORD_API = 'https://discord.com/api/v10';
const SETTINGS_ID = 'primary';
const MANAGE_ROLES = 1n << 28n;
const ADMINISTRATOR = 1n << 3n;

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

export type DiscordGuildRole = {
	id: string;
	name: string;
	position: number;
	permissions: string;
	managed?: boolean;
};

export type DiscordRuntimeSettings = {
	guildId: string | null;
	roleToolsId: string | null;
	rolePremiumId: string | null;
	roleChampionId: string | null;
	inviteUrl: string | null;
	announcementsChannelId: string | null;
};

export type DiscordConfigurationCheck = {
	configured: boolean;
	botReachable: boolean;
	guildReachable: boolean;
	botHasManageRoles: boolean;
	guildName: string | null;
	botUsername: string | null;
	botHighestRolePosition: number | null;
	roles: DiscordGuildRole[];
	managedRoles: Array<{
		key: 'tools' | 'premium' | 'champion';
		roleId: string | null;
		name: string | null;
		position: number | null;
		manageable: boolean;
	}>;
	errors: string[];
};

export function discordOAuthConfigured(): boolean {
	return Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && discordRedirectUri());
}

export function discordRedirectUri(): string {
	return (env.DISCORD_REDIRECT_URI || (env.ORIGIN ? `${env.ORIGIN.replace(/\/$/, '')}/api/discord/callback` : '')).trim();
}

export function getDiscordAuthorizeUrl(state: string): string {
	if (!discordOAuthConfigured()) throw new Error('Discord OAuth is not configured.');
	const url = new URL('https://discord.com/oauth2/authorize');
	url.searchParams.set('client_id', required('DISCORD_CLIENT_ID'));
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('redirect_uri', discordRedirectUri());
	url.searchParams.set('scope', 'identify');
	url.searchParams.set('state', state);
	url.searchParams.set('prompt', 'consent');
	return url.toString();
}

export function getDiscordBotInstallUrl(): string | null {
	if (!env.DISCORD_CLIENT_ID) return null;
	const url = new URL('https://discord.com/oauth2/authorize');
	url.searchParams.set('client_id', env.DISCORD_CLIENT_ID);
	url.searchParams.set('scope', 'bot');
	url.searchParams.set('permissions', MANAGE_ROLES.toString());
	return url.toString();
}

export async function exchangeDiscordCode(code: string): Promise<string> {
	const body = new URLSearchParams({
		client_id: required('DISCORD_CLIENT_ID'),
		client_secret: required('DISCORD_CLIENT_SECRET'),
		grant_type: 'authorization_code',
		code,
		redirect_uri: discordRedirectUri()
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
	const existingDiscord = await db.query.discordConnections.findFirst({
		where: eq(discordConnections.discordUserId, profile.id)
	});
	if (existingDiscord && existingDiscord.userId !== userId) {
		throw new Error('That Discord account is already linked to another Morelord Gaming account.');
	}

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
				roleSyncStatus: 'pending',
				roleSyncMessage: 'Discord identity updated. Role synchronization is pending.',
				updatedAt: now
			}
		});
}

export async function getDiscordConnection(d1: D1Database, userId: string) {
	return getDb(d1).query.discordConnections.findFirst({
		where: eq(discordConnections.userId, userId)
	});
}

export async function getDiscordSettings(d1: D1Database): Promise<DiscordRuntimeSettings> {
	const db = getDb(d1);
	const row = await db.query.discordSettings.findFirst({ where: eq(discordSettings.id, SETTINGS_ID) });
	return {
		guildId: row?.guildId ?? env.DISCORD_GUILD_ID ?? null,
		roleToolsId: row?.roleToolsId ?? env.DISCORD_ROLE_TOOLS ?? env.DISCORD_ROLE_COMMUNITY ?? null,
		rolePremiumId: row?.rolePremiumId ?? env.DISCORD_ROLE_PREMIUM ?? null,
		roleChampionId: row?.roleChampionId ?? env.DISCORD_ROLE_CHAMPION ?? null,
		inviteUrl: row?.inviteUrl ?? env.DISCORD_INVITE_URL ?? null,
		announcementsChannelId: row?.announcementsChannelId ?? null
	};
}

export async function saveDiscordSettings(d1: D1Database, values: DiscordRuntimeSettings) {
	const db = getDb(d1);
	const now = new Date();
	await db
		.insert(discordSettings)
		.values({ id: SETTINGS_ID, ...values, createdAt: now, updatedAt: now })
		.onConflictDoUpdate({
			target: discordSettings.id,
			set: { ...values, updatedAt: now }
		});
}

export async function discordRoleSyncConfigured(d1: D1Database): Promise<boolean> {
	if (!env.DISCORD_BOT_TOKEN) return false;
	const settings = await getDiscordSettings(d1);
	return Boolean(settings.guildId && settings.roleToolsId && settings.rolePremiumId && settings.roleChampionId);
}

function desiredManagedRoles(plan: string | null | undefined, settings: DiscordRuntimeSettings): Set<string> {
	const roles = new Set<string>();
	if (settings.roleToolsId) roles.add(settings.roleToolsId);
	if (plan?.startsWith('premium') && settings.rolePremiumId) roles.add(settings.rolePremiumId);
	if (plan?.startsWith('champion')) {
		if (settings.rolePremiumId) roles.add(settings.rolePremiumId);
		if (settings.roleChampionId) roles.add(settings.roleChampionId);
	}
	return roles;
}

function configuredManagedRoles(settings: DiscordRuntimeSettings): string[] {
	return [settings.roleToolsId, settings.rolePremiumId, settings.roleChampionId].filter(
		(value): value is string => Boolean(value)
	);
}

async function discordFetch(path: string, init: RequestInit = {}): Promise<Response> {
	return fetch(`${DISCORD_API}${path}`, {
		...init,
		headers: {
			Authorization: `Bot ${required('DISCORD_BOT_TOKEN')}`,
			...(init.headers ?? {})
		}
	});
}

async function setRole(guildId: string, discordUserId: string, roleId: string, add: boolean): Promise<void> {
	const response = await discordFetch(`/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
		method: add ? 'PUT' : 'DELETE',
		headers: { 'X-Audit-Log-Reason': 'Morelord Tools membership synchronization' }
	});
	if (!response.ok && response.status !== 204) {
		let detail = '';
		try { detail = `: ${JSON.stringify(await response.json())}`; } catch { /* ignore */ }
		throw new Error(`Discord role update failed (${response.status})${detail}`);
	}
}

export async function syncDiscordRoles(d1: D1Database, userId: string) {
	const connection = await getDiscordConnection(d1, userId);
	if (!connection) throw new Error('Connect Discord before synchronizing roles.');
	const settings = await getDiscordSettings(d1);
	if (!(await discordRoleSyncConfigured(d1))) {
		return updateSyncStatus(d1, userId, 'not_configured', 'Discord is connected, but automatic Tools role synchronization is not fully configured yet.');
	}

	const memberResponse = await discordFetch(`/guilds/${settings.guildId}/members/${connection.discordUserId}`);
	if (memberResponse.status === 404) {
		const inviteMessage = settings.inviteUrl
			? `Join the Morelord Gaming Discord, then synchronize again: ${settings.inviteUrl}`
			: 'Join the Morelord Gaming Discord, then synchronize again.';
		return updateSyncStatus(d1, userId, 'not_in_server', inviteMessage);
	}
	if (!memberResponse.ok) {
		return updateSyncStatus(d1, userId, 'error', `Discord member lookup failed (${memberResponse.status}).`);
	}

	const member = (await memberResponse.json()) as { roles?: string[] };
	const current = new Set(member.roles ?? []);
	const billing = await getBillingSummary(d1, userId);
	const desired = desiredManagedRoles(billing.subscription?.plan, settings);

	for (const roleId of configuredManagedRoles(settings)) {
		if (desired.has(roleId) && !current.has(roleId)) await setRole(settings.guildId!, connection.discordUserId, roleId, true);
		if (!desired.has(roleId) && current.has(roleId)) await setRole(settings.guildId!, connection.discordUserId, roleId, false);
	}

	const label = billing.subscription?.plan?.startsWith('champion')
		? 'Champion'
		: billing.subscription?.plan?.startsWith('premium')
			? 'Premium'
			: 'Standard';
	return updateSyncStatus(d1, userId, 'synced', `${label} Morelord Tools roles are synchronized.`);
}

export async function syncDiscordRolesForStripeCustomer(d1: D1Database, stripeCustomerId: string) {
	const db = getDb(d1);
	const customer = await db.query.stripeCustomers.findFirst({
		where: eq(stripeCustomers.stripeCustomerId, stripeCustomerId)
	});
	if (!customer) return null;
	const connection = await getDiscordConnection(d1, customer.userId);
	if (!connection) return null;
	return syncDiscordRoles(d1, customer.userId);
}

export async function disconnectDiscord(d1: D1Database, userId: string) {
	const connection = await getDiscordConnection(d1, userId);
	if (connection && env.DISCORD_BOT_TOKEN) {
		try {
			const settings = await getDiscordSettings(d1);
			if (settings.guildId) {
				for (const roleId of configuredManagedRoles(settings)) {
					try { await setRole(settings.guildId, connection.discordUserId, roleId, false); } catch (cause) { console.warn('Could not remove managed Discord role during disconnect.', cause); }
				}
			}
		} catch (cause) {
			console.warn('Discord role cleanup during disconnect failed.', cause);
		}
	}
	await getDb(d1).delete(discordConnections).where(eq(discordConnections.userId, userId));
}

export async function checkDiscordConfiguration(d1: D1Database): Promise<DiscordConfigurationCheck> {
	const settings = await getDiscordSettings(d1);
	const result: DiscordConfigurationCheck = {
		configured: Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.DISCORD_BOT_TOKEN && settings.guildId),
		botReachable: false,
		guildReachable: false,
		botHasManageRoles: false,
		guildName: null,
		botUsername: null,
		botHighestRolePosition: null,
		roles: [],
		managedRoles: [],
		errors: []
	};
	if (!env.DISCORD_BOT_TOKEN) {
		result.errors.push('DISCORD_BOT_TOKEN is not configured.');
		return result;
	}
	if (!settings.guildId) {
		result.errors.push('Discord Guild ID is not configured.');
		return result;
	}

	try {
		const botResponse = await discordFetch('/users/@me');
		if (!botResponse.ok) throw new Error(`Bot identity request failed (${botResponse.status}).`);
		const bot = (await botResponse.json()) as { id: string; username: string };
		result.botReachable = true;
		result.botUsername = bot.username;

		const [guildResponse, rolesResponse, memberResponse] = await Promise.all([
			discordFetch(`/guilds/${settings.guildId}`),
			discordFetch(`/guilds/${settings.guildId}/roles`),
			discordFetch(`/guilds/${settings.guildId}/members/${bot.id}`)
		]);
		if (!guildResponse.ok) throw new Error(`Guild lookup failed (${guildResponse.status}).`);
		if (!rolesResponse.ok) throw new Error(`Guild role lookup failed (${rolesResponse.status}).`);
		if (!memberResponse.ok) throw new Error(`Bot guild membership lookup failed (${memberResponse.status}).`);

		const guild = (await guildResponse.json()) as { name?: string };
		const roles = (await rolesResponse.json()) as DiscordGuildRole[];
		const member = (await memberResponse.json()) as { roles?: string[] };
		result.guildReachable = true;
		result.guildName = guild.name ?? null;
		result.roles = roles.sort((a, b) => b.position - a.position);

		const roleMap = new Map(roles.map((role) => [role.id, role]));
		const botRoles = (member.roles ?? []).map((id) => roleMap.get(id)).filter((role): role is DiscordGuildRole => Boolean(role));
		const guildEveryone = roleMap.get(settings.guildId);
		if (guildEveryone) botRoles.push(guildEveryone);
		result.botHighestRolePosition = botRoles.reduce((max, role) => Math.max(max, role.position), 0);
		const permissions = botRoles.reduce((value, role) => value | BigInt(role.permissions || '0'), 0n);
		result.botHasManageRoles = Boolean((permissions & MANAGE_ROLES) || (permissions & ADMINISTRATOR));

		const selected: Array<['tools' | 'premium' | 'champion', string | null]> = [
			['tools', settings.roleToolsId],
			['premium', settings.rolePremiumId],
			['champion', settings.roleChampionId]
		];
		result.managedRoles = selected.map(([key, roleId]) => {
			const role = roleId ? roleMap.get(roleId) : undefined;
			return {
				key,
				roleId,
				name: role?.name ?? null,
				position: role?.position ?? null,
				manageable: Boolean(role && result.botHasManageRoles && role.position < (result.botHighestRolePosition ?? 0) && !role.managed)
			};
		});
		for (const role of result.managedRoles) {
			if (!role.roleId) result.errors.push(`${role.key} role is not configured.`);
			else if (!role.name) result.errors.push(`Configured ${role.key} role was not found in the server.`);
			else if (!role.manageable) result.errors.push(`The bot role must be above ${role.name} and have Manage Roles permission.`);
		}
		if (!result.botHasManageRoles) result.errors.push('The bot does not have Manage Roles permission.');
	} catch (cause) {
		result.errors.push(cause instanceof Error ? cause.message : 'Discord configuration check failed.');
	}
	return result;
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
