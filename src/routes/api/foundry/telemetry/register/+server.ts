import type { RequestHandler } from './$types';
import { foundryCorsPreflight, jsonWithCors, requireD1 } from '$lib/server/http';
import { consumeTelemetryLimit } from '$lib/server/telemetry';
import { registerTelemetryCredential } from '$lib/server/telemetry-credentials';
import { sha256 } from '$lib/server/crypto';
export const OPTIONS: RequestHandler = async () => foundryCorsPreflight();
export const POST: RequestHandler = async (event) => {
	const db = requireD1(event.platform);
	if (!db) return jsonWithCors({ error: 'Reporting unavailable.' }, { status: 503 });
	// Registration needs no account or request content. Never buffer an unsolicited body.
	await event.request.body?.cancel();
	try {
		const key = await sha256(new Date().toISOString().slice(0, 10) + event.getClientAddress());
		if (
			!(await consumeTelemetryLimit(db, 'telemetry-register-hour:' + key, 3, 3600000)) ||
			!(await consumeTelemetryLimit(db, 'telemetry-register-day:' + key, 10, 86400000))
		) {
			return jsonWithCors(
				{ error: 'Registration rate limited.' },
				{ status: 429, headers: { 'retry-after': '3600' } }
			);
		}
		return jsonWithCors(await registerTelemetryCredential(db), {
			headers: { 'cache-control': 'no-store' }
		});
	} catch {
		return jsonWithCors({ error: 'Reporting unavailable.' }, { status: 503 });
	}
};
