import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isAdminEmail } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login?returnTo=${encodeURIComponent(url.pathname)}`);
	if (!isAdminEmail(locals.user.email)) error(403, 'Administrator access required.');

	return { adminUser: locals.user };
};
