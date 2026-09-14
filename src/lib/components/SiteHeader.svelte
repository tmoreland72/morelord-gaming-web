<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	let { loggedIn = false }: { loggedIn?: boolean } = $props();

	const publicLinks = [
		{ href: '/adventures', label: 'Adventures' },
		{ href: '/tools', label: 'Tools' },
		{ href: '/pricing', label: 'Memberships' }
	] as const;
	const trailingLinks = [
		{ href: '/releases', label: 'Releases' },
		{ href: '/docs', label: 'Docs' }
	] as const;

	let menuOpen = $state(false);

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<header class="site-header">
	<div class="shell header-inner">
		<a
			class="brand"
			href={resolve('/')}
			aria-label="Morelord Gaming home"
			onclick={() => (menuOpen = false)}
		>
			<img src="/branding/morelord-gaming-logo.png" alt="Morelord Gaming" />
		</a>

		<button
			class="menu-toggle"
			type="button"
			aria-label="Toggle navigation"
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span></span><span></span><span></span>
		</button>

		<nav class:open={menuOpen} aria-label="Primary navigation">
			{#each publicLinks as link (link.href)}
				<a
					class:active={isActive(link.href)}
					href={resolve(link.href)}
					onclick={() => (menuOpen = false)}
				>
					{link.label}
				</a>
			{/each}
			{#if loggedIn}
				<a
					class:active={isActive('/characters')}
					href={resolve('/characters')}
					onclick={() => (menuOpen = false)}
				>
					My Characters
				</a>
			{/if}
			{#each trailingLinks as link (link.href)}
				<a
					class:active={isActive(link.href)}
					href={resolve(link.href)}
					onclick={() => (menuOpen = false)}
				>
					{link.label}
				</a>
			{/each}
			<a
				class="account-link"
				class:active={isActive('/account')}
				href={resolve('/account')}
				onclick={() => (menuOpen = false)}
			>
				Account
			</a>
		</nav>
	</div>
</header>
