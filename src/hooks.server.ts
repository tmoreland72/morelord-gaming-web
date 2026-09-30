import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { createAuth } from '$lib/server/auth';
import { recordVisit, visitRecordFor } from '$lib/server/visit-log';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export const handle: Handle = async ({ event, resolve }) => {
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

	const response = await svelteKitHandler({ event, resolve, auth, building });

	// Privacy-light daily aggregate visit logging. Runs after the response via waitUntil
	// so it can never slow down or break the page.
	try {
		const visit = visitRecordFor({
			method: event.request.method,
			url: event.url,
			routeId: event.route.id,
			isDataRequest: event.isDataRequest,
			userAgent: event.request.headers.get('user-agent'),
			status: response.status,
			contentType: response.headers.get('content-type')
		});
		if (visit) {
			const write = recordVisit(event.platform.env.DB, visit);
			if (event.platform.ctx?.waitUntil) {
				event.platform.ctx.waitUntil(write);
			} else {
				void write;
			}
		}
	} catch {
		// Never let visit logging affect the response.
	}

	return response;
};
