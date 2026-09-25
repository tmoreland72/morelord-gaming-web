<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CharacterSheet from '$lib/characters/components/CharacterSheet.svelte';
	import type { PageProps } from './$types';
	import '@fontsource/roboto-condensed/400.css';
	import '@fontsource/roboto-condensed/500.css';
	import '@fontsource/roboto-condensed/600.css';
	import '@fontsource/roboto-condensed/700.css';
	import '$lib/characters/styles/tidy-theme.css';
	import '$lib/characters/styles/tidy-character.css';
	import '$lib/characters/styles/tidy-inventory.css';
	import '$lib/characters/styles/tidy-features.css';
	import '$lib/characters/styles/tidy-biography.css';
	import '$lib/characters/styles/tidy-details.css';

	let { data, form }: PageProps = $props();
	let copyingMessage = $state('');
	let busy = $state(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(data.shareUrl);
			copyingMessage = 'Link copied.';
		} catch {
			copyingMessage = 'Select and copy the link below.';
		}
	}
</script>

<svelte:head><title>{data.character.name} | Morelord Gaming</title></svelte:head>

<section class="shared-character">
	<div class="sheet-shell">
		<a href={resolve('/characters')}>← My Characters</a>
		<section class="sharing" aria-label="Character sharing">
			<h1>{data.character.name}</h1>
			{#if data.isOwner}
				<p>
					{data.isPublic ? 'Public' : 'Private'} — {data.isPublic
						? 'Anyone with this link can view the full character sheet and sign in to import a copy.'
						: 'Only you can view this character.'}
				</p>
				<p>
					Making this character public shares the full export, including biography, notes, and
					artwork. Making it private stops access to this link; previously imported copies remain
					with their owners.
				</p>
				<form
					method="POST"
					action="?/visibility"
					use:enhance={() => {
						busy = true;
						copyingMessage = '';
						return async ({ update }) => {
							try {
								await update();
							} finally {
								busy = false;
							}
						};
					}}
				>
					<input type="hidden" name="visibility" value={data.isPublic ? 'private' : 'public'} />
					<button class="button" disabled={busy}
						>{data.isPublic ? 'Make private' : 'Make public'}</button
					>
				</form>
				{#if data.isPublic}
					<label for="share-url">Public character link</label>
					<div class="share-link">
						<input
							id="share-url"
							readonly
							value={data.shareUrl}
							onclick={(event) => event.currentTarget.select()}
						/>
						<button class="button" type="button" onclick={copyLink}>Copy link</button>
					</div>
					{#if copyingMessage}<p role="status">{copyingMessage}</p>{/if}
				{/if}
			{:else if data.signedIn}
				<p>
					Import a private copy into My Characters. Your existing characters will stay as they are.
				</p>
				<form
					method="POST"
					action="?/import"
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							try {
								await update();
							} finally {
								busy = false;
							}
						};
					}}
				>
					<button class="button" disabled={busy}
						>{busy ? 'Importing…' : 'Import to My Characters'}</button
					>
				</form>
			{:else}
				<a
					class="button"
					href={resolve(
						`/login?returnTo=${encodeURIComponent(resolve('/characters/shared/[id]', { id: data.character.localId }))}`
					)}>Sign in to import</a
				>
			{/if}
			{#if form?.error}<p role="alert">{form.error}</p>{/if}
			{#if form?.success}<p role="status">{form.success}</p>{/if}
		</section>
		<CharacterSheet character={data.character} />
	</div>
</section>

<style>
	.shared-character {
		padding: 2rem 1rem 4rem;
		background: #17110d;
		color: #f7eedb;
		min-height: 70vh;
	}
	.sheet-shell {
		max-width: 1200px;
		margin-inline: auto;
	}
	a {
		color: #f6dfae;
	}
	.sharing {
		margin-block: 1rem;
		padding: 1.25rem;
		border: 1px solid #dba53577;
		border-radius: 8px;
		background: #211812;
	}
	h1 {
		margin: 0;
		font-size: 1.8rem;
	}
	p {
		line-height: 1.6;
	}
	label {
		display: block;
		margin-top: 1rem;
	}
	.share-link {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
	input {
		flex: 1;
		min-width: 0;
		padding: 0.75rem;
		color: #f7eedb;
		background: #17110d;
		border: 1px solid #dba53577;
		border-radius: 6px;
	}
</style>
