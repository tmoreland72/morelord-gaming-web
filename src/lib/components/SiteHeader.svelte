<script lang="ts">
	import { page } from '$app/state';

	const links = [
		{ href: '/', label: 'Home' },
		{ href: '/adventures', label: 'Adventures' },
		{ href: '/tools', label: 'Tools' },
		{ href: '/pricing', label: 'Pricing' },
		{ href: '/releases', label: 'Releases' }
	];
</script>

<header class="site-header">
	<div class="shell header-inner">
		<a class="brand" href="/" aria-label="Morelord Gaming home">
			<span class="brand-mark">M</span>
			<span>
				<strong>Morelord Gaming</strong>
				<small>Adventures &amp; Foundry Tools</small>
			</span>
		</a>

		<nav aria-label="Primary navigation">
			{#each links as link}
				<a class:active={page.url.pathname === link.href} href={link.href}>{link.label}</a>
			{/each}
			<a class="account-link" href="/account">Account</a>
		</nav>
	</div>
</header>
