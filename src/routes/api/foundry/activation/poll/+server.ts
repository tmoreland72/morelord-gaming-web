import type { RequestHandler } from './$types';
import { activationPollSchema, pollActivation } from '$lib/server/foundry';
import { foundryCorsPreflight, jsonWithCors, requireD1 } from '$lib/server/http';

export const OPTIONS: RequestHandler = async () => foundryCorsPreflight();

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = requireD1(platform);
	if (!db) return jsonWithCors({ error: 'Database unavailable.' }, { status: 503 });

	const parsed = activationPollSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return jsonWithCors({ error: 'activationId and deviceSecret are required.' }, { status: 400 });
	}

	const result = await pollActivation(db, parsed.data.activationId, parsed.data.deviceSecret);
	return jsonWithCors(result, { status: result.status === 'invalid' ? 401 : 200 });
};
