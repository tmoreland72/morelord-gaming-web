import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { env } = vi.hoisted(() => ({ env: { BETTER_AUTH_SECRET: '' } as Record<string, string> }));
vi.mock('$env/dynamic/private', () => ({ env }));
vi.mock('$app/server', () => ({ getRequestEvent: () => undefined }));

import { createAuth } from './auth';
import { socialSignInRedirects } from './return-to';

const ORIGIN = 'http://localhost:5173';
const ACTIVATION = '/account?activation=ABCD-2345#foundry-activation';
const SECRET = 'oauth-return-to-test-secret-32chars';

let worker: Miniflare;
let database: D1Database;
const realFetch = globalThis.fetch;

function jwt(payload: Record<string, unknown>) {
	const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
	return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.x`;
}

function mockProviders(discordVerified = true) {
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (url.startsWith('https://oauth2.googleapis.com/token')) {
			return Response.json({
				access_token: 'google-access',
				id_token: jwt({
					sub: 'google-user-1',
					email: 'gm@example.com',
					name: 'Test GM',
					email_verified: true
				}),
				token_type: 'Bearer',
				expires_in: 3600
			});
		}
		if (url.startsWith('https://discord.com/api/oauth2/token')) {
			if (init?.body && String(init.body).includes('code=bad-code')) {
				return Response.json({ error: 'invalid_grant' }, { status: 400 });
			}
			return Response.json({
				access_token: 'discord-access',
				token_type: 'Bearer',
				expires_in: 3600
			});
		}
		if (url.startsWith('https://discord.com/api/users/')) {
			return Response.json({
				id: '99887766',
				username: 'gm',
				global_name: 'Test GM',
				email: 'discord-gm@example.com',
				verified: discordVerified,
				avatar: null,
				discriminator: '0'
			});
		}
		return realFetch(input, init);
	}) as typeof fetch;
}

function storeCookies(response: Response, jar: Map<string, string>) {
	for (const line of response.headers.getSetCookie()) {
		const [pair] = line.split(';');
		const separator = pair.indexOf('=');
		const name = pair.slice(0, separator).trim();
		const value = pair.slice(separator + 1).trim();
		if (!value || /max-age=0/i.test(line)) jar.delete(name);
		else jar.set(name, value);
	}
}

function cookieHeader(jar: Map<string, string>) {
	return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function authRequest(
	auth: ReturnType<typeof createAuth>,
	path: string,
	jar: Map<string, string>,
	init?: { method?: string; body?: unknown }
) {
	const response = await auth.handler(
		new Request(`${ORIGIN}${path}`, {
			method: init?.method ?? 'GET',
			headers: {
				origin: ORIGIN,
				cookie: cookieHeader(jar),
				...(init?.body ? { 'content-type': 'application/json' } : {})
			},
			body: init?.body ? JSON.stringify(init.body) : undefined
		})
	);
	storeCookies(response, jar);
	return response;
}

async function startSignIn(
	auth: ReturnType<typeof createAuth>,
	provider: 'google' | 'discord',
	jar: Map<string, string>,
	redirects = socialSignInRedirects(ORIGIN, ACTIVATION)
) {
	const response = await authRequest(auth, '/api/auth/sign-in/social', jar, {
		method: 'POST',
		body: { provider, disableRedirect: true, ...redirects }
	});
	const payload = (await response.json()) as { url?: string };
	expect(response.status, JSON.stringify(payload)).toBe(200);
	const authorize = new URL(payload.url ?? '');
	if (provider === 'google') expect(authorize.searchParams.get('prompt')).toBe('select_account');
	const state = authorize.searchParams.get('state');
	expect(state).toBeTruthy();
	return { state: state!, redirects };
}

async function userCount(email: string) {
	return (
		await database
			.prepare('SELECT COUNT(*) AS total FROM user WHERE email = ?')
			.bind(email)
			.first<{ total: number }>()
	)?.total;
}

function returnToFrom(location: string) {
	const url = new URL(location, ORIGIN);
	return url.searchParams.get('returnTo');
}

beforeAll(async () => {
	env.BETTER_AUTH_SECRET = SECRET;
	env.GOOGLE_CLIENT_ID = 'google-client';
	env.GOOGLE_CLIENT_SECRET = 'google-secret';
	env.DISCORD_CLIENT_ID = 'discord-client';
	env.DISCORD_CLIENT_SECRET = 'discord-secret';
	worker = new Miniflare({
		modules: true,
		script: 'export default { fetch() { return new Response("ok"); } }',
		compatibilityDate: '2026-08-01',
		d1Databases: ['DB']
	});
	database = (await worker.getD1Database('DB')) as unknown as D1Database;
	for (const statement of readFileSync('migrations/0000_initial.sql', 'utf8').split(';')) {
		if (statement.trim()) await database.prepare(statement).run();
	}
});

beforeEach(() => {
	mockProviders(true);
});

afterAll(async () => {
	globalThis.fetch = realFetch;
	await worker?.dispose();
});

describe.sequential('OAuth callback returnTo', () => {
	it('sends a new Google account to the activation URL, including the hash', async () => {
		const auth = createAuth(database, ORIGIN);
		const jar = new Map<string, string>();
		const redirects = socialSignInRedirects(ORIGIN, ACTIVATION);
		redirects.callbackURL = `${ORIGIN}/account`;
		const { state } = await startSignIn(auth, 'google', jar, redirects);
		const callback = await authRequest(
			auth,
			`/api/auth/callback/google?code=google-code&state=${state}`,
			jar
		);
		expect(callback.status).toBe(302);
		expect(callback.headers.get('location')).toBe(`${ORIGIN}${ACTIVATION}`);
		expect(await userCount('gm@example.com')).toBe(1);
	});

	it('sends a new Discord account to the same activation URL', async () => {
		const auth = createAuth(database, ORIGIN);
		const jar = new Map<string, string>();
		const { state } = await startSignIn(auth, 'discord', jar);
		const callback = await authRequest(
			auth,
			`/api/auth/callback/discord?code=discord-code&state=${state}`,
			jar
		);
		expect(callback.status).toBe(302);
		expect(callback.headers.get('location')).toBe(`${ORIGIN}${ACTIVATION}`);
		expect(await userCount('discord-gm@example.com')).toBe(1);
	});

	it('sends a returning Google account through callbackURL with the activation hash', async () => {
		const auth = createAuth(database, ORIGIN);
		const jar = new Map<string, string>();
		const { state } = await startSignIn(auth, 'google', jar);
		const callback = await authRequest(
			auth,
			`/api/auth/callback/google?code=google-code&state=${state}`,
			jar
		);
		expect(callback.headers.get('location')).toBe(`${ORIGIN}${ACTIVATION}`);
		expect(await userCount('gm@example.com')).toBe(1);
	});

	it('keeps the full returnTo when Google or Discord reports an error', async () => {
		const auth = createAuth(database, ORIGIN);
		for (const provider of ['google', 'discord'] as const) {
			const jar = new Map<string, string>();
			const { state } = await startSignIn(auth, provider, jar);
			const callback = await authRequest(
				auth,
				`/api/auth/callback/${provider}?error=access_denied&state=${state}`,
				jar
			);
			expect(callback.status).toBe(302);
			const location = callback.headers.get('location') ?? '';
			expect(returnToFrom(location)).toBe(ACTIVATION);
			expect(new URL(location, ORIGIN).searchParams.get('error')).toBe('access_denied');
		}
	});

	it('keeps the full returnTo when the provider token exchange fails', async () => {
		const auth = createAuth(database, ORIGIN);
		const jar = new Map<string, string>();
		const { state } = await startSignIn(auth, 'discord', jar);
		const callback = await authRequest(
			auth,
			`/api/auth/callback/discord?code=bad-code&state=${state}`,
			jar
		);
		expect(callback.status).toBe(302);
		expect(returnToFrom(callback.headers.get('location') ?? '')).toBe(ACTIVATION);
		expect(new URL(callback.headers.get('location') ?? '', ORIGIN).searchParams.get('error')).toBe(
			'invalid_code'
		);
	});

	it('rejects a relative callback that includes the hash', async () => {
		const auth = createAuth(database, ORIGIN);
		const response = await authRequest(auth, '/api/auth/sign-in/social', new Map(), {
			method: 'POST',
			body: {
				provider: 'google',
				disableRedirect: true,
				callbackURL: ACTIVATION
			}
		});
		expect(response.status).toBe(403);
	});
});
