import type { FoundryActor } from './foundry-actor';
import type {
	MorelordCharacterAssets,
	MorelordDerivedCharacter,
	MorelordExportSource,
	MorelordPortraitAsset
} from './morelord-character-export';

export type StoredPortraitSource = 'export' | 'custom';

export interface StoredCharacter {
	localId: string;
	foundryActorId?: string;
	name: string;
	actorType: string;

	/** Original portrait path recorded by Foundry. */
	portraitPath?: string;

	/** Portable portrait stored in IndexedDB as a data URL. */
	portraitDataUrl?: string;

	/** Identifies whether the portable portrait came from an export or the user. */
	portraitSource?: StoredPortraitSource;

	/** Metadata about the portrait bundled by a format 1–2 export. */
	portraitAsset?: Omit<MorelordPortraitAsset, 'data'>;

	sourceFileName: string;
	importedAt: string;

	exportFormat?: string;
	exportFormatVersion?: number;
	exportedAt?: string;
	exportSource?: MorelordExportSource;

	foundryVersion?: string;
	systemVersion?: string;

	/** Display-ready values prepared by Foundry and copied by the exporter. */
	derived?: MorelordDerivedCharacter;

	/**
	 * Portable image library and ID references from export format 3+.
	 * Images are kept once and resolved through image-resolver.ts.
	 */
	assets?: MorelordCharacterAssets;

	/** Complete original Foundry Actor document. */
	actor: FoundryActor;
}
