import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateInstallationToken } from '$lib/server/foundry';

const corsHeaders = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'authorization, content-type, x-morelord-core-version, x-foundry-version',
	'access-control-allow-methods': 'GET, POST, OPTIONS'
};

export const OPTIONS: RequestHandler = async () => new Response(null, { status: 204, headers: corsHeaders });
export const GET: RequestHandler = async ({ request, platform, url }) => {
	if (!platform?.env?.DB) return json({ error: 'Database unavailable.' }, { status: 503, headers: corsHeaders });
	const authorization = request.headers.get('authorization');
	const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
	if (!token) return json({ error: 'Bearer token required.' }, { status: 401, headers: corsHeaders });
	try {
		const entitlement = await validateInstallationToken(
			platform.env.DB,
			token,
			url.searchParams.get('product') ?? undefined,
			{
				coreVersion: request.headers.get('x-morelord-core-version')?.trim() || undefined,
				foundryVersion: request.headers.get('x-foundry-version')?.trim() || undefined
			}
		);
		if (!entitlement) return json({ error: 'Installation token is invalid or revoked.' }, { status: 401, headers: corsHeaders });
		return json(entitlement, { headers: { ...corsHeaders, 'cache-control': 'no-store' } });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Entitlements could not be retrieved.' }, { status: 400, headers: corsHeaders });
	}
};
