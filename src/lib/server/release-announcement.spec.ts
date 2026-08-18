import { describe, expect, it, vi } from 'vitest';
import { buildDiscordReleaseMessage, publishDiscordRelease } from './release-announcement';

const release = {
	productName: 'Morelord Craftworks',
	productSlug: 'morelord-craftworks',
	version: '0.3.1',
	title: 'A better harvest',
	summary: 'Adds configurable harvesting tools.',
	publicUrl: 'https://morelordgaming.com/releases#morelord-craftworks-0.3.1',
	githubReleaseUrl: 'https://github.com/example/craftworks/releases/tag/v0.3.1',
	changes: [
		{ category: 'feature' as const, tier: 'premium' as const, description: 'Harvest creatures.' }
	]
};

describe('Discord release announcements', () => {
	it('builds an embed linked to the GitHub release', () => {
		const message = buildDiscordReleaseMessage(release, '123456789');

		expect(message.content).toBe('<@&123456789>');
		expect(message.allowed_mentions).toEqual({ parse: [], roles: ['123456789'] });
		expect(message.embeds[0]).toMatchObject({
			title: 'Morelord Craftworks 0.3.1 — A better harvest',
			url: release.githubReleaseUrl,
			description: release.summary
		});
		expect(message.embeds[0].fields[0].value).toContain('**New · premium:** Harvest creatures.');
	});

	it('does not allow broad mentions when the Tools role is not configured', () => {
		const message = buildDiscordReleaseMessage(release);

		expect(message.content).toBeUndefined();
		expect(message.allowed_mentions).toEqual({ parse: [], roles: [] });
	});

	it('requests a response and returns the Discord message ID', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(JSON.stringify({ id: 'discord-message-id' }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);

		await expect(
			publishDiscordRelease(
				'https://discord.com/api/webhooks/1/token',
				release,
				'123456789',
				fetcher
			)
		).resolves.toBe('discord-message-id');
		expect(fetcher).toHaveBeenCalledWith(
			expect.objectContaining({ search: '?wait=true' }),
			expect.objectContaining({ method: 'POST' })
		);
		const request = fetcher.mock.calls[0]?.[1];
		expect(JSON.parse(String(request?.body))).toMatchObject({
			content: '<@&123456789>',
			allowed_mentions: { parse: [], roles: ['123456789'] }
		});
	});

	it('reports Discord delivery failures', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 429 }));

		await expect(
			publishDiscordRelease('https://discord.com/api/webhooks/1/token', release, null, fetcher)
		).rejects.toThrow('Discord webhook returned 429.');
	});
});
