import type { FoundryActorItem } from '../models/foundry-actor';
import type { StoredCharacter } from '../models/stored-character';

export interface CharacterClassSummary {
	name: string;
	levels: number;
}

export interface CharacterSummary {
	classes: CharacterClassSummary[];
	totalLevel: number;
	species?: string;
	background?: string;
	spellCount: number;
	featureCount: number;
	inventoryCount: number;
}

function getNumericValue(
	object: Record<string, unknown> | undefined,
	key: string
): number | undefined {
	const value = object?.[key];

	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getClassLevels(item: FoundryActorItem): number {
	const levels = getNumericValue(item.system, 'levels');

	return levels ?? 0;
}

export function createCharacterSummary(character: StoredCharacter): CharacterSummary {
	const items = character.actor.items;

	const classes = items
		.filter((item) => item.type === 'class')
		.map((item) => ({
			name: item.name,
			levels: getClassLevels(item)
		}));

	const speciesItem = items.find((item) => item.type === 'race' || item.type === 'species');

	const backgroundItem = items.find((item) => item.type === 'background');

	const spellCount = items.filter((item) => item.type === 'spell').length;

	const featureCount = items.filter(
		(item) => item.type === 'feat' || item.type === 'subclass'
	).length;

	const inventoryCount = items.filter((item) =>
		['weapon', 'equipment', 'consumable', 'tool', 'loot', 'container'].includes(item.type)
	).length;

	return {
		classes,
		totalLevel: classes.reduce((total, item) => total + item.levels, 0),
		species: speciesItem?.name,
		background: backgroundItem?.name,
		spellCount,
		featureCount,
		inventoryCount
	};
}
