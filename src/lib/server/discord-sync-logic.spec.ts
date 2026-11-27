import { describe, expect, it } from 'vitest';
import {
	configuredManagedRoles,
	desiredManagedRoles,
	minimumDiscordRoleSyncReady,
	subscriberDiscordRolesReady
} from '$lib/server/discord-sync-logic';

const settings = {
	roleToolsId: 'tools',
	roleAdventuresId: 'adventures',
	rolePremiumId: 'premium',
	roleChampionId: 'champion'
};

describe('discord-sync-logic', () => {
	it('includes Adventures on every tier', () => {
		expect([...desiredManagedRoles('standard', settings)].sort()).toEqual(['adventures', 'tools']);
		expect([...desiredManagedRoles('premium', settings)].sort()).toEqual([
			'adventures',
			'premium',
			'tools'
		]);
		expect([...desiredManagedRoles('champion', settings)].sort()).toEqual([
			'adventures',
			'champion',
			'premium',
			'tools'
		]);
	});

	it('requires guild, tools, and adventures for minimum sync readiness', () => {
		expect(
			minimumDiscordRoleSyncReady({
				guildId: 'g1',
				roleToolsId: 'tools',
				roleAdventuresId: 'adventures'
			})
		).toBe(true);
		expect(
			minimumDiscordRoleSyncReady({
				guildId: 'g1',
				roleToolsId: 'tools',
				roleAdventuresId: null
			})
		).toBe(false);
	});

	it('lists all configured managed roles for cleanup', () => {
		expect(configuredManagedRoles(settings)).toEqual(['tools', 'adventures', 'premium', 'champion']);
	});

	it('tracks subscriber role configuration separately', () => {
		expect(subscriberDiscordRolesReady(settings)).toBe(true);
		expect(
			subscriberDiscordRolesReady({
				...settings,
				rolePremiumId: null
			})
		).toBe(false);
	});
});