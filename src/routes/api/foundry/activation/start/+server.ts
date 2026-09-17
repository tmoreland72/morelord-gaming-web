import type { RequestHandler } from './$types';
import { createActivationRequest, activationStartSchema } from '$lib/server/foundry';
import { clientAddressKey, foundryCorsPreflight, jsonWithCors, requireD1 } from '$lib/server/http';
import { consumeRateLimit } from '$lib/server/rate-limit';
import { publicErrorMessage, publicErrorStatus } from '$lib/server/errors';

export const OPTIONS: RequestHandler = async () => foundryCorsPreflight();

export const POST: RequestHandler = async (event) => {
	const db = requireD1(event.platform);
	if (!db) return jsonWithCors({ error: 'Database unavailable.' }, { status: 503 });

	const allowed = await consumeRateLimit(
		db,
		clientAddressKey(event, 'foundry-activation'),
		8,
		15 * 60 * 1000
	);
	if (!allowed) {
		return jsonWithCors(
			{ error: 'Too many activation attempts. Wait a few minutes and try again.' },
			{ status: 429 }
		);
	}

	try {
		let body: unknown;
		try {
			body = await event.request.json();
		} catch {
			return jsonWithCors({ error: 'productSlug is required.' }, { status: 400 });
		}
		const parsed = activationStartSchema.safeParse(body);
		if (!parsed.success) {
			return jsonWithCors({ error: 'productSlug is required.' }, { status: 400 });
		}
		const activation = await createActivationRequest(db, parsed.data);
		const verificationUrl = new URL('/account', event.url.origin);
		verificationUrl.searchParams.set('activation', activation.userCode);
		verificationUrl.hash = 'foundry-activation';
		return jsonWithCors({ ...activation, verificationUrl: verificationUrl.toString() });
	} catch (error) {
		return jsonWithCors(
			{
				error: publicErrorMessage(error, 'Activation could not be started.')
			},
			{ status: publicErrorStatus(error, 400) }
		);
	}
};
