import { describe, expect, it } from 'vitest';
import { ACTIVATION_MINUTES } from '$lib/server/foundry';
import { actions, load } from './+page.server';

const activation = '/account?activation=ABCD-2345#foundry-activation';

function accountLoad(href: string) {
	const headers = new Headers();
	const event = {
		locals: {},
		url: new URL(href),
		setHeaders(values: Record<string, string>) {
			for (const [name, value] of Object.entries(values)) headers.set(name, value);
		}
	} as unknown as Parameters<typeof load>[0];
	return { event, headers };
}

describe('account activation return path', () => {
	it('exposes a validated code and the full return path while logged out', async () => {
		const { event, headers } = accountLoad('http://localhost/account?activation=abcd-2345');
		const data = await load(event);
		if (!data) throw new Error('Account load returned no data');
		expect(data.activationCode).toBe('ABCD-2345');
		expect(data.activationExpiresMinutes).toBe(ACTIVATION_MINUTES);
		expect(data.accountReturnTo).toBe(activation);
		expect(data.user).toBeNull();
		expect(headers.get('cache-control')).toBe('private, no-store');
	});

	it('does not echo an activation value that fails the code format', async () => {
		const data = await load(
			accountLoad('http://localhost/account?activation=%3Cimg%20src=x%20onerror=alert(1)%3E').event
		);
		if (!data) throw new Error('Account load returned no data');
		expect(data.activationCode).toBe('');
		expect(data.accountReturnTo).toBe('/account');
	});

	it.each(['approveActivation', 'revokeInstallation', 'syncDiscord', 'disconnectDiscord'] as const)(
		'%s keeps the activation code when authentication is required',
		async (action) => {
			const url = new URL('http://localhost/account?activation=ABCD-2345');
			await expect(
				actions[action]({
					locals: {},
					url,
					request: new Request(url)
				} as Parameters<(typeof actions)[typeof action]>[0])
			).rejects.toMatchObject({
				status: 303,
				location: `/login?returnTo=${encodeURIComponent(activation)}`
			});
		}
	);
});
