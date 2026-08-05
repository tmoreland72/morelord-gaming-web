<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	const formatDate = (value: Date | string | number) => dateFormatter.format(new Date(value));
</script>

<svelte:head><title>Morelord Tools Releases</title></svelte:head>
<section class="page-hero tools-hero compact-hero"><div class="shell"><div class="eyebrow">Product updates</div><h1>Every Morelord Tools release in one place.</h1><p class="lead">Release workflows will publish structured product updates here automatically.</p></div></section>
<section class="section brand-panel-section">
	<div class="shell release-list">
		{#if data.releases.length === 0}
			<article class="card release-card"><h3>No releases have been published yet.</h3><p>Product updates will appear here after the first automated publication.</p></article>
		{:else}
			{#each data.releases as release}
				<article class="card release-card" id={`${release.productSlug}-${release.version}`}>
					<div class="release-meta"><div><a class="tag" href={`/tools/${release.productSlug}`}>{release.productName}</a><span class="version-badge">v{release.version}</span></div><time datetime={new Date(release.publishedAt).toISOString()}>{formatDate(release.publishedAt)}</time></div>
					<h2>{release.title}</h2>
					{#if release.summary}<p>{release.summary}</p>{/if}
					{#if release.changes.length}
						<ul class="release-changes">
							{#each release.changes as change}
								<li><span class={`change-type ${change.category}`}>{change.category}</span><span>{change.description}</span>{#if change.tier !== 'standard'}<span class="premium-badge">{change.tier}</span>{/if}</li>
							{/each}
						</ul>
					{/if}
				</article>
			{/each}
		{/if}
	</div>
</section>
