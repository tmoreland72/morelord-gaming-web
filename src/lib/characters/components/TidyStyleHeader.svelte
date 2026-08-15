<svelte:options runes={false} />

<script lang="ts">
	import type { StoredCharacter } from '../models/stored-character';

	import { createCharacterSummary } from '../characters/character-summary';

	import { getActorPortraitSrc } from '../assets/image-resolver';

	import {
		deriveCharacterValues,
		formatSignedNumber,
		getAbilityModifier,
		getAbilityScore
	} from '../characters/derived-character';

	import TidyIcon from './TidyIcon.svelte';

	import { closeIcon, savingThrowMarkerIcon } from '../icons/tidy-icons';

	export let character: StoredCharacter;
	export let onClose: () => void;
	export let onPortraitSelect: (file: File) => void;

	let portraitInput: HTMLInputElement;

	type UnknownRecord = Record<string, unknown>;

	interface AbilityDefinition {
		key: string;
		abbreviation: string;
	}

	interface IdentityPart {
		gold?: string;
		grey?: string;
		white?: string;
	}

	const abilities: AbilityDefinition[] = [
		{
			key: 'str',
			abbreviation: 'STR'
		},
		{
			key: 'dex',
			abbreviation: 'DEX'
		},
		{
			key: 'con',
			abbreviation: 'CON'
		},
		{
			key: 'int',
			abbreviation: 'INT'
		},
		{
			key: 'wis',
			abbreviation: 'WIS'
		},
		{
			key: 'cha',
			abbreviation: 'CHA'
		}
	];

	$: summary = createCharacterSummary(character);

	$: derived = deriveCharacterValues(character.actor);

	$: identityParts = getIdentityParts();

	$: portraitSource = getPortraitSource();

	function isRecord(value: unknown): value is UnknownRecord {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	function asString(value: unknown): string | undefined {
		return typeof value === 'string' ? value : undefined;
	}

	function asNumber(value: unknown): number | undefined {
		if (typeof value === 'number' && Number.isFinite(value)) {
			return value;
		}

		if (typeof value === 'string' && value.trim() !== '') {
			const parsed = Number(value);

			if (Number.isFinite(parsed)) {
				return parsed;
			}
		}

		return undefined;
	}

	function getNestedValue(source: unknown, ...keys: string[]): unknown {
		let current = source;

		for (const key of keys) {
			if (!isRecord(current)) {
				return undefined;
			}

			current = current[key];
		}

		return current;
	}

	function getInitials(name: string): string {
		return name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part.charAt(0).toUpperCase())
			.join('');
	}

	function getPortraitSource(): string | undefined {
		return getActorPortraitSrc(character) || undefined;
	}

	function openPortraitPicker(): void {
		portraitInput.click();
	}

	function handlePortraitSelection(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;

		const file = input.files?.[0];

		if (file) {
			onPortraitSelect(file);
		}

		input.value = '';
	}

	function getSizeLabel(): string {
		const size = asString(getNestedValue(character.actor.system, 'traits', 'size'));

		const labels: Record<string, string> = {
			tiny: 'Tiny',
			sm: 'Small',
			med: 'Medium',
			lg: 'Large',
			huge: 'Huge',
			grg: 'Gargantuan'
		};

		return size ? (labels[size] ?? formatLabel(size)) : 'Medium';
	}

	function getCreatureType(): string | undefined {
		const speciesItem = character.actor.items.find(
			(item) => item.type === 'race' || item.type === 'species'
		);

		const value = asString(getNestedValue(speciesItem?.system, 'type', 'value'));

		const subtype = asString(getNestedValue(speciesItem?.system, 'type', 'subtype'));

		const formattedValue = value ? formatLabel(value) : '';

		if (formattedValue && subtype) {
			return `${formattedValue} ` + `(${subtype})`;
		}

		return formattedValue || subtype || undefined;
	}

	function getAlignment(): string | undefined {
		return asString(getNestedValue(character.actor.system, 'details', 'alignment'));
	}

	function getSpellcastingAbility(): string | undefined {
		const value = asString(getNestedValue(character.actor.system, 'attributes', 'spellcasting'));

		return value ? value.toUpperCase() : undefined;
	}

	function getSpellSaveDc(): number | null {
		const ability = getSpellcastingAbility()?.toLowerCase();

		if (!ability) {
			return null;
		}

		return 8 + derived.proficiencyBonus + getAbilityModifier(character.actor, ability);
	}

	function getIdentityParts(): IdentityPart[] {
		const parts: IdentityPart[] = [];

		if (derived.speed !== null) {
			parts.push({
				gold: 'Speed',
				white: `${derived.speed} ` + `${derived.speedUnits}`
			});
		}

		parts.push({
			gold: getSizeLabel()
		});

		const creatureType = getCreatureType();

		if (creatureType) {
			parts.push({
				gold: creatureType
			});
		}

		if (summary.species) {
			parts.push({
				gold: summary.species
			});
		}

		const alignment = getAlignment();

		if (alignment) {
			parts.push({
				gold: alignment
			});
		}

		for (const characterClass of summary.classes) {
			parts.push({
				gold: characterClass.name,
				white: `${characterClass.levels}`
			});
		}

		const spellcastingAbility = getSpellcastingAbility();

		const spellSaveDc = getSpellSaveDc();

		if (spellcastingAbility && spellSaveDc !== null) {
			parts.push({
				grey: `${spellcastingAbility} DC`,
				white: `${spellSaveDc}`
			});
		}

		return parts;
	}

	function getHitDiceMaximum(): number {
		return character.actor.items
			.filter((item) => item.type === 'class')
			.reduce((total, item) => total + (asNumber(item.system?.levels) ?? 0), 0);
	}

	function getHitDiceSpent(): number {
		return character.actor.items
			.filter((item) => item.type === 'class')
			.reduce(
				(total, item) => total + (asNumber(getNestedValue(item.system, 'hd', 'spent')) ?? 0),
				0
			);
	}

	function getRemainingHitDice(): number {
		return Math.max(0, getHitDiceMaximum() - getHitDiceSpent());
	}

	function formatLabel(value: string): string {
		return value
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ')
			.replace(/\b\w/g, (character) => character.toUpperCase());
	}
</script>

<section class="tidy-header">
	<div class="header-tools">
		<button
			type="button"
			class="sidebar-toggle"
			aria-label="Toggle sidebar"
			title="Sidebar toggle is not active yet"
		>
			<span class="toggle-knob"></span>
		</button>

		<button
			type="button"
			class="close-button"
			aria-label="Close character sheet"
			title="Close character sheet"
			on:click={onClose}
		>
			<TidyIcon icon={closeIcon} />
		</button>
	</div>

	<div class="header-body">
		<aside class="portrait-column">
			<input
				bind:this={portraitInput}
				class="portrait-input"
				type="file"
				accept="image/png,image/jpeg,image/webp"
				on:change={handlePortraitSelection}
			/>

			<div class="portrait-stack">
				<button
					type="button"
					class="portrait-frame"
					aria-label={`Change portrait for ${character.name}`}
					title="Change portrait"
					on:click={openPortraitPicker}
				>
					{#if portraitSource}
						<img src={portraitSource} alt={character.name} />
					{:else}
						<span class="portrait-fallback">
							{getInitials(character.name)}
						</span>
					{/if}

					<span class="portrait-overlay"> Change portrait </span>
				</button>

				<div class="health-bar">
					<strong>
						{derived.currentHp}
						/
						{derived.maximumHp}
						HP
					</strong>
				</div>

				<div class="hit-dice-bar">
					<strong>
						{getRemainingHitDice()}
						/
						{getHitDiceMaximum()}
						HD
					</strong>
				</div>
			</div>
		</aside>

		<div class="character-overview">
			<div class="identity-row">
				<div class="identity">
					<h1>
						{character.name}
					</h1>

					<div class="identity-details">
						{#each identityParts as part, index}
							{#if index > 0}
								<span class="identity-separator" aria-hidden="true"> • </span>
							{/if}

							<span class="identity-part">
								{#if part.gold}
									<span class="identity-gold">
										{part.gold}
									</span>
								{/if}

								{#if part.grey}
									<span class="identity-grey">
										{part.grey}
									</span>
								{/if}

								{#if part.white}
									<span class="identity-white">
										{part.white}
									</span>
								{/if}
							</span>
						{/each}
					</div>
				</div>

				<div class="xp-block">
					<strong> XP 0 / 2,700 </strong>

					<div class="xp-track">
						<span></span>
					</div>
				</div>

				<div class="level-emblem">
					<strong>
						{summary.totalLevel}
					</strong>

					<span>
						PB
						{formatSignedNumber(derived.proficiencyBonus)}
					</span>
				</div>
			</div>

			<div class="statistics-row">
				<div class="armor-class">
					<div class="armor-emblem">
						{derived.armorClass}
					</div>

					<span>Score</span>
					<span>Save</span>
				</div>

				<div class="ability-row">
					{#each abilities as ability}
						{@const score = getAbilityScore(character.actor, ability.key)}

						{@const modifier = getAbilityModifier(character.actor, ability.key)}

						{@const savingThrow = derived.savingThrows.find((save) => save.ability === ability.key)}

						<div class="ability-stat">
							<div class="ability-hex">
								<span class="ability-label">
									{ability.abbreviation}
								</span>

								<strong class="ability-modifier">
									{formatSignedNumber(modifier)}
								</strong>

								<small class="ability-score">
									{score}
								</small>
							</div>

							<div class="saving-throw">
								<span class="saving-throw-value">
									{formatSignedNumber(savingThrow?.modifier ?? modifier)}
								</span>

								<TidyIcon icon={savingThrowMarkerIcon} className="saving-throw-marker" />
							</div>
						</div>
					{/each}
				</div>

				<div class="initiative-stat">
					<div class="initiative-hex">
						<strong>
							{formatSignedNumber(derived.initiative)}
						</strong>

						<span>INIT</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	button {
		font: inherit;
	}

	.tidy-header {
		overflow: hidden;
		background:
			linear-gradient(rgba(4, 5, 7, 0.9), rgba(5, 6, 8, 0.97)),
			radial-gradient(circle at 48% 30%, rgba(56, 58, 64, 0.2), transparent 45%);
		color: #eeeeee;
	}

	.header-tools {
		display: flex;
		min-height: 40px;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.85rem;
		border-bottom: 1px solid rgba(197, 184, 122, 0.28);
		background: linear-gradient(
			90deg,
			rgba(14, 15, 18, 0.97),
			rgba(25, 26, 31, 0.94),
			rgba(8, 9, 11, 0.98)
		);
	}

	.sidebar-toggle {
		position: relative;
		width: 58px;
		height: 25px;
		padding: 2px;
		border: 1px solid #62656d;
		border-radius: 999px;
		background: #090a0c;
		cursor: default;
	}

	.toggle-knob {
		display: block;
		width: 19px;
		height: 19px;
		border: 1px solid #91959d;
		border-radius: 50%;
		background: linear-gradient(#f0f1f3, #aeb2b9);
	}

	.close-button {
		display: grid;
		width: 32px;
		height: 32px;
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 0.15rem;
		background: transparent;
		color: #eeeeee;
		font-size: 1.15rem;
		line-height: 1;
		cursor: pointer;
	}

	.close-button:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #ffffff;
	}

	.close-button:focus-visible {
		outline: 2px solid #d4c477;
		outline-offset: 2px;
	}

	.header-body {
		display: grid;
		grid-template-columns:
			190px
			minmax(0, 1fr);
		min-height: 180px;
	}

	.portrait-column {
		min-width: 0;
		padding: 0.7rem 0 0 0.7rem;
		border-right: 1px solid rgba(180, 162, 99, 0.55);
		background: #0d0e11;
	}

	.portrait-input {
		display: none;
	}

	.portrait-stack {
		display: grid;
		grid-template-rows:
			minmax(0, 1fr)
			32px
			32px;
		min-height: 100%;
	}

	.portrait-frame {
		position: relative;
		display: block;
		width: 100%;
		min-height: 231px;
		overflow: hidden;
		padding: 0;
		border: 1px solid #5d5a50;
		border-right: 0;
		border-bottom: 0;
		border-radius: 0.12rem 0 0 0;
		background: linear-gradient(135deg, #343238, #111216);
		color: inherit;
		cursor: pointer;
	}

	.portrait-frame img {
		display: block;
		width: 100%;
		height: 100%;
		min-height: 231px;
		object-fit: cover;
		object-position: center top;
	}

	.portrait-fallback {
		display: grid;
		width: 100%;
		height: 100%;
		min-height: 231px;
		place-items: center;
		color: #f0ede4;
		font-family: Georgia, serif;
		font-size: 2.8rem;
		font-weight: 700;
	}

	.portrait-overlay {
		position: absolute;
		right: 0.45rem;
		bottom: 0.45rem;
		padding: 0.28rem 0.45rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.16rem;
		background: rgba(0, 0, 0, 0.72);
		color: var(--tidy-font-white, #eeeeee);
		font-size: 0.68rem;
		font-weight: 600;
		line-height: 1;
		opacity: 0;
		transition: opacity 120ms ease;
	}

	.portrait-frame:hover .portrait-overlay,
	.portrait-frame:focus-visible .portrait-overlay {
		opacity: 1;
	}

	.portrait-frame:focus-visible {
		outline: 2px solid var(--tidy-font-gold, #b7a66c);
		outline-offset: -2px;
	}

	.health-bar,
	.hit-dice-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.85rem;
		font-size: 1.05rem;
		line-height: 1;
	}

	.health-bar {
		border-top: 1px solid #87b48e;
		background: linear-gradient(90deg, #1d703b, #2a9956);
		color: #f4fff6;
	}

	.hit-dice-bar {
		border-top: 1px solid #8d464c;
		background: linear-gradient(90deg, #55171e, #7d202d);
		color: #f2dddd;
	}

	.health-bar strong,
	.hit-dice-bar strong {
		font-weight: 700;
	}

	.character-overview {
		min-width: 0;
		padding: 0.65rem 1.35rem 1rem;
	}

	.identity-row {
		display: grid;
		grid-template-columns:
			minmax(0, 1fr)
			auto
			105px;
		align-items: start;
		gap: 1.25rem;
	}

	.identity {
		min-width: 0;
	}

	.identity h1 {
		margin: 0 0 0.55rem;
		color: #f1f0ec;
		font-family: 'Nodesto Caps Condensed', 'Times New Roman', serif;
		font-size: 2.05rem;
		font-variant: normal;
		font-weight: 700;
		letter-spacing: 0.01em;
		line-height: 0.95;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
	}

	.identity-details {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.18rem;
		font-family: var(--tidy-font-body, 'Roboto Condensed', Arial, sans-serif);
		font-size: 0.76rem;
		font-weight: 600;
		line-height: 1.35;
	}

	.identity-part {
		display: inline-flex;
		align-items: baseline;
		gap: 0.2rem;
		white-space: nowrap;
	}

	.identity-gold {
		color: #b7a66c;
		font-weight: 600;
	}

	.identity-grey {
		color: var(--tidy-font-grey, #9b9b9f);
		font-weight: 600;
	}

	.identity-white {
		color: var(--tidy-font-white, #eeeeee);
		font-weight: 600;
	}

	.identity-separator {
		margin: 0 0.08rem;
		color: #766d4c;
		font-size: 0.66rem;
		font-weight: 400;
	}

	.xp-block {
		display: grid;
		min-width: 190px;
		align-self: center;
		justify-items: end;
		gap: 0.45rem;
		color: #d5c992;
		font-size: 0.85rem;
	}

	.xp-track {
		width: 170px;
		height: 15px;
		padding: 2px;
		border: 1px solid #6b6d72;
		border-radius: 999px;
		background: #111216;
	}

	.xp-track span {
		display: block;
		width: 0;
		height: 100%;
		border-radius: 999px;
		background: #8d865f;
	}

	.level-emblem {
		display: grid;
		width: 100px;
		height: 100px;
		place-items: center;
		border: 5px double #a99d66;
		border-radius: 50%;
		background: radial-gradient(circle, #151619 48%, #3e3b2d);
		color: #f8f7f2;
		text-align: center;
		box-shadow: 0 0 0 3px #161719;
	}

	.level-emblem strong {
		display: block;
		font-size: 2.3rem;
		line-height: 1;
	}

	.level-emblem span {
		color: #d8ca91;
		font-size: 0.8rem;
		font-weight: 800;
	}

	.statistics-row {
		display: grid;
		grid-template-columns:
			90px
			minmax(0, 1fr)
			92px;
		align-items: center;
		gap: 1.15rem;
		margin-top: 1.35rem;
	}

	.armor-class {
		display: grid;
		place-items: center;
		gap: 0.3rem;
		color: #b8b8bc;
		font-size: 0.78rem;
	}

	.armor-emblem {
		display: grid;
		width: 70px;
		height: 80px;
		place-items: center;
		clip-path: polygon(50% 0%, 94% 24%, 82% 78%, 50% 100%, 18% 78%, 6% 24%);
		background: linear-gradient(#d4c99d, #686454);
		color: #17181b;
		font-size: 2rem;
		font-weight: 800;
	}

	.ability-row {
		display: grid;
		grid-template-columns: repeat(6, minmax(76px, 1fr));
		align-items: start;
		gap: clamp(0.35rem, 1vw, 0.85rem);
		min-width: 0;
	}

	.ability-stat {
		display: grid;
		min-width: 0;
		justify-items: center;
		gap: 0.5rem;
	}

	.ability-hex {
		position: relative;
		display: grid;
		width: 82px;
		height: 92px;
		grid-template-rows:
			24px
			1fr;
		align-items: center;
		justify-items: center;
		padding: 0.55rem 0.25rem 1.6rem;
		overflow: visible;
		clip-path: polygon(50% 0%, 93% 24%, 93% 75%, 50% 100%, 7% 75%, 7% 24%);
		background: linear-gradient(145deg, #9d936c 0, #696b70 7%, #181a1e 11%, #282b30 100%);
		color: #eeeeee;
	}

	.ability-label {
		color: #d1c38b;
		font-size: 0.82rem;
		font-weight: 800;
		line-height: 1;
	}

	.ability-modifier {
		font-size: 1.85rem;
		line-height: 1;
	}

	.ability-score {
		position: absolute;
		bottom: -8px;
		left: 50%;
		display: grid;
		width: 36px;
		height: 39px;
		place-items: center;
		transform: translateX(-50%);
		clip-path: polygon(50% 0%, 93% 24%, 93% 75%, 50% 100%, 7% 75%, 7% 24%);
		background: #111216;
		color: #f0f0f0;
		font-size: 1rem;
		font-weight: 700;
		z-index: 2;
	}

	.saving-throw {
		display: inline-flex;
		min-height: 18px;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		margin-top: 0.15rem;
		color: #eceaec;
		font-size: 0.83rem;
		font-weight: 700;
	}

	.saving-throw-value {
		color: #eceaec;
	}

	.saving-throw :global(.saving-throw-marker) {
		color: #d0bf7a;
		font-size: 0.52rem;
	}

	.initiative-stat {
		display: grid;
		justify-items: center;
	}

	.initiative-hex {
		display: grid;
		width: 78px;
		height: 84px;
		place-items: center;
		clip-path: polygon(50% 0%, 93% 24%, 93% 75%, 50% 100%, 7% 75%, 7% 24%);
		background: linear-gradient(145deg, #696b70, #22252a);
		color: #eeeeee;
	}

	.initiative-hex strong {
		align-self: end;
		font-size: 1.85rem;
		line-height: 1;
	}

	.initiative-hex span {
		align-self: start;
		color: #c8ba81;
		font-size: 0.78rem;
		font-weight: 800;
	}

	@media (max-width: 1150px) {
		.header-body {
			grid-template-columns:
				220px
				minmax(0, 1fr);
		}

		.ability-row {
			grid-template-columns: repeat(3, minmax(78px, 1fr));
			row-gap: 1.25rem;
		}

		.statistics-row {
			align-items: start;
		}
	}

	@media (max-width: 900px) {
		.header-body {
			grid-template-columns: 1fr;
		}

		.portrait-column {
			padding: 0.7rem;
			border-right: 0;
			border-bottom: 1px solid rgba(180, 162, 99, 0.55);
		}

		.portrait-stack {
			grid-template-columns:
				150px
				1fr
				1fr;
			grid-template-rows: 150px;
			min-height: 150px;
		}

		.portrait-frame,
		.portrait-frame img,
		.portrait-fallback {
			min-height: 150px;
			height: 150px;
		}

		.portrait-frame {
			border: 1px solid #5d5a50;
			border-radius: 0.12rem 0 0 0.12rem;
		}

		.identity-row {
			grid-template-columns:
				minmax(0, 1fr)
				85px;
		}

		.xp-block {
			display: none;
		}

		.level-emblem {
			width: 82px;
			height: 82px;
		}

		.statistics-row {
			grid-template-columns:
				80px
				minmax(0, 1fr);
		}

		.initiative-stat {
			display: none;
		}
	}

	@media (max-width: 600px) {
		.portrait-stack {
			grid-template-columns: 1fr;
			grid-template-rows:
				minmax(220px, 260px)
				32px
				32px;
		}

		.portrait-frame,
		.portrait-frame img,
		.portrait-fallback {
			width: 100%;
			height: 100%;
			min-height: 220px;
			max-height: 260px;
		}

		.portrait-frame {
			border-radius: 0.12rem 0.12rem 0 0;
		}

		.identity-row {
			grid-template-columns:
				minmax(0, 1fr)
				74px;
		}

		.level-emblem {
			width: 72px;
			height: 72px;
		}

		.level-emblem strong {
			font-size: 1.6rem;
		}

		.statistics-row {
			grid-template-columns: 1fr;
		}

		.armor-class {
			display: none;
		}

		.ability-row {
			grid-template-columns: repeat(2, minmax(80px, 1fr));
		}
	}
</style>
