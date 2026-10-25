import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { createAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const FOUNDRY_MEDIA_ORIGIN = 'https://media.morelordgaming.com/foundry/';
const FOUNDRY_IMAGE_PATH = /^\/images\/foundry\/([A-Za-z0-9._-]+)$/;

export const handle: Handle = async ({ event, resolve }) => {
	const foundryImage = FOUNDRY_IMAGE_PATH.exec(event.url.pathname);
	if (foundryImage) {
		return new Response(null, {
			status: 301,
			headers: { location: FOUNDRY_MEDIA_ORIGIN + foundryImage[1] }
		});
	}

	if (!event.platform?.env?.DB) {
		throw new Error('D1 binding "DB" not found - are you running with Wrangler?');
	}

	const auth = createAuth(event.platform.env.DB, event.url.origin);
	event.locals.auth = auth;

	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	// Visits are counted by the browser beacon (POST /api/visit), not here.
	return svelteKitHandler({ event, resolve, auth, building });
};