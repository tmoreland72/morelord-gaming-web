import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
const corsHeaders = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'authorization, content-type',
	'access-control-allow-methods': 'GET, POST, OPTIONS'
};

export const OPTIONS: RequestHandler = async () => new Response(null, { status: 204, headers: corsHeaders });
import { pollActivation } from '$lib/server/foundry';

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.DB) return json({ error: 'Database unavailable.' }, { status: 503, headers: corsHeaders });
	const body = await request.json() as Record<string, unknown>;
	if (typeof body.activationId !== 'string' || typeof body.deviceSecret !== 'string') return json({ error: 'activationId and deviceSecret are required.' }, { status: 400, headers: corsHeaders });
	const result = await pollActivation(platform.env.DB, body.activationId, body.deviceSecret);
	return json(result, { status: result.status === 'invalid' ? 401 : 200, headers: corsHeaders });
};
