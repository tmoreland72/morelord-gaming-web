import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProductBySlug } from '$lib/server/catalog';
import { clientAddressKey, requireD1 } from '$lib/server/http';
import {
	SHARE_BODY_MAX,
	SHARE_RATE_LIMIT,
	SHARE_RATE_WINDOW_MS,
	buildShareMessage,
	parseShareRequest,
	readEmailBinding,
	readOptionalEnv,
	resolveFromAddress,
	verifyTurnstile
} from '$lib/server/page-share';
import { consumeRateLimit } from '$lib/server/rate-limit';
import { getProductLanding } from '$lib/product-landing';
import { sharePageUrl } from '$lib/share-links';

function errorResponse(error: string, status: number): Response {
	return json({ error }, { status, headers: { 'cache-control': 'no-store' } });
}

export const POST: RequestHandler = async (event) => {
	if (event.request.headers.get('origin') !== event.url.origin) {
		return errorResponse('This request was rejected.', 403);
	}

	const declaredLength = Number(event.request.headers.get('content-length') ?? '0');
	if (Number.isFinite(declaredLength) && declaredLength > SHARE_BODY_MAX) {
		return errorResponse('Enter a valid email address.', 400);
	}

	let body: unknown;
	try {
		const text = await event.request.text();
		if (text.length > SHARE_BODY_MAX) return errorResponse('Enter a valid email address.', 400);
		body = JSON.parse(text) as unknown;
	} catch {
		return errorResponse('Enter a valid email address.', 400);
	}

	const parsed = parseShareRequest(body);
	if (!parsed.ok) return errorResponse(parsed.error, parsed.status);
	if (parsed.honeypot) return json({ ok: true }, { headers: { 'cache-control': 'no-store' } });

	const db = requireD1(event.platform);
	if (!db) return errorResponse('Sharing by email is temporarily unavailable.', 503);

	const allowed = await consumeRateLimit(
		db,
		clientAddressKey(event, 'page-share'),
		SHARE_RATE_LIMIT,
		SHARE_RATE_WINDOW_MS
	);
	if (!allowed) {
		return errorResponse('Too many emails from this network. Please try again later.', 429);
	}

	const turnstileSecret = readOptionalEnv(event.platform, 'TURNSTILE_SECRET_KEY');
	if (turnstileSecret) {
		try {
			const passed = await verifyTurnstile({
				secret: turnstileSecret,
				token: parsed.turnstileToken,
				ip: event.getClientAddress()
			});
			if (!passed) return errorResponse('The spam check did not pass. Please try again.', 400);
		} catch {
			return errorResponse('The spam check did not pass. Please try again.', 400);
		}
	}

	const result = await getProductBySlug(db, parsed.slug);
	if (!result || result.product.status !== 'active') {
		return errorResponse('That page could not be shared.', 404);
	}

	const landing = getProductLanding(result.product.slug, {
		name: result.product.name,
		summary: result.product.summary
	});
	const message = buildShareMessage({
		to: parsed.email,
		from: resolveFromAddress(readOptionalEnv(event.platform, 'EMAIL_FROM')),
		title: landing.headline,
		blurb: landing.benefit ?? landing.subhead,
		url: sharePageUrl({
			origin: event.url.origin,
			slug: result.product.slug,
			source: 'email_share'
		}),
		senderName: parsed.senderName,
		productName: result.product.name
	});

	const email = readEmailBinding(event.platform);
	if (!email) return errorResponse('Email sending is not configured yet.', 503);

	try {
		await email.send(message);
	} catch (cause) {
		console.error('Share email failed', cause instanceof Error ? cause.name : 'unknown');
		return errorResponse('The email could not be sent. Please try again.', 502);
	}

	return json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
};
