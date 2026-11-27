/**
 * @param {import('@cloudflare/workers-types').ScheduledEvent} event
 * @param {Env} env
 * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
 */
worker_default.scheduled = async (event, env, ctx) => {
	const secret = env.CRON_SECRET;
	if (!secret) {
		console.warn('[discord-cron] CRON_SECRET is not configured; skipping catch-up sync.');
		return;
	}
	const origin = (env.ORIGIN || 'https://morelordgaming.com').replace(/\/$/, '');
	const req = new Request(`${origin}/api/cron/discord-role-sync`, {
		method: 'GET',
		headers: { Authorization: `Bearer ${secret}` }
	});
	ctx.waitUntil(worker_default.fetch(req, env, ctx));
};