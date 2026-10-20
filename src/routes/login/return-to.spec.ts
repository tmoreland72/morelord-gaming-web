import { beforeEach, describe, expect, it, vi } from 'vitest';

const { env } = vi.hoisted(() => ({ env: {} as Record<string, string> }));
vi.mock('$env/dynamic/private', () => ({ env }));
vi.mock('$app/server', () => ({ getRequestEvent: vi.fn() }));

import { actions, load } from './+page.server';

const activation = '/account?activation=ABCD-2345#foundry-activation';

beforeEach(() => {
	for (const key of Object.keys(env)) delete env[key];
	env.GOOGLE_CLIENT_ID = 'google-client';
	env.GOOGLE_CLIENT_SECRET = 'google-secret';
	env.DISCORD_CLIENT_ID = 'discord-client';
	env.DISCORD_CLIENT_SECRET = 'discord-secret';
});

function loginEvent(returnTo: string, provider: string) {
	const body = new URLSearchParams({ provider, returnTo });
	return {
		url: new URL(`http://localhost:5173/login?returnTo=${encodeURIComponent(returnTo)}`),
		request: new Request('http://localhost:5173/login?/signInSocial', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'http://localhost:5173'
			},
			body
		}),
		locals: {
			user: null,
			auth: {
				api: { signInSocial: vi.fn(async () => ({ url: 'https://provider.test/authorize' })) }
			}
		}
	};
}

describe('login returnTo', () => {
	it('preserves the activation path and rejects an open redirect', () => {
		expect(
			load({
				locals: { user: null },
				url: new URL(`http://localhost:5173/login?returnTo=${encodeURIComponent(activation)}`)
			} as unknown as Parameters<typeof load>[0])
		).toMatchObject({ returnTo: activation });

		expect(
			load({
				locals: { user: null },
				url: new URL('http://localhost:5173/login?returnTo=https://evil.com')
			} as unknown as Parameters<typeof load>[0])
		).toMatchObject({ returnTo: '/account' });
	});

	it.each(['google', 'discord'])(
		'asks %s to return new and existing users, and errors, to the activation path',
		async (provider) => {
			const event = loginEvent(activation, provider);
			await expect(actions.signInSocial(event as never)).rejects.toMatchObject({
				status: 302,
				location: 'https://provider.test/authorize'
			});
			expect(event.locals.auth.api.signInSocial).toHaveBeenCalledWith({
				body: {
					provider,
					disableRedirect: true,
					callbackURL: `http://localhost:5173${activation}`,
					newUserCallbackURL: `http://localhost:5173${activation}`,
					errorCallbackURL: `/login?returnTo=${encodeURIComponent(activation)}`
				}
			});
		}
	);

	it('does not start sign-in toward another origin', async () => {
		const event = loginEvent('https://evil.com/phish', 'google');
		await expect(actions.signInSocial(event as never)).rejects.toMatchObject({ status: 302 });
		expect(event.locals.auth.api.signInSocial).toHaveBeenCalledWith({
			body: expect.objectContaining({
				callbackURL: 'http://localhost:5173/account',
				newUserCallbackURL: 'http://localhost:5173/account',
				errorCallbackURL: '/login?returnTo=%2Faccount'
			})
		});
	});
});
