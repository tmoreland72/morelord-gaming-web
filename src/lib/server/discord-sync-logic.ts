import type { MembershipTier } from '$lib/server/billing';

export type DiscordManagedRoleKey = 'tools' | 'adventures' | 'premium' | 'champion';

export type DiscordRoleSettings = {
	roleToolsId: string | null;
	roleAdventuresId: string | null;
	rolePremiumId: string | null;
	roleChampionId: string | null;
};

/** Roles every linked Standard member should receive (site-managed). */
export function baseManagedRoles(settings: DiscordRoleSettings): string[] {
	return [settings.roleToolsId, settings.roleAdventuresId].filter(
		(value): value is string => Boolean(value)
	);
}

export function desiredManagedRoles(
	tier: MembershipTier,
	settings: DiscordRoleSettings
): Set<string> {
	const roles = new Set(baseManagedRoles(settings));
	if (tier === 'premium' || tier === 'champion') {
		if (settings.rolePremiumId) roles.add(settings.rolePremiumId);
	}
	if (tier === 'champion' && settings.roleChampionId) roles.add(settings.roleChampionId);
	return roles;
}

export function configuredManagedRoles(settings: DiscordRoleSettings): string[] {
	return [
		settings.roleToolsId,
		settings.roleAdventuresId,
		settings.rolePremiumId,
		settings.roleChampionId
	].filter((value): value is string => Boolean(value));
}

export function minimumDiscordRoleSyncReady(settings: {
	guildId: string | null;
	roleToolsId: string | null;
	roleAdventuresId: string | null;
}): boolean {
	return Boolean(settings.guildId && settings.roleToolsId && settings.roleAdventuresId);
}

export function subscriberDiscordRolesReady(settings: DiscordRoleSettings): boolean {
	return Boolean(settings.rolePremiumId && settings.roleChampionId);
}

export const DISCORD_CATCHUP_BATCH_SIZE = 15;
export const DISCORD_CATCHUP_MAX_RETRIES = 3;