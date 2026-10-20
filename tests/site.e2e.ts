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

test('footer links to the Morelord Gaming Etsy shop', async ({ page }) => {
	await page.goto('/');
	const etsy = page.getByRole('contentinfo').getByRole('link', { name: 'Shop on Etsy' });
	await expect(etsy).toHaveAttribute('href', 'https://www.etsy.com/shop/MorelordGaming');
	await expect(etsy).toHaveAttribute('target', '_blank');
	await expect(etsy).toHaveAttribute('rel', 'external noreferrer');
});

test('footer links to the Morelord Gaming Facebook page', async ({ page }) => {
	await page.goto('/');
	const facebook = page
		.getByRole('contentinfo')
		.getByRole('link', { name: 'Follow us on Facebook' });
	await expect(facebook).toHaveAttribute(
		'href',
		'https://www.facebook.com/profile.php?id=61595274225719'
	);
	await expect(facebook).toHaveAttribute('target', '_blank');
	await expect(facebook).toHaveAttribute('rel', 'external noreferrer');
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

const productLandings: Array<{
	path: string;
	headline: string;
	video: string | null;
	campaign?: boolean;
	premium: boolean;
	standard?: boolean;
	champion?: boolean;
}> = [
	{
		path: '/tools/morelord-character-export',
		headline: 'View and share your Foundry characters anywhere.',
		video: 'FkbDyflfSpU',
		premium: false
	},
	{
		path: '/tools/morelord-journeys',
		headline: "Camp, keep watch and rest, even when the party isn't traveling.",
		video: 'wuTtNGgRsxc',
		campaign: true,
		premium: false
	},
	{
		path: '/tools/morelord-marketplace',
		headline: 'Let the party shop, sell, and trade during the session.',
		video: 'jLHKF39rGjM',
		campaign: true,
		premium: true
	},
	{
		path: '/tools/morelord-downtime',
		headline: 'Give the party projects between adventures.',
		video: 'kubQ5qZ6B0I',
		premium: true,
		standard: false
	},
	{
		path: '/tools/morelord-core',
		headline: 'Connect your Foundry world to Morelord once.',
		video: '2advzIa3o9Q',
		premium: false
	},
	{
		path: '/tools/morelord-craftworks',
		headline: 'Turn what the party finds into what they can make.',
		video: 'qmcmKaunt40',
		campaign: true,
		premium: true,
		champion: true
	},
	{
		path: '/tools/morelord-encounters',
		headline: 'Build a ready-to-run encounter from monsters you already have.',
		video: 'xADXldd1oRE',
		campaign: true,
		premium: true
	}
];

for (const product of productLandings) {
	test(`${product.path} is an audience landing page`, async ({ page }) => {
		const response = await page.goto(product.path);
		expect(response?.ok()).toBeTruthy();
		const headline = page.getByRole('heading', { level: 1, name: product.headline });
		await expect(headline).toBeVisible();
		const signup = page.getByRole('link', { name: 'Create your free account' });
		await expect(signup).toBeVisible();
		await expect(signup).toHaveAttribute(
			'href',
			`/login?returnTo=${encodeURIComponent(product.path)}`
		);
		await expect(page.getByRole('link', { name: 'Unlock premium features' })).toHaveCount(0);
		await expect(page.getByText('paste this manifest URL')).toHaveCount(0);
		await expect(page.getByText("Install it from Foundry's module browser.")).toBeVisible();
		const install = page.getByRole('heading', { name: 'Add the module' });
		const headlineBox = await headline.boundingBox();
		const installBox = await install.boundingBox();
		expect(headlineBox && installBox && installBox.y > headlineBox.y).toBeTruthy();
		if (product.video) {
			await expect(page.locator(`iframe[src*="${product.video}"]`)).toBeVisible();
		}
		const campaignCaption = page.getByText('See it in a full campaign: Road to Phandalin');
		if (product.campaign) {
			const campaignVideo = page.locator(
				'iframe[title="See it in a full campaign: Road to Phandalin"]'
			);
			await expect(campaignVideo).toBeVisible();
			await expect(campaignCaption).toBeVisible();
			const featureHeading = page.getByRole('heading', { name: /features$/ }).first();
			const featureBox = await featureHeading.boundingBox();
			const campaignBox = await campaignVideo.boundingBox();
			expect(featureBox && campaignBox && campaignBox.y > featureBox.y).toBeTruthy();
		} else {
			await expect(campaignCaption).toHaveCount(0);
		}
		const premium = page.getByRole('heading', { name: 'Premium features' });
		if (product.premium) await expect(premium).toBeVisible();
		else await expect(premium).toHaveCount(0);
		if (product.standard === false) {
			await expect(page.getByRole('heading', { name: 'Standard features' })).toHaveCount(0);
		}
		if (product.champion) {
			await expect(page.getByRole('heading', { name: 'Champion features' })).toBeVisible();
		}
	});
}

test('release cards render markdown and omit internal dev notes', async ({ page }) => {
	await page.goto('/tools/morelord-journeys');
	await expect(page.locator('.release-copy strong', { hasText: 'Save Journey' })).toBeVisible();
	await expect(page.getByText('**Save Journey**')).toHaveCount(0);

	await page.goto('/tools/morelord-character-export');
	await expect(page.getByText(/\/tmp\//)).toHaveCount(0);
	await expect(page.locator('.release-copy code', { hasText: 'release-notes/' })).toBeVisible();

	await page.goto('/releases');
	await expect(page.getByText(/\/tmp\//)).toHaveCount(0);
	await expect(page.getByText(/release staging/i)).toHaveCount(0);
});
