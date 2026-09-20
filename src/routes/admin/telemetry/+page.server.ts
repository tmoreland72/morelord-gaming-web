import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isAdminEmail } from '$lib/server/admin';
import { telemetryModules } from '$lib/server/telemetry';
import { telemetryFeatureEvents } from '$lib/server/telemetry-catalog';
import { snapshotDownloads } from '$lib/server/github-downloads';
function requireAdmin(user: App.Locals['user']) {
	if (!user || !isAdminEmail(user.email)) error(403, 'Administrator access required.');
}
type Usage = { module: string; worlds: number; available: number; actions: number; errors: number };
type Feature = { module: string; event: string; worlds: number; count: number };
type Failure = {
	module: string;
	event: string;
	module_version: string;
	foundry_version: string;
	system: string;
	system_version: string;
	error_type: string;
	frames: string;
	recent: string;
	worlds: number;
	count: number;
	last_seen: string;
};
type Download = {
	module: string;
	release: string;
	asset_id: number;
	downloads: number;
	checked_at: number;
	previous: number | null;
	previous_at: number | null;
};
export const load: PageServerLoad = async ({ platform, locals, url }) => {
	requireAdmin(locals.user);
	const db = platform?.env?.DB;
	if (!db) error(503, 'Database unavailable.');
	const today = new Date().toISOString().slice(0, 10);
	const date = url.searchParams.get('date') || today;
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
		!Number.isFinite(Date.parse(date)) ||
		new Date(date).toISOString().slice(0, 10) !== date
	)
		error(400, 'Invalid date.');
	const end = new Date(Date.parse(date) + 86400000).toISOString();
	const start = date + 'T00:00:00.000Z';
	const [usage, features, failures, downloads] = await Promise.all([
		db
			.prepare(
				`SELECT module,
   COUNT(DISTINCT CASE WHEN kind='usage' AND event!='module.available' THEN world END) worlds,
   COUNT(DISTINCT CASE WHEN kind='usage' AND event='module.available' THEN world END) available,
   SUM(CASE WHEN kind='usage' AND event!='module.available' THEN 1 ELSE 0 END) actions,
   SUM(CASE WHEN kind='error' THEN 1 ELSE 0 END) errors
   FROM foundry_telemetry WHERE occurred_at>=? AND occurred_at<? GROUP BY module`
			)
			.bind(start, end)
			.all<Usage>(),
		db
			.prepare(
				`SELECT module,event,COUNT(DISTINCT world) worlds,COUNT(*) count FROM foundry_telemetry
   WHERE kind='usage' AND event!='module.available' AND occurred_at>=? AND occurred_at<? GROUP BY module,event ORDER BY module,count DESC`
			)
			.bind(start, end)
			.all<Feature>(),
		db
			.prepare(
				`SELECT module,event,module_version,foundry_version,system,system_version,error_type,frames,
   MAX(recent) recent,COUNT(DISTINCT world) worlds,COUNT(*) count,MAX(occurred_at) last_seen
   FROM foundry_telemetry WHERE kind='error' AND occurred_at>=? AND occurred_at<?
   GROUP BY module,event,module_version,foundry_version,system,system_version,error_type,frames ORDER BY worlds DESC,count DESC LIMIT 100`
			)
			.bind(start, end)
			.all<Failure>(),
		db
			.prepare(
				`SELECT s.*,
   (SELECT p.downloads FROM github_download_snapshots p WHERE p.module=s.module AND p.asset_id=s.asset_id AND p.day<s.day ORDER BY p.day DESC LIMIT 1) previous,
   (SELECT p.checked_at FROM github_download_snapshots p WHERE p.module=s.module AND p.asset_id=s.asset_id AND p.day<s.day ORDER BY p.day DESC LIMIT 1) previous_at
   FROM github_download_snapshots s WHERE s.day=(SELECT MAX(n.day) FROM github_download_snapshots n WHERE n.module=s.module AND n.asset_id=s.asset_id)
   ORDER BY s.module,s.checked_at DESC,s.release`
			)
			.all<Download>()
	]);
	return {
		date,
		modules: telemetryModules.map(
			(module) =>
				usage.results.find((row) => row.module === module) ?? {
					module,
					worlds: 0,
					available: 0,
					actions: 0,
					errors: 0
				}
		),
		features: [
			...features.results.filter((row) => telemetryModules.some((module) => module === row.module)),
			...Object.entries(telemetryFeatureEvents).flatMap(([module, events]) =>
				events
					.filter(
						(event) => !features.results.some((row) => row.module === module && row.event === event)
					)
					.map((event) => ({ module, event, worlds: 0, count: 0 }))
			)
		].sort(
			(a, b) =>
				a.module.localeCompare(b.module) || b.count - a.count || a.event.localeCompare(b.event)
		),
		failures: failures.results.filter((row) =>
			telemetryModules.some((module) => module === row.module)
		),
		downloads: downloads.results.filter((row) =>
			telemetryModules.some((module) => module === row.module)
		),
		credentials: (
			await db
				.prepare(
					'SELECT world,created_at,last_seen_at,revoked_at FROM foundry_telemetry_credentials ORDER BY COALESCE(last_seen_at,created_at) DESC LIMIT 50'
				)
				.all<{
					world: string;
					created_at: number;
					last_seen_at: number | null;
					revoked_at: number | null;
				}>()
		).results
	};
};
export const actions: Actions = {
	revoke: async ({ locals, platform, request }) => {
		requireAdmin(locals.user);
		const db = platform?.env?.DB;
		if (!db) error(503, 'Database unavailable.');
		const world = (await request.formData()).get('world');
		if (typeof world !== 'string' || !/^[0-9a-f-]{36}$/.test(world))
			error(400, 'Invalid reporting world.');
		await db
			.prepare('UPDATE foundry_telemetry_credentials SET revoked_at=? WHERE world=?')
			.bind(Date.now(), world)
			.run();
		redirect(303, '/admin/telemetry');
	},
	downloads: async ({ locals, platform }) => {
		requireAdmin(locals.user);
		const db = platform?.env?.DB;
		if (!db) error(503, 'Database unavailable.');
		return { snapshots: await snapshotDownloads(db) };
	}
};
