import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { bearerTokenMatches } from '$lib/server/crypto';
import { publishProductRelease, releaseInputSchema } from '$lib/server/releases';

function unauthorized() {
	return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const runtimeEnv = platform?.env as (Record<string, unknown> & { DB?: D1Database }) | undefined;
	const runtimeToken = runtimeEnv?.RELEASE_PUBLISH_TOKEN;
	const token =
		typeof runtimeToken === 'string' && runtimeToken.length > 0
			? runtimeToken
			: env.RELEASE_PUBLISH_TOKEN;
	if (!bearerTokenMatches(request.headers.get('authorization'), token)) return unauthorized();
	if (!platform?.env?.DB) {
		return json({ ok: false, error: 'D1 database binding is unavailable.' }, { status: 503 });
	}

	let input: unknown;
	try {
		input = await request.json();
	} catch {
		return json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 });
	}

	const parsed = releaseInputSchema.safeParse(input);
	if (!parsed.success) {
		return json(
			{
				ok: false,
				error:
					'Invalid release payload. Check the product slug, semantic version, URLs and change entries.'
			},
			{ status: 400 }
		);
	}

	const runtimeWebhook = runtimeEnv?.DISCORD_RELEASE_WEBHOOK_URL;
	const webhookUrl =
		typeof runtimeWebhook === 'string' && runtimeWebhook.length > 0
			? runtimeWebhook
			: env.DISCORD_RELEASE_WEBHOOK_URL;
	const runtimeOrigin = runtimeEnv?.ORIGIN;
	const origin =
		typeof runtimeOrigin === 'string' && runtimeOrigin.length > 0 ? runtimeOrigin : env.ORIGIN;

	const result = await publishProductRelease(platform.env.DB, parsed.data, {
		webhookUrl,
		origin,
		requestUrl: request.url
	});

	if (!result.ok) {
		return json(
			{
				ok: false,
				error: result.error,
				...(result.releaseId
					? {
							releaseId: result.releaseId,
							productSlug: result.productSlug,
							version: result.version
						}
					: {})
			},
			{ status: result.status }
		);
	}

	return json(result);
};
