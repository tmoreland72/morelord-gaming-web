import { z } from 'zod';
import type { FoundryActor } from '../models/foundry-actor';

const actorSchema = z
	.object({
		_id: z.string().optional(),
		name: z.string().min(1, 'The Actor has no name.'),
		type: z.string().min(1, 'The Actor has no type.'),
		img: z.string().optional(),
		system: z.record(z.string(), z.unknown()),
		items: z.array(z.record(z.string(), z.unknown())).default([]),
		effects: z.array(z.unknown()).default([]),
		flags: z.record(z.string(), z.unknown()).optional(),
		_stats: z
			.object({
				coreVersion: z.string().optional(),
				systemId: z.string().optional(),
				systemVersion: z.string().optional()
			})
			.passthrough()
			.optional()
	})
	.passthrough();

export function validateFoundryActor(data: unknown): FoundryActor {
	const result = actorSchema.safeParse(data);

	if (!result.success) {
		const details = result.error.issues.map((issue) => issue.message).join(' ');

		throw new Error(`This is not a valid Foundry Actor export. ${details}`);
	}

	const actor = result.data;

	if (actor.type !== 'character') {
		throw new Error(
			`The imported Actor is type "${actor.type}". ` +
				`Only D&D character Actors are currently supported.`
		);
	}

	if (actor._stats?.systemId && actor._stats.systemId !== 'dnd5e') {
		throw new Error(
			`This Actor belongs to the "${actor._stats.systemId}" system. ` +
				`Only dnd5e Actors are supported.`
		);
	}

	return actor as FoundryActor;
}
