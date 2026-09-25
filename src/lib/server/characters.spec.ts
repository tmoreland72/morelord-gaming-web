import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { expect, it } from 'vitest';
import { readActorJson } from '$lib/characters/import/read-actor-file';
import { actions } from '../../routes/characters/shared/[id]/+page.server';
import {
	deleteCharacter,
	getCharacter,
	getSharedCharacter,
	importPublicCharacter,
	listCharacters,
	saveImportedCharacter,
	setCharacterPublic
} from './characters';

it('restricts sharing to the owner and imports independent private copies', async () => {
	const worker = new Miniflare({
		modules: true,
		script: 'export default { fetch() { return new Response("ok"); } }',
		compatibilityDate: '2026-08-01',
		d1Databases: ['DB']
	});
	try {
		const db = await worker.getD1Database('DB');
		await db.prepare('CREATE TABLE user (id TEXT PRIMARY KEY)').run();
		await db.prepare("INSERT INTO user (id) VALUES ('owner'), ('visitor')").run();
		for (const file of [
			'0013_characters.sql',
			'0019_hardening.sql',
			'0022_public_characters.sql'
		]) {
			for (const statement of readFileSync(`migrations/${file}`, 'utf8').split(';')) {
				if (statement.trim()) await db.prepare(statement).run();
			}
		}
		const d1 = db as unknown as D1Database;
		const imported = readActorJson(
			'hero.json',
			JSON.stringify({
				_id: 'foundry-hero',
				name: 'Shared Hero',
				type: 'character',
				system: {},
				items: [],
				effects: []
			})
		);
		const original = await saveImportedCharacter(d1, 'owner', imported);
		const existing = await saveImportedCharacter(d1, 'visitor', imported);
		const visibilityForm = new FormData();
		visibilityForm.set('visibility', 'public');
		const event = {
			params: { id: original.localId },
			locals: {},
			platform: { env: { DB: d1 } },
			request: new Request('https://example.test/characters/shared/test?/visibility', {
				method: 'POST',
				body: visibilityForm
			})
		} as Parameters<NonNullable<typeof actions.import>>[0];
		await expect(actions.import!(event)).rejects.toMatchObject({ status: 401 });
		await expect(actions.visibility!(event)).rejects.toMatchObject({ status: 401 });
		event.locals = { user: { id: 'visitor' } } as typeof event.locals;
		await expect(actions.visibility!(event)).rejects.toMatchObject({ status: 404 });
		await expect(actions.import!(event)).rejects.toMatchObject({ status: 404 });
		expect(await getSharedCharacter(d1, original.localId)).toBeNull();
		expect(await getSharedCharacter(d1, original.localId, 'visitor')).toBeNull();
		expect(await getSharedCharacter(d1, original.localId, 'owner')).toMatchObject({
			isPublic: false,
			isOwner: true
		});
		expect(await importPublicCharacter(d1, 'visitor', original.localId)).toBeNull();
		expect(await setCharacterPublic(d1, 'visitor', original.localId, true)).toBe(false);
		expect(await setCharacterPublic(d1, 'owner', original.localId, true)).toBe(true);
		expect(await getSharedCharacter(d1, original.localId)).toMatchObject({
			isPublic: true,
			isOwner: false
		});
		expect(await getCharacter(d1, 'visitor', original.localId)).toBeNull();

		const copy = await importPublicCharacter(d1, 'visitor', original.localId);
		expect(copy?.localId).not.toBe(original.localId);
		expect(copy?.actor).toEqual(original.actor);
		expect(copy?.foundryActorId).toBeUndefined();
		expect(await listCharacters(d1, 'visitor')).toHaveLength(2);
		expect(await getCharacter(d1, 'visitor', existing.localId)).toEqual(existing);
		expect(await getSharedCharacter(d1, copy!.localId)).toBeNull();
		expect(await getCharacter(d1, 'owner', copy!.localId)).toBeNull();
		await expect(actions.import!(event)).rejects.toMatchObject({
			status: 303,
			location: '/characters'
		});
		expect(await listCharacters(d1, 'visitor')).toHaveLength(3);

		await saveImportedCharacter(d1, 'owner', imported);
		expect(await getSharedCharacter(d1, original.localId)).not.toBeNull();
		await setCharacterPublic(d1, 'owner', original.localId, false);
		expect(await getSharedCharacter(d1, original.localId)).toBeNull();
		expect(await importPublicCharacter(d1, 'visitor', original.localId)).toBeNull();
		await deleteCharacter(d1, 'owner', original.localId);
		expect(await getSharedCharacter(d1, original.localId, 'owner')).toBeNull();
		expect(await getCharacter(d1, 'visitor', copy!.localId)).toEqual(copy);
	} finally {
		await worker.dispose();
	}
}, 30_000);
