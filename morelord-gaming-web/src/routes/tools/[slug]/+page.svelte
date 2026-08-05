<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const standard = $derived(data.features.filter((feature) => feature.tier === 'standard'));
	const premium = $derived(data.features.filter((feature) => feature.tier !== 'standard'));
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
				<a class="button" href="/pricing">Unlock premium features</a>
				<a class="button secondary" href="/releases">Release history</a>
			</div>
		</div>
		<img class="product-mascot" src="/branding/morelord-mascot.png" alt="" />
	</div>
</section>

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

{#if data.releases.length}
	<section class="section parchment-section">
		<div class="shell">
			<div class="section-heading"><div><div class="eyebrow">Recent development</div><h2>Latest release</h2></div></div>
			{#each data.releases.slice(0, 1) as release}
				<article class="light-card"><span class="tag">v{release.version}</span><h3>{release.title}</h3><p>{release.summary}</p></article>
			{/each}
		</div>
	</section>
{/if}
