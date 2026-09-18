export function timingSafeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	let mismatch = 0;
	for (let index = 0; index < left.length; index += 1) {
		mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return mismatch === 0;
}

export function bearerTokenMatches(
	authorization: string | null,
	token: string | undefined
): boolean {
	if (!authorization || !token) return false;
	const prefix = 'Bearer ';
	if (!authorization.startsWith(prefix)) return false;
	return timingSafeEqual(authorization.slice(prefix.length).trim(), token.trim());
}

export async function sha256(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
