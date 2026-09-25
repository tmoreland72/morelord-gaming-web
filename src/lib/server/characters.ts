import { and, asc, eq, or } from 'drizzle-orm';
import { createCharacterSummary } from '$lib/characters/characters/character-summary';
import type { CharacterListItem } from '$lib/characters/models/character-list-item';
import type { ImportedActorFile } from '$lib/characters/import/read-actor-file';
import type { StoredCharacter } from '$lib/characters/models/stored-character';
import { getDb } from '$lib/server/db';
import { characters } from '$lib/server/db/schema';

const MAXIMUM_STORED_CHARACTER_BYTES = 1_900_000;

function usesTokenImage(character: StoredCharacter): boolean {
	return (
		character.portraitSource !== 'custom' &&
		typeof character.assets?.references?.actor?.prototypeToken === 'string'
	);
}

function listFieldsFromCharacter(character: StoredCharacter) {
	return {
		summaryJson: JSON.stringify(createCharacterSummary(character)),
		importedAt: character.importedAt,
		usesTokenImage: usesTokenImage(character)
	};
}

function listItemFromRow(row: {
	id: string;
	name: string;
	contentJson: string;
	summaryJson: string | null;
	importedAt: string | null;
	usesTokenImage: boolean;
	updatedAt: Date;
}): CharacterListItem {
	if (row.summaryJson) {
		return {
			localId: row.id,
			name: row.name,
			importedAt: row.importedAt ?? '',
			portraitVersion: row.updatedAt.getTime(),
			usesTokenImage: row.usesTokenImage,
			summary: JSON.parse(row.summaryJson) as CharacterListItem['summary']
		};
	}

	const stored = JSON.parse(row.contentJson) as StoredCharacter;
	return {
		localId: row.id,
		name: row.name,
		importedAt: stored.importedAt,
		portraitVersion: row.updatedAt.getTime(),
		usesTokenImage: usesTokenImage(stored),
		summary: createCharacterSummary(stored)
	};
}

export async function listCharacters(d1: D1Database, userId: string): Promise<CharacterListItem[]> {
	const rows = await getDb(d1)
		.select({
			id: characters.id,
			name: characters.name,
			contentJson: characters.contentJson,
			summaryJson: characters.summaryJson,
			importedAt: characters.importedAt,
			usesTokenImage: characters.usesTokenImage,
			updatedAt: characters.updatedAt
		})
		.from(characters)
		.where(eq(characters.userId, userId))
		.orderBy(asc(characters.name));

	return rows.map(listItemFromRow);
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
	const listFields = listFieldsFromCharacter(character);
	await db
		.insert(characters)
		.values({
			id: character.localId,
			userId,
			foundryActorId: character.foundryActorId,
			name: character.name,
			contentJson,
			...listFields,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: characters.id,
			set: {
				name: character.name,
				foundryActorId: character.foundryActorId,
				contentJson,
				...listFields,
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
		.set({
			contentJson,
			...listFieldsFromCharacter(updated),
			updatedAt: new Date()
		})
		.where(and(eq(characters.id, id), eq(characters.userId, userId)));
	return updated;
}

export async function deleteCharacter(d1: D1Database, userId: string, id: string) {
	await getDb(d1)
		.delete(characters)
		.where(and(eq(characters.id, id), eq(characters.userId, userId)));
}

export async function getSharedCharacter(d1: D1Database, id: string, userId?: string) {
	const row = await getDb(d1).query.characters.findFirst({
		where: and(
			eq(characters.id, id),
			or(eq(characters.isPublic, true), userId ? eq(characters.userId, userId) : undefined)
		)
	});
	return row
		? {
				character: JSON.parse(row.contentJson) as StoredCharacter,
				isPublic: row.isPublic,
				isOwner: row.userId === userId
			}
		: null;
}

export async function setCharacterPublic(
	d1: D1Database,
	userId: string,
	id: string,
	isPublic: boolean
) {
	const rows = await getDb(d1)
		.update(characters)
		.set({ isPublic, updatedAt: new Date() })
		.where(and(eq(characters.id, id), eq(characters.userId, userId)))
		.returning({ id: characters.id });
	return rows.length > 0;
}

export async function importPublicCharacter(d1: D1Database, userId: string, id: string) {
	const shared = await getSharedCharacter(d1, id);
	if (!shared) return null;
	const character: StoredCharacter = {
		...shared.character,
		localId: crypto.randomUUID(),
		foundryActorId: undefined,
		importedAt: new Date().toISOString()
	};
	// Shared copies are independent of the owner's Foundry import/upsert identity.
	await getDb(d1)
		.insert(characters)
		.values({
			id: character.localId,
			userId,
			name: character.name,
			contentJson: serializeCharacter(character),
			...listFieldsFromCharacter(character),
			isPublic: false
		});
	return character;
}

function omitPortraitData(
	portrait: NonNullable<ImportedActorFile['portrait']>
): NonNullable<StoredCharacter['portraitAsset']> {
	const metadata = { ...portrait };
	delete metadata.data;
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
