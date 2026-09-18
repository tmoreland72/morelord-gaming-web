import { expect, test } from '@playwright/test';

const publicPages = [
	{ path: '/', heading: 'Better adventures at the table and better tools behind the screen.' },
	{ path: '/adventures', heading: 'Professionally run adventures. Memorable stories.' },
	{ path: '/tools', heading: 'Practical Foundry modules with a generous free edition.' },
	{
		path: '/pricing',
		heading: 'Start free. Upgrade the whole toolkit when it earns its place at your table.'
	},
	{ path: '/releases', heading: 'Every Morelord Tools release in one place.' }
];

for (const publicPage of publicPages) {
	test(`${publicPage.path} renders`, async ({ page }) => {
		const response = await page.goto(publicPage.path);
		expect(response?.ok()).toBeTruthy();
		await expect(page.getByRole('heading', { level: 1, name: publicPage.heading })).toBeVisible();
	});
}

test('health endpoint confirms the local D1 binding', async ({ request }) => {
	const response = await request.get('/api/health');
	expect(response.status()).toBe(200);
	const body = await response.json();
	expect(body.status).toBe('ok');
	expect(body.database).toEqual({ available: true, healthy: true });
});

test('home page and footer link to the configured Discord server', async ({ page }) => {
	await page.goto('/');

	const discordInviteUrl = 'https://discord.gg/B5YKQf579E';
	await expect(
		page.getByRole('main').getByRole('link', { name: 'Join our Discord' })
	).toHaveAttribute('href', discordInviteUrl);
	await expect(
		page.getByRole('contentinfo').getByRole('link', { name: 'Join our Discord' })
	).toHaveAttribute('href', discordInviteUrl);
});

test('release publishing rejects unauthenticated requests', async ({ request }) => {
	const response = await request.post('/api/releases', {
		data: {
			productSlug: 'morelord-marketplace',
			version: '0.3.0',
			title: 'Unauthorized test'
		}
	});
	expect(response.status()).toBe(401);
});

test('unknown tool returns a normal not-found response', async ({ request }) => {
	const response = await request.get('/tools/not-a-real-module');
	expect(response.status()).toBe(404);
});

test('internal documentation is not public', async ({ page }) => {
	await page.goto('/docs/authentication');
	await expect(page).toHaveURL(/\/login/);
	await page.goto('/docs/release-automation');
	await expect(page).toHaveURL(/\/login/);
});

test('authentication status is not public', async ({ request }) => {
	const response = await request.get('/api/system/auth-status');
	expect(response.status()).toBe(404);
	expect(JSON.stringify(await response.json())).not.toContain('SECRET');
});

test('protected administration redirects anonymous visitors to login', async ({ page }) => {
	await page.goto('/admin');
	await expect(page).toHaveURL(/\/login/);
});
