const CLEANUP_EVERY = 25;

let operations = 0;

export async function consumeRateLimit(
	d1: D1Database,
	key: string,
	limit: number,
	windowMs: number
): Promise<boolean> {
	const now = Date.now();
	const windowStart = now - windowMs;

	try {
		operations += 1;
		if (operations % CLEANUP_EVERY === 1) {
			await d1
				.prepare('DELETE FROM rate_limit_events WHERE created_at < ?1')
				.bind(now - 24 * 60 * 60 * 1000)
				.run();
		}

		const row = await d1
			.prepare(
				'SELECT COUNT(*) AS total FROM rate_limit_events WHERE key = ?1 AND created_at >= ?2'
			)
			.bind(key, windowStart)
			.first<{ total: number }>();
		if (Number(row?.total ?? 0) >= limit) return false;

		await d1
			.prepare('INSERT INTO rate_limit_events (key, created_at) VALUES (?1, ?2)')
			.bind(key, now)
			.run();
		return true;
	} catch (cause) {
		console.warn('Rate limit storage unavailable; allowing request.', cause);
		return true;
	}
}
