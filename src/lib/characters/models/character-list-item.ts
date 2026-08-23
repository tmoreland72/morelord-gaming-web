import type { CharacterSummary } from '../characters/character-summary';

export interface CharacterListItem {
	localId: string;
	name: string;
	importedAt: string;
	summary: CharacterSummary;
}
