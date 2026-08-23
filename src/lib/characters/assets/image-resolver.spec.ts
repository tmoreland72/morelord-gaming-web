import { describe, expect, it } from 'vitest';
import type { StoredCharacter } from '../models/stored-character';
import { resolveActorPortrait } from './image-resolver';

function character(overrides: Partial<StoredCharacter> = {}): StoredCharacter {
	return {
		localId: 'character-1',
		name: 'Test Character',
		actorType: 'character',
		sourceFileName: 'character.json',
		importedAt: '2026-08-23T00:00:00.000Z',
		actor: {
			name: 'Test Character',
			type: 'character',
			img: 'data:image/webp;base64,PORTRAIT',
			system: {},
			items: [],
			effects: [],
			prototypeToken: { texture: { src: 'tokens/fallback.webp' } }
		},
		assets: {
			images: {
				portrait: { data: 'data:image/webp;base64,PORTRAIT' },
				token: { data: 'data:image/webp;base64,TOKEN' }
			},
			references: { actor: { portrait: 'portrait', prototypeToken: 'token' } }
		},
		...overrides
	};
}

describe('resolveActorPortrait', () => {
	it('prefers the exported prototype token', () => {
		expect(resolveActorPortrait(character()).src).toBe('data:image/webp;base64,TOKEN');
	});

	it('keeps a user-uploaded custom portrait above the exported token', () => {
		expect(
			resolveActorPortrait(
				character({
					portraitSource: 'custom',
					portraitDataUrl: 'data:image/webp;base64,CUSTOM'
				})
			).src
		).toBe('data:image/webp;base64,CUSTOM');
	});

	it('falls back to the exported portrait when the token is unavailable', () => {
		const withoutToken = character();
		withoutToken.assets!.references!.actor!.prototypeToken = undefined;

		expect(resolveActorPortrait(withoutToken).src).toBe('data:image/webp;base64,PORTRAIT');
	});
});
