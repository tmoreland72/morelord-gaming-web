import { DatabaseSync } from 'node:sqlite';
import { expect, it, vi } from 'vitest';
import { sharePageUrl } from '$lib/share-links';
import { POST } from './+server';

vi.mock('$lib/server/catalog', () => ({
	getProductBySlug: vi.fn(async (_db: unknown, slug: string) => {
		if (slug !== 'morelord-journeys') return null;
		return {
			product: {
				slug: 'morelord-journeys',
				name: 'Morelord Journeys',
				summary: 'Plan the route and resolve the travel day.',
				status: 'active' as const
			}
		};
	})
}));

type SentMail = {
	to: string;
	from: { email: string; name: string };
	subject: string;
	text: string;
	html: string;
};

function rateLimitDb() {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec('CREATE TABLE rate_limit_events (key TEXT NOT NULL, created_at INTEGER NOT NULL)');
	const db = {
		prepare(sql: string) {
			let values: unknown[] = [];
			return {
				bind(...args: unknown[]) {
					values = args;
					return this;
				},
				async run() {
					sqlite.prepare(sql).run(...(values as never[]));
					return { meta: { changes: 1 } };
				},
				async first<T>() {
					return (sqlite.prepare(sql).get(...(values as never[])) as T | undefined) ?? null;
				}
			};
		}
	};
	return { db, sqlite };
}

function shareEvent(input: {
	body: unknown;
	db?: unknown;
	email?: { send: (message: SentMail) => Promise<{ messageId: string }> };
	env?: Record<string, unknown>;
	ip?: string;
	origin?: string;
}) {
	const origin = input.origin ?? 'https://morelordgaming.com';
	const payload = JSON.stringify(input.body);
	return {
		request: new Request(`${origin}/api/tools/share`, {
			method: 'POST',
			headers: {
				origin,
				'content-type': 'application/json',
				'content-length': String(payload.length)
			},
			body: payload
		}),
		url: new URL(`${origin}/api/tools/share`),
		getClientAddress: () => input.ip ?? '203.0.113.10',
		platform: {
			env: {
				DB: input.db,
				EMAIL: input.email,
				...input.env
			}
		}
	} as unknown as Parameters<typeof POST>[0];
}

function sender() {
	const sent: SentMail[] = [];
	return {
		sent,
		email: {
			async send(message: SentMail) {
				sent.push(message);
				return { messageId: 'test-message' };
			}
		}
	};
}

const validBody = {
	slug: 'morelord-journeys',
	email: 'Friend@Example.com',
	senderName: 'Pat <script>alert(1)</script>',
	company: '',
	title: '<script>ignored</script>',
	campaign: 'evil'
};

it('rejects an invalid recipient and does not send', async () => {
	const { db, sqlite } = rateLimitDb();
	const { sent, email } = sender();
	try {
		for (const emailAddress of [
			'',
			'not-an-email',
			'a@b.com\nBcc: evil@example.com',
			'a@b.com,evil@example.com'
		]) {
			const response = await POST(
				shareEvent({ body: { ...validBody, email: emailAddress }, db, email })
			);
			expect(response.status).toBe(400);
			expect(await response.json()).toEqual({ error: 'Enter a valid email address.' });
		}
		expect(sent).toEqual([]);
	} finally {
		sqlite.close();
	}
});

it('rejects an oversized name and a slug that is not a tool page', async () => {
	const { db, sqlite } = rateLimitDb();
	const { sent, email } = sender();
	try {
		const longName = await POST(
			shareEvent({ body: { ...validBody, senderName: 'A'.repeat(81) }, db, email })
		);
		expect(longName.status).toBe(400);
		expect(await longName.json()).toEqual({ error: 'Name is too long.' });

		const badSlug = await POST(shareEvent({ body: { ...validBody, slug: '../admin' }, db, email }));
		expect(badSlug.status).toBe(400);

		const missing = await POST(
			shareEvent({ body: { ...validBody, slug: 'morelord-missing' }, db, email })
		);
		expect(missing.status).toBe(404);
		expect(sent).toEqual([]);
	} finally {
		sqlite.close();
	}
});

it('accepts a honeypot submission without sending mail', async () => {
	const { db, sqlite } = rateLimitDb();
	const { sent, email } = sender();
	try {
		const response = await POST(
			shareEvent({
				body: { ...validBody, email: 'not-an-email', company: 'https://spam.example' },
				db,
				email
			})
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(sent).toEqual([]);
	} finally {
		sqlite.close();
	}
});

it('sends the catalog title, blurb, and email UTM link, with the sender name escaped', async () => {
	const { db, sqlite } = rateLimitDb();
	const { sent, email } = sender();
	try {
		const response = await POST(
			shareEvent({
				body: { ...validBody, senderName: 'Pat\r\nBcc: evil@example.com <script>' },
				db,
				email,
				env: { EMAIL_FROM: 'hello@morelordgaming.com' }
			})
		);
		expect(response.status).toBe(200);
		expect(sent).toHaveLength(1);
		const message = sent[0];
		const link = sharePageUrl({
			origin: 'https://morelordgaming.com',
			slug: 'morelord-journeys',
			source: 'email_share'
		});
		expect(message.to).toBe('friend@example.com');
		expect(message.from).toEqual({ email: 'hello@morelordgaming.com', name: 'Morelord Gaming' });
		expect(message.subject).toBe('Morelord Gaming: Morelord Journeys');
		expect(message.subject).not.toContain('Pat');
		expect(message.subject).not.toContain('Bcc');
		expect(message.text).toContain(link);
		expect(message.text).toContain('utm_source=email_share');
		expect(message.text).toContain('utm_medium=email');
		expect(message.text).toContain('utm_campaign=morelord-journeys');
		expect(message.text).toContain(
			"Camp, keep watch and rest, even when the party isn't traveling."
		);
		expect(message.text).toContain('PatBcc: evil@example.com <script>');
		expect(message.html).toContain(link.replaceAll('&', '&amp;'));
		expect(message.html).toContain('PatBcc: evil@example.com &lt;script&gt;');
		expect(message.html).not.toContain('<script>');
		expect(message.html).not.toContain('ignored');
	} finally {
		sqlite.close();
	}
});

it('stops sending after five emails from the same address within an hour', async () => {
	const { db, sqlite } = rateLimitDb();
	const { sent, email } = sender();
	try {
		for (let attempt = 0; attempt < 5; attempt += 1) {
			const response = await POST(shareEvent({ body: validBody, db, email, ip: '198.51.100.8' }));
			expect(response.status).toBe(200);
		}
		const blocked = await POST(shareEvent({ body: validBody, db, email, ip: '198.51.100.8' }));
		expect(blocked.status).toBe(429);
		expect(await blocked.json()).toEqual({
			error: 'Too many emails from this network. Please try again later.'
		});
		expect(sent).toHaveLength(5);

		const otherNetwork = await POST(shareEvent({ body: validBody, db, email, ip: '198.51.100.9' }));
		expect(otherNetwork.status).toBe(200);
		expect(sent).toHaveLength(6);
	} finally {
		sqlite.close();
	}
});

it('requires Turnstile only when a secret is configured', async () => {
	const { db, sqlite } = rateLimitDb();
	const { sent, email } = sender();
	const fetchImpl = vi.fn(async () => Response.json({ success: true }));
	vi.stubGlobal('fetch', fetchImpl);
	try {
		const blocked = await POST(
			shareEvent({
				body: validBody,
				db,
				email,
				env: { TURNSTILE_SECRET_KEY: 'secret' },
				ip: '203.0.113.50'
			})
		);
		expect(blocked.status).toBe(400);
		expect(sent).toEqual([]);

		const allowed = await POST(
			shareEvent({
				body: { ...validBody, turnstileToken: 'token-ok' },
				db,
				email,
				env: { TURNSTILE_SECRET_KEY: 'secret' },
				ip: '203.0.113.50'
			})
		);
		expect(allowed.status).toBe(200);
		expect(sent).toHaveLength(1);
		expect(fetchImpl).toHaveBeenCalledOnce();
	} finally {
		vi.unstubAllGlobals();
		sqlite.close();
	}
});

it('reports when the email binding is missing', async () => {
	const { db, sqlite } = rateLimitDb();
	try {
		const response = await POST(shareEvent({ body: validBody, db }));
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ error: 'Email sending is not configured yet.' });
	} finally {
		sqlite.close();
	}
});
