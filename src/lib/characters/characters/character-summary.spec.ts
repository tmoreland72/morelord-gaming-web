import { describe, expect, it } from 'vitest';
import type { StoredCharacter } from '../models/stored-character';
import { createCharacterSummary } from './character-summary';

describe('createCharacterSummary', () => {
	it('includes subclass names with class summaries', () => {
		const character: StoredCharacter = {
			localId: 'character-1',
			name: 'Test Character',
			actorType: 'character',
			sourceFileName: 'character.json',
			importedAt: '2026-08-23T00:00:00.000Z',
			actor: {
				name: 'Test Character',
				type: 'character',
				system: {},
				effects: [],
				items: [
					{ name: 'Ranger', type: 'class', system: { levels: 4 } },
					{ name: 'Gloom Stalker', type: 'subclass', system: { classIdentifier: 'ranger' } }
				]
			}
		};

		expect(createCharacterSummary(character)).toMatchObject({
			classes: [{ name: 'Ranger', levels: 4 }],
			subclasses: ['Gloom Stalker'],
			totalLevel: 4
		});
	});
});
