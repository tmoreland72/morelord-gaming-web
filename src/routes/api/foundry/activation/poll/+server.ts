import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pollActivation } from '$lib/server/foundry';

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.DB) return json({ error: 'Database unavailable.' }, { status: 503 });
	const body = await request.json() as Record<string, unknown>;
	if (typeof body.activationId !== 'string' || typeof body.deviceSecret !== 'string') return json({ error: 'activationId and deviceSecret are required.' }, { status: 400 });
	const result = await pollActivation(platform.env.DB, body.activationId, body.deviceSecret);
	return json(result, { status: result.status === 'invalid' ? 401 : 200 });
};
