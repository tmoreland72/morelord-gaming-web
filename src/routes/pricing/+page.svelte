<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let annual = $state(true);

	function formatPrice(plan: 'premium-monthly' | 'premium-annual' | 'champion-monthly' | 'champion-annual'): string {
		const price = data.prices[plan];
		if (!price || price.unit_amount === null) return 'Price coming soon';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: price.currency.toUpperCase(),
			maximumFractionDigits: price.unit_amount % 100 === 0 ? 0 : 2
		}).format(price.unit_amount / 100);
	}
</script>

<svelte:head><title>Morelord Tools Memberships</title></svelte:head>
<section class="page-hero pricing-hero">
	<div class="shell">
		<div class="eyebrow">Tools memberships</div>
		<h1>Start free. Upgrade the whole toolkit when it earns its place at your table.</h1>
		<p class="lead">Every supported module has a useful free edition. Paid memberships unlock premium software features and enhanced community benefits.</p>
		{#if data.user}
			<div class="current-membership"><span>Current membership</span><strong>{data.membershipLabel}</strong>{#if data.cancelAtPeriodEnd}<small>Cancellation scheduled at period end</small>{:else if data.subscriptionStatus}<small>{data.subscriptionStatus}</small>{/if}</div>
		{/if}
		<div class="billing-toggle" aria-label="Billing frequency">
			<button class:active={!annual} type="button" onclick={() => (annual = false)}>Monthly</button>
			<button class:active={annual} type="button" onclick={() => (annual = true)}>Annual <span>Best value</span></button>
		</div>
	</div>
</section>
<section class="section pricing-section">
	{#if data.checkoutCancelled}<div class="shell setup-note"><strong>Checkout cancelled.</strong> No charge was made.</div>{/if}
	<div class="shell grid-3 pricing-grid">
		<article class="card pricing-card">
			<span class="tag">Community</span><h3>Standard</h3>{#if data.membershipTier === 'standard'}<div class="current-tier-badge">Current membership</div>{/if}<div class="price">Free</div>
			<p class="tier-summary">For every Foundry user.</p>
			<ul class="feature-list"><li>Standard features in supported modules</li><li>Public documentation</li><li>Community support channels</li><li>Stable public releases</li></ul>
			<a class="button secondary full-button" href="/tools">Browse free tools</a>
		</article>
		<article class="card pricing-card highlight">
			<div class="recommended">Recommended</div><span class="tag">Premium</span><h3>Tools Premium</h3>{#if data.membershipTier === 'premium'}<div class="current-tier-badge">Current membership</div>{/if}
			<div class="price">{formatPrice(annual ? 'premium-annual' : 'premium-monthly')} <small>{annual ? 'per year' : 'per month'}</small></div>
			<p class="tier-summary">For GMs who want the complete toolkit.</p>
			<ul class="feature-list"><li>Premium features across supported modules</li><li>Early-access releases</li><li>Premium Discord channels</li><li>Enhanced product support</li></ul>
			{#if data.membershipTier === 'premium' || data.membershipTier === 'champion'}
				<a class="button secondary full-button" href="/account">Manage current membership</a>
			{:else if data.user && data.prices[annual ? 'premium-annual' : 'premium-monthly']}
				<form method="POST" action="/api/billing/checkout"><input type="hidden" name="plan" value={annual ? 'premium-annual' : 'premium-monthly'} /><button class="button full-button" type="submit">Choose Tools Premium</button></form>
			{:else if data.user}<button class="button full-button" type="button" disabled>Subscriptions opening soon</button>
			{:else}<a class="button full-button" href="/login?returnTo=/pricing">Sign in to subscribe</a>{/if}
		</article>
		<article class="card pricing-card">
			<span class="tag">Supporter</span><h3>Tools Champion</h3>{#if data.membershipTier === 'champion'}<div class="current-tier-badge">Current membership</div>{/if}
			<div class="price">{formatPrice(annual ? 'champion-annual' : 'champion-monthly')} <small>{annual ? 'per year' : 'per month'}</small></div>
			<p class="tier-summary">For supporters who want a closer role.</p>
			<ul class="feature-list"><li>Everything in Tools Premium</li><li>Priority support</li><li>Development previews</li><li>Roadmap discussion and voting</li></ul>
			{#if data.membershipTier === 'champion'}
				<a class="button secondary full-button" href="/account">Manage current membership</a>
			{:else if data.user && data.prices[annual ? 'champion-annual' : 'champion-monthly']}
				<form method="POST" action="/api/billing/checkout"><input type="hidden" name="plan" value={annual ? 'champion-annual' : 'champion-monthly'} /><button class="button secondary full-button" type="submit">Choose Tools Champion</button></form>
			{:else if data.user}<button class="button secondary full-button" type="button" disabled>Subscriptions opening soon</button>
			{:else}<a class="button secondary full-button" href="/login?returnTo=/pricing">Sign in to subscribe</a>{/if}
		</article>
	</div>
	{#if !data.billingReady}<div class="shell setup-note"><strong>Founding memberships are not open yet.</strong> Checkout remains disabled until Stripe products, prices, the webhook and production secrets are connected.{#if data.priceError} <span>{data.priceError}</span>{/if}</div>{/if}
</section>
