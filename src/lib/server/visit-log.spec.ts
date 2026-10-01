import { describe, expect, it } from 'vitest';
import {
	beaconVisitRecord,
	cleanUtmValue,
	evaluateVisitBeacon,
	isAllowedVisitSource,
	isJsonContentType,
	isLikelyBot,
	normalizeVisitPath,
	shiftDay,
	visitDay
} from './visit-log';

const browserUa =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const now = new Date('2026-10-01T03:30:00Z');

function beacon(overrides: Partial<Parameters<typeof evaluateVisitBeacon>[0]> = {}) {
	return {
		contentType: 'application/json',
		origin: 'https://morelordgaming.com',
		referer: null,
		userAgent: browserUa,
		body: JSON.stringify({
			path: '/tools/morelord-core/?utm_source=ignored',
			utm_source: ' youtube ',
			utm_medium: 'pinned_comment',
			utm_campaign: 'ep1',
			webdriver: false
		}),
		now,
		...overrides
	};
}

describe('visit logging', () => {
	it('computes the America/Chicago day', () => {
		expect(visitDay(new Date('2026-10-01T03:30:00Z'))).toBe('2026-09-30');
		expect(visitDay(new Date('2026-10-01T06:00:00Z'))).toBe('2026-10-01');
		expect(visitDay(new Date('2026-01-15T05:30:00Z'))).toBe('2026-01-14');
		expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
	});

	it('records a valid browser beacon with cleaned path and UTM values', () => {
		expect(evaluateVisitBeacon(beacon())).toEqual({
			day: '2026-09-30',
			path: '/tools/morelord-core',
			utmSource: 'youtube',
			utmMedium: 'pinned_comment',
			utmCampaign: 'ep1'
		});
	});

	it('accepts a matching Referer when Origin is absent', () => {
		expect(
			evaluateVisitBeacon(beacon({ origin: null, referer: 'https://morelordgaming.com/tools?x=1' }))
		).not.toBeNull();
	});

	it('drops beacons from other origins or with no origin information', () => {
		expect(evaluateVisitBeacon(beacon({ origin: 'https://evil.example' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ origin: 'http://morelordgaming.com' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ origin: 'https://www.morelordgaming.com' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ origin: 'null' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ origin: null, referer: 'https://evil.example/' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ origin: null, referer: 'not a url' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ origin: null, referer: null }))).toBeNull();
		// Origin decides when present, even if the Referer would match.
		expect(
			evaluateVisitBeacon(
				beacon({ origin: 'https://evil.example', referer: 'https://morelordgaming.com/' })
			)
		).toBeNull();
		expect(isAllowedVisitSource('http://localhost:5173', null, ['http://localhost:5173'])).toBe(true);
	});

	it('requires a JSON content type and a sane JSON body', () => {
		expect(isJsonContentType('application/json; charset=utf-8')).toBe(true);
		expect(evaluateVisitBeacon(beacon({ contentType: 'text/plain' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ contentType: 'application/x-www-form-urlencoded' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ contentType: null }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ body: '' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ body: '{not json' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ body: '[]' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ body: JSON.stringify({ path: '/', pad: 'x'.repeat(3000) }) }))).toBeNull();
	});

	it('drops bot user agents and webdriver-controlled browsers', () => {
		expect(evaluateVisitBeacon(beacon({ userAgent: 'curl/8.5.0' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ userAgent: 'Mozilla/5.0 HeadlessChrome/129.0' }))).toBeNull();
		expect(evaluateVisitBeacon(beacon({ userAgent: null }))).toBeNull();
		expect(isLikelyBot('python-requests/2.32')).toBe(true);
		expect(beaconVisitRecord({ path: '/', webdriver: true }, now)).toBeNull();
	});

	it('drops missing, excluded and non-page paths', () => {
		expect(beaconVisitRecord({}, now)).toBeNull();
		expect(beaconVisitRecord({ path: 42 }, now)).toBeNull();
		expect(beaconVisitRecord({ path: 'tools' }, now)).toBeNull();
		expect(beaconVisitRecord({ path: '//evil.example/x' }, now)).toBeNull();
		expect(beaconVisitRecord({ path: '/api/stats/visits' }, now)).toBeNull();
		expect(beaconVisitRecord({ path: '/api' }, now)).toBeNull();
		expect(beaconVisitRecord({ path: '/admin/' }, now)).toBeNull();
		expect(beaconVisitRecord({ path: '/admin/telemetry' }, now)).toBeNull();
		expect(beaconVisitRecord({ path: '/_app/immutable/a.js' }, now)).toBeNull();
		expect(beaconVisitRecord({ path: '/favicon.png' }, now)).toBeNull();
		expect(beaconVisitRecord({ path: '/' }, now)).toEqual({
			day: '2026-09-30',
			path: '/',
			utmSource: '',
			utmMedium: '',
			utmCampaign: ''
		});
	});

	it('cleans UTM values and paths', () => {
		expect(cleanUtmValue('  hello  ')).toBe('hello');
		expect(cleanUtmValue('x'.repeat(100))).toHaveLength(64);
		expect(cleanUtmValue(null)).toBe('');
		expect(cleanUtmValue(123)).toBe('');
		expect(normalizeVisitPath('/')).toBe('/');
		expect(normalizeVisitPath('/tools/')).toBe('/tools');
		expect(normalizeVisitPath('/tools/?a=1#top')).toBe('/tools');
		expect(normalizeVisitPath('/?utm_source=x')).toBe('/');
		expect(normalizeVisitPath('/' + 'a'.repeat(300))).toHaveLength(200);
	});
});