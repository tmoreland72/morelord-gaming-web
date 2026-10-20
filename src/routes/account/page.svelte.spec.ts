import { page } from 'vitest/browser';
import { afterEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Account from './+page.svelte';
import type { PageData } from './$types';

afterEach(() => {
	vi.unstubAllGlobals();
});

function accountData(installations: PageData['installations']): PageData {
	return {
		user: { id: 'user-1', name: 'Test GM', email: 'gm@example.com', image: null },
		billing: null,
		installations,
		discord: null,
		discordInviteUrl: null,
		discordOAuthConfigured: false,
		discordRoleSyncConfigured: false,
		checkoutSuccess: false,
		discordResult: null,
		activationCode: '',
		activationExpiresMinutes: 15,
		accountReturnTo: '/account',
		isAdmin: false
	} as PageData;
}

it('shows the stored validation time and not a pre-check-in status', async () => {
	render(Account, {
		form: null,
		data: accountData([
			{
				id: 'pending',
				label: 'Pending installation',
				worldName: 'West Marches',
				foundryVersion: null,
				moduleVersion: null,
				lastValidatedAt: null,
				createdAt: new Date('2020-01-02T00:00:00.000Z'),
				productName: 'Morelord Core',
				productSlug: 'morelord-core'
			},
			{
				id: 'checked',
				label: 'Checked installation',
				worldName: 'Checked',
				foundryVersion: '13.346',
				moduleVersion: '1.2.3',
				lastValidatedAt: new Date('2026-10-20T18:49:48.000Z'),
				createdAt: new Date('2026-10-20T18:49:00.000Z'),
				productName: 'Morelord Core',
				productSlug: 'morelord-core'
			}
		])
	});

	const pending = page.getByRole('article').filter({ hasText: 'Pending installation' });
	const checked = page.getByRole('article').filter({ hasText: 'Checked installation' });
	await expect.element(pending.getByText('Not yet validated')).toBeVisible();
	await expect.element(checked.getByText('Last checked', { exact: false })).toBeVisible();
	await expect.element(checked.getByText('Not yet validated')).not.toBeInTheDocument();
});

it('shows the check-in time after Core stores it', async () => {
	const createdAt = new Date();
	vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
		if (!String(input).includes('/api/account/installations')) {
			return new Response('not found', { status: 404 });
		}
		return new Response(
			JSON.stringify([
				{
					id: 'pending',
					label: 'Pending installation',
					worldName: 'West Marches',
					foundryVersion: null,
					moduleVersion: null,
					lastValidatedAt: '2026-10-20T18:49:48.000Z',
					createdAt: createdAt.toISOString(),
					productName: 'Morelord Core',
					productSlug: 'morelord-core'
				}
			]),
			{ status: 200, headers: { 'content-type': 'application/json' } }
		);
	});

	const view = render(Account, {
		form: null,
		data: accountData([
			{
				id: 'pending',
				label: 'Pending installation',
				worldName: 'West Marches',
				foundryVersion: null,
				moduleVersion: null,
				lastValidatedAt: null,
				createdAt,
				productName: 'Morelord Core',
				productSlug: 'morelord-core'
			}
		])
	});

	await expect.element(page.getByText('Not yet validated')).toBeVisible();
	await expect.element(page.getByText('Last checked', { exact: false })).toBeVisible();
	await expect.element(page.getByText('Not yet validated')).not.toBeInTheDocument();
	view.unmount();
});
