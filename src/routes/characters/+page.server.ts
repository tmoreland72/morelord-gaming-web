import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readActorJson } from '$lib/characters/import/read-actor-file';
import {
	deleteCharacter,
	listCharacters,
	saveImportedCharacter,
	updateCharacterPortrait
} from '$lib/server/characters';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) redirect(303, `/login?returnTo=${encodeURIComponent(url.pathname)}`);
	if (!platform?.env.DB) error(503, 'Character storage is unavailable.');
	return { characters: await listCharacters(platform.env.DB, locals.user.id) };
};

export const actions: Actions = {
	import: async ({ request, locals, platform }) => {
		const context = requireUserAndDb(locals.user?.id, platform?.env.DB);
		const form = await request.formData();
		const file = form.get('character');
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { error: 'Choose a character JSON file.' });
		if (file.size > 20 * 1024 * 1024)
			return fail(413, { error: 'Character exports must be 20 MB or smaller.' });
		try {
			const imported = readActorJson(file.name, await file.text());
			const character = await saveImportedCharacter(context.db, context.userId, imported);
			return { success: `${character.name} was imported successfully.` };
		} catch (cause) {
			return fail(400, {
				error: cause instanceof Error ? cause.message : 'The character could not be imported.'
			});
		}
	},
	portrait: async ({ request, locals, platform }) => {
		const context = requireUserAndDb(locals.user?.id, platform?.env.DB);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const file = form.get('portrait');
		if (!(file instanceof File) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
			return fail(400, { error: 'Choose a PNG, JPG, or WebP image.' });
		if (file.size > 8 * 1024 * 1024)
			return fail(413, { error: 'The portrait image must be 8 MB or smaller.' });
		const dataUrl = `data:${file.type};base64,${arrayBufferToBase64(await file.arrayBuffer())}`;
		try {
			await updateCharacterPortrait(context.db, context.userId, id, dataUrl);
			return { success: 'The portrait was updated.' };
		} catch (cause) {
			return fail(404, {
				error: cause instanceof Error ? cause.message : 'The portrait could not be updated.'
			});
		}
	},
	delete: async ({ request, locals, platform }) => {
		const context = requireUserAndDb(locals.user?.id, platform?.env.DB);
		const form = await request.formData();
		await deleteCharacter(context.db, context.userId, String(form.get('id') ?? ''));
		return { success: 'The character was removed.' };
	}
};

function requireUserAndDb(userId: string | undefined, db: D1Database | undefined) {
	if (!userId) error(401, 'Sign in to manage characters.');
	if (!db) error(503, 'Character storage is unavailable.');
	return { userId, db };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = '';
	for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
	return btoa(binary);
}
