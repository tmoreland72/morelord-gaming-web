<svelte:options runes={false} />

<script lang="ts">
	import type { FoundryActor } from '../../models/foundry-actor';
	import { getPathValue } from '../../characters/actor-values';

	export let actor: FoundryActor;

	$: biography = findBiography();

	function findBiography(): string {
		const possiblePaths = [
			'system.details.biography.value',
			'system.details.biography.public',
			'system.details.biography',
			'system.details.notes.value',
			'system.details.notes'
		];

		for (const path of possiblePaths) {
			const value = getPathValue(actor, path);

			if (typeof value === 'string' && value.trim().length > 0) {
				return value;
			}
		}

		return '';
	}
</script>

<section class="tab-panel">
	<div class="panel-heading">
		<h3>Biography</h3>
	</div>

	{#if biography}
		<div class="biography-content">
			{@html biography}
		</div>
	{:else}
		<div class="empty-state">No biography was found.</div>
	{/if}
</section>

<style>
	h3 {
		margin-top: 0;
	}

	.tab-panel {
		padding: 1.25rem;
		border: 1px solid #454038;
		border-radius: 0.5rem;
		background: #24211d;
	}

	.panel-heading {
		margin-bottom: 1rem;
	}

	.panel-heading h3 {
		margin-bottom: 0;
	}

	.biography-content {
		padding: 1rem;
		border: 1px solid #454038;
		border-radius: 0.4rem;
		background: #1d1b18;
		line-height: 1.6;
		overflow-wrap: anywhere;
	}

	.biography-content :global(p:first-child) {
		margin-top: 0;
	}

	.biography-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.biography-content :global(a) {
		color: #d4ae6d;
	}

	.empty-state {
		padding: 2rem;
		border: 1px dashed #514c43;
		border-radius: 0.4rem;
		color: #aaa398;
		text-align: center;
	}
</style>
