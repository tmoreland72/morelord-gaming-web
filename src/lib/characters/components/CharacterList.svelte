<svelte:options runes={false} />

<script lang="ts">
	import type { StoredCharacter } from '../models/stored-character';
	import { createCharacterSummary } from '../characters/character-summary';
	import { getActorPortraitSrc } from '../assets/image-resolver';

	export let characters: StoredCharacter[];
	export let loading: boolean;

	export let onOpen: (character: StoredCharacter) => void;

	export let onRemove: (character: StoredCharacter) => void;
	export let onReplace: (character: StoredCharacter) => void;

	export let onImport: () => void;

	function formatImportDate(dateValue: string): string {
		const date = new Date(dateValue);

		if (Number.isNaN(date.getTime())) {
			return 'Unknown';
		}

		return date.toLocaleString();
	}

	function getInitials(name: string): string {
		return name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part.charAt(0).toUpperCase())
			.join('');
	}

	function getCharacterDescription(character: StoredCharacter): string {
		const summary = createCharacterSummary(character);

		const values = [
			summary.species,
			summary.background,
			summary.totalLevel > 0 ? `Level ${summary.totalLevel}` : undefined
		];

		return values
			.filter((value): value is string => typeof value === 'string' && value.length > 0)
			.join(' • ');
	}
</script>

<div class="character-list">
	<div class="section-heading">
		<div>
			<h2>Your Characters</h2>

			<p>Characters imported from Foundry are private to your Morelord Gaming account.</p>
		</div>
	</div>

	{#if loading}
		<section class="empty-state">
			<p>Loading characters…</p>
		</section>
	{:else if characters.length === 0}
		<section class="empty-state">
			<h3>No characters imported</h3>

			<p>
				Your GM must install the
				<a href="/tools/morelord-character-export">Morelord Character Export</a>
				module in Foundry VTT before they can provide your character export.
			</p>

			<button type="button" class="button import-button" on:click={onImport}>
				Import Your First Character
			</button>
		</section>
	{:else}
		<section class="character-grid">
			{#each characters as character}
				{@const summary = createCharacterSummary(character)}

				<article class="character-card">
					<button
						type="button"
						class="card-open-button"
						aria-label={`Open ${character.name}`}
						on:click={() => onOpen(character)}
					>
						<div class="portrait">
							{#if getActorPortraitSrc(character)}
								<img src={getActorPortraitSrc(character)} alt={`${character.name} portrait`} />
							{:else}
								{getInitials(character.name)}
							{/if}
						</div>

						<div class="character-details">
							<h3>{character.name}</h3>

							<p class="class-line">
								{#if summary.classes.length > 0}
									{summary.classes.map((item) => `${item.name} ${item.levels}`).join(' / ')}
								{:else}
									Character
								{/if}
							</p>

							{#if getCharacterDescription(character)}
								<p class="secondary-line">
									{getCharacterDescription(character)}
								</p>
							{/if}

							<p class="imported-date">
								Imported
								{formatImportDate(character.importedAt)}
							</p>
						</div>
					</button>

					<div class="card-actions">
						<button
							type="button"
							class="replace-button"
							aria-label={`Replace ${character.name}`}
							title="Import a file to replace this character"
							on:click={() => onReplace(character)}
						>
							Replace
						</button>
						<button
							type="button"
							class="delete-button"
							aria-label={`Remove ${character.name}`}
							title="Remove character"
							on:click={() => onRemove(character)}
						>
							Remove
						</button>
					</div>
				</article>
			{/each}
		</section>
	{/if}
</div>

<style>
	.character-list {
		width: 100%;
	}
	h2,
	h3,
	p {
		margin-top: 0;
	}

	button {
		font: inherit;
	}

	.section-heading {
		display: flex;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.section-heading h2 {
		margin-bottom: 0.25rem;
		color: #fff0c3;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(2rem, 4vw, 3rem);
		letter-spacing: -0.025em;
	}

	.section-heading p {
		margin-bottom: 0;
		color: #bdaf9a;
		line-height: 1.65;
	}

	.empty-state {
		padding: 3rem;
		border: 1px dashed #d49b2c66;
		border-radius: 15px;
		background: linear-gradient(150deg, #2b211b99, #18120fcc);
		text-align: center;
		color: #c6b9a5;
	}

	.empty-state h3 {
		color: #fff2cb;
		font-family: Georgia, 'Times New Roman', serif;
	}

	.empty-state a {
		color: #ffd35b;
		font-weight: 800;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.empty-state a:hover {
		color: #fff0b0;
	}

	.import-button {
		margin-top: 0.5rem;
	}

	.character-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
	}

	.character-card {
		position: relative;
		display: flex;
		min-width: 0;
		border: 1px solid #d49b2c3b;
		border-radius: 15px;
		background: linear-gradient(150deg, #2b211b, #18120f);
		overflow: hidden;
		box-shadow:
			0 18px 50px #0004,
			inset 0 1px #ffffff0c;
	}

	.card-open-button {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 1rem;
		min-width: 0;
		padding: 1.25rem;
		border: 0;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.card-open-button:hover {
		background: #ffffff08;
	}

	.card-open-button:focus-visible,
	.replace-button:focus-visible,
	.delete-button:focus-visible,
	.import-button:focus-visible {
		outline: 2px solid var(--tidy-active-tab);
		outline-offset: -2px;
	}

	.portrait {
		display: grid;
		width: 76px;
		height: 76px;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid #d6a03988;
		border-radius: 50%;
		background: #17110d;
		overflow: hidden;
		font-size: 1.4rem;
		font-weight: 700;
	}

	.portrait img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.character-details {
		min-width: 0;
	}

	.character-details h3 {
		margin-bottom: 0.35rem;
		color: #fff2cb;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.45rem;
		letter-spacing: 0.02em;
	}

	.character-details p {
		overflow-wrap: anywhere;
	}

	.class-line {
		margin-bottom: 0.25rem;
	}

	.secondary-line,
	.imported-date {
		color: #aa9d89;
	}

	.secondary-line {
		margin-bottom: 0.55rem;
	}

	.imported-date {
		margin-bottom: 0;
		font-size: 0.78rem;
	}

	.delete-button {
		margin: 0;
		padding: 0.4rem 0.55rem;
		border: 1px solid #b94b4355;
		border-radius: 8px;
		background: #38151288;
		color: #ffbbb3;
		cursor: pointer;
	}

	.card-actions {
		display: flex;
		flex-direction: column;
		align-self: flex-start;
		gap: 0.4rem;
		margin: 0.75rem 0.75rem 0 0;
	}

	.card-actions button {
		width: 100%;
	}

	.replace-button {
		padding: 0.4rem 0.55rem;
		border: 1px solid #d49b2c66;
		border-radius: 8px;
		background: #2a2018;
		color: #f3d58c;
		cursor: pointer;
	}

	.replace-button:hover {
		border-color: #e5a512;
		background: #493510;
		color: #ffe39a;
	}

	.delete-button:hover {
		border-color: #d65d55;
		background: #7d1716;
		color: #fff3df;
	}

	@media (max-width: 600px) {
		.character-grid {
			grid-template-columns: 1fr;
		}

		.empty-state {
			padding: 2rem 1rem;
		}
	}
</style>
