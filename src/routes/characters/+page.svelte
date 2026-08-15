<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import CharacterList from '$lib/characters/components/CharacterList.svelte';
	import CharacterSheet from '$lib/characters/components/CharacterSheet.svelte';
	import type { StoredCharacter } from '$lib/characters/models/stored-character';
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

	let { data, form } = $props();
	let selectedCharacter = $state<StoredCharacter | null>(null);
	let fileInput: HTMLInputElement;
	let importForm: HTMLFormElement;
	let portraitInput: HTMLInputElement;
	let portraitForm: HTMLFormElement;
	let portraitCharacterId = $state('');
	let deleteCharacterId = $state('');
	let deleteForm: HTMLFormElement;
	let importing = $state(false);

	function openFilePicker() {
		fileInput.click();
	}
	function submitImport() {
		if (fileInput.files?.length) importForm.requestSubmit();
	}
	function openCharacter(character: StoredCharacter) {
		selectedCharacter = character;
	}
	function closeCharacter() {
		selectedCharacter = null;
	}
	function removeCharacter(character: StoredCharacter) {
		if (!confirm(`Remove ${character.name} from My Characters?`)) return;
		deleteCharacterId = character.localId;
		deleteForm.requestSubmit();
	}
	function changePortrait(file: File) {
		if (!selectedCharacter) return;
		portraitCharacterId = selectedCharacter.localId;
		const transfer = new DataTransfer();
		transfer.items.add(file);
		portraitInput.files = transfer.files;
		portraitForm.requestSubmit();
	}
</script>

<svelte:head><title>My Characters | Morelord Gaming</title></svelte:head>

<div class="character-manager">
	{#if !selectedCharacter}
		<header class="character-header">
			<div>
				<div class="eyebrow">Your adventuring party</div>
				<h1>My Characters</h1>
				<p>Import and view your Foundry D&amp;D characters anywhere.</p>
			</div>
			<button type="button" class="import-button" disabled={importing} onclick={openFilePicker}
				>{importing ? 'Importing…' : 'Import Character'}</button
			>
		</header>
	{/if}
	{#if form?.error}<section class="manager-message error-message" role="alert">
			{form.error}
		</section>{/if}
	{#if form?.success}<section class="manager-message success-message" role="status">
			{form.success}
		</section>{/if}
	{#if selectedCharacter}
		<CharacterSheet
			character={selectedCharacter}
			onClose={closeCharacter}
			onPortraitChange={changePortrait}
		/>
	{:else}
		<CharacterList
			characters={data.characters}
			loading={false}
			onOpen={openCharacter}
			onRemove={removeCharacter}
			onImport={openFilePicker}
		/>
	{/if}
</div>

<form
	bind:this={importForm}
	method="POST"
	action="?/import"
	enctype="multipart/form-data"
	class="hidden-form"
	use:enhance={() => {
		importing = true;
		return async ({ update }) => {
			await update();
			importing = false;
			await invalidateAll();
		};
	}}
>
	<input
		bind:this={fileInput}
		name="character"
		type="file"
		accept=".json,application/json"
		onchange={submitImport}
	/>
</form>
<form
	bind:this={portraitForm}
	method="POST"
	action="?/portrait"
	enctype="multipart/form-data"
	class="hidden-form"
>
	<input name="id" value={portraitCharacterId} /><input
		bind:this={portraitInput}
		name="portrait"
		type="file"
	/>
</form>
<form bind:this={deleteForm} method="POST" action="?/delete" class="hidden-form">
	<input name="id" value={deleteCharacterId} />
</form>

<style>
	.character-manager {
		min-height: 70vh;
		padding: 2rem;
		background: radial-gradient(
			circle at top,
			var(--tidy-surface-dark) 0,
			var(--tidy-background) 34rem
		);
		color: var(--tidy-text);
		font-family: 'Roboto Condensed', Arial, sans-serif;
	}
	.character-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		width: min(1200px, 100%);
		margin: 0 auto 1.5rem;
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--tidy-border-gold);
	}
	.character-header h1 {
		margin: 0.2rem 0;
		color: var(--tidy-text-bright);
		font-family: var(--tidy-font-display);
		font-size: 2.4rem;
	}
	.character-header p {
		margin: 0;
		color: var(--tidy-text-muted);
	}
	.import-button {
		padding: 0.75rem 1.1rem;
		border: 1px solid var(--tidy-proficient);
		border-radius: var(--tidy-radius-medium);
		background: var(--tidy-dark-red);
		color: var(--tidy-text-bright);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.character-manager > :global(.character-list),
	.character-manager > :global(.tidy5e-sheet) {
		width: min(1200px, 100%);
		margin-inline: auto;
	}
	.manager-message {
		width: min(1200px, 100%);
		margin: 0 auto 1.5rem;
		padding: 1rem 1.25rem;
		border-radius: var(--tidy-radius-medium);
	}
	.error-message {
		border: 1px solid var(--tidy-danger-border);
		background: var(--tidy-danger-surface);
	}
	.success-message {
		border: 1px solid var(--tidy-success-border);
		background: var(--tidy-success-surface);
	}
	.hidden-form {
		display: none;
	}
	@media (max-width: 600px) {
		.character-manager {
			padding: 0.5rem;
		}
		.character-header {
			align-items: flex-start;
			padding: 1rem 0.5rem;
		}
		.character-header h1 {
			font-size: 1.7rem;
		}
		.character-header p {
			display: none;
		}
	}
</style>
