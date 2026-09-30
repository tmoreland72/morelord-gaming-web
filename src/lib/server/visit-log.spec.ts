import { describe, expect, it } from 'vitest';
import { cleanUtmValue, isLikelyBot, normalizeVisitPath, shiftDay, visitDay, visitRecordFor } from './visit-log';

const browserUa =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

function candidate(overrides: Partial<Parameters<typeof visitRecordFor>[0]> = {}) {
	return {
		method: 'GET',
		url: new URL('https://morelordgaming.com/tools/morelord-core/?utm_source=youtube&utm_medium=pinned_comment&utm_campaign=ep1'),
		routeId: '/tools/[slug]',
		isDataRequest: false,
		userAgent: browserUa,
		status: 200,
		contentType: 'text/html',
		now: new Date('2026-10-01T03:30:00Z'),
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

	it('records normal HTML page visits with UTM values', () => {
		expect(visitRecordFor(candidate())).toEqual({
			day: '2026-09-30',
			path: '/tools/morelord-core',
			utmSource: 'youtube',
			utmMedium: 'pinned_comment',
			utmCampaign: 'ep1'
		});
	});

	it('skips non-page, non-200, excluded and bot requests', () => {
		expect(visitRecordFor(candidate({ method: 'HEAD' }))).toBeNull();
		expect(visitRecordFor(candidate({ status: 404 }))).toBeNull();
		expect(visitRecordFor(candidate({ contentType: 'application/json' }))).toBeNull();
		expect(visitRecordFor(candidate({ routeId: null }))).toBeNull();
		expect(visitRecordFor(candidate({ isDataRequest: true }))).toBeNull();
		expect(visitRecordFor(candidate({ url: new URL('https://x.test/api/stats/visits') }))).toBeNull();
		expect(visitRecordFor(candidate({ url: new URL('https://x.test/admin/telemetry') }))).toBeNull();
		expect(visitRecordFor(candidate({ url: new URL('https://x.test/_app/immutable/a.js') }))).toBeNull();
		expect(visitRecordFor(candidate({ url: new URL('https://x.test/favicon.png') }))).toBeNull();
		expect(visitRecordFor(candidate({ userAgent: 'curl/8.5.0' }))).toBeNull();
		expect(visitRecordFor(candidate({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }))).toBeNull();
		expect(visitRecordFor(candidate({ userAgent: 'Mozilla/5.0 HeadlessChrome/129.0' }))).toBeNull();
		expect(visitRecordFor(candidate({ userAgent: null }))).toBeNull();
		expect(isLikelyBot('python-requests/2.32')).toBe(true);
	});

	it('cleans UTM values and paths', () => {
		expect(cleanUtmValue('  hello  ')).toBe('hello');
		expect(cleanUtmValue('x'.repeat(100))).toHaveLength(64);
		expect(cleanUtmValue(null)).toBe('');
		expect(normalizeVisitPath('/')).toBe('/');
		expect(normalizeVisitPath('/tools/')).toBe('/tools');
	});
});
