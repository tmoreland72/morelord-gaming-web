import { page } from 'vitest/browser';
import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Report from './+page.svelte';
import type { PageData } from './$types';
import '../../layout.css';
it('shows unused features and filters them independently from module totals', async () => {
	render(Report, {
		form: null,
		data: {
			date: '2026-09-18',
			modules: [{ module: 'morelord-downtime', worlds: 1, available: 2, actions: 3, errors: 0 }],
			features: [
				{ module: 'morelord-downtime', event: 'dashboard.opened', worlds: 1, count: 3 },
				{ module: 'morelord-downtime', event: 'research.opened', worlds: 0, count: 0 }
			],
			failures: [],
			downloads: [],
			credentials: []
		} as unknown as PageData
	});
	await expect
		.element(page.getByRole('heading', { name: 'Usage and errors', exact: true }))
		.toBeVisible();
	await page.getByRole('combobox', { name: 'Observed activity' }).selectOptions('unused');
	await expect
		.element(page.getByRole('cell', { name: 'research.opened', exact: true }))
		.toBeVisible();
	await expect
		.element(page.getByRole('cell', { name: 'dashboard.opened', exact: true }))
		.not.toBeInTheDocument();
	await page.getByRole('combobox', { name: 'Observed activity' }).selectOptions('used');
	await expect
		.element(page.getByRole('cell', { name: 'dashboard.opened', exact: true }))
		.toBeVisible();
	await expect
		.element(page.getByRole('cell', { name: 'research.opened', exact: true }))
		.not.toBeInTheDocument();
});
