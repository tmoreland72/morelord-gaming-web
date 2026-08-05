import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeDiscordCode, fetchDiscordProfile, saveDiscordConnection, syncDiscordRoles } from '$lib/server/discord';

export const GET: RequestHandler = async ({ locals, platform, cookies, url }) => {
	if (!locals.user) redirect(303, '/login?returnTo=/account');
	if (!platform?.env?.DB) redirect(303, '/account?discord=database-unavailable');
	const expectedState = cookies.get('discord_oauth_state');
	cookies.delete('discord_oauth_state', { path: '/' });
	const state = url.searchParams.get('state');
	const code = url.searchParams.get('code');
	const denied = url.searchParams.get('error');
	if (denied) redirect(303, '/account?discord=cancelled');
	if (!expectedState || !state || state !== expectedState || !code) redirect(303, '/account?discord=invalid-state');
	let succeeded = false;
	try {
		const token = await exchangeDiscordCode(code);
		const profile = await fetchDiscordProfile(token);
		await saveDiscordConnection(platform.env.DB, locals.user.id, profile);
		await syncDiscordRoles(platform.env.DB, locals.user.id);
		succeeded = true;
	} catch (error) {
		console.error('Discord connection failed', error);
	}
	redirect(303, succeeded ? '/account?discord=connected' : '/account?discord=failed');
};
