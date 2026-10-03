<script lang="ts">
	import { resolve } from '$app/paths';
	import { adminDocGuides } from '$lib/admin-docs';
</script>

<svelte:head
	><title>Administrator Documentation | Morelord Gaming</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<div class="eyebrow">Morelord administration wiki</div>
<h1>Operations documentation</h1>
<p class="lead">
	Private reference material for maintaining the website, integrations, billing and releases. Choose
	a guide from the sidebar.
</p>
{#each adminDocGuides as guide (guide.slug)}
	<article>
		<h2><a href={resolve(`/admin/docs/${guide.slug}`)}>{guide.title}</a></h2>
		<p>{guide.description}</p>
	</article>
{/each}

<style>
	h1 {
		font-size: clamp(2.3rem, 5vw, 3.5rem);
	}
	article {
		padding-block: 1.3rem;
		border-top: 1px solid #d49b2c33;
	}
	h2 {
		font-size: 1.6rem;
		margin-bottom: 0.6rem;
	}
	p {
		color: var(--muted);
		line-height: 1.7;
	}
</style>
