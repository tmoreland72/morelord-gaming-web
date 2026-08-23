<svelte:options runes={false} />

<script lang="ts">
	import type { FoundryActorItem } from '../../models/foundry-actor';
	import type { StoredCharacter } from '../../models/stored-character';
	import { getItemImageSrc } from '../../assets/image-resolver';
	import ItemDetailsDialog from '../ItemDetailsDialog.svelte';
	import TidyIcon from '../TidyIcon.svelte';
	import {
		collapseAllDoubleIcon,
		expandAllIcon,
		expandIcon,
		filterIcon,
		nextIcon,
		searchIcon,
		spellSlotIcon
	} from '../../icons/tidy-icons';

	export let character: StoredCharacter;

	type UnknownRecord = Record<string, unknown>;

	interface SpellGroup {
		id: string;
		level: number;
		label: string;
		tone: 'ritual' | 'cantrip' | 'leveled';
		spells: FoundryActorItem[];
	}

	let searchText = '';
	let preparedOnly = false;
	let concentrationOnly = false;
	let activationFilters: string[] = [];
	let componentFilters: string[] = [];
	let canCastOnly = false;
	let schoolFilters: string[] = [];
	let sourceFilters: string[] = [];
	let filterMenuOpen = false;
	let collapsedGroups: string[] = [];
	let selectedItem: FoundryActorItem | null = null;

	$: actor = character.actor;
	$: allSpells = actor.items.filter((item) => item.type === 'spell').sort(sortSpells);
	$: spellSources = actor.items
		.filter((item) => item.type === 'class' || item.type === 'subclass')
		.map((item) => item.name)
		.filter((name, index, values) => values.indexOf(name) === index)
		.sort((left, right) => left.localeCompare(right));
	$: visibleSpells = allSpells.filter((spell) =>
		matchesFilters(
			spell,
			searchText,
			preparedOnly,
			concentrationOnly,
			activationFilters,
			componentFilters,
			canCastOnly,
			schoolFilters,
			sourceFilters,
			spellSources
		)
	);
	$: spellGroups = createSpellGroups(visibleSpells);
	$: allGroupsCollapsed =
		spellGroups.length > 0 && spellGroups.every((group) => collapsedGroups.includes(group.id));

	function toggleGroup(id: string): void {
		collapsedGroups = collapsedGroups.includes(id)
			? collapsedGroups.filter((groupId) => groupId !== id)
			: [...collapsedGroups, id];
	}

	function toggleAllGroups(): void {
		collapsedGroups = allGroupsCollapsed ? [] : spellGroups.map((group) => group.id);
	}

	function asRecord(value: unknown): UnknownRecord | undefined {
		return typeof value === 'object' && value !== null && !Array.isArray(value)
			? (value as UnknownRecord)
			: undefined;
	}

	function getActivities(item: FoundryActorItem): UnknownRecord[] {
		const activities = item.system?.activities;
		if (Array.isArray(activities))
			return activities.map(asRecord).filter(Boolean) as UnknownRecord[];
		const record = asRecord(activities);
		return record ? (Object.values(record).map(asRecord).filter(Boolean) as UnknownRecord[]) : [];
	}

	function getActivationTypes(item: FoundryActorItem): string[] {
		const direct = asRecord(item.system?.activation)?.type;
		return [
			direct,
			...getActivities(item).map((activity) => asRecord(activity.activation)?.type)
		].filter((value): value is string => typeof value === 'string' && value.length > 0);
	}

	function getSpellLevel(item: FoundryActorItem): number {
		const level = item.system?.level;
		return typeof level === 'number' ? level : 0;
	}

	function getPreparedValue(item: FoundryActorItem): number {
		const prepared = item.system?.prepared;
		return typeof prepared === 'number' ? prepared : 0;
	}

	function isPrepared(item: FoundryActorItem): boolean {
		return getPreparedValue(item) > 0;
	}

	function isAlwaysPrepared(item: FoundryActorItem): boolean {
		return getPreparedValue(item) >= 2;
	}

	function getProperties(item: FoundryActorItem): string[] {
		const properties = item.system?.properties;
		return Array.isArray(properties)
			? properties.filter((value): value is string => typeof value === 'string')
			: [];
	}

	function isRitual(item: FoundryActorItem): boolean {
		return getProperties(item).includes('ritual');
	}

	function isConcentration(item: FoundryActorItem): boolean {
		return getProperties(item).includes('concentration');
	}

	function getLevelLabel(level: number): string {
		if (level === 0) return 'Cantrips';

		const suffix = level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';

		return `${level}${suffix} Level`;
	}

	function getSchool(item: FoundryActorItem): string {
		const school = item.system?.school;
		const schools: Record<string, string> = {
			abj: 'Abjuration',
			con: 'Conjuration',
			div: 'Divination',
			enc: 'Enchantment',
			evo: 'Evocation',
			ill: 'Illusion',
			nec: 'Necromancy',
			trs: 'Transmutation'
		};

		return typeof school === 'string' ? (schools[school] ?? school) : 'Spell';
	}

	function getComponents(item: FoundryActorItem): string {
		const properties = getProperties(item);
		const components: string[] = [];

		if (properties.includes('vocal')) components.push('V');
		if (properties.includes('somatic')) components.push('S');
		if (properties.includes('material')) components.push('M');
		if (properties.includes('concentration')) components.push('C');
		if (properties.includes('ritual')) components.push('R');

		return components.join('') || '—';
	}

	function getActivation(item: FoundryActorItem): string {
		const type = getActivationTypes(item)[0];

		const labels: Record<string, string> = {
			action: 'A',
			bonus: 'BA',
			reaction: 'R',
			minute: '1 m',
			hour: '1 h',
			special: 'S'
		};

		return typeof type === 'string' ? (labels[type] ?? type) : '—';
	}

	function toggleListFilter(filters: string[], value: string): string[] {
		return filters.includes(value)
			? filters.filter((filter) => filter !== value)
			: [...filters, value];
	}

	function clearFilters(): void {
		preparedOnly = false;
		concentrationOnly = false;
		activationFilters = [];
		componentFilters = [];
		canCastOnly = false;
		schoolFilters = [];
		sourceFilters = [];
	}

	function canCastSpell(item: FoundryActorItem): boolean {
		const mode =
			(asRecord(item.system?.preparation)?.mode as string | undefined) ??
			(typeof item.system?.method === 'string' ? item.system.method : undefined);
		return (
			getSpellLevel(item) === 0 ||
			isPrepared(item) ||
			['always', 'atwill', 'innate', 'pact'].includes(mode ?? '')
		);
	}

	function getSpellSource(item: FoundryActorItem, sources: string[]): string {
		const sourceData =
			`${JSON.stringify(item.system?.source ?? '')} ${JSON.stringify(item.flags ?? '')} ${item.system?.requirements ?? ''}`.toLowerCase();
		const match = sources.find((source) => sourceData.includes(source.toLowerCase()));
		return match ?? (sources.length === 1 ? sources[0] : '');
	}

	function formatDistance(value: unknown, units: unknown): string {
		if (typeof value !== 'number' && typeof value !== 'string') return '—';
		if (value === '') return '—';

		const unitLabels: Record<string, string> = {
			ft: 'ft',
			mi: 'mi',
			m: 'm',
			km: 'km',
			self: 'Self',
			touch: 'Touch',
			spec: 'Special',
			any: 'Any'
		};

		const unit = typeof units === 'string' ? (unitLabels[units] ?? units) : '';

		if (unit === 'Self' || unit === 'Touch' || unit === 'Special' || unit === 'Any') {
			return unit;
		}

		return `${value}${unit ? ` ${unit}` : ''}`;
	}

	function getRange(item: FoundryActorItem): string {
		const range = asRecord(item.system?.range);
		return range ? formatDistance(range.value, range.units) : '—';
	}

	function getTarget(item: FoundryActorItem): string {
		const target = asRecord(item.system?.target);
		const affects = asRecord(target?.affects);
		const template = asRecord(target?.template);

		if (affects) {
			const count = affects.count;
			const type = affects.type;
			const special = affects.special;

			if (typeof special === 'string' && special.trim()) return special;
			if (typeof type === 'string' && type) {
				const quantity = typeof count === 'number' ? `${count} ` : '';
				return `${quantity}${type}`.trim();
			}
		}

		if (template) {
			const size = template.size;
			const units = template.units;
			const type = template.type;

			if (typeof type === 'string' && type) {
				const distance = formatDistance(size, units);
				return distance === '—' ? type : `${distance} ${type}`;
			}
		}

		return '—';
	}

	function getRoll(item: FoundryActorItem): string {
		const activities = asRecord(item.system?.activities);
		if (!activities) return '—';

		for (const activity of Object.values(activities)) {
			const record = asRecord(activity);
			if (!record) continue;

			const save = asRecord(record.save);
			const ability = save?.ability;
			const dc = asRecord(save?.dc)?.value;

			if (typeof ability === 'string' && ability) {
				return `${ability.toUpperCase()}${typeof dc === 'number' ? ` ${dc}` : ''}`;
			}

			const attack = asRecord(record.attack);
			const bonus = attack?.bonus;
			if (typeof bonus === 'string' && bonus.trim()) return bonus;
		}

		return '—';
	}

	function getSlotSummary(level: number): string | null {
		if (level <= 0) return null;

		const spellcasting = asRecord(character.derived?.spellcasting);
		const slots = asRecord(spellcasting?.slots);
		const slot = asRecord(slots?.[`spell${level}`]);

		const max = slot?.max;
		const spent = slot?.value;

		if (typeof max !== 'number' || max <= 0) return null;

		const remaining = typeof spent === 'number' ? Math.max(0, max - spent) : max;

		return `${remaining} / ${max}`;
	}

	function hasItemDetails(item: FoundryActorItem): boolean {
		const description = asRecord(item.system?.description)?.value;

		return typeof description === 'string' && description.trim().length > 0;
	}

	function openItemDetails(item: FoundryActorItem): void {
		if (hasItemDetails(item)) {
			selectedItem = item;
		}
	}

	function matchesFilters(
		item: FoundryActorItem,
		search: string,
		onlyPrepared: boolean,
		onlyConcentration: boolean,
		activations: string[],
		components: string[],
		onlyCanCast: boolean,
		schools: string[],
		sources: string[],
		availableSources: string[]
	): boolean {
		const query = search.trim().toLocaleLowerCase();

		if (query) {
			const haystack = `${item.name} ${getSchool(item)}`.toLocaleLowerCase();
			if (!haystack.includes(query)) return false;
		}

		if (onlyPrepared && !isPrepared(item)) return false;
		if (onlyConcentration && !isConcentration(item)) return false;

		const activationTypes = getActivationTypes(item);
		if (
			activations.length > 0 &&
			!activations.some((filter) =>
				filter === 'other'
					? activationTypes.some((type) => !['action', 'bonus', 'reaction'].includes(type))
					: activationTypes.includes(filter)
			)
		)
			return false;

		const properties = getProperties(item);
		const aliases: Record<string, string[]> = {
			verbal: ['verbal', 'vocal'],
			somatic: ['somatic'],
			material: ['material'],
			concentration: ['concentration'],
			ritual: ['ritual']
		};
		if (
			components.length > 0 &&
			!components.some((filter) => aliases[filter].some((value) => properties.includes(value)))
		)
			return false;
		if (onlyCanCast && !canCastSpell(item)) return false;
		if (schools.length > 0 && !schools.includes(String(item.system?.school ?? '').toLowerCase()))
			return false;
		if (sources.length > 0 && !sources.includes(getSpellSource(item, availableSources)))
			return false;

		return true;
	}

	function sortSpells(left: FoundryActorItem, right: FoundryActorItem): number {
		const levelDifference = getSpellLevel(left) - getSpellLevel(right);
		return levelDifference || left.name.localeCompare(right.name);
	}

	function createSpellGroups(values: FoundryActorItem[]): SpellGroup[] {
		const ritualOnly = values.filter((spell) => isRitual(spell) && !isPrepared(spell));
		const standard = values.filter((spell) => !ritualOnly.includes(spell));
		const groups: SpellGroup[] = [];

		if (ritualOnly.length > 0) {
			groups.push({
				id: 'ritual-only',
				level: -1,
				label: 'Ritual Only',
				tone: 'ritual',
				spells: ritualOnly
			});
		}

		const byLevel = new Map<number, FoundryActorItem[]>();
		for (const spell of standard) {
			const level = getSpellLevel(spell);
			const group = byLevel.get(level) ?? [];
			group.push(spell);
			byLevel.set(level, group);
		}

		for (const [level, spells] of [...byLevel.entries()].sort(([a], [b]) => a - b)) {
			groups.push({
				id: `level-${level}`,
				level,
				label: getLevelLabel(level),
				tone: level === 0 ? 'cantrip' : 'leveled',
				spells
			});
		}

		return groups;
	}
</script>

<section class="tidy-spellbook" aria-label="Spellbook">
	<div class="spell-toolbar">
		<button
			type="button"
			class="collapse-all-button"
			title={allGroupsCollapsed ? 'Expand all spell levels' : 'Collapse all spell levels'}
			on:click={toggleAllGroups}
			><TidyIcon icon={allGroupsCollapsed ? expandAllIcon : collapseAllDoubleIcon} /></button
		>

		<label class="spell-search">
			<TidyIcon icon={searchIcon} />
			<input
				type="search"
				bind:value={searchText}
				placeholder="Search"
				aria-label="Search spells"
			/>
		</label>

		<div class="spell-filters" aria-label="Spell filters">
			<button
				type="button"
				class:active={preparedOnly}
				on:click={() => (preparedOnly = !preparedOnly)}
			>
				Prepared
			</button>

			<button
				type="button"
				class:active={concentrationOnly}
				on:click={() => (concentrationOnly = !concentrationOnly)}
			>
				Concentration
			</button>
		</div>

		<div class="filter-menu-container">
			<button
				type="button"
				class="filter-button"
				class:active={filterMenuOpen ||
					activationFilters.length > 0 ||
					componentFilters.length > 0 ||
					canCastOnly ||
					schoolFilters.length > 0 ||
					sourceFilters.length > 0}
				aria-label="Filter spells"
				aria-expanded={filterMenuOpen}
				on:click={() => (filterMenuOpen = !filterMenuOpen)}><TidyIcon icon={filterIcon} /></button
			>

			{#if filterMenuOpen}
				<div class="filter-menu">
					<fieldset>
						<legend>Activation Cost</legend>
						<div class="filter-options">
							{#each [['action', 'Action'], ['bonus', 'Bonus Action'], ['reaction', 'Reaction'], ['other', 'Other']] as option (option[0])}
								<button
									type="button"
									class:active={activationFilters.includes(option[0])}
									on:click={() =>
										(activationFilters = toggleListFilter(activationFilters, option[0]))}
									>{option[1]}</button
								>
							{/each}
						</div>
					</fieldset>

					<fieldset>
						<legend>Spell Components</legend>
						<div class="filter-options">
							{#each [['verbal', 'Verbal'], ['somatic', 'Somatic'], ['material', 'Material'], ['concentration', 'Concentration'], ['ritual', 'Ritual']] as option (option[0])}
								<button
									type="button"
									class:active={componentFilters.includes(option[0]) ||
										(option[0] === 'concentration' && concentrationOnly)}
									on:click={() =>
										option[0] === 'concentration'
											? (concentrationOnly = !concentrationOnly)
											: (componentFilters = toggleListFilter(componentFilters, option[0]))}
									>{option[1]}</button
								>
							{/each}
						</div>
					</fieldset>

					<fieldset>
						<legend>Spell Preparation</legend>
						<div class="filter-options">
							<button
								type="button"
								class:active={preparedOnly}
								on:click={() => (preparedOnly = !preparedOnly)}>Prepared</button
							>
							<button
								type="button"
								class:active={canCastOnly}
								on:click={() => (canCastOnly = !canCastOnly)}>Can Cast</button
							>
						</div>
					</fieldset>

					<fieldset>
						<legend>Spell School</legend>
						<div class="filter-options">
							{#each [['abj', 'Abjuration'], ['con', 'Conjuration'], ['div', 'Divination'], ['enc', 'Enchantment'], ['evo', 'Evocation'], ['ill', 'Illusion'], ['nec', 'Necromancy'], ['psi', 'Psionic'], ['trs', 'Transmutation']] as option (option[0])}
								<button
									type="button"
									class:active={schoolFilters.includes(option[0])}
									on:click={() => (schoolFilters = toggleListFilter(schoolFilters, option[0]))}
									>{option[1]}</button
								>
							{/each}
						</div>
					</fieldset>

					{#if spellSources.length > 0}<fieldset>
							<legend>Source Item</legend>
							<div class="filter-options">
								{#each spellSources as source (source)}
									<button
										type="button"
										class:active={sourceFilters.includes(source)}
										on:click={() => (sourceFilters = toggleListFilter(sourceFilters, source))}
										>{source}</button
									>
								{/each}
							</div>
						</fieldset>{/if}

					<button type="button" class="clear-filters" on:click={clearFilters}>× Clear All</button>
				</div>
			{/if}
		</div>
	</div>

	{#if allSpells.length === 0}
		<div class="empty-state">No spells were found.</div>
	{:else if spellGroups.length === 0}
		<div class="empty-state">No spells match the current filters.</div>
	{:else}
		<div class="spell-groups">
			{#each spellGroups as group}
				<section
					class="spell-group"
					class:ritual={group.tone === 'ritual'}
					class:cantrip={group.tone === 'cantrip'}
				>
					<header class="spell-level-header">
						<button
							type="button"
							class="level-title"
							aria-expanded={!collapsedGroups.includes(group.id)}
							on:click={() => toggleGroup(group.id)}
						>
							<span class="collapse-mark"
								><TidyIcon
									icon={collapsedGroups.includes(group.id) ? nextIcon : expandIcon}
								/></span
							>
							<strong>{group.label}</strong>
							<span class="level-count">{group.spells.length}</span>
						</button>

						{#if getSlotSummary(group.level)}
							<div class="slot-summary" title="Remaining spell slots">
								<span class="slot-pip"><TidyIcon icon={spellSlotIcon} /></span>
								{getSlotSummary(group.level)}
							</div>
						{/if}

						<div class="column-headings" aria-hidden="true">
							<span>Components</span>
							<span>Time</span>
							<span>Target</span>
							<span>Range</span>
							<span>Roll</span>
						</div>
					</header>

					{#if !collapsedGroups.includes(group.id)}
						<div class="spell-list">
							{#each group.spells as spell}
								<article class="spell-row" class:unprepared={!isPrepared(spell)}>
									<button
										type="button"
										class="spell-primary item-details-button"
										disabled={!hasItemDetails(spell)}
										aria-label={`View details for ${spell.name}`}
										on:click={() => openItemDetails(spell)}
									>
										<span class="spell-icon">
											{#if getItemImageSrc(character, spell)}
												<img src={getItemImageSrc(character, spell)} alt="" />
											{:else}
												<span>{spell.name.charAt(0).toUpperCase()}</span>
											{/if}
										</span>

										<span class="spell-name-block">
											<strong>{spell.name}</strong>
											<small>
												{getSchool(spell)}
												{#if isAlwaysPrepared(spell)}
													· Always Prepared{/if}
												{#if isRitual(spell)}
													· Ritual{/if}
											</small>
										</span>
									</button>

									<div class="spell-cell components" title="Components">
										{getComponents(spell)}
									</div>
									<div class="spell-cell" title="Casting time">{getActivation(spell)}</div>
									<div class="spell-cell target" title="Target">{getTarget(spell)}</div>
									<div class="spell-cell" title="Range">{getRange(spell)}</div>
									<div class="spell-cell roll" title="Roll">{getRoll(spell)}</div>
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

<style>
	.tidy-spellbook {
		display: grid;
		gap: 0.75rem;
		color: var(--tidy-font-white);
		font-family: var(--tidy-font-body);
	}

	.spell-toolbar {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.collapse-all-button {
		width: 30px;
		min-height: 30px;
		flex: 0 0 30px;
		border: 1px solid var(--tidy-border);
		border-radius: var(--tidy-radius-small);
		background: var(--tidy-surface);
		color: var(--tidy-font-white);
		cursor: pointer;
	}

	.spell-search {
		display: flex;
		min-width: 0;
		flex: 1 1 auto;
		align-items: center;
		gap: 0.4rem;
		min-height: 30px;
		padding: 0 0.55rem;
		border: 1px solid var(--tidy-border);
		border-radius: var(--tidy-radius-small);
		background: var(--tidy-surface);
		color: var(--tidy-font-grey);
	}

	.spell-search input {
		width: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--tidy-font-white);
		font-size: 0.8rem;
	}

	.spell-search input::placeholder {
		color: var(--tidy-font-grey);
	}

	.spell-filters {
		display: flex;
		gap: 0.3rem;
	}

	.spell-filters button {
		min-height: 30px;
		padding: 0 0.6rem;
		border: 1px solid var(--tidy-border);
		border-radius: 0;
		background: var(--tidy-surface);
		color: var(--tidy-font-white);
		font-size: var(--tidy-font-size-sm);
		font-weight: 700;
		cursor: pointer;
	}

	.filter-menu-container {
		position: relative;
	}

	.filter-button {
		width: 30px;
		height: 30px;
		border: 1px solid var(--tidy-border);
		border-radius: var(--tidy-radius-small);
		background: var(--tidy-surface);
		color: var(--tidy-font-white);
		cursor: pointer;
	}

	.filter-button.active,
	.filter-menu button.active {
		border-color: #c43d49;
		background: var(--tidy-dark-red);
		color: var(--tidy-font-bright-white);
	}

	.filter-menu {
		position: absolute;
		z-index: 20;
		top: calc(100% + 2px);
		right: 0;
		width: min(560px, calc(100vw - 3rem));
		padding: 0.75rem;
		border: 1px solid #555a62;
		border-radius: var(--tidy-radius-small);
		background: #24272d;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
	}

	.filter-menu fieldset {
		margin: 0 0 0.75rem;
		padding: 0;
		border: 0;
	}

	.filter-menu legend {
		margin-bottom: 0.35rem;
		color: var(--tidy-font-grey);
		font-size: var(--tidy-font-size-sm);
		font-weight: 700;
	}

	.filter-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.filter-menu .filter-options button,
	.filter-menu .clear-filters {
		min-height: 28px;
		padding: 0 0.7rem;
		border: 1px solid var(--tidy-border-strong);
		border-radius: var(--tidy-radius-small);
		background: var(--tidy-surface-raised);
		color: var(--tidy-font-white);
		font-size: var(--tidy-font-size-sm);
		font-weight: 600;
		cursor: pointer;
	}

	.filter-menu .clear-filters {
		width: 100%;
	}

	.spell-filters button:hover {
		border-color: var(--tidy-font-gold);
		color: var(--tidy-font-gold);
	}

	.spell-filters button.active {
		border-color: #c43d49;
		background: var(--tidy-dark-red);
		color: var(--tidy-font-bright-white);
	}

	.spell-groups {
		display: grid;
		gap: 0.72rem;
	}

	.spell-group {
		overflow: hidden;
		border: 1px solid var(--tidy-border-soft);
		border-radius: var(--tidy-radius-medium);
		background: var(--tidy-background-deep);
	}

	.spell-level-header {
		display: grid;
		grid-template-columns: minmax(240px, 1fr) auto minmax(440px, 42%);
		min-height: var(--tidy-section-height);
		align-items: center;
		background: var(--tidy-category-background);
		color: var(--tidy-font-bright-white);
		font-family: var(--tidy-font-display);
		font-size: var(--tidy-category-font-size);
		text-transform: uppercase;
	}

	.spell-group.ritual .spell-level-header {
		background: var(--tidy-category-background);
	}

	.spell-group.cantrip .spell-level-header {
		background: var(--tidy-category-background);
	}

	.level-title,
	.slot-summary {
		display: flex;
		align-items: center;
		gap: 0.38rem;
		padding: 0 0.55rem;
	}

	.level-title {
		align-self: stretch;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font: inherit;
		text-transform: inherit;
	}

	.level-title strong {
		color: var(--tidy-font-bright-white);
		font-family: var(--tidy-font-display);
		font-size: var(--tidy-category-font-size);
		font-weight: 700;
		letter-spacing: var(--tidy-category-letter-spacing);
		line-height: 1;
		text-transform: uppercase;
	}

	.collapse-mark {
		font-size: 1rem;
		line-height: 1;
	}

	.level-count {
		color: rgba(255, 255, 255, 0.75);
		font-family: var(--tidy-font-body);
		font-size: var(--tidy-font-size-sm);
	}

	.slot-summary {
		font-family: var(--tidy-font-body);
		font-size: var(--tidy-font-size-sm);
		white-space: nowrap;
		font-weight: 700;
	}

	.slot-pip {
		font-size: 0.7rem;
	}

	.column-headings {
		display: grid;
		grid-template-columns: 1.05fr 0.65fr 1.15fr 0.75fr 0.65fr;
		align-self: stretch;
		font-family: var(--tidy-font-body);
		font-size: var(--tidy-font-size-sm);
	}

	.column-headings span {
		display: grid;
		place-items: center;
		padding: 0 0.35rem;
		border-left: 1px solid rgba(255, 255, 255, 0.2);
	}

	.spell-list {
		display: grid;
	}

	.spell-row {
		display: grid;
		grid-template-columns: minmax(240px, 1fr) minmax(440px, 42%);
		min-height: var(--tidy-row-height);
		border-bottom: 1px solid var(--tidy-border-soft);
		background: var(--tidy-surface-row);
	}

	.spell-row:nth-child(even) {
		background: var(--tidy-surface-row-alt);
	}

	.spell-row:last-child {
		border-bottom: 0;
	}

	.spell-row.unprepared {
		opacity: 0.78;
	}

	.spell-primary {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.48rem;
		padding: 0.22rem 0.45rem;
	}

	.spell-icon {
		display: grid;
		width: 32px;
		height: 32px;
		flex: 0 0 32px;
		overflow: hidden;
		place-items: center;
		border: 1px solid var(--tidy-border-gold);
		border-radius: 2px;
		background: var(--tidy-surface-dark);
		color: var(--tidy-font-gold);
		font-weight: 700;
	}

	.spell-icon img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.spell-name-block {
		min-width: 0;
	}

	.spell-name-block strong,
	.spell-name-block small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.spell-name-block strong {
		color: var(--tidy-font-white);
		font-size: var(--tidy-font-size-lg);
		line-height: 1.05;
	}

	.spell-name-block small {
		margin-top: 0.15rem;
		color: var(--tidy-font-grey);
		font-size: var(--tidy-font-size-xs);
	}

	.spell-row > :global(.spell-cell),
	.spell-row .spell-cell {
		display: grid;
		min-width: 0;
		place-items: center;
		padding: 0.2rem 0.3rem;
		border-left: 1px solid var(--tidy-border-soft);
		color: var(--tidy-font-white);
		font-size: var(--tidy-font-size-sm);
		font-weight: 600;
		text-align: center;
	}

	.spell-row {
		grid-template-columns: minmax(240px, 1fr) 1.05fr 0.65fr 1.15fr 0.75fr 0.65fr;
	}

	.components {
		letter-spacing: 0.06em;
	}

	.target {
		line-height: 1.05;
	}

	.roll {
		color: var(--tidy-font-gold);
	}

	.empty-state {
		padding: 2rem;
		border: 1px dashed var(--tidy-border-strong);
		border-radius: var(--tidy-radius-medium);
		background: var(--tidy-surface-row);
		color: var(--tidy-font-grey);
		text-align: center;
	}

	@media (max-width: 900px) {
		.spell-toolbar {
			flex-wrap: wrap;
		}

		.spell-search {
			flex-basis: calc(100% - 39px);
		}

		.spell-filters {
			width: 100%;
		}

		.spell-level-header {
			grid-template-columns: 1fr auto;
		}

		.column-headings {
			display: none;
		}

		.spell-row {
			grid-template-columns: minmax(220px, 1fr) repeat(2, minmax(70px, auto));
		}

		.spell-row .spell-cell:nth-of-type(1),
		.spell-row .spell-cell:nth-of-type(4),
		.spell-row .spell-cell:nth-of-type(5) {
			display: none;
		}
	}
</style>
