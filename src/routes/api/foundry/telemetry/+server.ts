import { authenticateTelemetry } from '$lib/server/telemetry-credentials';
import type { RequestHandler } from './$types';
import { foundryCorsPreflight, jsonWithCors, requireD1 } from '$lib/server/http';
import { readTelemetry, storeTelemetry, consumeTelemetryLimit } from '$lib/server/telemetry';

export const OPTIONS: RequestHandler = async () => foundryCorsPreflight();
const unavailable = () =>
	jsonWithCors({ error: 'Reporting temporarily unavailable.' }, { status: 503 });
const limited = () =>
	jsonWithCors({ error: 'Rate limited.' }, { status: 429, headers: { 'retry-after': '60' } });
export const POST: RequestHandler = async (event) => {
	const db = requireD1(event.platform);
	if (!db) return unavailable();
	let payload;
	let reportingWorld: string | null = null;
	try {
		// Address hash is used only for abuse controls, never joined to usage reports or accounts.
		const digest = await crypto.subtle.digest(
			'SHA-256',
			new TextEncoder().encode(new Date().toISOString().slice(0, 10) + event.getClientAddress())
		);
		const key = [...new Uint8Array(digest)]
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
		if (
			!(await consumeTelemetryLimit(db, 'telemetry-minute:' + key, 30, 60000)) ||
			!(await consumeTelemetryLimit(db, 'telemetry-day:' + key, 2000, 86400000))
		)
			return limited();
	} catch {
		return unavailable();
	}
	try {
		reportingWorld = await authenticateTelemetry(db, event.request.headers.get('authorization'));
		if (!reportingWorld)
			return jsonWithCors({ error: 'Reporting credential required or revoked.' }, { status: 401 });
	} catch {
		return unavailable();
	}
	try {
		payload = await readTelemetry(event.request);
		if (payload.world !== reportingWorld)
			return jsonWithCors({ error: 'Reporting world mismatch.' }, { status: 403 });
	} catch {
		return jsonWithCors({ error: 'Invalid telemetry payload.' }, { status: 400 });
	}
	try {
		if (
			!(await consumeTelemetryLimit(db, 'telemetry-world-minute:' + payload.world, 30, 60000)) ||
			!(await consumeTelemetryLimit(db, 'telemetry-world-day:' + payload.world, 1000, 86400000))
		)
			return limited();
		await storeTelemetry(db, payload);
		await db
			.prepare('UPDATE foundry_telemetry_credentials SET last_seen_at=? WHERE world=?')
			.bind(Date.now(), reportingWorld)
			.run();
		if (Math.random() < 0.01)
			event.platform?.ctx?.waitUntil(
				Promise.all([
					db
						.prepare('DELETE FROM foundry_telemetry WHERE received_at < ?')
						.bind(Date.now() - 90 * 86400000)
						.run(),
					db
						.prepare('DELETE FROM rate_limit_events WHERE created_at < ?')
						.bind(Date.now() - 86400000)
						.run()
				])
			);
		return jsonWithCors({ accepted: true }, { headers: { 'cache-control': 'no-store' } });
	} catch {
		return unavailable();
	}
};
