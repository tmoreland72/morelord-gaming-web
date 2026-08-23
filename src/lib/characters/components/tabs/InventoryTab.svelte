<svelte:options runes={false} />

<script lang="ts">
	import type { FoundryActorItem } from '../../models/foundry-actor';

	import type { StoredCharacter } from '../../models/stored-character';

	import { getItemImageSrc } from '../../assets/image-resolver';

	import ItemDetailsDialog from '../ItemDetailsDialog.svelte';
	import TidyIcon from '../TidyIcon.svelte';
	import {
		attunementIcon,
		collapseAllDoubleIcon,
		expandAllIcon,
		expandIcon,
		filterIcon,
		nextIcon,
		searchIcon,
		carryingCapacityIcon
	} from '../../icons/tidy-icons';

	export let character: StoredCharacter;

	$: actor = character.actor;

	type UnknownRecord = Record<string, unknown>;

	interface InventoryGroup {
		id: string;
		label: string;
		items: FoundryActorItem[];
	}

	interface ValueParts {
		value: string;
		unit: string;
	}

	const inventoryTypes = ['weapon', 'equipment', 'consumable', 'tool', 'container', 'loot'];

	const groupOrder = ['weapon', 'equipment', 'consumable', 'tool', 'container', 'loot'];

	const groupLabels: Record<string, string> = {
		weapon: 'Weapons',
		equipment: 'Equipment',
		consumable: 'Consumables',
		tool: 'Tools',
		container: 'Containers',
		loot: 'Loot'
	};

	let searchText = '';
	let equippedOnly = false;
	let activationFilters: string[] = [];
	let rarityFilters: string[] = [];
	let miscellaneousFilters: string[] = [];
	let filterMenuOpen = false;
	let collapsedGroups: string[] = [];
	let selectedItem: FoundryActorItem | null = null;

	$: allInventory = actor.items
		.filter((item) => inventoryTypes.includes(item.type))
		.sort(sortInventoryItems);

	$: visibleInventory = allInventory.filter((item) =>
		matchesFilters(
			item,
			searchText,
			equippedOnly,
			activationFilters,
			rarityFilters,
			miscellaneousFilters
		)
	);

	$: groups = createGroups(visibleInventory);
	$: allGroupsCollapsed =
		groups.length > 0 && groups.every((group) => collapsedGroups.includes(group.id));

	$: strengthScore = getAbilityScore('str');

	$: sizeLabel = getSizeLabel();

	$: carryingCapacity = strengthScore * 15;

	$: totalWeight = calculateTotalWeight(allInventory);

	$: encumbrancePercent =
		carryingCapacity > 0 ? Math.min(100, (totalWeight / carryingCapacity) * 100) : 0;

	$: currency = getCurrency();

	function isRecord(value: unknown): value is UnknownRecord {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
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

	function asString(value: unknown): string | undefined {
		return typeof value === 'string' ? value : undefined;
	}

	function asBoolean(value: unknown): boolean {
		return value === true || value === 1 || value === 'true' || value === '1';
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

	function handleSearch(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;

		searchText = input.value;
	}

	function toggleEquipped(): void {
		equippedOnly = !equippedOnly;
	}

	function toggleFilter(collection: string[], value: string): string[] {
		return collection.includes(value)
			? collection.filter((entry) => entry !== value)
			: [...collection, value];
	}

	function toggleActivation(value: string): void {
		activationFilters = toggleFilter(activationFilters, value);
	}

	function toggleRarity(value: string): void {
		rarityFilters = toggleFilter(rarityFilters, value);
	}

	function toggleMiscellaneous(value: string): void {
		miscellaneousFilters = toggleFilter(miscellaneousFilters, value);
	}

	function clearFilters(): void {
		activationFilters = [];
		rarityFilters = [];
		miscellaneousFilters = [];
		equippedOnly = false;
	}

	function toggleGroup(id: string): void {
		collapsedGroups = collapsedGroups.includes(id)
			? collapsedGroups.filter((groupId) => groupId !== id)
			: [...collapsedGroups, id];
	}

	function toggleAllGroups(): void {
		collapsedGroups = allGroupsCollapsed ? [] : groups.map((group) => group.id);
	}

	function getActivities(item: FoundryActorItem): UnknownRecord[] {
		const activities = item.system?.activities;

		if (Array.isArray(activities)) return activities.filter(isRecord);
		return isRecord(activities) ? Object.values(activities).filter(isRecord) : [];
	}

	function hasActivation(item: FoundryActorItem, activation: string): boolean {
		const direct = asString(getNestedValue(item.system, 'activation', 'type'));
		return (
			direct === activation ||
			getActivities(item).some(
				(activity) => asString(getNestedValue(activity, 'activation', 'type')) === activation
			)
		);
	}

	function isMagical(item: FoundryActorItem): boolean {
		const properties = item.system?.properties;

		return (
			(Array.isArray(properties) && properties.includes('mgc')) ||
			(asNumber(item.system?.magicalBonus) ?? 0) > 0
		);
	}

	function matchesActivationFilters(item: FoundryActorItem, filters: string[]): boolean {
		if (filters.length === 0) return true;

		return filters.some((filter) => {
			if (filter === 'can-use') return getActivities(item).length > 0;
			if (filter === 'magical') return isMagical(item);
			return hasActivation(item, filter);
		});
	}

	function matchesMiscellaneousFilters(item: FoundryActorItem, filters: string[]): boolean {
		if (filters.length === 0) return true;

		return filters.some((filter) => {
			if (filter === 'equipped') return asBoolean(item.system?.equipped);
			if (filter === 'attuned') return asBoolean(item.system?.attuned);

			const attunement = item.system?.attunement;
			if (filter === 'optional-attunement') return attunement === 'optional' || attunement === 1;
			if (filter === 'attunement-required') return attunement === 'required' || attunement === 2;
			return false;
		});
	}

	function matchesFilters(
		item: FoundryActorItem,
		query: string,
		onlyEquipped: boolean,
		activation: string[],
		rarities: string[],
		miscellaneous: string[]
	): boolean {
		const search = query.trim().toLowerCase();

		if (search && !item.name.toLowerCase().includes(search)) {
			return false;
		}

		if (onlyEquipped && !asBoolean(item.system?.equipped)) {
			return false;
		}

		if (!matchesActivationFilters(item, activation)) return false;

		const rarity = (asString(item.system?.rarity) ?? '').toLowerCase().replace(/\s+/g, '-');
		if (rarities.length > 0 && !rarities.includes(rarity)) return false;

		if (!matchesMiscellaneousFilters(item, miscellaneous)) return false;

		return true;
	}

	function sortInventoryItems(left: FoundryActorItem, right: FoundryActorItem): number {
		const leftIndex = groupOrder.indexOf(left.type);

		const rightIndex = groupOrder.indexOf(right.type);

		const normalizedLeft = leftIndex === -1 ? groupOrder.length : leftIndex;

		const normalizedRight = rightIndex === -1 ? groupOrder.length : rightIndex;

		if (normalizedLeft !== normalizedRight) {
			return normalizedLeft - normalizedRight;
		}

		return left.name.localeCompare(right.name);
	}

	function createGroups(items: FoundryActorItem[]): InventoryGroup[] {
		return groupOrder
			.map((type) => ({
				id: type,
				label: groupLabels[type] ?? formatLabel(type),
				items: items.filter((item) => item.type === type)
			}))
			.filter((group) => group.items.length > 0);
	}

	function getAbilityScore(ability: string): number {
		return asNumber(getNestedValue(actor.system, 'abilities', ability, 'value')) ?? 10;
	}

	function getSizeLabel(): string {
		const size = asString(getNestedValue(actor.system, 'traits', 'size'));

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

	function getQuantity(item: FoundryActorItem): number {
		return asNumber(item.system?.quantity) ?? 1;
	}

	function getWeightValue(item: FoundryActorItem): number {
		return asNumber(getNestedValue(item.system, 'weight', 'value')) ?? 0;
	}

	function getWeightUnits(item: FoundryActorItem): string {
		return asString(getNestedValue(item.system, 'weight', 'units')) ?? 'lb';
	}

	function getWeightParts(item: FoundryActorItem): ValueParts {
		return {
			value: formatNumber(getWeightValue(item)),
			unit: getWeightUnits(item)
		};
	}

	function calculateTotalWeight(items: FoundryActorItem[]): number {
		return items.reduce((total, item) => total + getWeightValue(item) * getQuantity(item), 0);
	}

	function getPriceParts(item: FoundryActorItem): ValueParts {
		const value = asNumber(getNestedValue(item.system, 'price', 'value'));

		const denomination = asString(getNestedValue(item.system, 'price', 'denomination')) ?? 'gp';

		return {
			value: value === undefined ? '—' : formatNumber(value),
			unit: value === undefined ? '' : denomination.toUpperCase()
		};
	}

	function getUsesLabel(item: FoundryActorItem): string {
		const maximum = asNumber(getNestedValue(item.system, 'uses', 'max'));

		const spent = asNumber(getNestedValue(item.system, 'uses', 'spent')) ?? 0;

		if (maximum === undefined || maximum <= 0) {
			return '—';
		}

		return `${Math.max(0, maximum - spent)} / ${maximum}`;
	}

	function getFirstActivity(item: FoundryActorItem): UnknownRecord | undefined {
		return getActivities(item)[0];
	}

	function getActivationLabel(item: FoundryActorItem): string {
		const activity = getFirstActivity(item);

		const activation = asString(getNestedValue(activity, 'activation', 'type'));

		const labels: Record<string, string> = {
			action: 'A',
			bonus: 'BA',
			reaction: 'R',
			minute: 'Min',
			hour: 'Hr',
			special: 'S'
		};

		return activation ? (labels[activation] ?? activation.toUpperCase()) : '—';
	}

	function getWeaponAbility(item: FoundryActorItem): string {
		const activity = getFirstActivity(item);

		const activityAbility = asString(getNestedValue(activity, 'attack', 'ability'));

		if (activityAbility) {
			return activityAbility;
		}

		const configured = asString(item.system?.ability);

		if (configured) {
			return configured;
		}

		const properties = item.system?.properties;

		if (Array.isArray(properties) && properties.includes('fin')) {
			const strength = getAbilityScore('str');

			const dexterity = getAbilityScore('dex');

			return dexterity > strength ? 'dex' : 'str';
		}

		const rangeValue = asNumber(getNestedValue(item.system, 'range', 'value'));

		if (rangeValue !== undefined && rangeValue > 5) {
			return 'dex';
		}

		return 'str';
	}

	function getCharacterLevel(): number {
		return actor.items
			.filter((item) => item.type === 'class')
			.reduce((total, item) => total + (asNumber(item.system?.levels) ?? 0), 0);
	}

	function getProficiencyBonus(): number {
		const level = Math.max(1, getCharacterLevel());

		return 2 + Math.floor((level - 1) / 4);
	}

	function getRollModifier(item: FoundryActorItem): string {
		if (item.type !== 'weapon') {
			return '—';
		}

		const ability = getWeaponAbility(item);

		const abilityModifier = Math.floor((getAbilityScore(ability) - 10) / 2);

		const magicalBonus = asNumber(item.system?.magicalBonus) ?? 0;

		return formatSignedNumber(abilityModifier + getProficiencyBonus() + magicalBonus);
	}

	function getDamageLabel(item: FoundryActorItem): string {
		if (item.type !== 'weapon') {
			return '—';
		}

		const number = asNumber(getNestedValue(item.system, 'damage', 'base', 'number'));

		const denomination = asNumber(getNestedValue(item.system, 'damage', 'base', 'denomination'));

		const bonus = asString(getNestedValue(item.system, 'damage', 'base', 'bonus')) ?? '';

		if (number === undefined || denomination === undefined || denomination <= 0) {
			return '—';
		}

		const ability = getWeaponAbility(item);

		const abilityModifier = Math.floor((getAbilityScore(ability) - 10) / 2);

		const magicalBonus = asNumber(item.system?.magicalBonus) ?? 0;

		const totalBonus = abilityModifier + magicalBonus;

		const modifier = totalBonus === 0 ? '' : formatSignedNumber(totalBonus);

		return `${number}d${denomination}` + `${bonus}${modifier}`;
	}

	function getContainerCount(item: FoundryActorItem): string {
		if (item.type !== 'container' || !item._id) {
			return '—';
		}

		const count = actor.items.filter((entry) => entry.system?.container === item._id).length;

		return `${count} ${count === 1 ? 'item' : 'items'}`;
	}

	function getCurrency(): Record<string, number> {
		const result: Record<string, number> = {
			pp: 0,
			gp: 0,
			ep: 0,
			sp: 0,
			cp: 0
		};

		const source = actor.system.currency;

		if (!isRecord(source)) {
			return result;
		}

		for (const key of Object.keys(result)) {
			result[key] = asNumber(source[key]) ?? 0;
		}

		return result;
	}

	function hasItemDetails(item: FoundryActorItem): boolean {
		const description = getNestedValue(item.system, 'description', 'value');

		return typeof description === 'string' && description.trim().length > 0;
	}

	function openItemDetails(item: FoundryActorItem): void {
		if (hasItemDetails(item)) {
			selectedItem = item;
		}
	}

	function formatSignedNumber(value: number): string {
		return value >= 0 ? `+${value}` : `${value}`;
	}

	function formatNumber(value: number): string {
		return Number.isInteger(value)
			? `${value}`
			: value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
	}

	function formatLabel(value: string): string {
		return value
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ')
			.replace(/\b\w/g, (character) => character.toUpperCase());
	}
</script>

<section class="inventory-tab">
	<div class="toolbar">
		<button
			type="button"
			class="toolbar-icon"
			title={allGroupsCollapsed ? 'Expand all sections' : 'Collapse all sections'}
			on:click={toggleAllGroups}
			><TidyIcon icon={allGroupsCollapsed ? expandAllIcon : collapseAllDoubleIcon} /></button
		>

		<label class="search-field">
			<TidyIcon icon={searchIcon} />

			<input type="search" value={searchText} placeholder="Search" on:input={handleSearch} />
		</label>

		<div class="toolbar-filters">
			<button
				type="button"
				class:active={activationFilters.includes('action')}
				on:click={() => toggleActivation('action')}>Action</button
			>

			<button
				type="button"
				class:active={activationFilters.includes('bonus')}
				on:click={() => toggleActivation('bonus')}>Bonus Action</button
			>

			<button
				type="button"
				class:active={activationFilters.includes('reaction')}
				on:click={() => toggleActivation('reaction')}>Reaction</button
			>

			<button type="button" class:active={equippedOnly} on:click={toggleEquipped}>
				Equipped
			</button>

			<div class="filter-menu-container">
				<button
					type="button"
					class="toolbar-icon"
					class:active={filterMenuOpen ||
						rarityFilters.length > 0 ||
						miscellaneousFilters.length > 0}
					aria-label="Filter"
					aria-expanded={filterMenuOpen}
					on:click={() => (filterMenuOpen = !filterMenuOpen)}><TidyIcon icon={filterIcon} /></button
				>

				{#if filterMenuOpen}
					<div class="filter-menu">
						<fieldset>
							<legend>Activation Cost</legend>
							<div class="filter-options">
								{#each [['action', 'Action'], ['bonus', 'Bonus Action'], ['reaction', 'Reaction'], ['can-use', 'Can Use'], ['magical', 'Magical']] as option (option[0])}
									<button
										type="button"
										class:active={activationFilters.includes(option[0])}
										on:click={() => toggleActivation(option[0])}>{option[1]}</button
									>
								{/each}
							</div>
						</fieldset>

						<fieldset>
							<legend>Rarity</legend>
							<div class="filter-options">
								{#each [['common', 'Common'], ['uncommon', 'Uncommon'], ['rare', 'Rare'], ['very-rare', 'Very Rare'], ['legendary', 'Legendary'], ['artifact', 'Artifact']] as option (option[0])}
									<button
										type="button"
										class:active={rarityFilters.includes(option[0])}
										on:click={() => toggleRarity(option[0])}>{option[1]}</button
									>
								{/each}
							</div>
						</fieldset>

						<fieldset>
							<legend>Miscellaneous</legend>
							<div class="filter-options">
								<button type="button" class:active={equippedOnly} on:click={toggleEquipped}
									>Equipped</button
								>
								{#each [['optional-attunement', 'Optional Attunement'], ['attunement-required', 'Attunement Required'], ['attuned', 'Attuned']] as option (option[0])}
									<button
										type="button"
										class:active={miscellaneousFilters.includes(option[0])}
										on:click={() => toggleMiscellaneous(option[0])}>{option[1]}</button
									>
								{/each}
							</div>
						</fieldset>

						<button type="button" class="clear-filters" on:click={clearFilters}>× Clear All</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="encumbrance-summary">
		<span class="summary-badge">
			<span class="badge-label"> Strength </span>

			<strong class="badge-value">
				{strengthScore}
			</strong>
		</span>

		<span class="summary-badge">
			<span class="badge-label"> Size </span>

			<strong class="badge-value">
				{sizeLabel}
			</strong>
		</span>

		<span class="summary-badge">
			<span class="badge-label"> Multiplier </span>

			<strong class="badge-value"> ×1 </strong>
		</span>

		<div class="encumbrance-bar">
			<div class="encumbrance-fill" style={`width: ${encumbrancePercent}%`}></div>

			<strong>
				<TidyIcon icon={carryingCapacityIcon} />
				{formatNumber(totalWeight)}
				/
				{carryingCapacity}
			</strong>
		</div>
	</div>

	{#if groups.length === 0}
		<div class="empty-state">No matching items were found.</div>
	{:else}
		<div class="group-list">
			{#each groups as group}
				<section
					class:weapon-group={group.id === 'weapon'}
					class:container-group={group.id === 'container'}
					class="inventory-group"
				>
					<header class="group-header">
						<button
							type="button"
							class="group-title"
							aria-expanded={!collapsedGroups.includes(group.id)}
							on:click={() => toggleGroup(group.id)}
						>
							<span class="group-toggle"
								><TidyIcon
									icon={collapsedGroups.includes(group.id) ? nextIcon : expandIcon}
								/></span
							>

							<h3>
								<span class="group-name">
									{group.label}
								</span>

								<span class="group-count">
									{group.items.length}
								</span>
							</h3>
						</button>

						<div class="group-columns">
							{#if group.id === 'weapon'}
								<span>Uses</span>
								<span>Time</span>
								<span>Roll</span>
								<span>Formula</span>
								<span>Price</span>
								<span>Quantity</span>
								<span>Weight</span>
							{:else if group.id === 'container'}
								<span></span>
								<span></span>
							{:else}
								<span>Price</span>
								<span>Quantity</span>
								<span>Weight</span>
							{/if}
						</div>
					</header>

					{#if !collapsedGroups.includes(group.id)}
						<div class="item-list">
							{#each group.items as item}
								{@const price = getPriceParts(item)}

								{@const weight = getWeightParts(item)}

								<article class="item-row">
									<button
										type="button"
										class="item-identity item-details-button"
										disabled={!hasItemDetails(item)}
										aria-label={`View details for ${item.name}`}
										on:click={() => openItemDetails(item)}
									>
										<span class="item-image">
											{#if getItemImageSrc(character, item)}
												<img src={getItemImageSrc(character, item) ?? ''} alt="" />
											{/if}
										</span>

										<strong>
											{item.name}
										</strong>
									</button>

									{#if group.id === 'weapon'}
										<span>
											{getUsesLabel(item)}
										</span>

										<span class="activation-value">
											{getActivationLabel(item)}
										</span>

										<span class="roll-value">
											{getRollModifier(item)}
										</span>

										<span class="formula-value">
											{getDamageLabel(item)}
										</span>
									{/if}

									{#if group.id === 'container'}
										<span class="container-contents">
											{getContainerCount(item)}
										</span>

										<span class="container-meter"></span>
									{:else}
										<span class="price-value">
											<strong>
												{price.value}
											</strong>

											{#if price.unit}
												<small>
													{price.unit}
												</small>
											{/if}
										</span>

										<span>
											<span class="quantity-field">
												{getQuantity(item)}
											</span>
										</span>

										<span class="weight-value">
											<strong>
												{weight.value}
											</strong>

											<small>
												{weight.unit}
											</small>
										</span>
									{/if}
								</article>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	{/if}

	<footer class="inventory-footer">
		<div class="attunement-box"><TidyIcon icon={attunementIcon} /> 0 / 3 Attuned</div>

		<div class="currency-grid">
			{#each [['pp', 'PP'], ['gp', 'GP'], ['ep', 'EP'], ['sp', 'SP'], ['cp', 'CP']] as denomination}
				<div class="currency-box">
					<span>
						{currency[denomination[0]]}
					</span>

					<strong>
						{denomination[1]}
					</strong>
				</div>
			{/each}
		</div>
	</footer>
</section>

<ItemDetailsDialog {character} item={selectedItem} onClose={() => (selectedItem = null)} />
