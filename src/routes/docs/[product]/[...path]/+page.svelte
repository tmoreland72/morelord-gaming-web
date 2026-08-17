<script lang="ts">
	import { getProductDocComponent } from '$lib/product-docs';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const Document = $derived(getProductDocComponent(data.sourcePath));
	const productName = $derived(
		data.navigation.find((item) => item.href === `/docs/${data.metadata.product}`)?.title ??
			data.metadata.product
				.split('-')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ')
	);
</script>

<svelte:head>
	<title>{data.metadata.title} | Morelord Gaming</title>
	<meta
		name="description"
		content={data.metadata.description ?? `Documentation for ${productName}.`}
	/>
</svelte:head>

<section class="page-hero tools-hero compact-hero docs-hero">
	<div class="shell">
		<nav class="docs-breadcrumbs" aria-label="Breadcrumb">
			<a href="/tools">Morelord Tools</a><span>/</span><a href={`/tools/${data.metadata.product}`}
				>{productName}</a
			><span>/</span><span aria-current="page">Documentation</span>
		</nav>
		<div class="eyebrow">Product guide</div>
		<h1>{data.metadata.title}</h1>
		{#if data.metadata.description}<p class="lead">{data.metadata.description}</p>{/if}
		<div class="docs-meta" aria-label="Document details">
			{#if data.metadata.version}<span class="tag">Version {data.metadata.version}</span>{/if}
			{#if data.metadata.foundry}<span class="tag">Foundry v{data.metadata.foundry}</span>{/if}
			{#if data.metadata.audience}
				<span class="tag">{data.metadata.audience.replaceAll('-', ' ')}</span>
			{/if}
		</div>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell product-docs-layout">
		<aside class="card product-docs-sidebar">
			<div class="eyebrow">{productName}</div>
			<h2>Documentation</h2>
			<nav aria-label={`${productName} documentation`}>
				{#each data.navigation as item}
					<a href={item.href} class:active={item.href === `/docs/${data.metadata.slug}`}>
						<span>{item.title}</span>
						{#if item.audience}<small>{item.audience.replaceAll('-', ' ')}</small>{/if}
					</a>
				{/each}
			</nav>
			<a class="text-link product-docs-back" href={`/tools/${data.metadata.product}`}
				>Back to product <span>→</span></a
			>
		</aside>

		<article class="card docs-card docs-prose">
			{#if Document}
				<Document />
			{/if}
		</article>
	</div>
</section>
