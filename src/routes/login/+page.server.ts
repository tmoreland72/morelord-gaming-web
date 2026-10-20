import { fail, redirect } from '@sveltejs/kit';
import { configuredAuthProviders, type AuthProviderName } from '$lib/server/auth';
import { safeReturnTo, socialSignInRedirects } from '$lib/server/return-to';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
	if (locals.user) redirect(302, returnTo);

	return {
		providers: configuredAuthProviders(),
		returnTo
	};
};

export const actions: Actions = {
	signInSocial: async (event) => {
		const formData = await event.request.formData();
		const provider = formData.get('provider')?.toString() as AuthProviderName | undefined;
		const returnTo = safeReturnTo(formData.get('returnTo')?.toString() ?? null);
		const providers = configuredAuthProviders();

		if (!provider || (provider !== 'discord' && provider !== 'google')) {
			return fail(400, { message: 'Unsupported sign-in provider.' });
		}

		if (!providers[provider]) {
			return fail(503, {
				message: `${provider === 'google' ? 'Google' : 'Discord'} sign-in is not configured.`
			});
		}

		const result = await event.locals.auth.api.signInSocial({
			body: {
				provider,
				disableRedirect: true,
				...socialSignInRedirects(event.url.origin, returnTo)
			}
		});

		if (result.url) redirect(302, result.url);
		return fail(400, {
			message: 'Sign-in could not be started. Confirm the OAuth application settings.'
		});
	}
};
