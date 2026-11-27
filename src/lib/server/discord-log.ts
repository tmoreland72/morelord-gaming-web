export function logDiscordSync(scope: string, details: Record<string, unknown>): void {
	console.info(`[discord-sync:${scope}]`, JSON.stringify(details));
}