import type { RequestHandler } from './$types';
import { validateInstallationToken } from '$lib/server/foundry';
import { foundryCorsPreflight, jsonWithCors, requireD1 } from '$lib/server/http';
import { publicErrorMessage, publicErrorStatus } from '$lib/server/errors';

export const OPTIONS: RequestHandler = async () => foundryCorsPreflight();

export const GET: RequestHandler = async ({ request, platform, url }) => {
	const db = requireD1(platform);
	if (!db) return jsonWithCors({ error: 'Database unavailable.' }, { status: 503 });

	const authorization = request.headers.get('authorization');
	const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
	if (!token) return jsonWithCors({ error: 'Bearer token required.' }, { status: 401 });

	try {
		const entitlement = await validateInstallationToken(
			db,
			token,
			url.searchParams.get('product') ?? undefined,
			{
				coreVersion: request.headers.get('x-morelord-core-version')?.trim() || undefined,
				foundryVersion: request.headers.get('x-foundry-version')?.trim() || undefined
			}
		);
		if (!entitlement) {
			return jsonWithCors({ error: 'Installation token is invalid or revoked.' }, { status: 401 });
		}
		return jsonWithCors(entitlement, { headers: { 'cache-control': 'no-store' } });
	} catch (error) {
		return jsonWithCors(
			{ error: publicErrorMessage(error, 'Entitlements could not be retrieved.') },
			{ status: publicErrorStatus(error, 400) }
		);
	}
};
