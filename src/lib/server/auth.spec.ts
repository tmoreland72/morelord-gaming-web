import { beforeEach, describe, expect, it, vi } from 'vitest';

const { env } = vi.hoisted(() => ({ env: {} as Record<string, string> }));
vi.mock('$env/dynamic/private', () => ({ env }));
vi.mock('$app/server', () => ({ getRequestEvent: vi.fn() }));
vi.mock('$lib/server/db', () => ({ getDb: vi.fn() }));
vi.mock('better-auth/adapters/drizzle', () => ({ drizzleAdapter: vi.fn() }));
vi.mock('better-auth/svelte-kit', () => ({ sveltekitCookies: () => ({ id: 'test-cookies' }) }));

import { configuredAuthProviders, createAuth } from './auth';

beforeEach(() => {
	for (const key of Object.keys(env)) delete env[key];
});

describe('Discord authentication', () => {
	it('requires both credentials and never exposes GitHub as a provider', () => {
		env.GITHUB_CLIENT_ID = 'legacy';
		env.GITHUB_CLIENT_SECRET = 'legacy';
		env.DISCORD_CLIENT_ID = 'discord-client';
		expect(configuredAuthProviders()).toEqual({ google: false, discord: false });
		env.DISCORD_CLIENT_SECRET = 'discord-secret';
		expect(configuredAuthProviders()).toEqual({ google: false, discord: true });
	});

	it('supports Discord without a bot token and rejects unverified or missing email', async () => {
		env.DISCORD_CLIENT_ID = 'discord-client';
		env.DISCORD_CLIENT_SECRET = 'discord-secret';
		const options = createAuth(null!, 'https://morelordgaming.com').options;
		const discord = options.socialProviders?.discord;
		if (!discord || typeof discord === 'function') throw new Error('Discord provider missing');
		const map = discord.mapProfileToUser!;
		const profile = { email: 'member@example.com', verified: true } as Parameters<typeof map>[0];
		expect(await map(profile)).toEqual({});
		expect(() => map({ ...profile, verified: false })).toThrow('Verify your Discord email');
		expect(() => map({ ...profile, email: '' })).toThrow('Verify your Discord email');
		expect(options.account?.accountLinking?.trustedProviders).not.toContain('discord');
		expect(options.socialProviders).not.toHaveProperty('github');
	});
});
