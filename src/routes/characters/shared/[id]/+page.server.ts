import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getSharedCharacter,
	importPublicCharacter,
	setCharacterPublic
} from '$lib/server/characters';

export const load: PageServerLoad = async ({ params, locals, platform, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	if (!platform?.env.DB) error(503, 'Character storage is unavailable.');
	const shared = await getSharedCharacter(platform.env.DB, params.id, locals.user?.id);
	if (!shared) error(404, 'The character is private or could not be found.');
	return { ...shared, shareUrl: `${url.origin}${url.pathname}`, signedIn: Boolean(locals.user) };
};

export const actions: Actions = {
	visibility: async ({ params, locals, platform, request }) => {
		if (!locals.user) error(401, 'Sign in to manage characters.');
		if (!platform?.env.DB) error(503, 'Character storage is unavailable.');
		const value = (await request.formData()).get('visibility');
		if (value !== 'public' && value !== 'private')
			return fail(400, { error: 'Choose a visibility.' });
		const updated = await setCharacterPublic(
			platform.env.DB,
			locals.user.id,
			params.id,
			value === 'public'
		);
		if (!updated) error(404, 'The character could not be found.');
		return {
			success:
				value === 'public' ? 'Your character is now public.' : 'Your character is now private.'
		};
	},
	import: async ({ params, locals, platform }) => {
		if (!locals.user) error(401, 'Sign in to import characters.');
		if (!platform?.env.DB) error(503, 'Character storage is unavailable.');
		const character = await importPublicCharacter(platform.env.DB, locals.user.id, params.id);
		if (!character) error(404, 'The character is private or could not be found.');
		redirect(303, '/characters');
	}
};
