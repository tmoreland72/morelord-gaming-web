import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveActorPortrait } from '$lib/characters/assets/image-resolver';
import { getCharacter } from '$lib/server/characters';

export const GET: RequestHandler = async ({ locals, platform, params }) => {
	if (!locals.user) error(401, 'Sign in to view character portraits.');
	if (!platform?.env.DB) error(503, 'Character storage is unavailable.');

	const character = await getCharacter(platform.env.DB, locals.user.id, params.id);
	if (!character) error(404, 'The character could not be found.');

	const source = resolveActorPortrait(character).src;
	if (!source) error(404, 'This character has no available portrait.');
	if (/^https?:\/\//i.test(source)) redirect(302, source);

	const match = /^data:(image\/(?:png|jpeg|webp|gif|svg\+xml));base64,(.+)$/is.exec(source);
	if (!match) error(404, 'This character has no browser-compatible portrait.');

	let bytes: Uint8Array;
	try {
		const binary = atob(match[2]);
		bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
	} catch {
		error(422, 'The stored portrait data is invalid.');
	}

	const body = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(body).set(bytes);

	return new Response(body, {
		headers: {
			'content-type': match[1].toLowerCase(),
			'cache-control': 'private, max-age=3600',
			'content-length': String(bytes.byteLength),
			'x-content-type-options': 'nosniff'
		}
	});
};
