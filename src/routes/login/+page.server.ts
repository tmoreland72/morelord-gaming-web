import { fail, redirect } from '@sveltejs/kit';
import { configuredAuthProviders, type AuthProviderName } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

function safeReturnTo(value: string | null): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) return '/account';
	return value;
}

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

		if (!provider || (provider !== 'github' && provider !== 'google')) {
			return fail(400, { message: 'Unsupported sign-in provider.' });
		}

		if (!providers[provider]) {
			return fail(503, { message: `${provider === 'google' ? 'Google' : 'GitHub'} sign-in is not configured.` });
		}

		const result = await event.locals.auth.api.signInSocial({
			body: { provider, callbackURL: returnTo }
		});

		if (result.url) redirect(302, result.url);
		return fail(400, { message: 'Sign-in could not be started. Confirm the OAuth application settings.' });
	}
};
