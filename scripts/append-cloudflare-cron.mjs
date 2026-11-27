import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(root, '..', '.svelte-kit', 'cloudflare', '_worker.js');
const cronPath = path.join(root, '..', 'cron', 'discord-role-sync-job.js');

const cron = await readFile(cronPath, 'utf8');
await appendFile(workerPath, `\n${cron}`, 'utf8');
console.log('Appended Discord role sync scheduled handler to Cloudflare worker.');