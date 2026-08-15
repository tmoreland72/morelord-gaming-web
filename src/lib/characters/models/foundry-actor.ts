export interface FoundryStats {
	coreVersion?: string;
	systemId?: string;
	systemVersion?: string;
	createdTime?: number;
	modifiedTime?: number;
	lastModifiedBy?: string;
	[key: string]: unknown;
}

export interface FoundryActorSystem {
	abilities?: unknown;
	attributes?: unknown;
	bonuses?: unknown;
	currency?: unknown;
	details?: unknown;
	resources?: unknown;
	skills?: unknown;
	spells?: unknown;
	traits?: unknown;
	tools?: unknown;

	[key: string]: unknown;
}

export interface FoundryActorItem {
	_id?: string;
	name: string;
	type: string;
	img?: string;
	system?: Record<string, unknown>;
	effects?: unknown[];
	flags?: Record<string, unknown>;

	[key: string]: unknown;
}

export interface FoundryActor {
	_id?: string;
	name: string;
	type: string;
	img?: string;
	system: FoundryActorSystem;
	items: FoundryActorItem[];
	effects: unknown[];
	flags?: Record<string, unknown>;
	_stats?: FoundryStats;

	[key: string]: unknown;
}
