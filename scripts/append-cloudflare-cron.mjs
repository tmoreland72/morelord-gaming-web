import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(root, '..', '.svelte-kit', 'cloudflare', '_worker.js');

const cron = `
worker_default.scheduled = async (event, env, ctx) => {
	if (!env.DB) {
		console.warn('[discord-cron] DB binding missing; skipping catch-up sync.');
		return;
	}
	ctx.waitUntil(
		(async () => {
			try {
				const { syncNotInServerDiscordBatch } = await import('./../output/server/chunks/discord.js');
				const result = await syncNotInServerDiscordBatch(env.DB);
				console.log('[discord-cron] catch-up batch finished', JSON.stringify(result));
			} catch (cause) {
				console.error('[discord-cron] catch-up batch failed.', cause);
			}
		})()
	);
};
`;

await appendFile(workerPath, cron, 'utf8');
console.log('Appended Discord role sync scheduled handler to Cloudflare worker.');