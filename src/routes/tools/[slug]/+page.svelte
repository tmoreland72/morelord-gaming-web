<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import ReleaseNote from '$lib/components/ReleaseNote.svelte';
	import SharePage from '$lib/components/SharePage.svelte';
	import { githubRepoUrl } from '$lib/github';
	import {
		getProductLanding,
		moduleInstallerBlurb,
		productCallToAction,
		publicFeatureTiers,
		type FeatureTier
	} from '$lib/product-landing';

	let { data }: { data: PageData } = $props();
	let copied = $state(false);

	const landing = $derived(
		getProductLanding(data.product.slug, {
			name: data.product.name,
			summary: data.product.summary
		})
	);
	const tiers = $derived(publicFeatureTiers(data.product.slug, data.features));
	const visibleTiers = $derived(
		(
			[
				{ id: 'standard', tag: 'Included free', title: 'Standard features' },
				{ id: 'premium', tag: 'Tools Premium', title: 'Premium features' },
				{ id: 'champion', tag: 'Tools Champion', title: 'Champion features' }
			] as const
		)
			.map((tier) => ({ ...tier, features: tiers[tier.id as FeatureTier] }))
			.filter((tier) => tier.features.length > 0)
	);
	const callToAction = $derived(
		productCallToAction({
			loggedIn: Boolean(data.user),
			hasPremium: data.hasPremiumEntitlement,
			returnTo: `/tools/${data.product.slug}`
		})
	);
	const latestRelease = $derived(data.releases[0] ?? null);
	const compactHero = $derived(Boolean(landing.benefit));

	async function copyManifest(): Promise<void> {
		if (!data.product.manifestUrl) return;
		await navigator.clipboard.writeText(data.product.manifestUrl);
		copied = true;
		window.setTimeout(() => (copied = false), 1800);
	}
</script>

<svelte:head>
	<title>{data.product.name} | Morelord Tools</title>
	<meta name="description" content={landing.benefit ?? landing.subhead} />
</svelte:head>

<section class="page-hero tools-hero compact-hero landing-hero">
	<div class="shell product-hero-layout">
		<div>
			<div class="eyebrow">{data.product.name}</div>
			<h1>{landing.headline}</h1>
			{#if landing.benefit}
				<div class="product-description">
					<p>{landing.benefit}</p>
				</div>
			{:else if landing.description.length > 0}
				<div class="product-description">
					{#each landing.description as paragraph, index (index)}
						<p>{paragraph}</p>
					{/each}
				</div>
			{/if}
			{#if !compactHero}
				<p class="installer-blurb">{moduleInstallerBlurb}</p>
			{/if}
			{#if landing.freeAccount}
				<p class="installer-blurb">{landing.freeAccount}</p>
			{/if}
			<div class="actions">
				{#if callToAction}
					<a
						class="button"
						href={callToAction.label === 'Create your free account'
							? resolve(`/login?returnTo=${encodeURIComponent(`/tools/${data.product.slug}`)}`)
							: resolve('/pricing')}>{callToAction.label}</a
					>
				{/if}
				<SharePage
					slug={data.product.slug}
					title={landing.headline}
					blurb={landing.benefit ?? landing.subhead}
					origin={data.shareOrigin}
					turnstileSiteKey={data.turnstileSiteKey}
				/>
				<a
					class="button secondary"
					href={resolve('/docs/[product]/[...path]', { product: data.product.slug, path: '' })}
					>Read the guide</a
				>
			</div>
		</div>
		{#if landing.sheetPreview}
			<img class="product-mascot" src={landing.sheetPreview.src} alt={landing.sheetPreview.alt} />
		{:else}
			<img class="product-mascot" src="/branding/morelord-mascot.png" alt="Chuck the goblin king" />
		{/if}
	</div>
</section>

{#if landing.youtubeId}
	<section class="section product-demo-section" aria-label={`${data.product.name} demo`}>
		<div class="shell">
			<div class="docs-video product-demo">
				<iframe
					src={`https://www.youtube-nocookie.com/embed/${landing.youtubeId}`}
					title={`${data.product.name} demo`}
					loading="lazy"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					referrerpolicy="strict-origin-when-cross-origin"
					allowfullscreen
				></iframe>
			</div>
		</div>
	</section>
{/if}

{#if compactHero && landing.description.length > 0}
	<section class="section">
		<div class="shell">
			<div class="product-description">
				{#each landing.description as paragraph, index (index)}
					<p>{paragraph}</p>
				{/each}
			</div>
			<p class="installer-blurb">{moduleInstallerBlurb}</p>
		</div>
	</section>
{/if}

{#if visibleTiers.length > 0}
	<section class="section brand-panel-section">
		<div class="shell feature-columns" style:--tier-count={visibleTiers.length}>
			{#each visibleTiers as tier (tier.id)}
				<article class="card feature-tier-card {tier.id}-tier-card">
					<span class="tag">{tier.tag}</span>
					<h2>{tier.title}</h2>
					<ul class="feature-list detailed-list">
						{#each tier.features as feature (feature.name)}
							<li>
								<strong>{feature.name}</strong>
								{#if feature.description}<span>{feature.description}</span>{/if}
							</li>
						{/each}
					</ul>
				</article>
			{/each}
		</div>
	</section>
{/if}

{#if landing.secondaryVideos && landing.secondaryVideos.length > 0}
	<section class="section campaign-demo-section" aria-label="More demos">
		<div class="shell">
			{#each landing.secondaryVideos as video (video.youtubeId)}
				<figure class="campaign-demo">
					<div class="docs-video product-demo">
						<iframe
							src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
							title={video.caption}
							loading="lazy"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerpolicy="strict-origin-when-cross-origin"
							allowfullscreen
						></iframe>
					</div>
					<figcaption>{video.caption}</figcaption>
				</figure>
			{/each}
		</div>
	</section>
{/if}

{#if latestRelease}
	<section class="section parchment-section">
		<div class="shell">
			<div class="section-heading">
				<div>
					<div class="eyebrow">Recent development</div>
					<h2>Latest release</h2>
				</div>
				<a class="text-link" href={resolve('/releases')}>All releases <span>→</span></a>
			</div>
			<article class="light-card">
				<span class="tag">v{latestRelease.version}</span>
				<h3>{latestRelease.title}</h3>
				<ReleaseNote text={latestRelease.summary} />
			</article>
		</div>
	</section>
{/if}

<section class="section product-install-section">
	<div class="shell product-install-grid">
		<article class="card install-card">
			<div class="install-card-heading">
				<div>
					<div class="eyebrow">Install in Foundry</div>
					<h2>Add the module</h2>
				</div>
				{#if latestRelease}<span class="tag">v{latestRelease.version}</span>{/if}
			</div>
			<p>Install it from Foundry's module browser.</p>
			{#if data.product.manifestUrl}
				<div class="manifest-control">
					<code>{data.product.manifestUrl}</code>
					<button class="button compact-button" type="button" onclick={copyManifest}
						>{copied ? 'Copied' : 'Copy'}</button
					>
				</div>
			{/if}
			<div class="install-links">
				<a
					class="text-link"
					href={resolve('/docs/[product]/[...path]', { product: data.product.slug, path: '' })}
					>Installation and usage guide <span>→</span></a
				>
				{#if data.product.githubRepository}
					<a
						class="text-link"
						href={githubRepoUrl(data.product.githubRepository)}
						target="_blank"
						rel="external noreferrer">GitHub repository <span>↗</span></a
					>
				{/if}
				{#if latestRelease?.githubReleaseUrl}
					<a
						class="text-link"
						href={latestRelease.githubReleaseUrl}
						target="_blank"
						rel="external noreferrer">Release notes <span>↗</span></a
					>
				{/if}
			</div>
		</article>
		<aside class="card dependency-card">
			<div class="eyebrow">Requirements</div>
			{#if data.product.slug === 'morelord-core'}
				<h2>Shared account service</h2>
				<p>
					Install Core once for each Foundry world you want to connect. It links supported Morelord
					modules to your membership.
				</p>
			{:else if landing.requiresCore}
				<h2>Morelord Core</h2>
				<p>
					Install Morelord Core from Foundry's module browser and enable it in the world. It
					connects this module to your Morelord Gaming account.
				</p>
				<a class="text-link" href={resolve('/tools/[slug]', { slug: 'morelord-core' })}
					>Get Morelord Core <span>→</span></a
				>
			{:else}
				<h2>{landing.requirements?.title ?? 'A free Morelord account'}</h2>
				<p>
					{landing.requirements?.body ??
						'Exporting a character does not require Morelord Core. Create a free account when you want to import, view, or share the character on the website.'}
				</p>
			{/if}
		</aside>
	</div>
</section>
