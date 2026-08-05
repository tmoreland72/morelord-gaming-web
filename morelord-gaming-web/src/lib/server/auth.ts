import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getDb } from '$lib/server/db';

export type AuthProviderName = 'google' | 'github';

export function configuredAuthProviders(): Record<AuthProviderName, boolean> {
	return {
		google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
		github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)
	};
}

function socialProviders() {
	const providers: Record<string, { clientId: string; clientSecret: string }> = {};
	const configured = configuredAuthProviders();

	if (configured.github) {
		providers.github = {
			clientId: env.GITHUB_CLIENT_ID!,
			clientSecret: env.GITHUB_CLIENT_SECRET!
		};
	}

	if (configured.google) {
		providers.google = {
			clientId: env.GOOGLE_CLIENT_ID!,
			clientSecret: env.GOOGLE_CLIENT_SECRET!
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
		account: {
			accountLinking: {
				enabled: true,
				trustedProviders: ['google', 'github']
			}
		},
		plugins: [sveltekitCookies(getRequestEvent)]
	});
};

/** CLI-only instance used by Better Auth schema generation. */
export const auth = createAuth(null!, env.ORIGIN);
