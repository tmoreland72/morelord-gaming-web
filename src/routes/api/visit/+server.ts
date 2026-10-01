import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { requireD1 } from '$lib/server/http';
import {
	VISIT_ALLOWED_ORIGIN,
	VISIT_BEACON_MAX_BODY_LENGTH,
	evaluateVisitBeacon,
	recordVisit
} from '$lib/server/visit-log';

const noContent = () =>
	new Response(null, {
		status: 204,
		headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }
	});

/**
 * Browser-confirmed page-load beacon sent by the root layout. Always answers 204;
 * requests that fail any filter are silently dropped. Only POST is exported, so
 * other methods get SvelteKit's 405.
 */
export const POST: RequestHandler = async ({ request, url, platform }) => {
	try {
		const declaredLength = Number(request.headers.get('content-length') ?? '0');
		if (declaredLength > VISIT_BEACON_MAX_BODY_LENGTH) return noContent();

		const visit = evaluateVisitBeacon({
			contentType: request.headers.get('content-type'),
			origin: request.headers.get('origin'),
			referer: request.headers.get('referer'),
			userAgent: request.headers.get('user-agent'),
			body: await request.text(),
			allowedOrigins: dev ? [VISIT_ALLOWED_ORIGIN, url.origin] : [VISIT_ALLOWED_ORIGIN]
		});
		if (!visit) return noContent();

		const db = requireD1(platform);
		if (!db) return noContent();

		const write = recordVisit(db, visit);
		if (platform?.ctx?.waitUntil) {
			platform.ctx.waitUntil(write);
		} else {
			await write;
		}
	} catch {
		// Never let visit logging produce an error response.
	}
	return noContent();
};