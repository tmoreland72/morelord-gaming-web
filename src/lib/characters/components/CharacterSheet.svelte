<svelte:options runes={false} />

<script lang="ts">
	import type { StoredCharacter } from '../models/stored-character';

	import type { TidyIcon as TidyIconDefinition } from '../icons/tidy-icons';

	import TidyStyleHeader from './TidyStyleHeader.svelte';
	import TidyIcon from './TidyIcon.svelte';

	import SummaryTab from './tabs/SummaryTab.svelte';
	import InventoryTab from './tabs/InventoryTab.svelte';
	import SpellsTab from './tabs/SpellsTab.svelte';
	import FeaturesTab from './tabs/FeaturesTab.svelte';
	import BiographyTab from './tabs/BiographyTab.svelte';
	import DiagnosticsTab from './tabs/DiagnosticsTab.svelte';

	import {
		biographyIcon,
		characterIcon,
		diagnosticsIcon,
		featuresIcon,
		inventoryIcon,
		spellbookIcon
	} from '../icons/tidy-icons';

	export let character: StoredCharacter;
	export let onClose: () => void;
	export let onPortraitChange: (file: File) => void;

	type TabId = 'character' | 'inventory' | 'spellbook' | 'features' | 'biography' | 'diagnostics';

	interface SheetTab {
		id: TabId;
		label: string;
		icon: TidyIconDefinition;
	}

	const tabs: SheetTab[] = [
		{
			id: 'character',
			label: 'Character',
			icon: characterIcon
		},
		{
			id: 'inventory',
			label: 'Inventory',
			icon: inventoryIcon
		},
		{
			id: 'spellbook',
			label: 'Spellbook',
			icon: spellbookIcon
		},
		{
			id: 'features',
			label: 'Features',
			icon: featuresIcon
		},
		{
			id: 'biography',
			label: 'Biography',
			icon: biographyIcon
		},
		{
			id: 'diagnostics',
			label: 'Diagnostics',
			icon: diagnosticsIcon
		}
	];

	let activeTab: TabId = 'character';

	function selectTab(tabId: TabId): void {
		activeTab = tabId;
	}
</script>

<section class="tidy-sheet">
	<TidyStyleHeader {character} {onClose} onPortraitSelect={onPortraitChange} />

	<nav class="tidy-navigation" aria-label="Character sheet sections">
		{#each tabs as tab}
			<button
				type="button"
				class:active={activeTab === tab.id}
				class:diagnostics={tab.id === 'diagnostics'}
				aria-current={activeTab === tab.id ? 'page' : undefined}
				on:click={() => selectTab(tab.id)}
			>
				<TidyIcon icon={tab.icon} className="tab-icon" />

				<span class="tab-label">
					{tab.label}
				</span>
			</button>
		{/each}
	</nav>

	<main class="sheet-content">
		{#if activeTab === 'character'}
			<SummaryTab {character} />
		{:else if activeTab === 'inventory'}
			<InventoryTab {character} />
		{:else if activeTab === 'spellbook'}
			<SpellsTab {character} />
		{:else if activeTab === 'features'}
			<FeaturesTab {character} />
		{:else if activeTab === 'biography'}
			<BiographyTab actor={character.actor} />
		{:else if activeTab === 'diagnostics'}
			<DiagnosticsTab actor={character.actor} />
		{/if}
	</main>
</section>

<style>
	button {
		font: inherit;
	}

	.tidy-sheet {
		width: 100%;
		min-height: 720px;
		overflow: hidden;
		border: 1px solid #3f4146;
		border-radius: 0.35rem;
		background: linear-gradient(rgba(12, 13, 15, 0.98), rgba(8, 9, 11, 0.99));
		box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5);
		font-family: var(--tidy-font-body, 'Roboto Condensed', Arial, sans-serif);
		font-size: 0.86rem;
	}

	.tidy-navigation {
		display: flex;
		min-height: 40px;
		align-items: center;
		gap: 0.1rem;
		padding: 0 0.7rem;
		overflow-x: auto;
		border-top: 1px solid rgba(176, 157, 90, 0.3);
		border-bottom: 1px solid rgba(176, 157, 90, 0.58);
		background: linear-gradient(rgba(8, 9, 11, 0.99), rgba(12, 13, 15, 0.99));
	}

	.tidy-navigation button {
		position: relative;
		display: flex;
		min-height: 39px;
		flex: 0 0 auto;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.72rem;
		border: 0;
		background: transparent;
		color: #dedee1;
		font-size: 0.86rem;
		font-weight: 600;
		line-height: 1;
		cursor: pointer;
	}

	.tidy-navigation button::after {
		position: absolute;
		right: 0.55rem;
		bottom: 0;
		left: 0.55rem;
		height: 3px;
		background: transparent;
		content: '';
	}

	.tidy-navigation button:hover {
		background: rgba(255, 255, 255, 0.035);
		color: #ffffff;
	}

	.tidy-navigation button.active {
		color: #ffffff;
	}

	.tidy-navigation button.active::after {
		background: linear-gradient(90deg, #d37ca9, #efabc6);
	}

	.tidy-navigation button.diagnostics {
		margin-left: auto;
		color: #96989e;
		font-size: 0.76rem;
	}

	.tidy-navigation button.diagnostics.active {
		color: #ffffff;
	}

	.tidy-navigation :global(.tab-icon) {
		width: 1rem;
		height: 1rem;
		color: #c8c9cd;
		font-size: 0.8rem;
	}

	.tidy-navigation button:hover :global(.tab-icon),
	.tidy-navigation button.active :global(.tab-icon) {
		color: #ffffff;
	}

	.tab-label {
		color: inherit;
		font-size: inherit;
		font-weight: inherit;
	}

	.sheet-content {
		min-height: 600px;
		padding: 0.75rem;
		background:
			radial-gradient(circle at 30% 35%, rgba(91, 82, 64, 0.07), transparent 28%),
			repeating-linear-gradient(
				135deg,
				rgba(255, 255, 255, 0.008) 0,
				rgba(255, 255, 255, 0.008) 2px,
				transparent 2px,
				transparent 6px
			),
			#111214;
	}

	.sheet-content :global(.tab-panel),
	.sheet-content :global(.sheet-section) {
		border-color: #3d4046;
		border-radius: 0.25rem;
		background: rgba(28, 30, 34, 0.94);
	}

	@media (max-width: 760px) {
		.tidy-navigation {
			padding: 0 0.25rem;
		}

		.tidy-navigation button {
			min-height: 38px;
			padding: 0.35rem 0.5rem;
		}

		.tidy-navigation button.diagnostics {
			margin-left: 0;
		}

		.sheet-content {
			padding: 0.5rem;
		}
	}
</style>
