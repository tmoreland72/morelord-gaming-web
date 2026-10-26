<script lang="ts">
	import { onMount, tick } from 'svelte';
	import {
		sharePageUrl,
		socialShareHref,
		type ShareSource,
		type SocialNetwork
	} from '$lib/share-links';

	let {
		slug,
		title,
		blurb,
		origin,
		turnstileSiteKey = ''
	}: {
		slug: string;
		title: string;
		blurb: string;
		origin: string;
		turnstileSiteKey?: string;
	} = $props();

	let root = $state<HTMLDivElement | null>(null);
	let trigger = $state<HTMLButtonElement | null>(null);
	let menu = $state<HTMLDivElement | null>(null);
	let dialog = $state<HTMLDialogElement | null>(null);
	let turnstileHost = $state<HTMLDivElement | null>(null);
	let statusEl = $state<HTMLElement | null>(null);

	let menuOpen = $state(false);
	let emailOpen = $state(false);
	let copied = $state(false);
	let copyError = $state('');
	let sending = $state(false);
	let recipient = $state('');
	let senderName = $state('');
	let honeypot = $state('');
	let turnstileToken = $state('');
	let errorMessage = $state('');
	let successMessage = $state('');
	let canNativeShare = $state(false);

	const menuId = $derived(`share-menu-${slug}`);
	const dialogTitleId = $derived(`share-dialog-title-${slug}`);
	const emailFieldId = $derived(`share-recipient-${slug}`);
	const nameFieldId = $derived(`share-sender-${slug}`);

	const networks: { id: SocialNetwork; label: string }[] = [
		{ id: 'x', label: 'X' },
		{ id: 'facebook', label: 'Facebook' },
		{ id: 'reddit', label: 'Reddit' },
		{ id: 'bluesky', label: 'Bluesky' }
	];

	onMount(() => {
		canNativeShare = typeof navigator.share === 'function';
	});

	function pageUrl(source: ShareSource): string {
		return sharePageUrl({ origin, slug, source });
	}

	function networkHref(network: SocialNetwork): string {
		return socialShareHref(network, pageUrl(network), title);
	}

	function menuItems(): HTMLElement[] {
		return [...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
	}

	async function openMenu() {
		copied = false;
		copyError = '';
		menuOpen = true;
		await tick();
		menuItems()[0]?.focus();
	}

	function closeMenu(restoreFocus: boolean) {
		menuOpen = false;
		if (restoreFocus) trigger?.focus();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !menuOpen || emailOpen) return;
		event.preventDefault();
		closeMenu(true);
	}

	function onWindowPointerDown(event: PointerEvent) {
		if (!menuOpen) return;
		const target = event.target;
		if (!(target instanceof Node) || root?.contains(target)) return;
		closeMenu(false);
	}

	function onMenuKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			closeMenu(true);
			return;
		}
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
		const items = menuItems();
		if (items.length === 0) return;
		event.preventDefault();
		const current = items.indexOf(document.activeElement as HTMLElement);
		let next = 0;
		if (event.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % items.length;
		else if (event.key === 'ArrowUp') next = current <= 0 ? items.length - 1 : current - 1;
		else if (event.key === 'End') next = items.length - 1;
		items[next]?.focus();
	}

	async function openEmail() {
		menuOpen = false;
		errorMessage = '';
		successMessage = '';
		turnstileToken = '';
		emailOpen = true;
		await tick();
		if (dialog && !dialog.open) dialog.showModal();
		dialog?.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
		void mountTurnstile();
	}

	function closeEmail() {
		if (dialog?.open) dialog.close();
		else onDialogClose();
	}

	function onDialogClose() {
		emailOpen = false;
		trigger?.focus();
	}

	function onDialogClick(event: MouseEvent) {
		if (event.target === dialog) closeEmail();
	}

	async function mountTurnstile() {
		if (!turnstileSiteKey || !turnstileHost) return;
		try {
			await loadTurnstile();
			const turnstile = turnstileApi();
			if (!turnstileHost || !turnstile) return;
			turnstile.render(turnstileHost, {
				sitekey: turnstileSiteKey,
				callback: (token: string) => {
					turnstileToken = token;
				}
			});
		} catch {
			errorMessage = 'The spam check could not be loaded. Please try again.';
		}
	}

	async function copyLink() {
		copyError = '';
		try {
			await navigator.clipboard.writeText(pageUrl('copy_link'));
			copied = true;
			window.setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			copied = false;
			copyError = 'Could not copy the link.';
		}
	}

	async function nativeShare() {
		copyError = '';
		try {
			await navigator.share({ title, text: blurb, url: pageUrl('native_share') });
			closeMenu(true);
		} catch (cause) {
			if (cause instanceof DOMException && cause.name === 'AbortError') return;
			copyError = 'Could not open the share sheet.';
		}
	}

	async function submitEmail(event: SubmitEvent) {
		event.preventDefault();
		if (sending) return;
		errorMessage = '';
		successMessage = '';
		if (turnstileSiteKey && !turnstileToken) {
			errorMessage = 'Complete the spam check, then try again.';
			return;
		}
		sending = true;
		try {
			const response = await fetch('/api/tools/share', {
				method: 'POST',
				headers: { 'content-type': 'application/json', accept: 'application/json' },
				body: JSON.stringify({
					slug,
					email: recipient,
					senderName,
					company: honeypot,
					turnstileToken
				})
			});
			const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
			if (!response.ok) {
				errorMessage =
					typeof payload.error === 'string' ? payload.error : 'The email could not be sent.';
				return;
			}
			successMessage =
				'Email sent. The recipient will get the page title, a short description, and a link.';
			await tick();
			statusEl?.focus();
		} catch {
			errorMessage = 'The email could not be sent. Please try again.';
		} finally {
			sending = false;
		}
	}

	type TurnstileApi = {
		render: (
			el: HTMLElement,
			options: { sitekey: string; callback: (token: string) => void }
		) => string;
	};

	function turnstileApi(): TurnstileApi | undefined {
		return (window as Window & { turnstile?: TurnstileApi }).turnstile;
	}

	function loadTurnstile(): Promise<void> {
		if (turnstileApi()) return Promise.resolve();
		return new Promise((resolve, reject) => {
			const existing = document.querySelector<HTMLScriptElement>('script[data-share-turnstile]');
			if (existing) {
				existing.addEventListener('load', () => resolve(), { once: true });
				existing.addEventListener('error', () => reject(new Error('turnstile')), { once: true });
				return;
			}
			const script = document.createElement('script');
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			script.async = true;
			script.dataset.shareTurnstile = '';
			script.addEventListener('load', () => resolve(), { once: true });
			script.addEventListener('error', () => reject(new Error('turnstile')), { once: true });
			document.head.appendChild(script);
		});
	}
</script>

<svelte:window onkeydown={onWindowKeydown} onpointerdown={onWindowPointerDown} />

<div class="share-page" bind:this={root}>
	<button
		bind:this={trigger}
		class="button"
		type="button"
		aria-expanded={menuOpen}
		aria-haspopup="menu"
		aria-controls={menuId}
		onclick={() => (menuOpen ? closeMenu(false) : openMenu())}
	>
		Share this page
	</button>
	{#if menuOpen}
		<div
			bind:this={menu}
			class="share-menu"
			id={menuId}
			role="menu"
			aria-label="Share this page"
			tabindex="-1"
			onkeydown={onMenuKeydown}
		>
			<button type="button" role="menuitem" onclick={openEmail}>Email</button>
			{#each networks as network (network.id)}
				<a
					role="menuitem"
					href={networkHref(network.id)}
					target="_blank"
					rel="external noreferrer"
					onclick={() => closeMenu(false)}>{network.label}</a
				>
			{/each}
			<button type="button" role="menuitem" onclick={copyLink}>
				{copied ? 'Copied' : 'Copy link'}
			</button>
			{#if canNativeShare}
				<button type="button" role="menuitem" onclick={nativeShare}>Share on this device</button>
			{/if}
			<p class="share-live" aria-live="polite">{copied ? 'Copied' : copyError}</p>
		</div>
	{/if}
</div>

{#if emailOpen}
	<dialog
		bind:this={dialog}
		class="share-dialog"
		aria-labelledby={dialogTitleId}
		onclose={onDialogClose}
		onclick={onDialogClick}
	>
		<div class="share-dialog-card">
			<header class="share-dialog-header">
				<h2 id={dialogTitleId}>Email this page</h2>
				<button type="button" class="share-close" aria-label="Close" onclick={closeEmail}
					>Close</button
				>
			</header>
			{#if successMessage}
				<p class="share-success" role="status" tabindex="-1" bind:this={statusEl}>
					{successMessage}
				</p>
				<button class="button" type="button" onclick={closeEmail}>Done</button>
			{:else}
				<p class="share-intro">
					Send the page title, a short description, and a link. The message comes from Morelord
					Gaming.
				</p>
				{#if errorMessage}
					<p class="form-error" role="alert">{errorMessage}</p>
				{/if}
				<form class="share-form" onsubmit={submitEmail}>
					<label for={emailFieldId}>Recipient email (required)</label>
					<input
						id={emailFieldId}
						name="email"
						type="email"
						autocomplete="email"
						required
						maxlength="254"
						bind:value={recipient}
					/>
					<label for={nameFieldId}>Your name (optional)</label>
					<input
						id={nameFieldId}
						name="senderName"
						type="text"
						autocomplete="name"
						maxlength="80"
						bind:value={senderName}
					/>
					<label class="support-honeypot" aria-hidden="true">
						Company
						<input name="company" tabindex="-1" autocomplete="off" bind:value={honeypot} />
					</label>
					{#if turnstileSiteKey}
						<div class="share-turnstile" bind:this={turnstileHost}></div>
					{/if}
					<div class="share-form-actions">
						<button class="button" type="submit" disabled={sending}>
							{sending ? 'Sending…' : 'Send email'}
						</button>
						<button class="button secondary" type="button" onclick={closeEmail}>Cancel</button>
					</div>
				</form>
			{/if}
		</div>
	</dialog>
{/if}

<style>
	.share-page {
		position: relative;
	}

	.share-menu {
		position: absolute;
		z-index: 5;
		top: calc(100% + 0.45rem);
		left: 0;
		display: grid;
		min-width: 16rem;
		padding: 0.4rem;
		border: 1px solid #e5a62d55;
		border-radius: 12px;
		background: #120d0af8;
		box-shadow: 0 18px 40px #000b;
	}

	.share-menu button,
	.share-menu a {
		display: flex;
		align-items: center;
		min-height: 44px;
		padding: 0.55rem 0.85rem;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: #f6dfae;
		font: inherit;
		font-weight: 750;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
	}

	.share-menu button:hover,
	.share-menu a:hover,
	.share-menu button:focus-visible,
	.share-menu a:focus-visible {
		background: #2a1c12;
		outline: 2px solid #e5a512;
		outline-offset: -2px;
	}

	.share-live {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}

	.share-dialog {
		width: min(28rem, calc(100vw - 1.5rem));
		padding: 0;
		border: 0;
		background: transparent;
	}

	.share-dialog::backdrop {
		background: rgb(7 5 4 / 82%);
	}

	.share-dialog-card {
		padding: 1.3rem 1.3rem 1.2rem;
		border: 1px solid #e5a62d66;
		border-radius: 14px;
		background: #17110d;
		color: #fff8e7;
		box-shadow: 0 24px 70px #000c;
	}

	.share-dialog-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.share-dialog-header h2 {
		margin: 0;
		font-size: 1.8rem;
	}

	.share-close {
		border: 0;
		background: transparent;
		color: #f6dfae;
		font: inherit;
		font-weight: 750;
		cursor: pointer;
	}

	.share-intro {
		margin: 0.8rem 0 1rem;
		color: #d4c8b4;
		line-height: 1.5;
	}

	.share-form {
		display: grid;
		gap: 0.45rem;
	}

	.share-form label {
		color: #f3d58c;
		font-weight: 800;
	}

	.share-form input {
		width: 100%;
		margin-bottom: 0.45rem;
		padding: 0.78rem 0.9rem;
		border: 1px solid #d7a53e55;
		border-radius: 8px;
		background: #100c09;
		color: #fff0ca;
		font: inherit;
	}

	.share-form input:focus {
		border-color: #e5a512;
		outline: none;
		box-shadow: 0 0 0 3px #e5a51233;
	}

	.share-form-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		margin-top: 0.4rem;
	}

	.share-success {
		margin: 1rem 0;
		padding: 0.9rem 1rem;
		border: 1px solid #5d9b6a77;
		border-radius: 8px;
		background: #173120;
		color: #bce3b7;
	}

	.share-turnstile {
		margin: 0.2rem 0 0.4rem;
	}

	@media (max-width: 520px) {
		.share-page {
			width: 100%;
		}

		.share-menu {
			right: 0;
			min-width: 0;
		}
	}
</style>
