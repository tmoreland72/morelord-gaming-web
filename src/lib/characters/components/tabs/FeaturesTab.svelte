<svelte:options runes={false} />

<script lang="ts">
	import TidyIcon from '../TidyIcon.svelte';
	import {
		collapseAllDoubleIcon,
		expandIcon,
		expandAllIcon,
		filterIcon,
		nextIcon,
		searchIcon,
		settingsIcon,
		sortIcon
	} from '../../icons/tidy-icons';
	import type { FoundryActorItem } from '../../models/foundry-actor';
	import type { StoredCharacter } from '../../models/stored-character';
	import { getItemImageSrc } from '../../assets/image-resolver';
	import ItemDetailsDialog from '../ItemDetailsDialog.svelte';

	export let character: StoredCharacter;

	type UnknownRecord = Record<string, unknown>;

	interface FeatureGroup {
		id: string;
		label: string;
		source: FoundryActorItem | undefined;
		items: FoundryActorItem[];
		order: number;
	}

	let searchText = '';
	let actionFilter = 'all';
	let collapsedGroups = new Set<string>();
	let selectedItem: FoundryActorItem | null = null;

	$: actor = character.actor;
	$: sourceItems = actor.items.filter((item) =>
		['class', 'subclass', 'race', 'species', 'background'].includes(item.type)
	);
	$: sourceById = new Map(
		sourceItems.filter((item) => Boolean(item._id)).map((item) => [item._id as string, item])
	);
	$: features = actor.items.filter((item) => item.type === 'feat');
	$: visibleFeatures = features.filter(matchesFilters);
	$: groups = buildGroups(visibleFeatures);
	$: allGroupsCollapsed =
		groups.length > 0 && groups.every((group) => collapsedGroups.has(group.id));

	function isRecord(value: unknown): value is UnknownRecord {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	function asString(value: unknown): string | undefined {
		return typeof value === 'string' && value.trim() ? value : undefined;
	}

	function asNumber(value: unknown): number | undefined {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string' && value.trim()) {
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : undefined;
		}
		return undefined;
	}

	function getNestedValue(source: unknown, ...keys: string[]): unknown {
		let current = source;
		for (const key of keys) {
			if (!isRecord(current)) return undefined;
			current = current[key];
		}
		return current;
	}

	function getAdvancementSourceId(item: FoundryActorItem): string | undefined {
		const origin =
			asString(getNestedValue(item.flags, 'dnd5e', 'advancementOrigin')) ??
			asString(getNestedValue(item.flags, 'dnd5e', 'advancementRoot'));

		if (!origin) return undefined;
		return origin.split('.')[0] || undefined;
	}

	function getSourceItem(item: FoundryActorItem): FoundryActorItem | undefined {
		const advancementId = getAdvancementSourceId(item);
		if (advancementId) {
			const source = sourceById.get(advancementId);
			if (source) return source;
		}

		const requirements = asString(item.system?.requirements)?.toLocaleLowerCase();
		if (requirements) {
			return sourceItems.find((candidate) =>
				requirements.includes(candidate.name.toLocaleLowerCase())
			);
		}

		const featureType = asString(getNestedValue(item.system, 'type', 'value'));
		if (featureType === 'race') {
			return sourceItems.find(
				(candidate) => candidate.type === 'race' || candidate.type === 'species'
			);
		}
		if (featureType === 'background') {
			return sourceItems.find((candidate) => candidate.type === 'background');
		}

		return undefined;
	}

	function getSourceOrder(source: FoundryActorItem | undefined): number {
		if (!source) return 999;
		const typeOrder: Record<string, number> = {
			class: 10,
			subclass: 20,
			background: 30,
			race: 40,
			species: 40
		};
		return typeOrder[source.type] ?? 900;
	}

	function buildGroups(items: FoundryActorItem[]): FeatureGroup[] {
		const grouped = new Map<string, FeatureGroup>();

		for (const item of items) {
			const source = getSourceItem(item);
			const id = source?._id ?? 'other';
			const label = source ? `${source.name} Features` : 'Other Features';

			const group = grouped.get(id) ?? {
				id,
				label,
				source,
				items: [],
				order: getSourceOrder(source)
			};

			group.items.push(item);
			grouped.set(id, group);
		}

		return [...grouped.values()]
			.map((group) => ({
				...group,
				items: group.items.sort(sortFeatures)
			}))
			.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
	}

	function sortFeatures(left: FoundryActorItem, right: FoundryActorItem): number {
		const leftLevel = getFeatureLevel(left) ?? 0;
		const rightLevel = getFeatureLevel(right) ?? 0;
		return leftLevel - rightLevel || left.name.localeCompare(right.name);
	}

	function getFeatureLevel(item: FoundryActorItem): number | undefined {
		return asNumber(getNestedValue(item.system, 'prerequisites', 'level'));
	}

	function getUsesLabel(item: FoundryActorItem): string {
		const max = asNumber(getNestedValue(item.system, 'uses', 'max'));
		const spent = asNumber(getNestedValue(item.system, 'uses', 'spent')) ?? 0;
		if (!max || max <= 0) return '–';
		return `${Math.max(0, max - spent)} / ${max}`;
	}

	function getRecoveryLabel(item: FoundryActorItem): string {
		const recovery = getNestedValue(item.system, 'uses', 'recovery');
		if (!Array.isArray(recovery) || recovery.length === 0) return '–';

		const labels = recovery
			.map((entry) => {
				if (!isRecord(entry)) return undefined;
				const period = asString(entry.period) ?? asString(entry.type);
				return period ? formatRecovery(period) : undefined;
			})
			.filter((value): value is string => Boolean(value));

		return labels.length ? labels.join(', ') : '–';
	}

	function getActivity(item: FoundryActorItem): UnknownRecord | undefined {
		const activities = item.system?.activities;
		if (!isRecord(activities)) return undefined;
		return Object.values(activities).find(isRecord);
	}

	function getActivationType(item: FoundryActorItem): string | undefined {
		return (
			asString(getNestedValue(item.system, 'activation', 'type')) ??
			asString(getNestedValue(getActivity(item), 'activation', 'type')) ??
			asString(getNestedValue(getActivity(item), 'type'))
		);
	}

	function getTimeLabel(item: FoundryActorItem): string {
		const activation = getActivationType(item);
		if (!activation) return '–';

		const labels: Record<string, string> = {
			action: 'A',
			bonus: 'BA',
			reaction: 'R',
			special: 'Special',
			minute: '1 m',
			hour: '1 h',
			legendary: 'Legendary',
			lair: 'Lair'
		};

		return labels[activation] ?? formatLabel(activation);
	}

	function getSourceLabel(item: FoundryActorItem): string {
		const source = getSourceItem(item);
		if (!source) return '–';

		const level = getFeatureLevel(item);
		if (source.type === 'subclass' && level) return `${source.name} ${level}`;
		if ((source.type === 'race' || source.type === 'species') && source.name) {
			return source.name;
		}

		return '–';
	}

	function matchesFilters(item: FoundryActorItem): boolean {
		const query = searchText.trim().toLocaleLowerCase();
		if (query) {
			const sourceName = getSourceItem(item)?.name ?? '';
			const identifier = asString(item.system?.identifier) ?? '';
			const haystack = `${item.name} ${sourceName} ${identifier}`.toLocaleLowerCase();
			if (!haystack.includes(query)) return false;
		}

		if (actionFilter === 'all') return true;
		return getActivationType(item) === actionFilter;
	}

	function setActionFilter(value: string): void {
		actionFilter = actionFilter === value ? 'all' : value;
	}

	function toggleGroup(id: string): void {
		const next = new Set(collapsedGroups);
		next.has(id) ? next.delete(id) : next.add(id);
		collapsedGroups = next;
	}

	function toggleAllGroups(): void {
		if (allGroupsCollapsed) {
			collapsedGroups = new Set();
		} else {
			collapsedGroups = new Set(groups.map((group) => group.id));
		}
	}

	function formatRecovery(value: string): string {
		const labels: Record<string, string> = {
			sr: 'SR',
			lr: 'LR',
			day: 'Daily',
			dawn: 'Dawn',
			dusk: 'Dusk',
			turn: 'Turn',
			recoverAll: 'LR'
		};
		return labels[value] ?? formatLabel(value);
	}

	function formatLabel(value: string): string {
		return value
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ')
			.replace(/\b\w/g, (character) => character.toUpperCase());
	}

	function getInitial(name: string): string {
		return name.charAt(0).toUpperCase();
	}
</script>

<section class="features-tab">
	<div class="toolbar">
		<button
			class="toolbar-icon"
			type="button"
			title={allGroupsCollapsed ? 'Expand all groups' : 'Collapse all groups'}
			on:click={toggleAllGroups}
			><TidyIcon icon={allGroupsCollapsed ? expandAllIcon : collapseAllDoubleIcon} /></button
		>

		<label class="search-field">
			<TidyIcon icon={searchIcon} />
			<input
				bind:value={searchText}
				type="search"
				placeholder="Search"
				aria-label="Search features"
			/>
		</label>

		<div class="toolbar-filters" aria-label="Feature filters">
			<button
				class:active={actionFilter === 'action'}
				type="button"
				on:click={() => setActionFilter('action')}>Action</button
			>
			<button
				class:active={actionFilter === 'bonus'}
				type="button"
				on:click={() => setActionFilter('bonus')}>Bonus Action</button
			>
			<button
				class:active={actionFilter === 'reaction'}
				type="button"
				on:click={() => setActionFilter('reaction')}>Reaction</button
			>
			<button
				class:active={actionFilter === 'special'}
				type="button"
				on:click={() => setActionFilter('special')}>Can Use</button
			>
		</div>

		<button class="toolbar-icon" type="button" title="Filter options" disabled
			><TidyIcon icon={filterIcon} /></button
		>
		<button class="toolbar-icon" type="button" title="Sort options" disabled
			><TidyIcon icon={sortIcon} /></button
		>
		<button class="toolbar-icon" type="button" title="Settings" disabled
			><TidyIcon icon={settingsIcon} /></button
		>
	</div>

	{#if groups.length === 0}
		<div class="empty-state">No character features match the current filters.</div>
	{:else}
		<div class="group-list">
			{#each groups as group}
				<section class="feature-group">
					<header class="group-header">
						<button class="group-title" type="button" on:click={() => toggleGroup(group.id)}>
							<span class="group-toggle" aria-hidden="true"
								><TidyIcon icon={collapsedGroups.has(group.id) ? nextIcon : expandIcon} /></span
							>
							<h3>
								<span class="group-name">{group.label}</span>
								<span class="group-count">{group.items.length}</span>
							</h3>
						</button>

						<div class="group-columns" aria-hidden="true">
							<span>Uses</span>
							<span>Time</span>
							<span>Recovery</span>
							<span>Source</span>
						</div>
					</header>

					{#if !collapsedGroups.has(group.id)}
						<div class="feature-list">
							{#each group.items as feature}
								{@const image = getItemImageSrc(character, feature)}
								<article class="feature-row detail-trigger">
									<button
										type="button"
										class="feature-name-cell feature-details-button"
										aria-label={`View details for ${feature.name}`}
										on:click={() => (selectedItem = feature)}
									>
										<div class="feature-icon">
											{#if image}
												<img src={image} alt="" />
											{:else}
												<span>{getInitial(feature.name)}</span>
											{/if}
										</div>
										<strong>{feature.name}</strong>
									</button>

									<span class="feature-cell muted">{getUsesLabel(feature)}</span>
									<span class="feature-cell">{getTimeLabel(feature)}</span>
									<span class="feature-cell">{getRecoveryLabel(feature)}</span>
									<span class="feature-cell source-cell">{getSourceLabel(feature)}</span>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	{/if}
</section>

<ItemDetailsDialog {character} item={selectedItem} onClose={() => (selectedItem = null)} />
