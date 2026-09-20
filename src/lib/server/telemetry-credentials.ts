import { sha256 } from '$lib/server/crypto';
export async function registerTelemetryCredential(db: D1Database) {
	const world = crypto.randomUUID();
	const token =
		'mlt_' +
		[...crypto.getRandomValues(new Uint8Array(32))]
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
	await db
		.prepare(
			'INSERT INTO foundry_telemetry_credentials (world,token_hash,created_at) VALUES (?,?,?)'
		)
		.bind(world, await sha256(token), Date.now())
		.run();
	return { world, token };
}
export async function authenticateTelemetry(db: D1Database, authorization: string | null) {
	const token = authorization?.match(/^Bearer (mlt_[a-f0-9]{64})$/)?.[1];
	if (!token) return null;
	const credential = await db
		.prepare('SELECT world,revoked_at FROM foundry_telemetry_credentials WHERE token_hash=?')
		.bind(await sha256(token))
		.first<{ world: string; revoked_at: number | null }>();
	return credential && credential.revoked_at === null ? credential.world : null;
}
