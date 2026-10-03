<script lang="ts">
	import { resolve } from '$app/paths';
	import { getProductDocGroups } from '$lib/product-docs';
	const groups = getProductDocGroups();
</script>

<svelte:head>
	<title>Product Documentation | Morelord Gaming</title>
	<meta
		name="description"
		content="Installation, setup and usage guides for all Morelord Tools Foundry VTT modules."
	/>
</svelte:head>
<div class="eyebrow">Morelord Tools wiki</div>
<h1>Product documentation</h1>
<p class="lead">
	Everything you need to install, configure and use Morelord Tools. Choose a module from the
	sidebar, then open its overview or a guide.
</p>
<div class="module-list">
	{#each groups as group (group.product)}
		<article>
			<h2>
				<a href={resolve('/docs/[product]/[...path]', { product: group.product, path: '' })}
					>{group.title} <span aria-hidden="true">→</span></a
				>
			</h2>
			{#if group.description}<p>{group.description}</p>{/if}
		</article>
	{/each}
</div>

<style>
	h1 {
		font-size: clamp(2.3rem, 5vw, 3.5rem);
	}
	.module-list {
		margin-top: 2rem;
	}
	article {
		padding-block: 1.3rem;
		border-top: 1px solid #d49b2c33;
	}
	h2 {
		margin: 0 0 0.6rem;
		font-size: 1.6rem;
	}
	h2 a:hover {
		color: var(--gold-light);
	}
	h2 span {
		color: var(--gold);
		font-family: sans-serif;
	}
	p {
		color: var(--muted);
		line-height: 1.7;
	}
</style>
