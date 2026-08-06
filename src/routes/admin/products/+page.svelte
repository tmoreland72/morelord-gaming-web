<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Products | Morelord Administration</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord administration</div>
		<h1>Product catalog</h1>
		<p class="lead">Review product metadata, feature tiers and release activity stored in D1.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell admin-dashboard">
		<div class="admin-toolbar">
			<a class="button" href="/admin/products/new">Add product</a>
		</div>

		<div class="admin-product-list">
			{#each data.products as product}
				<article class="card admin-product-row">
					<div class="admin-product-main">
						<div class="admin-product-title">
							<span class="tag status-{product.status}">{product.status}</span>
							<h2>{product.name}</h2>
						</div>
						<p>{product.summary}</p>
						<small><code>{product.slug}</code></small>
					</div>

					<div class="admin-product-metrics">
						<div><strong>{product.featureCount}</strong><span>Features</span></div>
						<div><strong>{product.releaseCount}</strong><span>Releases</span></div>
					</div>

					<a class="button secondary" href={`/admin/products/${product.slug}`}>Edit product</a>
				</article>
			{/each}
		</div>
	</div>
</section>
