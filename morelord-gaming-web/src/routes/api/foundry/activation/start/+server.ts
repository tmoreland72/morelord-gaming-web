import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
const corsHeaders = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'authorization, content-type',
	'access-control-allow-methods': 'GET, POST, OPTIONS'
};

export const OPTIONS: RequestHandler = async () => new Response(null, { status: 204, headers: corsHeaders });
import { createActivationRequest } from '$lib/server/foundry';

export const POST: RequestHandler = async ({ request, platform, url }) => {
	if (!platform?.env?.DB) return json({ error: 'Database unavailable.' }, { status: 503, headers: corsHeaders });
	try {
		const body = await request.json() as Record<string, unknown>;
		const productSlug = typeof body.productSlug === 'string' ? body.productSlug : '';
		if (!productSlug) return json({ error: 'productSlug is required.' }, { status: 400, headers: corsHeaders });
		const activation = await createActivationRequest(platform.env.DB, {
			productSlug,
			installationLabel: typeof body.installationLabel === 'string' ? body.installationLabel : undefined,
			worldId: typeof body.worldId === 'string' ? body.worldId : undefined,
			worldName: typeof body.worldName === 'string' ? body.worldName : undefined,
			foundryVersion: typeof body.foundryVersion === 'string' ? body.foundryVersion : undefined,
			moduleVersion: typeof body.moduleVersion === 'string' ? body.moduleVersion : undefined
		});
		return json({ ...activation, verificationUrl: `${url.origin}/account` }, { headers: corsHeaders });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Activation could not be started.' }, { status: 400, headers: corsHeaders });
	}
};
