<svelte:options runes={false} />

<script lang="ts">
	import type { FoundryActorItem } from '../../models/foundry-actor';

	import type { StoredCharacter } from '../../models/stored-character';

	import { getItemImageSrc } from '../../assets/image-resolver';

	import { deriveCharacterValues, formatSignedNumber } from '../../characters/derived-character';

	import ItemDetailsDialog from '../ItemDetailsDialog.svelte';
	import TidyIcon from '../TidyIcon.svelte';
	import type { TidyIcon as TidyIconDefinition } from '../../icons/tidy-icons';
	import {
		armorIcon,
		expertiseIcon,
		halfProficientIcon,
		immunityIcon,
		languagesIcon,
		notProficientIcon,
		proficientIcon,
		resistanceIcon,
		savingThrowsIcon,
		sizeIcon,
		skillsIcon,
		specialTraitsIcon,
		speedIcon,
		toolsIcon,
		traitContinuationIcon,
		vulnerabilityIcon,
		weaponsIcon
	} from '../../icons/tidy-icons';

	export let character: StoredCharacter;
	export let sidebarOnly = false;

	let selectedItem: FoundryActorItem | null = null;

	$: actor = character.actor;

	type UnknownRecord = Record<string, unknown>;

	interface TraitRow {
		label: string;
		icon: TidyIconDefinition;
		values: string[];
		tone?: 'resistance' | 'vulnerability';
	}

	interface ToolRow {
		key: string;
		name: string;
		ability: string;
		proficiency: number;
		item?: FoundryActorItem;
	}

	const toolLabels: Record<string, string> = {
		calligrapher: "Calligrapher's Supplies",
		cook: "Cook's Utensils",
		forg: 'Forgery Kit',
		herb: 'Herbalism Kit',
		navg: "Navigator's Tools",
		poison: "Poisoner's Kit",
		thief: "Thieves' Tools"
	};

	const abilityLabels: Record<string, string> = {
		str: 'STR',
		dex: 'DEX',
		con: 'CON',
		int: 'INT',
		wis: 'WIS',
		cha: 'CHA'
	};

	$: derived = deriveCharacterValues(actor);

	$: classes = actor.items
		.filter((item) => item.type === 'class')
		.sort((left, right) => left.name.localeCompare(right.name));

	$: species = actor.items.find((item) => item.type === 'race' || item.type === 'species');

	$: background = actor.items.find((item) => item.type === 'background');

	$: tools = getTools(actor);

	$: traitRows = createTraitRows();

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

	function getArrayOfStrings(value: unknown): string[] {
		if (Array.isArray(value)) {
			return value.filter(
				(entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
			);
		}

		if (isRecord(value)) {
			return Object.entries(value)
				.filter(([, enabled]) => enabled === true || enabled === 1)
				.map(([key]) => key);
		}

		return [];
	}

	function getTraitValues(traitName: string): string[] {
		const trait = getNestedValue(actor.system, 'traits', traitName);

		if (!isRecord(trait)) {
			return getArrayOfStrings(trait).map(formatLabel);
		}

		const values = getArrayOfStrings(trait.value);

		const custom =
			asString(trait.custom)
				?.split(/[;,]/)
				.map((entry) => entry.trim())
				.filter(Boolean) ?? [];

		return [...values, ...custom]
			.map(formatLabel)
			.filter((value, index, collection) => collection.indexOf(value) === index);
	}

	function getSizeLabel(): string {
		const value = asString(getNestedValue(actor.system, 'traits', 'size'));

		const labels: Record<string, string> = {
			tiny: 'Tiny',
			sm: 'Small',
			med: 'Medium',
			lg: 'Large',
			huge: 'Huge',
			grg: 'Gargantuan'
		};

		return value ? (labels[value] ?? formatLabel(value)) : '—';
	}

	function getCreatureType(): string {
		const value = asString(getNestedValue(species?.system, 'type', 'value'));

		const subtype = asString(getNestedValue(species?.system, 'type', 'subtype'));

		if (value && subtype) {
			return `${formatLabel(value)} ${formatLabel(subtype)}`;
		}

		return formatLabel(value || subtype || 'Humanoid');
	}

	function getClassLevel(item: FoundryActorItem): number {
		return asNumber(item.system?.levels) ?? 0;
	}

	function getSpeedLabel(): string {
		if (derived.speed === null) {
			return '—';
		}

		return `Speed ${derived.speed} ${derived.speedUnits}`;
	}

	function createTraitRows(): TraitRow[] {
		return [
			{
				label: 'Size',
				icon: sizeIcon,
				values: [getSizeLabel()]
			},
			{
				label: 'Speed',
				icon: speedIcon,
				values: [getSpeedLabel()]
			},
			{
				label: 'Resistances',
				icon: resistanceIcon,
				values: getTraitValues('dr'),
				tone: 'resistance'
			},
			{
				label: 'Damage Immunities',
				icon: immunityIcon,
				values: getTraitValues('di'),
				tone: 'resistance'
			},
			{
				label: 'Condition Immunities',
				icon: immunityIcon,
				values: getTraitValues('ci'),
				tone: 'resistance'
			},
			{
				label: 'Vulnerabilities',
				icon: vulnerabilityIcon,
				values: getTraitValues('dv'),
				tone: 'vulnerability'
			},
			{
				label: 'Armor',
				icon: armorIcon,
				values: getTraitValues('armorProf')
			},
			{
				label: 'Weapons',
				icon: weaponsIcon,
				values: getTraitValues('weaponProf')
			},
			{
				label: 'Languages',
				icon: languagesIcon,
				values: getTraitValues('languages')
			}
		];
	}

	function normalizeToolName(value: string): string {
		return value.toLowerCase().replace(/[^a-z0-9]/g, '');
	}

	function getTools(currentActor: StoredCharacter['actor']): ToolRow[] {
		const toolItems = currentActor.items.filter((item) => item.type === 'tool');
		const systemTools = isRecord(currentActor.system.tools) ? currentActor.system.tools : {};
		const matchedItems: FoundryActorItem[] = [];
		const rows = Object.entries(systemTools).flatMap(([key, value]) => {
			if (!isRecord(value)) return [];

			const proficiency = asNumber(value.value) ?? 0;
			if (proficiency <= 0) return [];

			const name = toolLabels[key] ?? formatLabel(key);
			const aliases = [normalizeToolName(key), normalizeToolName(name)];
			const item = toolItems.find((candidate) => {
				const identifier = asString(candidate.system?.identifier) ?? '';
				return (
					aliases.includes(normalizeToolName(candidate.name)) ||
					aliases.includes(normalizeToolName(identifier))
				);
			});

			if (item) matchedItems.push(item);

			return [
				{
					key,
					name,
					ability: asString(value.ability) ?? getToolItemAbility(item),
					proficiency,
					item
				}
			];
		});

		for (const item of toolItems) {
			if (matchedItems.includes(item)) continue;

			rows.push({
				key: asString(item.system?.identifier) ?? item.name,
				name: item.name,
				ability: getToolItemAbility(item),
				proficiency: asNumber(item.system?.proficient) ?? 1,
				item
			});
		}

		return rows.sort((left, right) => left.name.localeCompare(right.name));
	}

	function getToolItemAbility(item?: FoundryActorItem): string {
		if (!item) return '';

		const ability = asString(item.system?.ability);

		if (ability) {
			return ability.toUpperCase();
		}

		const activity = getFirstActivity(item);

		const activityAbility = asString(getNestedValue(activity, 'check', 'ability'));

		return activityAbility ?? '';
	}

	function getToolModifier(tool: ToolRow): number {
		const baseModifier = getAbilityModifierFromDerived(tool.ability);

		return baseModifier + derived.proficiencyBonus * tool.proficiency;
	}

	function getAbilityModifierFromDerived(ability: string): number {
		const save = derived.savingThrows.find((entry) => entry.ability === ability);

		if (!save) {
			return 0;
		}

		const proficientBonus = save.proficient ? derived.proficiencyBonus : 0;

		return save.modifier - proficientBonus;
	}

	function getFirstActivity(item: FoundryActorItem): unknown {
		const activities = item.system?.activities;

		if (!isRecord(activities)) {
			return undefined;
		}

		return Object.values(activities)[0];
	}

	function getProficiencyIcon(proficiency: number): TidyIconDefinition {
		if (proficiency >= 2) {
			return expertiseIcon;
		}

		if (proficiency >= 1) {
			return proficientIcon;
		}

		if (proficiency > 0) {
			return halfProficientIcon;
		}

		return notProficientIcon;
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

	function formatLabel(value: string): string {
		return value
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ')
			.replace(/\b\w/g, (character) => character.toUpperCase());
	}
</script>

<div class:sidebar-only={sidebarOnly} class="character-tab">
	<aside class="left-column">
		<section class="tidy-panel skills-panel">
			<header class="panel-header">
				<div>
					<TidyIcon icon={skillsIcon} className="header-icon" />

					<h3>Skills</h3>
				</div>

				<span> Modifier / Passive </span>
			</header>

			<div class="skill-list">
				{#each derived.skills as skill}
					<div class="skill-row">
						<span
							class:trained={skill.proficiency > 0}
							class:expert={skill.proficiency >= 2}
							class="proficiency-marker"
						>
							<TidyIcon icon={getProficiencyIcon(skill.proficiency)} />
						</span>

						<span class="skill-ability">
							{abilityLabels[skill.ability] ?? skill.ability.toUpperCase()}
						</span>

						<strong class="skill-name">
							{skill.name}
						</strong>

						<span class="skill-modifier">
							{formatSignedNumber(skill.modifier)}
						</span>

						<span class="skill-passive">
							{skill.passive}
						</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="tidy-panel tools-panel">
			<header class="panel-header">
				<div>
					<TidyIcon icon={toolsIcon} className="header-icon" />

					<h3>Tools</h3>
				</div>

				<span>Modifier</span>
			</header>

			{#if tools.length === 0}
				<div class="empty-row">No tool proficiencies</div>
			{:else}
				<div class="tool-list">
					{#each tools as tool}
						<div class="tool-row">
							<span class:expert={tool.proficiency >= 2} class="proficiency-marker trained">
								<TidyIcon icon={getProficiencyIcon(tool.proficiency)} />
							</span>

							<span class="tool-ability">
								{abilityLabels[tool.ability] ?? (tool.ability.toUpperCase() || '—')}
							</span>

							<button
								type="button"
								class="item-details-button"
								disabled={!tool.item || !hasItemDetails(tool.item)}
								aria-label={`View details for ${tool.name}`}
								on:click={() => tool.item && openItemDetails(tool.item)}
							>
								<strong>
									{tool.name}
								</strong>
							</button>

							<span class="tool-modifier">
								{formatSignedNumber(getToolModifier(tool))}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</aside>

	{#if !sidebarOnly}
		<div class="right-column">
			<section class="tidy-panel saves-panel">
				<header class="panel-header">
					<div>
						<TidyIcon icon={savingThrowsIcon} className="header-icon" />

						<h3>Saving Throws</h3>
					</div>

					<span>Modifier</span>
				</header>

				<div class="save-grid">
					{#each derived.savingThrows as save}
						<div class="save-row">
							<span class:trained={save.proficient} class="proficiency-marker">
								<TidyIcon icon={save.proficient ? proficientIcon : notProficientIcon} />
							</span>

							<strong>
								{save.name}
							</strong>

							<span>
								{formatSignedNumber(save.modifier)}
							</span>
						</div>
					{/each}
				</div>
			</section>

			<section class="traits-section">
				<header class="traits-heading">
					<h3>Character Traits</h3>

					<button type="button" disabled
						><TidyIcon icon={specialTraitsIcon} /> Special Traits</button
					>
				</header>

				<div class="trait-list">
					{#each classes as classItem}
						<div class="trait-row">
							<strong class="trait-label"> Class </strong>

							<div class="trait-value">
								<button
									type="button"
									class="trait-item-link item-details-button"
									disabled={!hasItemDetails(classItem)}
									aria-label={`View details for ${classItem.name}`}
									on:click={() => openItemDetails(classItem)}
								>
									<span class="item-icon">
										{#if getItemImageSrc(character, classItem)}
											<img src={getItemImageSrc(character, classItem)} alt="" />
										{:else}
											{classItem.name.charAt(0).toUpperCase()}
										{/if}
									</span>

									<strong class="linked-value">
										{classItem.name}
									</strong>
								</button>

								<span>
									· Level
									{getClassLevel(classItem)}
								</span>
							</div>
						</div>
					{/each}

					<div class="trait-row">
						<strong class="trait-label"> Species </strong>

						<div class="trait-value">
							{#if species}
								<button
									type="button"
									class="trait-item-link item-details-button"
									disabled={!hasItemDetails(species)}
									aria-label={`View details for ${species.name}`}
									on:click={() => openItemDetails(species)}
								>
									<span class="item-icon">
										{#if getItemImageSrc(character, species)}
											<img src={getItemImageSrc(character, species)} alt="" />
										{:else}
											{species.name.charAt(0).toUpperCase()}
										{/if}
									</span>

									<strong class="linked-value">
										{species.name}
									</strong>
								</button>
							{:else}
								<span>—</span>
							{/if}
						</div>
					</div>

					<div class="trait-row">
						<strong class="trait-label"> Creature Type </strong>

						<div class="trait-value">
							<span class="trait-arrow"><TidyIcon icon={traitContinuationIcon} /></span>

							<span>
								{getCreatureType()}
							</span>
						</div>
					</div>

					<div class="trait-row">
						<strong class="trait-label"> Background </strong>

						<div class="trait-value">
							{#if background}
								<button
									type="button"
									class="trait-item-link item-details-button"
									disabled={!hasItemDetails(background)}
									aria-label={`View details for ${background.name}`}
									on:click={() => openItemDetails(background)}
								>
									<span class="item-icon">
										{#if getItemImageSrc(character, background)}
											<img src={getItemImageSrc(character, background)} alt="" />
										{:else}
											{background.name.charAt(0).toUpperCase()}
										{/if}
									</span>

									<strong class="linked-value">
										{background.name}
									</strong>
								</button>
							{:else}
								<span>—</span>
							{/if}
						</div>
					</div>

					{#each traitRows as row}
						<div class="trait-row">
							<strong class="trait-label">
								<span class="trait-label-icon">
									<TidyIcon icon={row.icon} />
								</span>

								{row.label}
							</strong>

							<div class="trait-value trait-tags">
								{#if row.values.length === 0}
									<span class="muted"> None </span>
								{:else}
									{#each row.values as value}
										<span
											class="trait-tag"
											class:resistance={row.tone === 'resistance'}
											class:vulnerability={row.tone === 'vulnerability'}
										>
											{value}
										</span>
									{/each}
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		</div>
	{/if}
</div>

<ItemDetailsDialog {character} item={selectedItem} onClose={() => (selectedItem = null)} />
