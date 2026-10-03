<script lang="ts">
	import { resolve } from '$app/paths';

	import { getProductDocComponent } from '$lib/product-docs';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
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

<section class="wiki-doc-header">
	<div>
		<nav class="docs-breadcrumbs" aria-label="Breadcrumb">
			<a href={resolve('/tools')}>Morelord Tools</a><span>/</span><a
				href={resolve('/tools/[slug]', { slug: data.metadata.product })}>{productName}</a
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

<article class="docs-prose" data-requested-document={data.requestedDocument}>
	{#each data.documents as document (document.id)}
		{@const Document = getProductDocComponent(document.sourcePath)}
		<section id={document.id} data-doc-part data-doc-route={`/docs/${document.metadata.slug}`}>
			{#if document.metadata.slug !== document.metadata.product}
				<h2 class="guide-heading">
					{document.metadata.title.replace(`${productName.replace(/ Documentation$/, '')} `, '')}
				</h2>
			{/if}
			{#if Document}<Document />{/if}
		</section>
	{/each}
</article>

<style>
	.wiki-doc-header h1 {
		font-size: clamp(2.3rem, 5vw, 3.5rem);
	}
	.wiki-doc-header {
		margin-bottom: 2rem;
	}
	.docs-prose {
		padding: 0;
	}
	.docs-prose :global([data-doc-part] > h1) {
		display: none;
	}
	.docs-prose :global([data-doc-part]) {
		scroll-margin-top: 7rem;
	}
	.docs-prose :global(.guide-heading) {
		margin-top: 3rem;
	}
</style>
