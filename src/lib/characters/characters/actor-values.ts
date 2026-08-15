import type { FoundryActor } from '../models/foundry-actor';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getPathValue(source: unknown, path: string): unknown {
	const parts = path.split('.');
	let current: unknown = source;

	for (const part of parts) {
		if (!isRecord(current)) {
			return undefined;
		}

		current = current[part];
	}

	return current;
}

export function getNumberAtPath(source: unknown, path: string): number | undefined {
	const value = getPathValue(source, path);

	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function getStringAtPath(source: unknown, path: string): string | undefined {
	const value = getPathValue(source, path);

	return typeof value === 'string' ? value : undefined;
}

export function getAbilityScore(actor: FoundryActor, ability: string): number {
	return getNumberAtPath(actor, `system.abilities.${ability}.value`) ?? 10;
}

export function getAbilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

export function formatModifier(modifier: number): string {
	return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}
