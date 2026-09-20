import { z } from 'zod';
export const telemetryModules = [
	'morelord-core',
	'morelord-journeys',
	'morelord-downtime',
	'morelord-craftworks',
	'morelord-encounters',
	'morelord-marketplace',
	'morelord-character-export'
] as const;
const code = z.string().regex(/^[a-z][a-z0-9_.-]{0,79}$/);
const version = z.string().regex(/^[a-zA-Z0-9.+_-]{1,40}$/);
const frame = z
	.string()
	.max(240)
	.regex(/^morelord-[a-z-]+\/[a-zA-Z0-9_./-]+\.(?:m?js):[0-9]+:[0-9]+$/);
const common = {
	id: z.uuid(),
	at: z.iso.datetime(),
	module: z.enum(telemetryModules),
	event: code,
	moduleVersion: version,
	foundryVersion: version,
	system: version,
	systemVersion: version,
	role: z.enum(['gm', 'player'])
};
export const telemetrySchema = z
	.object({
		schemaVersion: z.literal(1),
		world: z.uuid(),
		events: z
			.array(
				z.discriminatedUnion('kind', [
					z.object({ ...common, kind: z.literal('usage') }).strict(),
					z
						.object({
							...common,
							kind: z.literal('error'),
							type: z.enum([
								'Error',
								'TypeError',
								'RangeError',
								'ReferenceError',
								'SyntaxError',
								'URIError',
								'EvalError',
								'AggregateError'
							]),
							frames: z.array(frame).max(8),
							recent: z.array(z.string().regex(/^morelord-[a-z-]+:[a-z][a-z0-9_.-]{0,79}$/)).max(5)
						})
						.strict()
				])
			)
			.min(1)
			.max(25)
	})
	.strict();

export async function readTelemetry(request: Request) {
	if (!request.headers.get('content-type')?.startsWith('application/json'))
		throw new Error('Invalid content type');
	const reader = request.body?.getReader();
	if (!reader) throw new Error('Missing body');
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > 49152) {
				await reader.cancel();
				throw new Error('Payload too large');
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	const payload = telemetrySchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
	const now = Date.now();
	if (
		payload.events.some(
			(event) => Date.parse(event.at) < now - 7 * 86400000 || Date.parse(event.at) > now + 300000
		)
	)
		throw new Error('Invalid event date');
	return payload;
}

export async function storeTelemetry(db: D1Database, payload: z.infer<typeof telemetrySchema>) {
	const now = Date.now();
	await db.batch(
		payload.events.map((event) =>
			db
				.prepare(
					'INSERT OR IGNORE INTO foundry_telemetry (id,world,occurred_at,received_at,kind,module,event,module_version,foundry_version,system,system_version,role,error_type,frames,recent) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
				)
				.bind(
					event.id,
					payload.world,
					event.at,
					now,
					event.kind,
					event.module,
					event.event,
					event.moduleVersion,
					event.foundryVersion,
					event.system,
					event.systemVersion,
					event.role,
					event.kind === 'error' ? event.type : null,
					event.kind === 'error' ? JSON.stringify(event.frames) : null,
					event.kind === 'error' ? JSON.stringify(event.recent) : null
				)
		)
	);
}

// One SQL statement checks and consumes quota, so concurrent requests cannot race a read/write pair.
// Database failures deliberately propagate: this public ingestion route must fail closed.
export async function consumeTelemetryLimit(
	db: D1Database,
	key: string,
	limit: number,
	windowMs: number
) {
	const now = Date.now();
	const result = await db
		.prepare(
			'INSERT INTO rate_limit_events (key,created_at) SELECT ?1,?2 WHERE (SELECT COUNT(*) FROM rate_limit_events WHERE key=?1 AND created_at>=?3) < ?4'
		)
		.bind(key, now, now - windowMs, limit)
		.run();
	return result.meta.changes === 1;
}
