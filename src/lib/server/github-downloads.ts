import { telemetryModules } from './telemetry';
type Release = {
	tag_name: string;
	draft: boolean;
	assets: { id: number; name: string; download_count: number }[];
};
export async function snapshotDownloads(db: D1Database, fetcher: typeof fetch = fetch) {
	const results: { module: string; status: string; downloads?: number }[] = [];
	for (const module of telemetryModules) {
		try {
			const releases: Release[] = [];
			for (let page = 1; ; page++) {
				if (page > 10) throw new Error('Release pagination limit exceeded');
				const response = await fetcher(
					'https://api.github.com/repos/tmoreland72/' +
						module +
						'/releases?per_page=100&page=' +
						page,
					{
						headers: {
							accept: 'application/vnd.github+json',
							'user-agent': 'Morelord-download-report',
							'x-github-api-version': '2022-11-28'
						},
						signal: AbortSignal.timeout(15000)
					}
				);
				if (!response.ok) throw new Error('GitHub request failed (' + response.status + ')');
				const batch = (await response.json()) as Release[];
				releases.push(...batch.filter((release) => !release.draft));
				if (batch.length < 100) break;
			}
			const assets = releases.flatMap((release) =>
				release.assets
					.filter((asset) => [module + '.zip', 'module.zip'].includes(asset.name))
					.map((asset) => ({ ...asset, release: release.tag_name }))
			);
			if (!assets.length) {
				results.push({ module, status: 'No matching release ZIP assets' });
				continue;
			}
			const now = Date.now();
			const day = new Date(now).toISOString().slice(0, 10);
			for (let start = 0; start < assets.length; start += 50) {
				await db.batch(
					assets
						.slice(start, start + 50)
						.map((asset) =>
							db
								.prepare(
									'INSERT INTO github_download_snapshots (module,asset_id,day,release,downloads,checked_at) VALUES (?,?,?,?,?,?) ON CONFLICT(module,asset_id,day) DO UPDATE SET downloads=excluded.downloads,checked_at=excluded.checked_at'
								)
								.bind(module, asset.id, day, asset.release, asset.download_count, now)
						)
				);
			}
			results.push({
				module,
				status: 'Updated',
				downloads: assets.reduce((sum, asset) => sum + asset.download_count, 0)
			});
		} catch (error) {
			results.push({
				module,
				status: error instanceof Error ? error.message : 'GitHub unavailable'
			});
		}
	}
	return results;
}
