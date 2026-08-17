import type { LayoutServerLoad } from './$types';

const DEFAULT_DISCORD_INVITE_URL = 'https://discord.gg/B5YKQf579E';

export const load: LayoutServerLoad = ({ locals, platform }) => {
	const runtimeEnv = platform?.env as (Env & { DISCORD_INVITE_URL?: string }) | undefined;

	return {
		loggedIn: Boolean(locals.user),
		discordInviteUrl: runtimeEnv?.DISCORD_INVITE_URL?.trim() || DEFAULT_DISCORD_INVITE_URL
	};
};
