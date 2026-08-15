<svelte:options runes={false} />

<script lang="ts">
	import type { FoundryActorItem } from '../../models/foundry-actor';

	import type { StoredCharacter } from '../../models/stored-character';

	import { getItemImageSrc } from '../../assets/image-resolver';

	import ItemDetailsDialog from '../ItemDetailsDialog.svelte';

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
	let selectedItem: FoundryActorItem | null = null;

	$: allInventory = actor.items
		.filter((item) => inventoryTypes.includes(item.type))
		.sort(sortInventoryItems);

	$: visibleInventory = allInventory.filter(matchesFilters);

	$: groups = createGroups(visibleInventory);

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

	function matchesFilters(item: FoundryActorItem): boolean {
		const search = searchText.trim().toLowerCase();

		if (search && !item.name.toLowerCase().includes(search)) {
			return false;
		}

		if (equippedOnly && item.system?.equipped !== true) {
			return false;
		}

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
		const activities = item.system?.activities;

		if (!isRecord(activities)) {
			return undefined;
		}

		return Object.values(activities).find(isRecord);
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
		<button type="button" class="toolbar-icon" disabled title="Collapse sections"> ⌄ </button>

		<label class="search-field">
			<span>⌕</span>

			<input type="search" value={searchText} placeholder="Search" on:input={handleSearch} />
		</label>

		<div class="toolbar-filters">
			<button type="button" disabled> Action </button>

			<button type="button" disabled> Bonus Action </button>

			<button type="button" disabled> Reaction </button>

			<button type="button" class:active={equippedOnly} on:click={toggleEquipped}>
				Equipped
			</button>

			<button type="button" class="toolbar-icon" disabled> ▼ </button>

			<button type="button" class="toolbar-icon" disabled> ⇵ </button>

			<button type="button" class="toolbar-icon" disabled> ⚙ </button>
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
				⚖
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
						<div class="group-title">
							<span class="group-toggle"> ⌄ </span>

							<h3>
								<span class="group-name">
									{group.label}
								</span>

								<span class="group-count">
									{group.items.length}
								</span>
							</h3>
						</div>

						<div class="group-columns">
							{#if group.id === 'weapon'}
								<span>Uses</span>
								<span>Time</span>
								<span>Roll</span>
								<span>Formula</span>
								<span>Price</span>
								<span>Quantity</span>
								<span>Weight</span>
								<span>⌕</span>
								<span>＋</span>
							{:else if group.id === 'container'}
								<span></span>
								<span></span>
								<span>⌕</span>
								<span>＋</span>
							{:else}
								<span>Price</span>
								<span>Quantity</span>
								<span>Weight</span>
								<span>⌕</span>
								<span>＋</span>
							{/if}
						</div>
					</header>

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

								<span class="item-action"> ♡ </span>

								<span class="item-action"> ⋮ </span>
							</article>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}

	<footer class="inventory-footer">
		<div class="attunement-box">⚙ 0 / 3 Attuned</div>

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
