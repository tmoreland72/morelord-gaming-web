import type { FoundryActor } from '../models/foundry-actor';
import type {
	MorelordCharacterAssets,
	MorelordCharacterExport,
	MorelordDerivedCharacter,
	MorelordExportSource,
	MorelordPortraitAsset
} from '../models/morelord-character-export';
import { validateFoundryActor } from './validate-foundry-actor';

const MAXIMUM_SUPPORTED_FORMAT_VERSION = 3;

export interface ImportedActorFile {
	fileName: string;
	actor: FoundryActor;
	exportFormat?: 'morelord-character';
	exportFormatVersion?: number;
	exportedAt?: string;
	exportSource?: MorelordExportSource;
	derived?: MorelordDerivedCharacter;
	portrait?: MorelordPortraitAsset;
	assets?: MorelordCharacterAssets;
}

export async function readActorFile(file: File): Promise<ImportedActorFile> {
	if (!file.name.toLowerCase().endsWith('.json')) {
		throw new Error('Please select a JSON character export file.');
	}

	let text: string;

	try {
		text = await file.text();
	} catch {
		throw new Error('The selected file could not be read.');
	}

	return readActorJson(file.name, text);
}

export function readActorJson(fileName: string, text: string): ImportedActorFile {
	let data: unknown;

	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('The selected file does not contain valid JSON.');
	}

	if (isMorelordCharacterExport(data)) {
		return readMorelordExport(fileName, data);
	}

	return {
		fileName,
		actor: validateFoundryActor(data)
	};
}

function readMorelordExport(fileName: string, data: MorelordCharacterExport): ImportedActorFile {
	if (!Number.isInteger(data.formatVersion) || data.formatVersion < 1) {
		throw new Error('The Morelord character export has an invalid format version.');
	}

	if (data.formatVersion > MAXIMUM_SUPPORTED_FORMAT_VERSION) {
		throw new Error(
			`This character uses Morelord export format ${data.formatVersion}, which is newer than this app supports.`
		);
	}

	const assets = isRecord(data.assets) ? (data.assets as MorelordCharacterAssets) : undefined;

	validateAssets(assets, data.formatVersion);

	const legacyPortrait = assets?.portrait;
	const format3Portrait = resolveReferencedAsset(assets, assets?.references?.actor?.portrait);
	const portrait = format3Portrait ?? legacyPortrait;

	return {
		fileName,
		actor: validateFoundryActor(data.actor),
		exportFormat: data.format,
		exportFormatVersion: data.formatVersion,
		exportedAt: optionalString(data.exportedAt),
		exportSource: isRecord(data.source) ? data.source : undefined,
		derived: isRecord(data.derived) ? (data.derived as MorelordDerivedCharacter) : undefined,
		portrait: isRecord(portrait) ? (portrait as MorelordPortraitAsset) : undefined,
		assets
	};
}

function validateAssets(assets: MorelordCharacterAssets | undefined, formatVersion: number): void {
	if (!assets) {
		return;
	}

	if (assets.portrait?.data !== undefined) {
		discardInvalidImageData(assets.portrait, 'portrait');
	}

	if (assets.images !== undefined && !isRecord(assets.images)) {
		throw new Error('The character export contains an invalid image library.');
	}

	for (const [assetId, asset] of Object.entries(assets.images ?? {})) {
		if (!isRecord(asset)) {
			throw new Error(`Image asset ${assetId} is invalid.`);
		}

		if (asset.data !== undefined) {
			discardInvalidImageData(asset, `image asset ${assetId}`);
		}
	}

	if (formatVersion >= 3) {
		validateFormat3References(assets);
	}
}

function validateFormat3References(assets: MorelordCharacterAssets): void {
	const references = assets.references;

	if (references !== undefined && !isRecord(references)) {
		throw new Error('The character export contains invalid image references.');
	}

	const actorReferences = references?.actor;

	if (actorReferences !== undefined && !isRecord(actorReferences)) {
		throw new Error('The character export contains invalid actor image references.');
	}

	const itemReferences = references?.items;

	if (itemReferences !== undefined && !isRecord(itemReferences)) {
		throw new Error('The character export contains invalid item image references.');
	}

	const referencedAssetIds = [
		actorReferences?.portrait,
		actorReferences?.prototypeToken,
		...Object.values(itemReferences ?? {})
	].filter((value): value is string => typeof value === 'string');

	for (const assetId of referencedAssetIds) {
		if (!assets.images?.[assetId]) {
			throw new Error(`The character export references missing image asset ${assetId}.`);
		}
	}
}

function resolveReferencedAsset(
	assets: MorelordCharacterAssets | undefined,
	assetId: string | undefined
): MorelordPortraitAsset | undefined {
	if (!assetId) {
		return undefined;
	}

	return assets?.images?.[assetId];
}

function discardInvalidImageData(asset: MorelordPortraitAsset, label: string): void {
	if (typeof asset.data === 'string' && isSupportedImageDataUrl(asset.data)) return;

	delete asset.data;
	asset.error ||= `The embedded ${label} data was invalid and was skipped during import.`;
}

function isMorelordCharacterExport(value: unknown): value is MorelordCharacterExport {
	return isRecord(value) && value.format === 'morelord-character' && 'actor' in value;
}

function isRecord(value: unknown): value is Record<string, any> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isSupportedImageDataUrl(value: string): boolean {
	return /^data:image\/(?:png|jpeg|webp|gif|svg\+xml);base64,/i.test(value);
}
