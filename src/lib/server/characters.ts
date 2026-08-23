import { and, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { characters } from '$lib/server/db/schema';
import type { ImportedActorFile } from '$lib/characters/import/read-actor-file';
import type { StoredCharacter } from '$lib/characters/models/stored-character';
import type { CharacterListItem } from '$lib/characters/models/character-list-item';

const MAXIMUM_STORED_CHARACTER_BYTES = 1_900_000;

export async function listCharacters(d1: D1Database, userId: string): Promise<CharacterListItem[]> {
	type CharacterSummaryRow = {
		localId: string;
		name: string;
		importedAt: string;
		classesJson: string;
		species: string | null;
		background: string | null;
		spellCount: number;
		featureCount: number;
		inventoryCount: number;
	};
	const result = await d1
		.prepare(
			`
			SELECT
				c.id AS localId,
				c.name,
				COALESCE(json_extract(c.content_json, '$.importedAt'), '') AS importedAt,
				COALESCE((
					SELECT json_group_array(json_object(
						'name', json_extract(item.value, '$.name'),
						'levels', COALESCE(json_extract(item.value, '$.system.levels'), 0)
					))
					FROM json_each(json_extract(c.content_json, '$.actor.items')) AS item
					WHERE json_extract(item.value, '$.type') = 'class'
				), '[]') AS classesJson,
				(
					SELECT json_extract(item.value, '$.name')
					FROM json_each(json_extract(c.content_json, '$.actor.items')) AS item
					WHERE json_extract(item.value, '$.type') IN ('race', 'species') LIMIT 1
				) AS species,
				(
					SELECT json_extract(item.value, '$.name')
					FROM json_each(json_extract(c.content_json, '$.actor.items')) AS item
					WHERE json_extract(item.value, '$.type') = 'background' LIMIT 1
				) AS background,
				(SELECT count(*) FROM json_each(json_extract(c.content_json, '$.actor.items')) AS item
					WHERE json_extract(item.value, '$.type') = 'spell') AS spellCount,
				(SELECT count(*) FROM json_each(json_extract(c.content_json, '$.actor.items')) AS item
					WHERE json_extract(item.value, '$.type') IN ('feat', 'subclass')) AS featureCount,
				(SELECT count(*) FROM json_each(json_extract(c.content_json, '$.actor.items')) AS item
					WHERE json_extract(item.value, '$.type') IN ('weapon', 'equipment', 'consumable', 'tool', 'loot', 'container')) AS inventoryCount
			FROM characters AS c
			WHERE c.user_id = ?
			ORDER BY c.name ASC
		`
		)
		.bind(userId)
		.all<CharacterSummaryRow>();

	return result.results.map((row) => {
		const classes = JSON.parse(row.classesJson) as CharacterListItem['summary']['classes'];
		return {
			localId: row.localId,
			name: row.name,
			importedAt: row.importedAt,
			summary: {
				classes,
				totalLevel: classes.reduce((total, item) => total + item.levels, 0),
				species: row.species ?? undefined,
				background: row.background ?? undefined,
				spellCount: row.spellCount,
				featureCount: row.featureCount,
				inventoryCount: row.inventoryCount
			}
		};
	});
}

export async function getCharacter(
	d1: D1Database,
	userId: string,
	id: string
): Promise<StoredCharacter | null> {
	const row = await getDb(d1).query.characters.findFirst({
		where: and(eq(characters.userId, userId), eq(characters.id, id))
	});
	return row ? (JSON.parse(row.contentJson) as StoredCharacter) : null;
}

export async function saveImportedCharacter(
	d1: D1Database,
	userId: string,
	imported: ImportedActorFile,
	replacementId?: string
): Promise<StoredCharacter> {
	const db = getDb(d1);
	const replacementRow = replacementId
		? await db.query.characters.findFirst({
				where: and(eq(characters.userId, userId), eq(characters.id, replacementId))
			})
		: undefined;
	if (replacementId && !replacementRow) {
		throw new Error('The character being replaced could not be found.');
	}
	const matchingActorRow = imported.actor._id
		? await db.query.characters.findFirst({
				where: and(eq(characters.userId, userId), eq(characters.foundryActorId, imported.actor._id))
			})
		: undefined;
	if (replacementRow && matchingActorRow && matchingActorRow.id !== replacementRow.id) {
		throw new Error('That exported character already exists in My Characters.');
	}
	const existingRow = replacementRow ?? matchingActorRow;
	const existing = existingRow
		? (JSON.parse(existingRow.contentJson) as StoredCharacter)
		: undefined;
	const exportedPortraitData = imported.portrait?.data;
	const preserveCustomPortrait =
		existing?.portraitSource === 'custom' && typeof existing.portraitDataUrl === 'string';
	const portraitAsset = imported.portrait
		? omitPortraitData(imported.portrait)
		: existing?.portraitAsset;
	const character: StoredCharacter = {
		localId: existing?.localId ?? crypto.randomUUID(),
		foundryActorId: imported.actor._id,
		name: imported.actor.name,
		actorType: imported.actor.type,
		portraitPath: imported.portrait?.path ?? imported.actor.img,
		portraitDataUrl: preserveCustomPortrait
			? existing?.portraitDataUrl
			: (exportedPortraitData ?? existing?.portraitDataUrl),
		portraitSource: preserveCustomPortrait
			? 'custom'
			: exportedPortraitData
				? 'export'
				: existing?.portraitSource,
		portraitAsset,
		sourceFileName: imported.fileName,
		importedAt: new Date().toISOString(),
		exportFormat: imported.exportFormat,
		exportFormatVersion: imported.exportFormatVersion,
		exportedAt: imported.exportedAt,
		exportSource: imported.exportSource,
		foundryVersion: imported.exportSource?.foundryVersion ?? imported.actor._stats?.coreVersion,
		systemVersion: imported.exportSource?.systemVersion ?? imported.actor._stats?.systemVersion,
		derived: imported.derived,
		assets: imported.assets,
		actor: imported.actor
	};
	const now = new Date();
	const contentJson = serializeCharacter(character);
	await db
		.insert(characters)
		.values({
			id: character.localId,
			userId,
			foundryActorId: character.foundryActorId,
			name: character.name,
			contentJson,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: characters.id,
			set: {
				name: character.name,
				foundryActorId: character.foundryActorId,
				contentJson,
				updatedAt: now
			}
		});
	return character;
}

export async function updateCharacterPortrait(
	d1: D1Database,
	userId: string,
	id: string,
	portraitDataUrl: string
) {
	const db = getDb(d1);
	const row = await db.query.characters.findFirst({
		where: and(eq(characters.id, id), eq(characters.userId, userId))
	});
	if (!row) throw new Error('The character could not be found.');
	const character = JSON.parse(row.contentJson) as StoredCharacter;
	const updated: StoredCharacter = { ...character, portraitDataUrl, portraitSource: 'custom' };
	const contentJson = serializeCharacter(updated);
	await db
		.update(characters)
		.set({ contentJson, updatedAt: new Date() })
		.where(and(eq(characters.id, id), eq(characters.userId, userId)));
	return updated;
}

export async function deleteCharacter(d1: D1Database, userId: string, id: string) {
	await getDb(d1)
		.delete(characters)
		.where(and(eq(characters.id, id), eq(characters.userId, userId)));
}

function omitPortraitData(
	portrait: NonNullable<ImportedActorFile['portrait']>
): NonNullable<StoredCharacter['portraitAsset']> {
	const { data: _data, ...metadata } = portrait;
	return metadata;
}

function serializeCharacter(character: StoredCharacter): string {
	const json = JSON.stringify(character);
	if (new TextEncoder().encode(json).byteLength > MAXIMUM_STORED_CHARACTER_BYTES) {
		throw new Error(
			'This character export is too large to store. Remove embedded images and try again.'
		);
	}
	return json;
}
