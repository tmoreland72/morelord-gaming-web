<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Morelord Tools | Foundry VTT Modules</title>
	<meta name="description" content="Practical Foundry VTT modules with free standard editions and premium advanced features." />
</svelte:head>

<section class="page-hero tools-hero">
	<div class="shell split-hero">
		<div>
			<div class="eyebrow">Morelord Tools</div>
			<h1>Practical Foundry modules with a generous free edition.</h1>
			<p class="lead">Install once, use the standard feature set for free, and unlock premium capabilities across supported modules through one Morelord Tools membership.</p>
			<div class="actions"><a class="button" href="/pricing">Compare memberships</a><a class="button secondary" href="/releases">View releases</a></div>
		</div>
		<img class="hero-mascot" src="/branding/morelord-mascot.png" alt="Morelord Gaming mascot" />
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell">
		<div class="section-heading"><div><div class="eyebrow">Current projects</div><h2>Tools created from real campaign needs</h2></div><p>Each module includes a useful standard edition. Premium capabilities unlock through the same Morelord account across participating tools.</p></div>
		<div class="grid-3">
			{#each data.products as product}
				<article class="card product-card">
					<span class="tag">Foundry VTT</span>
					<h3>{product.name}</h3>
					<p>{product.summary}</p>
					<a class="text-link" href={`/tools/${product.slug}`}>Explore product <span>→</span></a>
				</article>
			{/each}
		</div>
	</div>
</section>

<section class="section callout-section">
	<div class="shell callout">
		<div><div class="eyebrow">One installation</div><h2>Free and premium features in the same module.</h2><p>No separate premium package to install and no duplicate configuration. Connect a Morelord account and eligible features activate automatically.</p></div>
		<a class="button" href="/pricing">See membership options</a>
	</div>
</section>
