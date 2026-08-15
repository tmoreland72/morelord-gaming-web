import { and, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { characters } from '$lib/server/db/schema';
import type { ImportedActorFile } from '$lib/characters/import/read-actor-file';
import type { StoredCharacter } from '$lib/characters/models/stored-character';

const MAXIMUM_STORED_CHARACTER_BYTES = 1_900_000;

export async function listCharacters(d1: D1Database, userId: string): Promise<StoredCharacter[]> {
	const rows = await getDb(d1).query.characters.findMany({
		where: eq(characters.userId, userId),
		orderBy: (table, { asc }) => [asc(table.name)]
	});
	return rows.map((row) => JSON.parse(row.contentJson) as StoredCharacter);
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
