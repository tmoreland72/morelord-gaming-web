import { json } from '@sveltejs/kit';
import { listUserInstallations } from '$lib/server/foundry';
import type { RequestHandler } from './$types';

/** Installation rows for the account page, without reloading billing or Discord. */
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) return json({ error: 'Sign in required.' }, { status: 401 });
	const db = platform?.env?.DB;
	if (!db) return json({ error: 'Database unavailable.' }, { status: 503 });
	return json(await listUserInstallations(db, locals.user.id), {
		headers: { 'cache-control': 'private, no-store' }
	});
};
