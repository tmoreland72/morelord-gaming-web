import { describe, expect, it } from 'vitest';
import { readActorJson } from './read-actor-file';

function characterExport(imageData: unknown) {
	return JSON.stringify({
		format: 'morelord-character',
		formatVersion: 3,
		actor: {
			_id: 'actor-1',
			name: 'Test Character',
			type: 'character',
			system: {},
			items: [],
			effects: []
		},
		assets: {
			images: {
				'image-49': { path: 'icons/test.webp', data: imageData }
			},
			references: { actor: { portrait: 'image-49' }, items: {} }
		}
	});
}

describe('readActorJson image assets', () => {
	it('imports the character while discarding non-string embedded image data', () => {
		const imported = readActorJson('character.json', characterExport({ invalid: true }));

		expect(imported.actor.name).toBe('Test Character');
		expect(imported.assets?.images?.['image-49']?.data).toBeUndefined();
		expect(imported.assets?.images?.['image-49']?.error).toContain('was invalid');
	});

	it('imports the character while discarding unsupported data URLs', () => {
		const imported = readActorJson(
			'character.json',
			characterExport('data:application/octet-stream;base64,AAAA')
		);

		expect(imported.assets?.images?.['image-49']?.data).toBeUndefined();
	});

	it('keeps supported embedded image data', () => {
		const data = 'data:image/webp;base64,AAAA';
		const imported = readActorJson('character.json', characterExport(data));

		expect(imported.assets?.images?.['image-49']?.data).toBe(data);
	});
});
