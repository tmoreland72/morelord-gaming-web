import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { syncNotInServerDiscordBatch } from '$lib/server/discord-cron';

function authorized(request: Request): boolean {
	const secret = env.CRON_SECRET?.trim();
	if (!secret) return false;
	const header = request.headers.get('authorization')?.trim();
	return header === `Bearer ${secret}`;
}

/** Optional manual HTTP trigger (Bearer CRON_SECRET). The Worker scheduled() handler calls sync directly. */
export const GET: RequestHandler = async ({ request, platform }) => {
	if (!env.CRON_SECRET?.trim()) {
		return json(
			{ error: 'Cron HTTP trigger is not configured (CRON_SECRET is unset).' },
			{ status: 503 }
		);
	}
	if (!authorized(request)) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!platform?.env?.DB) return json({ error: 'Database unavailable' }, { status: 503 });
	const result = await syncNotInServerDiscordBatch(platform.env.DB);
	return json({ ok: true, result });
};