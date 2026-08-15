import type { FoundryActorItem } from '../models/foundry-actor';
import type { MorelordImageAsset } from '../models/morelord-character-export';
import type { StoredCharacter } from '../models/stored-character';

export interface ResolvedCharacterImage {
	src?: string;
	path?: string;
	assetId?: string;
	embedded: boolean;
	error?: string;
}

export function resolveActorPortrait(character: StoredCharacter): ResolvedCharacterImage {
	if (character.portraitDataUrl) {
		return {
			src: character.portraitDataUrl,
			path: character.portraitPath,
			assetId: character.assets?.references?.actor?.portrait,
			embedded: true
		};
	}

	return resolveAssetReference(
		character,
		character.assets?.references?.actor?.portrait,
		character.actor.img
	);
}

export function resolvePrototypeToken(character: StoredCharacter): ResolvedCharacterImage {
	const tokenPath = readPrototypeTokenPath(character);

	return resolveAssetReference(
		character,
		character.assets?.references?.actor?.prototypeToken,
		tokenPath
	);
}

export function resolveItemImage(
	character: StoredCharacter,
	itemOrId: FoundryActorItem | string
): ResolvedCharacterImage {
	const item =
		typeof itemOrId === 'string'
			? character.actor.items.find((candidate) => candidate._id === itemOrId)
			: itemOrId;

	const itemId = typeof itemOrId === 'string' ? itemOrId : itemOrId._id;

	const assetId = itemId ? character.assets?.references?.items?.[itemId] : undefined;

	return resolveAssetReference(character, assetId, item?.img);
}

export function getActorPortraitSrc(character: StoredCharacter, fallback = ''): string {
	return resolveActorPortrait(character).src ?? fallback;
}

export function getPrototypeTokenSrc(character: StoredCharacter, fallback = ''): string {
	return resolvePrototypeToken(character).src ?? fallback;
}

export function getItemImageSrc(
	character: StoredCharacter,
	itemOrId: FoundryActorItem | string,
	fallback = ''
): string {
	return resolveItemImage(character, itemOrId).src ?? fallback;
}

function resolveAssetReference(
	character: StoredCharacter,
	assetId: string | undefined,
	fallbackPath: string | undefined
): ResolvedCharacterImage {
	const asset = assetId ? character.assets?.images?.[assetId] : undefined;

	if (asset?.data) {
		return fromAsset(asset, assetId!, true);
	}

	if (asset) {
		return {
			src: usableBrowserPath(asset.path) ? asset.path : undefined,
			path: asset.path,
			assetId,
			embedded: false,
			error: asset.error
		};
	}

	return {
		src: usableBrowserPath(fallbackPath) ? fallbackPath : undefined,
		path: fallbackPath,
		assetId,
		embedded: false
	};
}

function fromAsset(
	asset: MorelordImageAsset,
	assetId: string,
	embedded: boolean
): ResolvedCharacterImage {
	return {
		src: asset.data,
		path: asset.path,
		assetId,
		embedded,
		error: asset.error
	};
}

function readPrototypeTokenPath(character: StoredCharacter): string | undefined {
	const prototypeToken = character.actor.prototypeToken;

	if (!isRecord(prototypeToken)) {
		return undefined;
	}

	const texture = prototypeToken.texture;

	if (!isRecord(texture)) {
		return undefined;
	}

	return typeof texture.src === 'string' ? texture.src : undefined;
}

function usableBrowserPath(path: string | undefined): path is string {
	if (!path) {
		return false;
	}

	return /^(?:data:|blob:|https?:\/\/|\/)/i.test(path);
}

function isRecord(value: unknown): value is Record<string, any> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
