import { json } from '@sveltejs/kit';
import { configuredAuthProviders } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, platform, url }) => {
	let databaseHealthy = false;
	if (platform?.env?.DB) {
		try {
			await platform.env.DB.prepare('SELECT 1').first();
			databaseHealthy = true;
		} catch {
			databaseHealthy = false;
		}
	}

	return json({
		status: databaseHealthy ? 'ok' : 'degraded',
		origin: url.origin,
		database: { available: Boolean(platform?.env?.DB), healthy: databaseHealthy },
		providers: configuredAuthProviders(),
		session: {
			authenticated: Boolean(locals.user),
			userId: locals.user?.id ?? null
		}
	});
};
