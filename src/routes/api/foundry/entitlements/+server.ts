import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateInstallationToken } from '$lib/server/foundry';

export const GET: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.DB) return json({ error: 'Database unavailable.' }, { status: 503 });
	const authorization = request.headers.get('authorization');
	const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
	if (!token) return json({ error: 'Bearer token required.' }, { status: 401 });
	const entitlement = await validateInstallationToken(platform.env.DB, token);
	if (!entitlement) return json({ error: 'Installation token is invalid or revoked.' }, { status: 401 });
	return json(entitlement, { headers: { 'cache-control': 'no-store' } });
};
