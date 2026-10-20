import { describe, expect, it } from 'vitest';
import { ACTIVATION_MINUTES } from '$lib/server/foundry';
import { actions, load } from './+page.server';

const activation = '/account?activation=ABCD-2345#foundry-activation';

describe('account activation return path', () => {
	it('exposes a validated code and the full return path while logged out', async () => {
		const data = await load({
			locals: {},
			url: new URL('http://localhost/account?activation=abcd-2345')
		} as unknown as Parameters<typeof load>[0]);
		if (!data) throw new Error('Account load returned no data');
		expect(data.activationCode).toBe('ABCD-2345');
		expect(data.activationExpiresMinutes).toBe(ACTIVATION_MINUTES);
		expect(data.accountReturnTo).toBe(activation);
		expect(data.user).toBeNull();
	});

	it('does not echo an activation value that fails the code format', async () => {
		const data = await load({
			locals: {},
			url: new URL('http://localhost/account?activation=%3Cimg%20src=x%20onerror=alert(1)%3E')
		} as unknown as Parameters<typeof load>[0]);
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
