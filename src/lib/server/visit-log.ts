/**
 * Privacy-light visit logging: increments a per-day aggregate counter in D1.
 * No IPs, user agents, cookies or user ids are stored - only daily counts per
 * path and UTM combination.
 *
 * Visits are only counted when a real browser loads the page and sends a
 * beacon to POST /api/visit (see the root +layout.svelte). Plain server-side
 * GETs (crawlers, scanners, uptime checks) are never counted.
 */

export const VISIT_TIME_ZONE = 'America/Chicago';

/** Only beacons from the production site are counted. */
export const VISIT_ALLOWED_ORIGIN = 'https://morelordgaming.com';

/** Upper bound for a beacon body; real payloads are well under 1 KB. */
export const VISIT_BEACON_MAX_BODY_LENGTH = 2048;

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

function stripControlChars(value: string): string {
	// eslint-disable-next-line no-control-regex
	return value.replace(/[\u0000-\u001f\u007f]/g, '');
}

export function cleanUtmValue(value: unknown): string {
	if (typeof value !== 'string' || !value) return '';
	return stripControlChars(value).trim().slice(0, UTM_MAX_LENGTH);
}

/** Path only: no query string, no hash, no trailing slash (except for "/"). */
export function normalizeVisitPath(pathname: string): string {
	let path = stripControlChars(pathname || '').trim();
	path = path.split(/[?#]/, 1)[0] || '/';
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

/**
 * True when the request comes from an allowed origin. The Origin header decides
 * when present; otherwise the Referer's origin is used. Missing both = rejected.
 */
export function isAllowedVisitSource(
	origin: string | null | undefined,
	referer: string | null | undefined,
	allowedOrigins: readonly string[] = [VISIT_ALLOWED_ORIGIN]
): boolean {
	if (origin) return allowedOrigins.includes(origin);
	if (referer) {
		try {
			return allowedOrigins.includes(new URL(referer).origin);
		} catch {
			return false;
		}
	}
	return false;
}

export function isJsonContentType(contentType: string | null | undefined): boolean {
	if (!contentType) return false;
	return contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

export interface VisitRecord {
	day: string;
	path: string;
	utmSource: string;
	utmMedium: string;
	utmCampaign: string;
}

/** Turns a beacon body into the aggregate row to increment, or null when it should not be counted. */
export function beaconVisitRecord(payload: unknown, now: Date = new Date()): VisitRecord | null {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
	const body = payload as Record<string, unknown>;
	if (body.webdriver === true || body.webdriver === 'true') return null;
	if (typeof body.path !== 'string') return null;

	const path = normalizeVisitPath(body.path);
	if (!path.startsWith('/') || path.startsWith('//')) return null;
	if (!isTrackablePath(path)) return null;

	return {
		day: visitDay(now),
		path,
		utmSource: cleanUtmValue(body.utm_source),
		utmMedium: cleanUtmValue(body.utm_medium),
		utmCampaign: cleanUtmValue(body.utm_campaign)
	};
}

export interface VisitBeaconRequest {
	contentType: string | null;
	origin: string | null;
	referer: string | null;
	userAgent: string | null;
	body: string;
	allowedOrigins?: readonly string[];
	now?: Date;
}

/** Full filter for POST /api/visit: returns the row to increment, or null to silently drop. */
export function evaluateVisitBeacon(request: VisitBeaconRequest): VisitRecord | null {
	if (!isJsonContentType(request.contentType)) return null;
	if (!isAllowedVisitSource(request.origin, request.referer, request.allowedOrigins)) return null;
	if (isLikelyBot(request.userAgent)) return null;
	if (!request.body || request.body.length > VISIT_BEACON_MAX_BODY_LENGTH) return null;

	let payload: unknown;
	try {
		payload = JSON.parse(request.body);
	} catch {
		return null;
	}
	return beaconVisitRecord(payload, request.now);
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