import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const databaseAvailable = Boolean(platform?.env?.DB);
	let databaseHealthy = false;

	if (platform?.env?.DB) {
		try {
			await platform.env.DB.prepare('SELECT 1 AS ok').first();
			databaseHealthy = true;
		} catch {
			databaseHealthy = false;
		}
	}

	return json(
		{
			status: databaseHealthy ? 'ok' : 'degraded',
			service: 'morelord-gaming-web',
			database: { available: databaseAvailable, healthy: databaseHealthy },
			timestamp: new Date().toISOString()
		},
		{ status: databaseHealthy ? 200 : 503 }
	);
};
