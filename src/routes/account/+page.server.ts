import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getBillingSummary } from '$lib/server/billing';
import {
	disconnectDiscord,
	discordOAuthConfigured,
	discordRoleSyncConfigured,
	getDiscordConnection,
	syncDiscordRoles
} from '$lib/server/discord';
import { approveActivation, listUserInstallations, revokeInstallation } from '$lib/server/foundry';
import { isAdminEmail } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	const db = platform?.env?.DB;
	const billing = locals.user && db ? await getBillingSummary(db, locals.user.id) : null;
	const installations = locals.user && db ? await listUserInstallations(db, locals.user.id) : [];
	const discord = locals.user && db ? await getDiscordConnection(db, locals.user.id) : null;
	return {
		user: locals.user ?? null,
		billing,
		installations,
		discord,
		discordOAuthConfigured: discordOAuthConfigured(),
		discordRoleSyncConfigured: discordRoleSyncConfigured(),
		checkoutSuccess: url.searchParams.get('checkout') === 'success',
		discordResult: url.searchParams.get('discord'),
		isAdmin: isAdminEmail(locals.user?.email)
	};
};

export const actions: Actions = {
	approveActivation: async ({ locals, platform, request }) => {
		if (!locals.user) redirect(303, '/login?returnTo=/account');
		if (!platform?.env?.DB) return fail(503, { activationError: 'Database unavailable.' });
		const data = await request.formData();
		const code = String(data.get('code') ?? '').trim();
		if (!code) return fail(400, { activationError: 'Enter the activation code shown in Foundry.', activationCode: code });
		try {
			await approveActivation(platform.env.DB, locals.user.id, code);
			return { activationSuccess: true };
		} catch (error) {
			return fail(400, { activationError: error instanceof Error ? error.message : 'Activation failed.', activationCode: code });
		}
	},
	revokeInstallation: async ({ locals, platform, request }) => {
		if (!locals.user) redirect(303, '/login?returnTo=/account');
		if (!platform?.env?.DB) return fail(503, { revokeError: 'Database unavailable.' });
		const data = await request.formData();
		const installationId = String(data.get('installationId') ?? '');
		if (!installationId) return fail(400, { revokeError: 'Installation ID is required.' });
		await revokeInstallation(platform.env.DB, locals.user.id, installationId);
		return { revokeSuccess: true };
	},
	syncDiscord: async ({ locals, platform }) => {
		if (!locals.user) redirect(303, '/login?returnTo=/account');
		if (!platform?.env?.DB) return fail(503, { discordError: 'Database unavailable.' });
		try {
			const result = await syncDiscordRoles(platform.env.DB, locals.user.id);
			return { discordSyncSuccess: true, discordMessage: result.message };
		} catch (error) {
			return fail(400, { discordError: error instanceof Error ? error.message : 'Discord synchronization failed.' });
		}
	},
	disconnectDiscord: async ({ locals, platform }) => {
		if (!locals.user) redirect(303, '/login?returnTo=/account');
		if (!platform?.env?.DB) return fail(503, { discordError: 'Database unavailable.' });
		await disconnectDiscord(platform.env.DB, locals.user.id);
		return { discordDisconnectSuccess: true };
	},
	signOut: async ({ locals, request }) => {
		await locals.auth.api.signOut({ headers: request.headers });
		redirect(302, '/');
	}
};
