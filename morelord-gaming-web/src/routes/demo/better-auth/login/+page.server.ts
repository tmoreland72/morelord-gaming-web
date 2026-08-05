import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	if (event.locals.user) return redirect(302, '/demo/better-auth');
	return {};
};

export const actions: Actions = {
	signInSocial: async (event) => {
		const formData = await event.request.formData();
		const provider = formData.get('provider')?.toString();
		const callbackURL = formData.get('callbackURL')?.toString() ?? '/demo/better-auth';

		if (provider !== 'github' && provider !== 'google') {
			return fail(400, { message: 'Unsupported social sign-in provider.' });
		}

		const result = await event.locals.auth.api.signInSocial({
			body: { provider, callbackURL }
		});

		if (result.url) return redirect(302, result.url);
		return fail(400, { message: 'Social sign-in failed. Confirm the provider credentials are configured.' });
	}
};
