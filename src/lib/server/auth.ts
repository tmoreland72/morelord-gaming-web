import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { APIError } from 'better-auth/api';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getDb } from '$lib/server/db';

export type AuthProviderName = 'google' | 'discord';

export function configuredAuthProviders(): Record<AuthProviderName, boolean> {
	return {
		google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
		discord: Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET)
	};
}

function socialProviders() {
	const providers: NonNullable<Parameters<typeof betterAuth>[0]>['socialProviders'] = {};
	const configured = configuredAuthProviders();

	if (configured.discord) {
		providers.discord = {
			clientId: env.DISCORD_CLIENT_ID!,
			clientSecret: env.DISCORD_CLIENT_SECRET!,
			// Better Auth defaults Discord to prompt=none so an existing Discord
			// session can sign in without another consent screen. The separate
			// role-link flow sets prompt=consent on its own authorize URL.
			mapProfileToUser(profile) {
				if (!profile.email || !profile.verified) {
					throw new APIError('FORBIDDEN', {
						message: 'Verify your Discord email before signing in.'
					});
				}
				return {};
			}
		};
	}

	if (configured.google) {
		providers.google = {
			clientId: env.GOOGLE_CLIENT_ID!,
			clientSecret: env.GOOGLE_CLIENT_SECRET!,
			// Omitting prompt lets Google reuse the browser's current session.
			// select_account shows the account chooser on every sign-in.
			prompt: 'select_account'
		};
	}

	return providers;
}

function normalizedBaseUrl(baseURL?: string): string {
	return (baseURL || env.ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
}

export const createAuth = (d1: D1Database, baseURL?: string) => {
	const resolvedBaseURL = normalizedBaseUrl(baseURL);

	return betterAuth({
		baseURL: resolvedBaseURL,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(getDb(d1), { provider: 'sqlite' }),
		emailAndPassword: { enabled: false },
		socialProviders: socialProviders(),
		trustedOrigins: [resolvedBaseURL],
		// Vitest skips origin checks unless this is set. Production already checks them.
		advanced: { disableOriginCheck: false },
		account: {
			accountLinking: {
				enabled: true,
				trustedProviders: ['google']
			}
		},
		plugins: [sveltekitCookies(getRequestEvent)]
	});
};

/** CLI-only instance used by Better Auth schema generation. */
export const auth = createAuth(null!, env.ORIGIN);
