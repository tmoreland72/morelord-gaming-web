<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import CharacterList from '$lib/characters/components/CharacterList.svelte';
	import CharacterSheet from '$lib/characters/components/CharacterSheet.svelte';
	import type { StoredCharacter } from '$lib/characters/models/stored-character';
	import type { CharacterListItem } from '$lib/characters/models/character-list-item';
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
	let replacementIdInput: HTMLInputElement;
	let importForm: HTMLFormElement;
	let portraitInput: HTMLInputElement;
	let portraitIdInput: HTMLInputElement;
	let portraitForm: HTMLFormElement;
	let deleteIdInput: HTMLInputElement;
	let deleteForm: HTMLFormElement;
	let importing = $state(false);
	let opening = $state(false);
	let openError = $state<string | null>(null);
	let actionMessageVisible = $state(true);

	function openFilePicker() {
		replacementIdInput.value = '';
		fileInput.click();
	}
	function replaceCharacter(character: CharacterListItem) {
		replacementIdInput.value = character.localId;
		fileInput.click();
	}
	function submitImport() {
		if (fileInput.files?.length) {
			actionMessageVisible = true;
			importForm.requestSubmit();
		}
	}
	async function openCharacter(character: CharacterListItem) {
		actionMessageVisible = false;
		opening = true;
		openError = null;
		try {
			const response = await fetch(`/characters/${encodeURIComponent(character.localId)}`);
			if (!response.ok) throw new Error('The character could not be loaded.');
			selectedCharacter = (await response.json()) as StoredCharacter;
		} catch (cause) {
			openError = cause instanceof Error ? cause.message : 'The character could not be loaded.';
		} finally {
			opening = false;
		}
	}
	function closeCharacter() {
		selectedCharacter = null;
	}
	function removeCharacter(character: CharacterListItem) {
		if (!confirm(`Remove ${character.name} from My Characters?`)) return;
		deleteIdInput.value = character.localId;
		actionMessageVisible = true;
		deleteForm.requestSubmit();
	}
	function changePortrait(file: File) {
		if (!selectedCharacter) return;
		portraitIdInput.value = selectedCharacter.localId;
		actionMessageVisible = true;
		const transfer = new DataTransfer();
		transfer.items.add(file);
		portraitInput.files = transfer.files;
		portraitForm.requestSubmit();
	}
</script>

<svelte:head><title>My Characters | Morelord Gaming</title></svelte:head>

{#if !selectedCharacter}
	<section class="page-hero compact-hero character-hero">
		<div class="shell character-hero-content">
			<div>
				<div class="eyebrow">Your adventuring party</div>
				<h1>My Characters</h1>
				<p class="lead">Import and view your Foundry D&amp;D characters anywhere.</p>
			</div>
			<button type="button" class="button" disabled={importing} onclick={openFilePicker}>
				{importing ? 'Importing…' : 'Import Character'}
			</button>
		</div>
	</section>
{/if}

<div class:sheet-mode={selectedCharacter} class="character-manager">
	{#if actionMessageVisible && form?.error}<section
			class="manager-message error-message"
			role="alert"
		>
			{form.error}
		</section>{/if}
	{#if actionMessageVisible && form?.success}<section
			class="manager-message success-message"
			role="status"
		>
			{form.success}
		</section>{/if}
	{#if openError}<section class="manager-message error-message" role="alert">
			{openError}
		</section>{/if}
	{#if selectedCharacter}
		<div class="sheet-shell">
			<button type="button" class="back-button" onclick={closeCharacter}
				>← Back to Characters</button
			>
			<CharacterSheet character={selectedCharacter} onPortraitChange={changePortrait} />
		</div>
	{:else}
		<CharacterList
			characters={data.characters}
			loading={opening}
			onOpen={openCharacter}
			onRemove={removeCharacter}
			onReplace={replaceCharacter}
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
	<input bind:this={replacementIdInput} name="replacementId" type="hidden" />
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
	<input bind:this={portraitIdInput} name="id" /><input
		bind:this={portraitInput}
		name="portrait"
		type="file"
	/>
</form>
<form bind:this={deleteForm} method="POST" action="?/delete" class="hidden-form">
	<input bind:this={deleteIdInput} name="id" />
</form>

<style>
	.character-manager {
		min-height: 70vh;
		padding: 3rem 1rem 5rem;
		background:
			radial-gradient(circle at 15% 0, #4a221644, transparent 35rem),
			linear-gradient(180deg, #17110d, #100c09);
		color: #f7eedb;
	}
	.character-hero-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
	}
	.character-hero h1 {
		margin-bottom: 0.65rem;
	}
	.character-hero .lead {
		margin: 0;
		font-size: 1.08rem;
	}
	.character-manager > :global(.character-list),
	.character-manager > :global(.tidy5e-sheet) {
		width: min(1200px, 100%);
		margin-inline: auto;
	}
	.sheet-shell {
		width: min(1200px, 100%);
		margin-inline: auto;
	}
	.back-button {
		margin: 0 0 0.75rem;
		padding: 0.65rem 0.9rem;
		border: 1px solid #dba53577;
		border-radius: 8px;
		background: #17110dd9;
		color: #f6dfae;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.back-button:hover {
		border-color: #e5a512;
		background: #7d1716;
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
			padding: 1.5rem 0.5rem 3rem;
		}
		.character-hero-content {
			align-items: flex-start;
			flex-direction: column;
		}
		.character-hero-content .button {
			width: 100%;
		}
	}
</style>
