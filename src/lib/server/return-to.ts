import { parseActivationCode } from '$lib/server/foundry';

const FALLBACK_RETURN_TO = '/account';

/**
 * Keep post-login navigation on this site. Fragments are allowed so the
 * Foundry approval section can be addressed, and anything that could leave
 * the origin is replaced with the account page.
 */
export function safeReturnTo(
	value: string | null | undefined,
	fallback = FALLBACK_RETURN_TO
): string {
	if (typeof value !== 'string') return fallback;
	const candidate = value.trim();
	if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
	if (candidate.includes('\\') || /[\u0000-\u001F\u007F]/.test(candidate)) return fallback;
	if (/%2f|%5c/i.test(candidate)) return fallback;
	let parsed: URL;
	try {
		parsed = new URL(candidate, 'http://return-to.invalid');
	} catch {
		return fallback;
	}
	if (parsed.origin !== 'http://return-to.invalid' || parsed.username || parsed.password)
		return fallback;
	const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
	if (!normalized.startsWith('/') || normalized.startsWith('//')) return fallback;
	return normalized;
}

/** Relative path back to this account request, including a validated activation code and hash. */
export function accountPageReturnTo(url: URL): string {
	const params = new URLSearchParams(url.search);
	const code = parseActivationCode(params.get('activation'));
	if (code) params.set('activation', code);
	else params.delete('activation');
	const search = params.toString();
	const hash = code ? '#foundry-activation' : '';
	return safeReturnTo(`${url.pathname}${search ? `?${search}` : ''}${hash}`);
}

export function loginPathForReturnTo(returnTo: string): string {
	return `/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

/**
 * Better Auth's relative callback check rejects URL fragments. An absolute
 * URL on the request origin keeps `?activation` and `#foundry-activation`
 * through the provider round trip without accepting another origin.
 */
export function absoluteCallbackURL(origin: string, returnTo: string): string {
	const safe = safeReturnTo(returnTo);
	const base = new URL(origin);
	if (base.protocol !== 'http:' && base.protocol !== 'https:') {
		throw new Error('Callback origin must be http or https.');
	}
	return new URL(safe, base.origin).toString();
}

export function socialSignInRedirects(origin: string, returnTo: string) {
	const safe = safeReturnTo(returnTo);
	const callbackURL = absoluteCallbackURL(origin, safe);
	return {
		callbackURL,
		newUserCallbackURL: callbackURL,
		errorCallbackURL: loginPathForReturnTo(safe)
	};
}
