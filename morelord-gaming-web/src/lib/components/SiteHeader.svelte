<script lang="ts">
	import { page } from '$app/state';

	const links = [
		{ href: '/adventures', label: 'Adventures' },
		{ href: '/tools', label: 'Tools' },
		{ href: '/pricing', label: 'Memberships' },
		{ href: '/releases', label: 'Releases' },
		{ href: '/docs/authentication', label: 'Docs' }
	];

	let menuOpen = $state(false);

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<header class="site-header">
	<div class="shell header-inner">
		<a class="brand" href="/" aria-label="Morelord Gaming home" onclick={() => (menuOpen = false)}>
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
			{#each links as link}
				<a class:active={isActive(link.href)} href={link.href} onclick={() => (menuOpen = false)}>
					{link.label}
				</a>
			{/each}
			<a class="account-link" class:active={isActive('/account')} href="/account" onclick={() => (menuOpen = false)}>
				Account
			</a>
		</nav>
	</div>
</header>
