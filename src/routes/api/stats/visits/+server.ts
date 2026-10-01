import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireD1 } from '$lib/server/http';
import { VISIT_TIME_ZONE, shiftDay, visitDay } from '$lib/server/visit-log';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const TOP_PATHS_PER_DAY = 10;
const PINNED_COMMENT_MEDIUM = 'pinned_comment';

const responseHeaders = {
	'cache-control': 'no-store',
	'x-robots-tag': 'noindex'
};

function parseDays(raw: string | null): number {
	const parsed = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DAYS;
	return Math.min(parsed, MAX_DAYS);
}

interface DayTotalRow {
	day: string;
	visits: number;
}
interface CampaignRow {
	day: string;
	utm_campaign: string;
	visits: number;
}
interface UtmRow {
	day: string;
	utm_source: string;
	utm_medium: string;
	utm_campaign: string;
	visits: number;
}
interface PathRow {
	day: string;
	path: string;
	visits: number;
}

interface DailyStats {
	day: string;
	visits: number;
	pinnedComment: { visits: number; byCampaign: Record<string, number> };
	utm: { utm_source: string; utm_medium: string; utm_campaign: string; visits: number }[];
	topPaths: { path: string; visits: number }[];
}

/** Public, aggregate-only visit counts (no personal data is stored). */
export const GET: RequestHandler = async ({ url, platform }) => {
	const db = requireD1(platform);
	if (!db) {
		return json({ error: 'Database unavailable' }, { status: 503, headers: responseHeaders });
	}

	const days = parseDays(url.searchParams.get('days'));
	const to = visitDay();
	const from = shiftDay(to, -(days - 1));

	try {
		const [totals, campaigns, utm, paths] = await db.batch([
			db
				.prepare(
					`SELECT day, SUM(count) AS visits FROM site_visits_daily
					 WHERE day >= ? AND day <= ? GROUP BY day`
				)
				.bind(from, to),
			db
				.prepare(
					`SELECT day, utm_campaign, SUM(count) AS visits FROM site_visits_daily
					 WHERE day >= ? AND day <= ? AND utm_medium = ?
					 GROUP BY day, utm_campaign ORDER BY day DESC, visits DESC`
				)
				.bind(from, to, PINNED_COMMENT_MEDIUM),
			db
				.prepare(
					`SELECT day, utm_source, utm_medium, utm_campaign, SUM(count) AS visits FROM site_visits_daily
					 WHERE day >= ? AND day <= ?
					 GROUP BY day, utm_source, utm_medium, utm_campaign ORDER BY day DESC, visits DESC`
				)
				.bind(from, to),
			db
				.prepare(
					`SELECT day, path, visits FROM (
					   SELECT day, path, SUM(count) AS visits,
					          ROW_NUMBER() OVER (PARTITION BY day ORDER BY SUM(count) DESC, path) AS rn
					   FROM site_visits_daily WHERE day >= ? AND day <= ?
					   GROUP BY day, path
					 ) WHERE rn <= ? ORDER BY day DESC, visits DESC, path`
				)
				.bind(from, to, TOP_PATHS_PER_DAY)
		]);

		const byDay = new Map<string, DailyStats>();
		for (let offset = 0; offset < days; offset++) {
			const day = shiftDay(to, -offset);
			byDay.set(day, {
				day,
				visits: 0,
				pinnedComment: { visits: 0, byCampaign: {} },
				utm: [],
				topPaths: []
			});
		}

		for (const row of (totals.results ?? []) as unknown as DayTotalRow[]) {
			const entry = byDay.get(row.day);
			if (entry) entry.visits = Number(row.visits) || 0;
		}
		for (const row of (campaigns.results ?? []) as unknown as CampaignRow[]) {
			const entry = byDay.get(row.day);
			if (!entry) continue;
			const visits = Number(row.visits) || 0;
			entry.pinnedComment.visits += visits;
			entry.pinnedComment.byCampaign[row.utm_campaign] = visits;
		}
		for (const row of (utm.results ?? []) as unknown as UtmRow[]) {
			byDay.get(row.day)?.utm.push({
				utm_source: row.utm_source,
				utm_medium: row.utm_medium,
				utm_campaign: row.utm_campaign,
				visits: Number(row.visits) || 0
			});
		}
		for (const row of (paths.results ?? []) as unknown as PathRow[]) {
			byDay.get(row.day)?.topPaths.push({ path: row.path, visits: Number(row.visits) || 0 });
		}

		const daily = [...byDay.values()];
		return json(
			{
				timeZone: VISIT_TIME_ZONE,
				days,
				from,
				to,
				generatedAt: new Date().toISOString(),
				totals: {
					visits: daily.reduce((sum, entry) => sum + entry.visits, 0),
					pinnedCommentVisits: daily.reduce((sum, entry) => sum + entry.pinnedComment.visits, 0)
				},
				notes:
					'Aggregate daily counts of browser-confirmed page loads (counted by a beacon sent from a visible browser tab after load; bots, headless/automated browsers and other origins are filtered). Empty UTM values mean the parameter was absent.',
				daily
			},
			{ headers: responseHeaders }
		);
	} catch {
		return json({ error: 'Visit stats unavailable' }, { status: 500, headers: responseHeaders });
	}
};
