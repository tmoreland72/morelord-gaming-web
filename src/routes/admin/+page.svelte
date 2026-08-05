<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const integrations = $derived([
		{ name: 'Authentication secret', ready: data.configuration.authSecret, detail: 'Signs sessions and authentication state.' },
		{ name: 'Google OAuth', ready: data.configuration.googleOAuth, detail: 'Customer sign-in through Google.' },
		{ name: 'GitHub OAuth', ready: data.configuration.githubOAuth, detail: 'Customer sign-in through GitHub.' },
		{ name: 'Stripe API and webhook', ready: data.configuration.stripe, detail: 'Checkout, billing portal and subscription events.' },
		{ name: 'Stripe prices', ready: data.configuration.stripePrices, detail: 'Monthly and annual Premium and Champion prices.' },
		{ name: 'Discord OAuth', ready: data.configuration.discordOAuth, detail: 'Connects a customer’s Discord identity.' },
		{ name: 'Discord role sync', ready: data.configuration.discordRoles, detail: 'Bot and managed subscription roles.' },
		{ name: 'Release publishing', ready: data.configuration.releasePublishing, detail: 'Secures automated product release updates.' },
		{ name: 'Administrator access', ready: data.configuration.adminAccess, detail: 'Restricts this dashboard by email address.' }
	]);

	const readyCount = $derived(integrations.filter((item) => item.ready).length);
</script>

<svelte:head>
	<title>Administration | Morelord Gaming</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord administration</div>
		<h1>System readiness</h1>
		<p class="lead">A private overview of configuration, database activity and connected services.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell admin-dashboard">
		<div class="admin-toolbar">
			<a class="button" href="/admin/products">Manage products</a>
			<a class="button secondary" href="/admin/billing">Billing</a>
			<a class="button secondary" href="/admin/discount-codes">Friends & Family</a>
			<a class="button secondary" href="/admin/docs">Admin docs</a>
		</div>

		<div class="admin-summary card">
			<div>
				<span class="tag">Signed in as administrator</span>
				<h2>{data.user.name}</h2>
				<p>{data.user.email}</p>
			</div>
			<div class="readiness-score">
				<strong>{readyCount}/{integrations.length}</strong>
				<span>services configured</span>
			</div>
		</div>

		<section class="account-section">
			<div class="section-heading">
				<div>
					<div class="eyebrow">Configuration</div>
					<h2>Integration checklist</h2>
				</div>
				<p>This page reports whether required values exist. Secret values are never displayed.</p>
			</div>

			<div class="status-grid">
				{#each integrations as integration}
					<article class="card status-card" class:ready={integration.ready}>
						<div class="status-line">
							<span class="status-dot" aria-hidden="true"></span>
							<strong>{integration.name}</strong>
							<span>{integration.ready ? 'Ready' : 'Setup needed'}</span>
						</div>
						<p>{integration.detail}</p>
					</article>
				{/each}
			</div>
		</section>

		<section class="account-section">
			<div class="section-heading">
				<div>
					<div class="eyebrow">Database</div>
					<h2>Current records</h2>
				</div>
				<p>Counts are read directly from the active D1 database.</p>
			</div>

			<div class="metric-grid">
				<div class="metric-card"><strong>{data.counts.products}</strong><span>Products</span></div>
				<div class="metric-card"><strong>{data.counts.releases}</strong><span>Releases</span></div>
				<div class="metric-card"><strong>{data.counts.users}</strong><span>Users</span></div>
				<div class="metric-card"><strong>{data.counts.subscriptions}</strong><span>Subscriptions</span></div>
				<div class="metric-card"><strong>{data.counts.entitlements}</strong><span>Entitlements</span></div>
				<div class="metric-card"><strong>{data.counts.installations}</strong><span>Foundry installs</span></div>
				<div class="metric-card"><strong>{data.counts.discordConnections}</strong><span>Discord links</span></div>
				<div class="metric-card"><strong>{data.counts.webhookEvents}</strong><span>Webhook events</span></div>
			</div>
		</section>

		<section class="account-section">
			<div class="section-heading">
				<div>
					<div class="eyebrow">Recent activity</div>
					<h2>Latest synchronized records</h2>
				</div>
			</div>

			<div class="grid-2">
				<article class="card">
					<span class="tag">Latest release</span>
					{#if data.latestRelease}
						<h3>{data.latestRelease.productName} {data.latestRelease.version}</h3>
						<p>{data.latestRelease.title}</p>
						<small>{new Date(data.latestRelease.publishedAt).toLocaleString()}</small>
					{:else}
						<h3>No releases found</h3>
						<p>Publish a release through the secure release API to verify this workflow.</p>
					{/if}
				</article>

				<article class="card">
					<span class="tag">Latest webhook</span>
					{#if data.latestWebhook}
						<h3>{data.latestWebhook.provider}</h3>
						<p>{data.latestWebhook.eventType}</p>
						<small>{new Date(data.latestWebhook.processedAt).toLocaleString()}</small>
					{:else}
						<h3>No webhook events found</h3>
						<p>Stripe activity will appear after a verified event is processed.</p>
					{/if}
				</article>
			</div>
		</section>
	</div>
</section>
