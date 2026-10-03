import { json } from '@sveltejs/kit';
import { requireD1 } from '$lib/server/http';
import type { RequestHandler } from './$types';

const headers = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };

export const GET: RequestHandler = async ({ platform }) => {
	const db = requireD1(platform);
	if (!db) return json({ error: 'Database unavailable' }, { status: 503, headers });
	try {
		const row = await db.prepare('SELECT COUNT(*) AS count FROM "user"').first<{ count: number }>();
		return json({ registeredAccounts: row!.count }, { headers });
	} catch {
		return json({ error: 'Account stats unavailable' }, { status: 500, headers });
	}
};
