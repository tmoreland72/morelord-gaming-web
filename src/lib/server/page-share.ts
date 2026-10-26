import { env } from '$env/dynamic/private';
import { isToolSlug } from '$lib/share-links';

export const SHARE_EMAIL_MAX = 254;
export const SHARE_NAME_MAX = 80;
export const SHARE_BODY_MAX = 4_096;
export const SHARE_RATE_LIMIT = 5;
export const SHARE_RATE_WINDOW_MS = 60 * 60 * 1000;
export const SHARE_FROM_ADDRESS = 'chuck@morelordgaming.com';
export const SHARE_FROM_NAME = 'Chuck from Morelord Gaming';

const EMAIL_PATTERN =
	/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const FROM_PATTERN = /^[A-Za-z0-9._%+-]+@morelordgaming\.com$/;

export type ShareEmailMessage = {
	to: string;
	from: { email: string; name: string };
	subject: string;
	text: string;
	html: string;
};

export type ParsedShareRequest =
	| { ok: false; status: 400; error: string }
	| { ok: true; honeypot: true }
	| {
			ok: true;
			honeypot: false;
			slug: string;
			email: string;
			senderName: string;
			turnstileToken: string;
	  };

export function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

/** Drop CR/LF and other controls so a name cannot break out of the body. */
export function stripControls(value: string): string {
	let result = '';
	for (const character of value) {
		const code = character.codePointAt(0) ?? 0;
		if (code > 31 && code !== 127) result += character;
	}
	return result;
}

export function readOptionalEnv(platform: App.Platform | undefined, key: string): string {
	const bag = platform?.env as unknown as Record<string, unknown> | undefined;
	const fromPlatform = bag?.[key];
	if (typeof fromPlatform === 'string' && fromPlatform.trim()) return fromPlatform.trim();
	const fromFile = env[key];
	return typeof fromFile === 'string' ? fromFile.trim() : '';
}

export function resolveFromAddress(value: string | undefined): string {
	const trimmed = value?.trim() ?? '';
	return FROM_PATTERN.test(trimmed) ? trimmed : SHARE_FROM_ADDRESS;
}

export function readEmailBinding(platform: App.Platform | undefined): SendEmail | undefined {
	const email = (platform?.env as { EMAIL?: SendEmail } | undefined)?.EMAIL;
	return email && typeof email.send === 'function' ? email : undefined;
}

export function parseShareRequest(body: unknown): ParsedShareRequest {
	if (!body || typeof body !== 'object') {
		return { ok: false, status: 400, error: 'Enter a valid email address.' };
	}
	const record = body as Record<string, unknown>;
	const company = record.company;
	const honeypotFilled =
		typeof company === 'string' ? company.trim().length > 0 : company != null && company !== false;
	if (honeypotFilled) return { ok: true, honeypot: true };

	const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
	const email = typeof record.email === 'string' ? record.email.trim() : '';
	const senderName =
		typeof record.senderName === 'string' ? stripControls(record.senderName).trim() : '';
	const turnstileToken =
		typeof record.turnstileToken === 'string' ? record.turnstileToken.trim().slice(0, 2048) : '';

	if (!isToolSlug(slug)) {
		return { ok: false, status: 400, error: 'That page could not be shared.' };
	}
	if (
		!email ||
		email.length > SHARE_EMAIL_MAX ||
		/[\s<>]/.test(email) ||
		!EMAIL_PATTERN.test(email)
	) {
		return { ok: false, status: 400, error: 'Enter a valid email address.' };
	}
	if (senderName.length > SHARE_NAME_MAX) {
		return { ok: false, status: 400, error: 'Name is too long.' };
	}

	return {
		ok: true,
		honeypot: false,
		slug,
		email: email.toLowerCase(),
		senderName,
		turnstileToken
	};
}

export function buildShareMessage(input: {
	to: string;
	from: string;
	title: string;
	blurb: string;
	url: string;
	senderName: string;
	productName: string;
}): ShareEmailMessage {
	const title = stripControls(input.title).trim();
	const blurb = stripControls(input.blurb).trim();
	const productName = stripControls(input.productName).trim() || 'Morelord Tools';
	const senderName = stripControls(input.senderName).trim();
	const intro = senderName
		? `${senderName} shared a Morelord Gaming page with you.`
		: 'A Morelord Gaming page was shared with you.';
	const safeTitle = escapeHtml(title);
	const safeBlurb = escapeHtml(blurb);
	const safeIntro = escapeHtml(intro);
	const safeUrl = escapeHtml(input.url);
	return {
		to: input.to,
		from: { email: resolveFromAddress(input.from), name: SHARE_FROM_NAME },
		subject: `Morelord Gaming: ${productName}`.slice(0, 180),
		text: `${intro}\n\n${title}\n\n${blurb}\n\n${input.url}\n`,
		html: `<!doctype html><html><body><p>${safeIntro}</p><h1>${safeTitle}</h1><p>${safeBlurb}</p><p><a href="${safeUrl}">${safeUrl}</a></p></body></html>`
	};
}

export async function verifyTurnstile(input: {
	secret: string;
	token: string;
	ip: string;
	fetchImpl?: typeof fetch;
}): Promise<boolean> {
	if (!input.secret || !input.token) return false;
	const response = await (input.fetchImpl ?? fetch)(
		'https://challenges.cloudflare.com/turnstile/v0/siteverify',
		{
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				secret: input.secret,
				response: input.token,
				remoteip: input.ip
			})
		}
	);
	if (!response.ok) return false;
	const payload = (await response.json()) as { success?: boolean };
	return payload.success === true;
}
