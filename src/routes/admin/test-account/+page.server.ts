import { error, fail, redirect } from '@sveltejs/kit';
import { isAdminEmail } from '$lib/server/admin';
import { publicErrorMessage, publicErrorStatus } from '$lib/server/errors';
import { getTestAccount, resetTestAccount } from '$lib/server/test-account';
import type { Actions, PageServerLoad } from './$types';

function requireAdmin(locals: App.Locals) {
	if (!locals.user) redirect(303, '/login?returnTo=/admin/test-account');
	if (!isAdminEmail(locals.user.email)) error(403, 'Administrator access required.');
	return locals.user;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	requireAdmin(locals);
	if (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');
	return getTestAccount(platform.env.DB);
};

export const actions: Actions = {
	reset: async ({ locals, platform, request }) => {
		const actor = requireAdmin(locals);
		if (!platform?.env?.DB) return fail(503, { message: 'D1 database binding is unavailable.' });
		const form = await request.formData();
		try {
			await resetTestAccount(platform.env.DB, actor, {
				userId: String(form.get('userId') ?? ''),
				confirmation: String(form.get('confirmation') ?? '')
			});
			return {
				success: true,
				message: 'Test account reset. Its next Google sign-in will create a new Morelord account.'
			};
		} catch (cause) {
			return fail(publicErrorStatus(cause), {
				message: publicErrorMessage(cause, 'Reset failed. Reload the page and try again.')
			});
		}
	}
};
