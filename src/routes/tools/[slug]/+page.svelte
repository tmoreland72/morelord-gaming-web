<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copied = $state(false);

	const standard = $derived(data.features.filter((feature) => feature.tier === 'standard'));
	const premium = $derived(data.features.filter((feature) => feature.tier !== 'standard'));
	const latestRelease = $derived(data.releases[0] ?? null);
	const documentationUrl = $derived(`/docs/${data.product.slug}`);

	async function copyManifest(): Promise<void> {
		if (!data.product.manifestUrl) return;
		await navigator.clipboard.writeText(data.product.manifestUrl);
		copied = true;
		window.setTimeout(() => (copied = false), 1800);
	}
</script>

<svelte:head>
	<title>{data.product.name} | Morelord Tools</title>
	<meta name="description" content={data.product.summary} />
</svelte:head>

<section class="page-hero tools-hero compact-hero">
	<div class="shell product-hero-layout">
		<div>
			<div class="eyebrow">Morelord Tools</div>
			<h1>{data.product.name}</h1>
			<p class="lead">{data.product.summary}</p>
			<div class="actions">
				{#if !data.hasPremiumEntitlement}
					<a class="button" href="/pricing">Unlock premium features</a>
				{/if}
				<a class="button secondary" href={documentationUrl}>Read the guide</a>
			</div>
		</div>
		<img class="product-mascot" src="/branding/morelord-mascot.png" alt="" />
	</div>
</section>

{#if data.product.manifestUrl}
	<section class="section product-install-section">
		<div class="shell product-install-grid">
			<article class="card install-card">
				<div class="install-card-heading">
					<div>
						<div class="eyebrow">Install in Foundry</div>
						<h2>Manifest installation</h2>
					</div>
					{#if latestRelease}<span class="tag">v{latestRelease.version}</span>{/if}
				</div>
				<p>In Foundry Setup, open <strong>Add-on Modules</strong>, choose <strong>Install Module</strong>, paste this manifest URL and select <strong>Install</strong>.</p>
				<div class="manifest-control">
					<code>{data.product.manifestUrl}</code>
					<button class="button compact-button" type="button" onclick={copyManifest}>{copied ? 'Copied' : 'Copy'}</button>
				</div>
				<div class="install-links">
					<a class="text-link" href={documentationUrl}>Installation and usage guide <span>→</span></a>
					{#if data.product.githubRepository}
						<a class="text-link" href={`https://github.com/${data.product.githubRepository}`} target="_blank" rel="noreferrer">GitHub repository <span>↗</span></a>
					{/if}
					{#if latestRelease?.githubReleaseUrl}
						<a class="text-link" href={latestRelease.githubReleaseUrl} target="_blank" rel="noreferrer">Release notes <span>↗</span></a>
					{/if}
				</div>
			</article>
			<aside class="card dependency-card">
				<div class="eyebrow">Requirements</div>
				<h2>{data.product.slug === 'morelord-core' ? 'Shared account service' : 'Morelord Core'}</h2>
				{#if data.product.slug === 'morelord-core'}
					<p>Install Core once per Foundry installation. It connects supported Morelord modules to your membership and shared entitlements.</p>
				{:else}
					<p>This product uses Morelord Core for account connection and premium-feature access. Install and enable Core before configuring this module.</p>
					<a class="text-link" href="/tools/morelord-core">Get Morelord Core <span>→</span></a>
				{/if}
			</aside>
		</div>
	</section>
{/if}

<section class="section brand-panel-section">
	<div class="shell feature-columns">
		<article class="card feature-tier-card">
			<span class="tag">Included free</span>
			<h2>Standard features</h2>
			<ul class="feature-list detailed-list">
				{#each standard as feature}
					<li><strong>{feature.name}</strong>{#if feature.description}<span>{feature.description}</span>{/if}</li>
				{/each}
			</ul>
		</article>
		<article class="card feature-tier-card premium-tier-card">
			<span class="tag">Tools Premium</span>
			<h2>Premium features</h2>
			<ul class="feature-list detailed-list">
				{#each premium as feature}
					<li><strong>{feature.name}</strong>{#if feature.description}<span>{feature.description}</span>{/if}</li>
				{/each}
			</ul>
		</article>
	</div>
</section>

{#if latestRelease}
	<section class="section parchment-section">
		<div class="shell">
			<div class="section-heading"><div><div class="eyebrow">Recent development</div><h2>Latest release</h2></div><a class="text-link" href="/releases">All releases <span>→</span></a></div>
			<article class="light-card"><span class="tag">v{latestRelease.version}</span><h3>{latestRelease.title}</h3><p>{latestRelease.summary}</p></article>
		</div>
	</section>
{/if}
