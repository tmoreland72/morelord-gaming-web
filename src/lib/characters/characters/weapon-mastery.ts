import type { FoundryActor, FoundryActorItem } from '../models/foundry-actor';

function record(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export function getWeaponMasteries(actor: FoundryActor): string[] {
	const mastery = record(record(record(actor.system.traits).weaponProf).mastery).value;
	return Array.isArray(mastery)
		? mastery.filter((value): value is string => typeof value === 'string')
		: [];
}

export function hasWeaponMastery(item: FoundryActorItem, masteries: string[]): boolean {
	return (
		item.type === 'weapon' &&
		typeof item.system?.type === 'object' &&
		masteries.includes(String(record(item.system.type).baseItem ?? ''))
	);
}

const weaponLabels: Record<string, string> = {
	lighthammer: 'Light Hammer',
	handcrossbow: 'Hand Crossbow',
	heavycrossbow: 'Heavy Crossbow',
	lightcrossbow: 'Light Crossbow',
	warpick: 'War Pick'
};

export function weaponLabel(key: string): string {
	return (
		weaponLabels[key] ??
		key
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ')
			.replace(/\b\w/g, (letter) => letter.toUpperCase())
	);
}
