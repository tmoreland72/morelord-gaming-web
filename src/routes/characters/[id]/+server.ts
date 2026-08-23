import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCharacter } from '$lib/server/characters';

export const GET: RequestHandler = async ({ locals, platform, params }) => {
	if (!locals.user) error(401, 'Sign in to view characters.');
	if (!platform?.env.DB) error(503, 'Character storage is unavailable.');

	const character = await getCharacter(platform.env.DB, locals.user.id, params.id);
	if (!character) error(404, 'The character could not be found.');

	return json(character, {
		headers: { 'cache-control': 'private, no-store' }
	});
};
