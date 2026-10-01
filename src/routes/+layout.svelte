<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';

	let { data, children } = $props();

	// Privacy-light visit beacon: once per full page load (the root layout mounts
	// once; in-app navigations do not re-run this), only in a real, visible browser tab.
	onMount(() => {
		// A function (not a direct check) so TypeScript does not narrow the flag to false.
		const isWebdriver = () => navigator.webdriver === true;
		if (isWebdriver()) return;
		const { pathname, search } = window.location;
		if (/^\/(?:admin|api)(?:\/|$)/.test(pathname)) return;

		let sent = false;
		const send = () => {
			if (sent || isWebdriver()) return;
			sent = true;
			document.removeEventListener('visibilitychange', onVisibilityChange);
			const params = new URLSearchParams(search);
			const body = JSON.stringify({
				path: pathname,
				utm_source: params.get('utm_source') ?? '',
				utm_medium: params.get('utm_medium') ?? '',
				utm_campaign: params.get('utm_campaign') ?? '',
				webdriver: isWebdriver()
			});
			try {
				fetch('/api/visit', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body,
					keepalive: true,
					credentials: 'omit'
				}).catch(() => {});
			} catch {
				// Ignore - visit counting must never affect the page.
			}
		};
		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') send();
		};

		const timer = setTimeout(() => {
			if (document.visibilityState === 'visible') send();
			else document.addEventListener('visibilitychange', onVisibilityChange);
		}, 1000);

		return () => {
			clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<meta name="theme-color" content="#15111d" />
</svelte:head>

<SiteHeader loggedIn={data.loggedIn} />
<main>{@render children()}</main>
<SiteFooter discordInviteUrl={data.discordInviteUrl} />