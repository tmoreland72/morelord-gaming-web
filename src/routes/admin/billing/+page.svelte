<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const checks = $derived([
		['Stripe secret key', data.configuration.secretKey],
		['Webhook signing secret', data.configuration.webhookSecret],
		['Premium monthly price', data.configuration.premiumMonthly],
		['Premium annual price', data.configuration.premiumAnnual],
		['Champion monthly price', data.configuration.championMonthly],
		['Champion annual price', data.configuration.championAnnual]
	] as const);
</script>
<svelte:head><title>Billing Administration | Morelord Gaming</title><meta name="robots" content="noindex,nofollow" /></svelte:head>
<section class="page-hero compact-hero"><div class="shell"><div class="eyebrow">Morelord administration</div><h1>Stripe billing</h1><p class="lead">Subscription configuration, synchronized memberships and recent webhook activity.</p></div></section>
<section class="section brand-panel-section"><div class="shell admin-dashboard">
	<section class="account-section"><div class="section-heading"><div><div class="eyebrow">Configuration</div><h2>Production readiness</h2></div></div>
		<div class="status-grid">{#each checks as check}<article class="card status-card" class:ready={check[1]}><div class="status-line"><span class="status-dot"></span><strong>{check[0]}</strong><span>{check[1] ? 'Ready' : 'Missing'}</span></div></article>{/each}</div>
		{#if data.stripeError}<div class="error-banner">Stripe API: {data.stripeError}</div>{/if}
	</section>
	<section class="account-section"><div class="section-heading"><div><div class="eyebrow">Customers</div><h2>Recent subscriptions</h2></div><p>Latest 50 synchronized subscription records.</p></div>
		{#if data.subscriptions.length}<div class="installation-list">{#each data.subscriptions as subscription}<article class="card installation-row"><div><span class="tag">{subscription.status}</span><h3>{subscription.name ?? subscription.email ?? 'Unknown customer'}</h3><p>{subscription.plan ?? subscription.priceId ?? 'Plan not identified'}{subscription.cancelAtPeriodEnd ? ' · Cancels at period end' : ''}</p>{#if subscription.currentPeriodEnd}<small>Period ends {new Date(subscription.currentPeriodEnd).toLocaleString()}</small>{/if}</div></article>{/each}</div>{:else}<article class="card empty-state"><h3>No subscriptions synchronized</h3><p>Verified Stripe subscription events will appear here.</p></article>{/if}
	</section>
	<section class="account-section"><div class="section-heading"><div><div class="eyebrow">Events</div><h2>Recent Stripe webhooks</h2></div></div>
		{#if data.webhooks.length}<div class="installation-list">{#each data.webhooks as webhook}<article class="card installation-row"><div><span class="tag">Stripe</span><h3>{webhook.eventType}</h3><small>{new Date(webhook.processedAt).toLocaleString()} · {webhook.id}</small></div></article>{/each}</div>{:else}<article class="card empty-state"><h3>No Stripe webhooks received</h3><p>Complete the webhook setup and send a test event.</p></article>{/if}
	</section>
</div></section>
