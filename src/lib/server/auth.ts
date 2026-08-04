import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';

function socialProviders() {
	const providers: Record<string, { clientId: string; clientSecret: string }> = {};

	if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
		providers.github = {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET
		};
	}

	if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
		providers.google = {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET
		};
	}

	return providers;
}

const authConfig = {
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	emailAndPassword: { enabled: false },
	socialProviders: socialProviders(),
	plugins: [sveltekitCookies(getRequestEvent)]
} satisfies Omit<Parameters<typeof betterAuth>[0], 'database'>;

export const createAuth = (d1: D1Database) =>
	betterAuth({
		...authConfig,
		database: drizzleAdapter(getDb(d1), { provider: 'sqlite' })
	});

/** CLI-only instance used by Better Auth schema generation. */
export const auth = createAuth(null!);
