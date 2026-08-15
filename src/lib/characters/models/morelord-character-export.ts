import type { FoundryActor } from './foundry-actor';

export interface MorelordExportSource {
	module?: string;
	moduleVersion?: string;
	foundryVersion?: string;
	foundryGeneration?: number;
	systemId?: string;
	systemVersion?: string;
	worldId?: string;
	[key: string]: unknown;
}

export interface MorelordImageAsset {
	path?: string;
	originalMimeType?: string;
	mimeType?: string;
	data?: string;
	bytes?: number;
	originalWidth?: number;
	originalHeight?: number;
	width?: number;
	height?: number;
	error?: string;
	[key: string]: unknown;
}

/** Format 1–2 portrait structure. */
export type MorelordPortraitAsset = MorelordImageAsset;

export interface MorelordAssetReferences {
	actor?: {
		portrait?: string;
		prototypeToken?: string;
		[key: string]: unknown;
	};
	items?: Record<string, string>;
	[key: string]: unknown;
}

export interface MorelordAssetSummary {
	requested?: number;
	embedded?: number;
	failed?: number;
	[key: string]: unknown;
}

export interface MorelordCharacterAssets {
	/** Legacy format 1–2 portrait asset. */
	portrait?: MorelordPortraitAsset;

	/** Format 3 shared, deduplicated image library. */
	images?: Record<string, MorelordImageAsset>;
	references?: MorelordAssetReferences;
	summary?: MorelordAssetSummary;

	[key: string]: unknown;
}

export interface MorelordDerivedClass {
	id?: string;
	name: string;
	identifier?: string;
	levels: number;
	hitDie?: string;
	spellcastingProgression?: string;
	[key: string]: unknown;
}

export interface MorelordDerivedCharacter {
	name?: string;
	level?: number;
	classes?: MorelordDerivedClass[];
	proficiencyBonus?: number;
	armorClass?: number;
	hitPoints?: Record<string, unknown>;
	initiative?: Record<string, unknown>;
	movement?: Record<string, unknown>;
	senses?: Record<string, unknown>;
	abilities?: Record<string, unknown>;
	skills?: Record<string, unknown>;
	tools?: Record<string, unknown>;
	passivePerception?: number;
	spellcasting?: Record<string, unknown>;
	[key: string]: unknown;
}

export interface MorelordCharacterExport {
	format: 'morelord-character';
	formatVersion: number;
	exportedAt?: string;
	source?: MorelordExportSource;
	actor: FoundryActor;
	derived?: MorelordDerivedCharacter;
	assets?: MorelordCharacterAssets;
}
