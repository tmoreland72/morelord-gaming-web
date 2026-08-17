export type ReleaseAnnouncement = {
	productName: string;
	productSlug: string;
	version: string;
	title: string;
	summary?: string;
	publicUrl: string;
	githubReleaseUrl?: string;
	changes: Array<{
		category: 'feature' | 'improvement' | 'fix' | 'breaking' | 'security';
		tier?: 'standard' | 'premium' | 'champion';
		description: string;
	}>;
};

const categoryLabels = {
	feature: 'New',
	improvement: 'Improved',
	fix: 'Fixed',
	breaking: 'Breaking',
	security: 'Security'
} as const;

export function buildDiscordReleaseMessage(release: ReleaseAnnouncement) {
	const displayedChanges = release.changes.slice(0, 10);
	const changes = displayedChanges.map((change) => {
		const tier = change.tier && change.tier !== 'standard' ? ` · ${change.tier}` : '';
		return `**${categoryLabels[change.category]}${tier}:** ${change.description}`;
	});

	if (release.changes.length > displayedChanges.length) {
		changes.push(`*Plus ${release.changes.length - displayedChanges.length} more changes…*`);
	}

	return {
		username: 'Morelord Gaming Releases',
		allowed_mentions: { parse: [] as string[] },
		embeds: [
			{
				title: `${release.productName} ${release.version} — ${release.title}`.slice(0, 256),
				url: release.githubReleaseUrl || release.publicUrl,
				description: release.summary?.slice(0, 4_096),
				color: 0x7c3aed,
				fields: changes.length
					? [{ name: 'What changed', value: changes.join('\n').slice(0, 1_024) }]
					: [],
				footer: { text: 'Morelord Gaming' },
				timestamp: new Date().toISOString()
			}
		]
	};
}

export async function publishDiscordRelease(
	webhookUrl: string,
	release: ReleaseAnnouncement,
	fetcher: typeof fetch = fetch
): Promise<string> {
	const url = new URL(webhookUrl);
	url.searchParams.set('wait', 'true');

	const response = await fetcher(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(buildDiscordReleaseMessage(release))
	});

	if (!response.ok) {
		throw new Error(`Discord webhook returned ${response.status}.`);
	}

	const message = (await response.json()) as { id?: unknown };
	if (typeof message.id !== 'string' || !message.id) {
		throw new Error('Discord webhook did not return a message ID.');
	}

	return message.id;
}
