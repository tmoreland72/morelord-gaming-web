import { randomBytes } from 'node:crypto';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { discordOAuthConfigured, getDiscordAuthorizeUrl } from '$lib/server/discord';

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	if (!locals.user) redirect(303, `/login?returnTo=${encodeURIComponent('/account')}`);
	if (!discordOAuthConfigured()) redirect(303, '/account?discord=not-configured');
	const state = randomBytes(24).toString('base64url');
	cookies.set('discord_oauth_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 10 * 60
	});
	redirect(302, getDiscordAuthorizeUrl(state));
};
