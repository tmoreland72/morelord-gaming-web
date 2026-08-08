<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const tabs = [
		{ href: '/admin', label: 'Overview', exact: true },
		{ href: '/admin/products', label: 'Products' },
		{ href: '/admin/billing', label: 'Billing' },
		{ href: '/admin/subscription-audit', label: 'Subscription audit' },
		{ href: '/admin/discount-codes', label: 'Friends & Family' },
		{ href: '/admin/discord', label: 'Discord' },
		{ href: '/admin/installations', label: 'Installations' },
		{ href: '/admin/docs', label: 'Admin docs' }
	];

	function active(href: string, exact = false): boolean {
		return exact ? page.url.pathname === href : page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<nav class="admin-tabs-wrap" aria-label="Administration sections">
	<div class="shell admin-tabs">
		{#each tabs as tab}
			<a href={tab.href} class:active={active(tab.href, tab.exact)} aria-current={active(tab.href, tab.exact) ? 'page' : undefined}>
				{tab.label}
			</a>
		{/each}
	</div>
</nav>

{@render children()}
