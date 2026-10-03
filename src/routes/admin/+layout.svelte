<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
	const menu = [
		{ label: 'Overview', links: [{ href: '/admin', label: 'Overview' }] },
		{ label: 'Products', links: [{ href: '/admin/products', label: 'Products' }] },
		{
			label: 'Finance',
			links: [
				{ href: '/admin/billing', label: 'Billing' },
				{ href: '/admin/subscription-audit', label: 'Subscriptions' },
				{ href: '/admin/discount-codes', label: 'Promotions' }
			]
		},
		{
			label: 'Statistics',
			links: [
				{ href: '/admin/installations', label: 'Installations' },
				{ href: '/admin/telemetry', label: 'Usage & Errors' }
			]
		},
		{ label: 'Contact Requests', links: [{ href: '/admin/support', label: 'Contact Requests' }] },
		{
			label: 'Setup',
			links: [
				{ href: '/admin/discord', label: 'Discord' },
				{ href: '/admin/test-account', label: 'Test Accounts' }
			]
		},
		{ label: 'Docs', links: [{ href: '/admin/docs', label: 'Docs' }] }
	] as const;
	function active(href: string) {
		return (
			page.url.pathname === href || (href !== '/admin' && page.url.pathname.startsWith(`${href}/`))
		);
	}
</script>

<nav class="admin-tabs-wrap" aria-label="Administration sections">
	<div class="shell admin-tabs">
		{#each menu as group (group.label)}
			{#if group.links.length === 1}
				<a
					href={resolve(group.links[0].href)}
					class:active={active(group.links[0].href)}
					aria-current={active(group.links[0].href) ? 'page' : undefined}>{group.label}</a
				>
			{:else}
				<details>
					<summary class:active={group.links.some((link) => active(link.href))}
						>{group.label}</summary
					>
					<div class="admin-submenu">
						{#each group.links as link (link.href)}
							<a
								href={resolve(link.href)}
								class:active={active(link.href)}
								aria-current={active(link.href) ? 'page' : undefined}
								onclick={(event) => {
									event.currentTarget.closest('details')?.removeAttribute('open');
								}}>{link.label}</a
							>
						{/each}
					</div>
				</details>
			{/if}
		{/each}
	</div>
</nav>
{@render children()}

<style>
	.admin-tabs {
		overflow: visible;
		flex-wrap: wrap;
	}
	details {
		position: relative;
	}
	summary {
		padding: 0.9rem 1rem 0.82rem;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 800;
		color: #aa9d89;
	}
	summary.active {
		color: var(--gold-light);
	}
	.admin-submenu {
		position: absolute;
		top: 100%;
		left: 0;
		z-index: 40;
		display: grid;
		min-width: 190px;
		padding: 0.35rem;
		background: var(--charcoal);
		border: 1px solid #d49b2c40;
		border-radius: 6px;
		box-shadow: 0 8px 24px #0008;
	}
</style>
