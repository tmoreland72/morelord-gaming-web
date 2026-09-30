/**
 * Privacy-light visit logging: increments a per-day aggregate counter in D1.
 * No IPs, user agents, cookies or user ids are stored - only daily counts per
 * path and UTM combination.
 */

export const VISIT_TIME_ZONE = 'America/Chicago';

const UTM_MAX_LENGTH = 64;
const PATH_MAX_LENGTH = 200;

const EXCLUDED_PATH_PREFIXES = ['/api/', '/admin/', '/_app/', '/.well-known/'];
const EXCLUDED_EXACT_PATHS = new Set(['/api', '/admin', '/_app']);
const STATIC_ASSET_PATTERN =
	/\.(?:js|mjs|css|map|json|xml|txt|ico|png|jpe?g|gif|webp|avif|svg|woff2?|ttf|otf|eot|mp4|webm|mp3|pdf|zip|webmanifest)$/i;
const BOT_USER_AGENT_PATTERN =
	/bot|crawl|spider|slurp|scrape|preview|curl|wget|python|headless|phantom|selenium|puppeteer|playwright|lighthouse|pingdom|uptime|monitor|httpclient|http-client|okhttp|axios|node-fetch|undici|go-http|java\/|libwww|facebookexternalhit|embedly|whatsapp|validator|feedfetcher|archiver|postman|insomnia/i;

let chicagoFormatter: Intl.DateTimeFormat | null = null;

/** Calendar day (YYYY-MM-DD) in America/Chicago for the given instant. */
export function visitDay(date: Date = new Date()): string {
	try {
		chicagoFormatter ??= new Intl.DateTimeFormat('en-US', {
			timeZone: VISIT_TIME_ZONE,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		const parts = chicagoFormatter.formatToParts(date);
		const get = (type: string) => parts.find((part) => part.type === type)?.value;
		const year = get('year');
		const month = get('month');
		const day = get('day');
		if (year && month && day) return `${year}-${month}-${day}`;
	} catch {
		// Fall through to the fixed-offset approximation (CST, UTC-6).
	}
	return new Date(date.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Shift a YYYY-MM-DD day string by a whole number of days. */
export function shiftDay(day: string, deltaDays: number): string {
	const base = Date.parse(`${day}T00:00:00Z`);
	return new Date(base + deltaDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function cleanUtmValue(value: string | null | undefined): string {
	if (!value) return '';
	// eslint-disable-next-line no-control-regex
	return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, UTM_MAX_LENGTH);
}

export function normalizeVisitPath(pathname: string): string {
	let path = pathname || '/';
	if (path.length > 1) path = path.replace(/\/+$/, '') || '/';
	return path.slice(0, PATH_MAX_LENGTH);
}

export function isLikelyBot(userAgent: string | null | undefined): boolean {
	if (!userAgent || !userAgent.trim()) return true;
	return BOT_USER_AGENT_PATTERN.test(userAgent);
}

export function isTrackablePath(pathname: string): boolean {
	if (EXCLUDED_EXACT_PATHS.has(pathname)) return false;
	if (EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
	if (pathname.endsWith('/__data.json')) return false;
	if (STATIC_ASSET_PATTERN.test(pathname)) return false;
	return true;
}

export interface VisitRecord {
	day: string;
	path: string;
	utmSource: string;
	utmMedium: string;
	utmCampaign: string;
}

interface VisitCandidate {
	method: string;
	url: URL;
	routeId: string | null;
	isDataRequest?: boolean;
	userAgent: string | null;
	status: number;
	contentType: string | null;
	now?: Date;
}

/** Returns the aggregate row to increment, or null when the request should not be counted. */
export function visitRecordFor(candidate: VisitCandidate): VisitRecord | null {
	if (candidate.method !== 'GET') return null;
	if (candidate.status !== 200) return null;
	if (candidate.isDataRequest) return null;
	if (!candidate.routeId) return null;
	if (!candidate.contentType || !candidate.contentType.toLowerCase().includes('text/html')) return null;
	if (!isTrackablePath(candidate.url.pathname)) return null;
	if (isLikelyBot(candidate.userAgent)) return null;

	const params = candidate.url.searchParams;
	return {
		day: visitDay(candidate.now),
		path: normalizeVisitPath(candidate.url.pathname),
		utmSource: cleanUtmValue(params.get('utm_source')),
		utmMedium: cleanUtmValue(params.get('utm_medium')),
		utmCampaign: cleanUtmValue(params.get('utm_campaign'))
	};
}

export async function recordVisit(db: D1Database, visit: VisitRecord): Promise<void> {
	try {
		await db
			.prepare(
				`INSERT INTO site_visits_daily (day, path, utm_source, utm_medium, utm_campaign, count)
				 VALUES (?, ?, ?, ?, ?, 1)
				 ON CONFLICT(day, path, utm_source, utm_medium, utm_campaign)
				 DO UPDATE SET count = count + 1`
			)
			.bind(visit.day, visit.path, visit.utmSource, visit.utmMedium, visit.utmCampaign)
			.run();
	} catch {
		// Visit logging must never affect the page; swallow errors.
	}
}
