import type { FoundryActor, FoundryActorItem } from '../models/foundry-actor';

type UnknownRecord = Record<string, unknown>;

export interface DerivedSkill {
	key: string;
	name: string;
	ability: string;
	proficiency: number;
	modifier: number;
	passive: number;
}

export interface DerivedSavingThrow {
	ability: string;
	name: string;
	proficient: boolean;
	modifier: number;
}

export interface DerivedCharacterValues {
	level: number;
	proficiencyBonus: number;
	armorClass: number;
	initiative: number;
	maximumHp: number;
	currentHp: number;
	temporaryHp: number;
	speed: number | null;
	speedUnits: string;
	skills: DerivedSkill[];
	savingThrows: DerivedSavingThrow[];
}

const abilityNames: Record<string, string> = {
	str: 'Strength',
	dex: 'Dexterity',
	con: 'Constitution',
	int: 'Intelligence',
	wis: 'Wisdom',
	cha: 'Charisma'
};

const skillNames: Record<string, string> = {
	acr: 'Acrobatics',
	ani: 'Animal Handling',
	arc: 'Arcana',
	ath: 'Athletics',
	dec: 'Deception',
	his: 'History',
	ins: 'Insight',
	itm: 'Intimidation',
	inv: 'Investigation',
	med: 'Medicine',
	nat: 'Nature',
	prc: 'Perception',
	prf: 'Performance',
	per: 'Persuasion',
	rel: 'Religion',
	slt: 'Sleight of Hand',
	ste: 'Stealth',
	sur: 'Survival',
	psi: 'Psionics'
};

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

function getRecordValue(source: unknown, key: string): unknown {
	return isRecord(source) ? source[key] : undefined;
}

function getNestedValue(source: unknown, ...keys: string[]): unknown {
	let current = source;

	for (const key of keys) {
		current = getRecordValue(current, key);

		if (current === undefined) {
			return undefined;
		}
	}

	return current;
}

export function getAbilityScore(actor: FoundryActor, ability: string): number {
	return asNumber(getNestedValue(actor.system, 'abilities', ability, 'value')) ?? 10;
}

export function getAbilityModifier(actor: FoundryActor, ability: string): number {
	const score = getAbilityScore(actor, ability);

	return Math.floor((score - 10) / 2);
}

export function getCharacterLevel(actor: FoundryActor): number {
	return actor.items
		.filter((item) => item.type === 'class')
		.reduce((total, item) => {
			const levels = asNumber(item.system?.levels) ?? 0;

			return total + levels;
		}, 0);
}

export function getProficiencyBonus(actor: FoundryActor): number {
	const preparedValue = asNumber(getNestedValue(actor.system, 'attributes', 'prof'));

	if (preparedValue !== undefined) {
		return preparedValue;
	}

	const level = Math.max(1, getCharacterLevel(actor));

	return 2 + Math.floor((level - 1) / 4);
}

function getSimpleNumericBonus(value: unknown): number {
	if (typeof value === 'number') {
		return value;
	}

	if (typeof value !== 'string') {
		return 0;
	}

	const normalized = value.trim().replace(/\s+/g, '');

	if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
		return 0;
	}

	const parsed = Number(normalized);

	return Number.isFinite(parsed) ? parsed : 0;
}

export function getSkills(actor: FoundryActor): DerivedSkill[] {
	const skillsValue = actor.system.skills;

	if (!isRecord(skillsValue)) {
		return [];
	}

	const proficiencyBonus = getProficiencyBonus(actor);

	return Object.entries(skillsValue)
		.map(([key, value]) => {
			const skill = isRecord(value) ? value : {};

			const ability = asString(skill.ability) ?? '';

			const proficiency = asNumber(skill.value) ?? 0;

			const checkBonus = getSimpleNumericBonus(getNestedValue(skill, 'bonuses', 'check'));

			const passiveBonus = getSimpleNumericBonus(getNestedValue(skill, 'bonuses', 'passive'));

			const modifier =
				getAbilityModifier(actor, ability) + proficiencyBonus * proficiency + checkBonus;

			return {
				key,
				name: skillNames[key] ?? key.toUpperCase(),
				ability,
				proficiency,
				modifier,
				passive: 10 + modifier + passiveBonus
			};
		})
		.sort((left, right) => left.name.localeCompare(right.name));
}

export function getSavingThrows(actor: FoundryActor): DerivedSavingThrow[] {
	const proficiencyBonus = getProficiencyBonus(actor);

	return Object.entries(abilityNames).map(([ability, name]) => {
		const proficientValue =
			asNumber(getNestedValue(actor.system, 'abilities', ability, 'proficient')) ?? 0;

		const proficient = proficientValue > 0;

		const bonus = getSimpleNumericBonus(
			getNestedValue(actor.system, 'abilities', ability, 'bonuses', 'save')
		);

		return {
			ability,
			name,
			proficient,
			modifier: getAbilityModifier(actor, ability) + proficiencyBonus * proficientValue + bonus
		};
	});
}

function getClassHitPointTotal(item: FoundryActorItem): number {
	const advancement = item.system?.advancement;

	if (!isRecord(advancement)) {
		return 0;
	}

	for (const advancementValue of Object.values(advancement)) {
		if (!isRecord(advancementValue)) {
			continue;
		}

		if (advancementValue.type !== 'HitPoints') {
			continue;
		}

		const values = advancementValue.value;

		if (!isRecord(values)) {
			return 0;
		}

		return Object.values(values).reduce(
			(total: number, value) => total + (asNumber(value) ?? 0),
			0
		);
	}

	return 0;
}

export function getMaximumHp(actor: FoundryActor): number {
	const preparedMaximum = asNumber(getNestedValue(actor.system, 'attributes', 'hp', 'max'));

	if (preparedMaximum !== undefined) {
		return preparedMaximum;
	}

	const level = getCharacterLevel(actor);

	const classHp = actor.items
		.filter((item) => item.type === 'class')
		.reduce((total, item) => total + getClassHitPointTotal(item), 0);

	if (classHp <= 0) {
		return asNumber(getNestedValue(actor.system, 'attributes', 'hp', 'value')) ?? 0;
	}

	const constitutionModifier = getAbilityModifier(actor, 'con');

	return Math.max(level, classHp + constitutionModifier * level);
}

function getEquippedArmor(actor: FoundryActor): FoundryActorItem[] {
	return actor.items.filter((item) => {
		if (item.type !== 'equipment') {
			return false;
		}

		return item.system?.equipped === true;
	});
}

function getEquipmentType(item: FoundryActorItem): string {
	const type = item.system?.type;

	if (!isRecord(type)) {
		return '';
	}

	return asString(type.value) ?? '';
}

function getArmorValue(item: FoundryActorItem): number | undefined {
	return asNumber(getNestedValue(item.system, 'armor', 'value'));
}

function isShield(item: FoundryActorItem): boolean {
	const equipmentType = getEquipmentType(item);

	return equipmentType === 'shield' || equipmentType === 'shl';
}

export function getArmorClass(actor: FoundryActor): number {
	const preparedAc = asNumber(getNestedValue(actor.system, 'attributes', 'ac', 'value'));

	if (preparedAc !== undefined) {
		return preparedAc;
	}

	const flatAc = asNumber(getNestedValue(actor.system, 'attributes', 'ac', 'flat'));

	if (flatAc !== undefined) {
		return flatAc;
	}

	const dexterityModifier = getAbilityModifier(actor, 'dex');

	let armorClass = 10 + dexterityModifier;
	let shieldBonus = 0;

	for (const item of getEquippedArmor(actor)) {
		const armorValue = getArmorValue(item);

		if (armorValue === undefined) {
			continue;
		}

		if (isShield(item)) {
			shieldBonus += armorValue;
			continue;
		}

		const dexterityCap = asNumber(getNestedValue(item.system, 'armor', 'dex'));

		const appliedDexterity =
			dexterityCap === undefined || dexterityCap === null
				? dexterityModifier
				: Math.min(dexterityModifier, dexterityCap);

		armorClass = Math.max(armorClass, armorValue + appliedDexterity);
	}

	return armorClass + shieldBonus;
}

export function getMovementSpeed(actor: FoundryActor): {
	value: number | null;
	units: string;
} {
	const actorSpeed = asNumber(getNestedValue(actor.system, 'attributes', 'movement', 'walk'));

	const actorUnits =
		asString(getNestedValue(actor.system, 'attributes', 'movement', 'units')) ?? 'ft';

	if (actorSpeed !== undefined) {
		return {
			value: actorSpeed,
			units: actorUnits
		};
	}

	const race = actor.items.find((item) => item.type === 'race' || item.type === 'species');

	const raceSpeed = asNumber(getNestedValue(race?.system, 'movement', 'walk'));

	const raceUnits = asString(getNestedValue(race?.system, 'movement', 'units')) ?? actorUnits;

	return {
		value: raceSpeed ?? null,
		units: raceUnits
	};
}

export function getInitiative(actor: FoundryActor): number {
	const configuredAbility =
		asString(getNestedValue(actor.system, 'attributes', 'init', 'ability')) || 'dex';

	const bonus = getSimpleNumericBonus(getNestedValue(actor.system, 'attributes', 'init', 'bonus'));

	return getAbilityModifier(actor, configuredAbility) + bonus;
}

export function deriveCharacterValues(actor: FoundryActor): DerivedCharacterValues {
	const movement = getMovementSpeed(actor);

	return {
		level: getCharacterLevel(actor),
		proficiencyBonus: getProficiencyBonus(actor),
		armorClass: getArmorClass(actor),
		initiative: getInitiative(actor),
		maximumHp: getMaximumHp(actor),
		currentHp: asNumber(getNestedValue(actor.system, 'attributes', 'hp', 'value')) ?? 0,
		temporaryHp: asNumber(getNestedValue(actor.system, 'attributes', 'hp', 'temp')) ?? 0,
		speed: movement.value,
		speedUnits: movement.units,
		skills: getSkills(actor),
		savingThrows: getSavingThrows(actor)
	};
}

export function formatSignedNumber(value: number): string {
	return value >= 0 ? `+${value}` : `${value}`;
}
