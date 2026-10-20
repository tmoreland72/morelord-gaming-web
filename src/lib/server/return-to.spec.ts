import { describe, expect, it } from 'vitest';
import {
	absoluteCallbackURL,
	accountPageReturnTo,
	loginPathForReturnTo,
	safeReturnTo,
	socialSignInRedirects
} from './return-to';

const activation = '/account?activation=ABCD-2345#foundry-activation';

describe('safeReturnTo', () => {
	it('keeps a same-origin account path, including the activation query and hash', () => {
		expect(safeReturnTo(activation)).toBe(activation);
		expect(safeReturnTo('/tools/morelord-core')).toBe('/tools/morelord-core');
	});

	it('rejects open redirects', () => {
		for (const value of [
			null,
			'',
			'https://evil.com',
			'http://evil.com/account',
			'//evil.com',
			'///evil.com',
			'/\\evil.com',
			'/%2f%2fevil.com',
			'/%5c%5cevil.com',
			'javascript:alert(1)',
			'/account\nSet-Cookie: stolen'
		]) {
			expect(safeReturnTo(value)).toBe('/account');
		}
	});
});

describe('Foundry return paths', () => {
	it('builds the account return path from a validated activation code', () => {
		const url = new URL('http://localhost/account?activation=abcd-2345&checkout=success');
		expect(accountPageReturnTo(url)).toBe(
			'/account?activation=ABCD-2345&checkout=success#foundry-activation'
		);
		expect(loginPathForReturnTo(accountPageReturnTo(url))).toBe(
			`/login?returnTo=${encodeURIComponent('/account?activation=ABCD-2345&checkout=success#foundry-activation')}`
		);
	});

	it('drops an activation value that is not a Core code', () => {
		const url = new URL('http://localhost/account?activation=%3Cscript%3E&discord=connected');
		expect(accountPageReturnTo(url)).toBe('/account?discord=connected');
	});

	it('sends Google and Discord, new accounts, and errors back with the hash intact', () => {
		const redirects = socialSignInRedirects('https://morelordgaming.com', activation);
		expect(redirects.callbackURL).toBe(`https://morelordgaming.com${activation}`);
		expect(redirects.newUserCallbackURL).toBe(redirects.callbackURL);
		expect(absoluteCallbackURL('https://morelordgaming.com', activation)).toBe(
			redirects.callbackURL
		);
		const returnTo = new URL(
			redirects.errorCallbackURL,
			'https://morelordgaming.com'
		).searchParams.get('returnTo');
		expect(returnTo).toBe(activation);
	});
});
