import { expect, test } from '@playwright/test';

const publicPages = [
	{ path: '/', heading: 'Better adventures at the table and better tools behind the screen.' },
	{ path: '/adventures', heading: 'Professionally run adventures. Memorable stories.' },
	{ path: '/tools', heading: 'Practical Foundry modules for your table.' },
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
	const hero = page.getByRole('region', { name: 'Morelord Gaming', exact: true });
	await expect(hero.getByRole('link', { name: 'Join Our Discord', exact: true })).toHaveAttribute(
		'href',
		discordInviteUrl
	);
	await expect(hero.getByRole('link', { name: 'Watch Our Videos' })).toHaveAttribute(
		'href',
		'https://www.youtube.com/@MorelordGaming'
	);
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

test('Docs opens the module wiki and keeps navigation available in guides', async ({ page }) => {
	await page.goto('/');
	await page
		.getByRole('navigation', { name: 'Primary navigation' })
		.getByRole('link', { name: 'Docs', exact: true })
		.click();
	await expect(page).toHaveURL(/\/docs$/);
	const navigation = page.getByRole('navigation', { name: 'Module documentation' });
	await expect(navigation.locator('summary')).toHaveCount(7);
	await navigation.getByRole('link', { name: 'Morelord Marketplace', exact: true }).click();
	await expect(
		navigation.getByRole('link', { name: 'Morelord Marketplace', exact: true })
	).toHaveAttribute('aria-current', 'page');
	await expect(navigation.locator('.wiki-pages > a').filter({ hasText: /^Overview$/ })).toHaveCount(
		0
	);
	await navigation.getByRole('link', { name: 'Game Master Manual', exact: true }).click();
	await expect(page).toHaveURL(/\/docs\/morelord-marketplace#morelord-marketplace--gm--/);
	await expect(page.locator('[data-doc-part]')).toHaveCount(3);
	const section = navigation.locator('.wiki-sections a').first();
	await expect(section).toBeVisible();
	const href = await section.getAttribute('href');
	await section.click();
	await expect(page).toHaveURL(new RegExp(`${href?.split('#')[1]}$`));
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(navigation).toBeVisible();
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
	).toBeTruthy();
});

test('Craftworks is consolidated and the Downtime disclosure opens its documentation', async ({
	page
}) => {
	await page.goto('/docs/morelord-craftworks');
	await expect(page.locator('[data-doc-part]')).toHaveCount(3);
	const navigation = page.getByRole('navigation', { name: 'Module documentation' });
	await navigation.getByRole('link', { name: 'Game Master Manual', exact: true }).click();
	await expect(page).toHaveURL(/\/docs\/morelord-craftworks#/);
	await expect(
		page.locator('.docs-prose').getByRole('heading', { name: 'Player Manual', exact: true })
	).toBeVisible();
	await navigation
		.locator('summary')
		.filter({ hasText: 'Morelord Downtime' })
		.click({ position: { x: 7, y: 15 } });
	await expect(page).toHaveURL(/\/docs\/morelord-downtime$/);
	await expect(navigation.getByRole('link', { name: 'GM workflow', exact: true })).toBeVisible();
	await expect(
		page.locator('.docs-prose').getByRole('heading', { name: 'Setup', exact: true })
	).toBeVisible();
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
