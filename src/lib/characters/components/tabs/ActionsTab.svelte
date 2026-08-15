<svelte:options runes={false} />

<script lang="ts">
	import type { FoundryActor, FoundryActorItem } from '../../models/foundry-actor';

	export let actor: FoundryActor;

	type UnknownRecord = Record<string, unknown>;

	interface CharacterAction {
		id: string;
		itemId?: string;
		itemName: string;
		itemType: string;
		activityName: string;
		activityType: string;
		activation: string;
		range?: string;
		target?: string;
		damage?: string;
		ability?: string;
		uses?: string;
		consumesSpellSlot: boolean;
	}

	interface ActionGroup {
		id: string;
		label: string;
		actions: CharacterAction[];
	}

	const actionTypeLabels: Record<string, string> = {
		attack: 'Attack',
		damage: 'Damage',
		save: 'Saving Throw',
		check: 'Ability Check',
		heal: 'Healing',
		utility: 'Utility',
		summon: 'Summon',
		enchant: 'Enchantment',
		forward: 'Forward'
	};

	const activationLabels: Record<string, string> = {
		action: 'Action',
		bonus: 'Bonus Action',
		reaction: 'Reaction',
		minute: 'Minute',
		hour: 'Hour',
		special: 'Special',
		legendary: 'Legendary Action',
		lair: 'Lair Action',
		crew: 'Crew Action',
		none: 'No Action'
	};

	const abilityLabels: Record<string, string> = {
		str: 'Strength',
		dex: 'Dexterity',
		con: 'Constitution',
		int: 'Intelligence',
		wis: 'Wisdom',
		cha: 'Charisma'
	};

	const damageTypeLabels: Record<string, string> = {
		acid: 'Acid',
		bludgeoning: 'Bludgeoning',
		cold: 'Cold',
		fire: 'Fire',
		force: 'Force',
		lightning: 'Lightning',
		necrotic: 'Necrotic',
		piercing: 'Piercing',
		poison: 'Poison',
		psychic: 'Psychic',
		radiant: 'Radiant',
		slashing: 'Slashing',
		thunder: 'Thunder',
		healing: 'Healing',
		temphp: 'Temporary HP'
	};

	const groupOrder = ['action', 'bonus', 'reaction', 'special', 'other'];

	$: actions = extractActions(actor);

	$: groups = createGroups(actions);

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

	function asBoolean(value: unknown): boolean {
		return value === true;
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

	function extractActions(sourceActor: FoundryActor): CharacterAction[] {
		const results: CharacterAction[] = [];

		for (const item of sourceActor.items) {
			const activities = item.system?.activities;

			if (!isRecord(activities)) {
				continue;
			}

			for (const [activityId, activityValue] of Object.entries(activities)) {
				if (!isRecord(activityValue)) {
					continue;
				}

				results.push(createAction(item, activityId, activityValue));
			}
		}

		return results.sort(sortActions);
	}

	function createAction(
		item: FoundryActorItem,
		activityId: string,
		activity: UnknownRecord
	): CharacterAction {
		const activityType = asString(activity.type) ?? 'utility';

		const explicitName = asString(activity.name)?.trim();

		const activation = getActivationType(activity);

		return {
			id: `${item._id ?? item.name}:${activityId}`,
			itemId: item._id,
			itemName: item.name,
			itemType: item.type,
			activityName: explicitName || getFallbackActivityName(item, activityType),
			activityType,
			activation,
			range: getRangeLabel(item, activity),
			target: getTargetLabel(item, activity),
			damage: getDamageLabel(item, activity),
			ability: getAbilityLabel(activity),
			uses: getUsesLabel(item, activity),
			consumesSpellSlot: asBoolean(getNestedValue(activity, 'consumption', 'spellSlot'))
		};
	}

	function getFallbackActivityName(item: FoundryActorItem, activityType: string): string {
		const typeLabel = actionTypeLabels[activityType] ?? formatLabel(activityType);

		return `${item.name} — ${typeLabel}`;
	}

	function getActivationType(activity: UnknownRecord): string {
		const type = asString(getNestedValue(activity, 'activation', 'type')) ?? '';

		if (!type) {
			return 'other';
		}

		return type;
	}

	function getActivationLabel(activation: string): string {
		return activationLabels[activation] ?? formatLabel(activation);
	}

	function getRangeLabel(item: FoundryActorItem, activity: UnknownRecord): string | undefined {
		const activityRange = getNestedValue(activity, 'range');

		const override = asBoolean(getNestedValue(activityRange, 'override'));

		const rangeSource = override || isRecord(activityRange) ? activityRange : item.system?.range;

		if (!isRecord(rangeSource)) {
			return undefined;
		}

		const units = asString(rangeSource.units) ?? 'ft';

		const special = asString(rangeSource.special)?.trim();

		if (special) {
			return special;
		}

		if (units === 'self') {
			return 'Self';
		}

		if (units === 'touch') {
			return 'Touch';
		}

		if (units === 'any') {
			return 'Any Range';
		}

		const value = asNumber(rangeSource.value);

		const long = asNumber(rangeSource.long);

		const reach = asNumber(rangeSource.reach);

		if (value !== undefined && long !== undefined) {
			return `${value}/${long} ${units}`;
		}

		if (value !== undefined) {
			return `${value} ${units}`;
		}

		if (reach !== undefined) {
			return `${reach} ${units}`;
		}

		return undefined;
	}

	function getTargetLabel(item: FoundryActorItem, activity: UnknownRecord): string | undefined {
		const activityTarget = getNestedValue(activity, 'target');

		const itemTarget = item.system?.target;

		const targetSource = isRecord(activityTarget) ? activityTarget : itemTarget;

		const affects = getNestedValue(targetSource, 'affects');

		const template = getNestedValue(targetSource, 'template');

		const affectType = asString(getNestedValue(affects, 'type'));

		const affectCount =
			asString(getNestedValue(affects, 'count')) ??
			asNumber(getNestedValue(affects, 'count'))?.toString();

		const affectSpecial = asString(getNestedValue(affects, 'special'))?.trim();

		if (affectSpecial) {
			return affectSpecial;
		}

		if (affectType) {
			const label = formatLabel(affectType);

			return affectCount ? `${affectCount} ${label}` : label;
		}

		const templateType = asString(getNestedValue(template, 'type'));

		const templateSize =
			asNumber(getNestedValue(template, 'size')) ?? asNumber(getNestedValue(template, 'width'));

		const templateUnits = asString(getNestedValue(template, 'units')) ?? 'ft';

		if (templateType) {
			return templateSize !== undefined
				? `${templateSize} ${templateUnits} ${formatLabel(templateType)}`
				: formatLabel(templateType);
		}

		return undefined;
	}

	function getDamageLabel(item: FoundryActorItem, activity: UnknownRecord): string | undefined {
		const parts = getNestedValue(activity, 'damage', 'parts');

		const includeBase = getNestedValue(activity, 'damage', 'includeBase') !== false;

		const formulas: string[] = [];

		if (Array.isArray(parts)) {
			for (const part of parts) {
				const formula = createDamagePartLabel(part);

				if (formula) {
					formulas.push(formula);
				}
			}
		}

		if (formulas.length === 0 && includeBase) {
			const baseDamage = createDamagePartLabel(getNestedValue(item.system, 'damage', 'base'));

			if (baseDamage) {
				formulas.push(baseDamage);
			}
		}

		if (formulas.length === 0) {
			return undefined;
		}

		return formulas.join(' + ');
	}

	function createDamagePartLabel(value: unknown): string | undefined {
		if (!isRecord(value)) {
			return undefined;
		}

		const customEnabled = asBoolean(getNestedValue(value, 'custom', 'enabled'));

		const customFormula = asString(getNestedValue(value, 'custom', 'formula'))?.trim();

		if (customEnabled && customFormula) {
			return customFormula;
		}

		const number = asNumber(value.number);

		const denomination = asNumber(value.denomination);

		const bonus = asString(value.bonus)?.trim() ?? '';

		if (number === undefined || denomination === undefined || denomination <= 0) {
			return undefined;
		}

		const damageTypes = Array.isArray(value.types)
			? value.types
					.filter((type): type is string => typeof type === 'string')
					.map((type) => damageTypeLabels[type] ?? formatLabel(type))
			: [];

		const formula = `${number}d${denomination}${bonus}`;

		return damageTypes.length > 0 ? `${formula} ${damageTypes.join('/')}` : formula;
	}

	function getAbilityLabel(activity: UnknownRecord): string | undefined {
		const attackAbility = asString(getNestedValue(activity, 'attack', 'ability'));

		const checkAbility = asString(getNestedValue(activity, 'check', 'ability'));

		const saveAbility = asString(getNestedValue(activity, 'save', 'ability'));

		const ability = attackAbility || checkAbility || saveAbility;

		if (!ability) {
			return undefined;
		}

		return abilityLabels[ability] ?? ability.toUpperCase();
	}

	function getUsesLabel(item: FoundryActorItem, activity: UnknownRecord): string | undefined {
		const activityMaximum = asNumber(getNestedValue(activity, 'uses', 'max'));

		const activitySpent = asNumber(getNestedValue(activity, 'uses', 'spent')) ?? 0;

		if (activityMaximum !== undefined && activityMaximum > 0) {
			return `${Math.max(0, activityMaximum - activitySpent)} / ${activityMaximum}`;
		}

		const itemMaximum = asNumber(getNestedValue(item.system, 'uses', 'max'));

		const itemSpent = asNumber(getNestedValue(item.system, 'uses', 'spent')) ?? 0;

		if (itemMaximum !== undefined && itemMaximum > 0) {
			return `${Math.max(0, itemMaximum - itemSpent)} / ${itemMaximum}`;
		}

		return undefined;
	}

	function sortActions(left: CharacterAction, right: CharacterAction): number {
		const leftOrder = getActivationOrder(left.activation);

		const rightOrder = getActivationOrder(right.activation);

		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}

		const itemDifference = left.itemName.localeCompare(right.itemName);

		if (itemDifference !== 0) {
			return itemDifference;
		}

		return left.activityName.localeCompare(right.activityName);
	}

	function getActivationOrder(activation: string): number {
		const order = ['action', 'bonus', 'reaction', 'special'];

		const index = order.indexOf(activation);

		return index === -1 ? order.length : index;
	}

	function createGroups(values: CharacterAction[]): ActionGroup[] {
		const activationGroups = new Map<string, CharacterAction[]>();

		for (const action of values) {
			const groupId = groupOrder.includes(action.activation) ? action.activation : 'other';

			const group = activationGroups.get(groupId) ?? [];

			group.push(action);
			activationGroups.set(groupId, group);
		}

		return groupOrder
			.map((id) => ({
				id,
				label: getGroupLabel(id),
				actions: activationGroups.get(id) ?? []
			}))
			.filter((group) => group.actions.length > 0);
	}

	function getGroupLabel(id: string): string {
		const labels: Record<string, string> = {
			action: 'Actions',
			bonus: 'Bonus Actions',
			reaction: 'Reactions',
			special: 'Special Actions',
			other: 'Other Activities'
		};

		return labels[id] ?? formatLabel(id);
	}

	function getActivityTypeLabel(action: CharacterAction): string {
		return actionTypeLabels[action.activityType] ?? formatLabel(action.activityType);
	}

	function getItemTypeLabel(itemType: string): string {
		const labels: Record<string, string> = {
			weapon: 'Weapon',
			spell: 'Spell',
			feat: 'Feature',
			consumable: 'Consumable',
			tool: 'Tool',
			equipment: 'Equipment',
			class: 'Class',
			race: 'Species',
			background: 'Background'
		};

		return labels[itemType] ?? formatLabel(itemType);
	}

	function formatLabel(value: string): string {
		return value
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ')
			.replace(/\b\w/g, (character) => character.toUpperCase());
	}

	function getInitial(value: string): string {
		return value.charAt(0).toUpperCase();
	}
</script>

<section class="tab-panel">
	<div class="panel-heading">
		<div>
			<h3>Actions</h3>

			<p>Attacks, spell activities, checks, utility actions, and other usable activities.</p>
		</div>

		<span class="count-badge">
			{actions.length}
		</span>
	</div>

	{#if actions.length === 0}
		<div class="empty-state">No activities were found on this character's Items.</div>
	{:else}
		<div class="action-groups">
			{#each groups as group}
				<section class="action-group">
					<header class="group-heading">
						<h4>{group.label}</h4>

						<span>
							{group.actions.length}
						</span>
					</header>

					<div class="action-list">
						{#each group.actions as action}
							<article class="action-row">
								<div class="action-icon">
									{getInitial(action.activityName)}
								</div>

								<div class="action-information">
									<div class="action-title-row">
										<strong>
											{action.activityName}
										</strong>

										<span class="activity-type">
											{getActivityTypeLabel(action)}
										</span>
									</div>

									<small class="source-item">
										{action.itemName}
										•
										{getItemTypeLabel(action.itemType)}
									</small>

									<div class="action-details">
										<span>
											{getActivationLabel(action.activation)}
										</span>

										{#if action.ability}
											<span>
												{action.ability}
											</span>
										{/if}

										{#if action.range}
											<span>
												Range {action.range}
											</span>
										{/if}

										{#if action.target}
											<span>
												Target {action.target}
											</span>
										{/if}

										{#if action.damage}
											<span>
												{action.damage}
											</span>
										{/if}

										{#if action.consumesSpellSlot}
											<span> Uses Spell Slot </span>
										{/if}
									</div>
								</div>

								{#if action.uses}
									<div class="action-status">
										<span>
											Uses {action.uses}
										</span>
									</div>
								{/if}
							</article>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</section>

<style>
	h3,
	h4,
	p {
		margin-top: 0;
	}

	.tab-panel {
		padding: 1.25rem;
		border: 1px solid #454038;
		border-radius: 0.5rem;
		background: #24211d;
	}

	.panel-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.panel-heading h3 {
		margin-bottom: 0.25rem;
	}

	.panel-heading p {
		margin-bottom: 0;
		color: #aaa398;
	}

	.count-badge {
		min-width: 2.25rem;
		padding: 0.35rem 0.65rem;
		border: 1px solid #514c43;
		border-radius: 999px;
		background: #1d1b18;
		text-align: center;
	}

	.action-groups {
		display: grid;
		gap: 1rem;
	}

	.action-group {
		overflow: hidden;
		border: 1px solid #454038;
		border-radius: 0.4rem;
	}

	.group-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.7rem 0.85rem;
		background: #302c26;
	}

	.group-heading h4 {
		margin-bottom: 0;
	}

	.group-heading > span {
		display: grid;
		min-width: 1.8rem;
		height: 1.8rem;
		place-items: center;
		border-radius: 999px;
		background: #1d1b18;
		color: #aaa398;
		font-size: 0.8rem;
	}

	.action-list {
		background: #1d1b18;
	}

	.action-row {
		display: grid;
		grid-template-columns:
			auto
			minmax(220px, 1fr)
			auto;
		align-items: flex-start;
		gap: 0.85rem;
		padding: 0.85rem;
		border-bottom: 1px solid #454038;
	}

	.action-row:last-child {
		border-bottom: 0;
	}

	.action-row:nth-child(even) {
		background: #211f1b;
	}

	.action-icon {
		display: grid;
		width: 42px;
		height: 42px;
		place-items: center;
		border: 1px solid #514c43;
		border-radius: 0.3rem;
		background: #181714;
		font-weight: 700;
	}

	.action-information {
		min-width: 0;
	}

	.action-title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
	}

	.action-title-row strong {
		overflow-wrap: anywhere;
	}

	.activity-type {
		padding: 0.15rem 0.4rem;
		border: 1px solid #514c43;
		border-radius: 999px;
		color: #aaa398;
		font-size: 0.68rem;
	}

	.source-item {
		display: block;
		margin-top: 0.2rem;
		color: #777168;
	}

	.action-details {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 0.7rem;
		margin-top: 0.4rem;
		color: #aaa398;
		font-size: 0.75rem;
	}

	.action-details span {
		position: relative;
	}

	.action-details span:not(:last-child)::after {
		position: absolute;
		right: -0.45rem;
		content: '•';
		color: #5f594f;
	}

	.action-status {
		display: flex;
		justify-content: flex-end;
	}

	.action-status span {
		padding: 0.2rem 0.45rem;
		border: 1px solid #806c48;
		border-radius: 999px;
		background: #3d3020;
		color: #e2c289;
		font-size: 0.7rem;
	}

	.empty-state {
		padding: 2rem;
		border: 1px dashed #514c43;
		border-radius: 0.4rem;
		color: #aaa398;
		text-align: center;
	}

	@media (max-width: 700px) {
		.action-row {
			grid-template-columns:
				auto
				minmax(0, 1fr);
		}

		.action-status {
			grid-column: 2;
			justify-content: flex-start;
		}
	}

	@media (max-width: 500px) {
		.panel-heading {
			flex-direction: column;
		}

		.action-icon {
			width: 36px;
			height: 36px;
		}
	}
</style>
