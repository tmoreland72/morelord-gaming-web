<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const cardCopy: Record<string, { purpose: string; description: string; access: string }> = {
		'morelord-core': {
			purpose: 'Account connection & shared services',
			description:
				'Connect Foundry to your Morelord Gaming account. Manage membership access and shared services for supported modules from one place.',
			access: 'Free · Setup foundation'
		},
		'morelord-character-export': {
			purpose: 'Characters beyond the tabletop',
			description:
				'Give players access to their characters between sessions. Export supported Foundry character data to My Characters on the Morelord Gaming website.',
			access: 'Free edition · Paid features available'
		},
		'morelord-craftworks': {
			purpose: 'Harvesting & crafting',
			description:
				'Turn gathered materials and recovered loot into useful equipment. Manage harvesting, recipes, and inventory-backed crafting projects inside Foundry.',
			access: 'Free edition · Paid features available'
		},
		'morelord-downtime': {
			purpose: 'Projects between adventures',
			description:
				'Give players meaningful projects between adventures. Publish downtime sessions, let players choose permitted projects, and track how they spend their available time.',
			access: 'Premium or Champion required'
		},
		'morelord-encounters': {
			purpose: 'Encounter building',
			description:
				'Build encounters from your available monsters. Choose a difficulty and encounter style, review the roster, and drag linked Actors into your scene.',
			access: 'Free edition · Paid features available'
		},
		'morelord-journeys': {
			purpose: 'Travel & exploration',
			description:
				'Keep overland travel organized from departure to camp. Plan routes, assign expedition roles, manage supplies, and resolve each travel day.',
			access: 'Free edition · Paid features available'
		},
		'morelord-marketplace': {
			purpose: 'Shopping & item transfers',
			description:
				'Bring shopping and item transfers into Foundry. Let players browse available wares, buy and sell eligible items, and transfer equipment between characters.',
			access: 'Free edition · Paid features available'
		}
	};
</script>

<svelte:head>
	<title>Morelord Tools | Foundry VTT Modules</title>
	<meta
		name="description"
		content="Practical Foundry VTT modules with free standard editions and premium advanced features."
	/>
</svelte:head>

<section class="page-hero tools-hero">
	<div class="shell split-hero">
		<div>
			<div class="eyebrow">Morelord Tools</div>
			<h1>Practical Foundry modules for your table.</h1>
			<p class="lead">
				Every module except Downtime includes a useful free edition. Downtime requires Premium or
				Champion. Only GMs need membership; one membership covers all modules and unlimited worlds,
				with tier-specific features.
			</p>
			<div class="actions">
				<a class="button" href="/pricing">Compare memberships</a><a
					class="button secondary"
					href="/releases">View releases</a
				>
			</div>
		</div>
		<img class="hero-mascot" src="/branding/morelord-mascot.png" alt="Morelord Gaming mascot" />
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell">
		<div class="section-heading">
			<div>
				<div class="eyebrow">Current projects</div>
				<h2>Tools created from real campaign needs</h2>
			</div>
			<p>
				Players need a Morelord Gaming account only for My Characters through Character Export. Install and
				enable Morelord Core to connect your account and manage membership access across supported
				modules.
			</p>
		</div>
		<div class="grid-3">
			{#each data.products as product}
				<article
					class="card product-card"
					class:setup-foundation={product.slug === 'morelord-core'}
				>
					<span class="tag">{cardCopy[product.slug]?.purpose ?? 'Foundry VTT'}</span>
					<h3>{product.name}</h3>
					<p>{cardCopy[product.slug]?.description ?? product.summary}</p>
					<p class="access-label">
						{cardCopy[product.slug]?.access ?? 'See product for access details'}
					</p>
					<a class="text-link" href={`/tools/${product.slug}`}>Explore product <span>→</span></a>
				</article>
			{/each}
		</div>
	</div>
</section>

<section class="section callout-section">
	<div class="shell callout">
		<div>
			<div class="eyebrow">One installation</div>
			<h2>Membership access in the same installation.</h2>
			<p>
				No separate premium package to install and no duplicate configuration. Connect the GM's
				Morelord Gaming account and eligible features activate automatically. Downtime requires Premium or
				Champion.
			</p>
		</div>
		<a class="button" href="/pricing">See membership options</a>
	</div>
</section>

<style>
	.setup-foundation {
		border: 2px solid #d49b2c;
	}
	.access-label {
		font-weight: 700;
	}
</style>
