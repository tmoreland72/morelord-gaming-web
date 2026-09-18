import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { supportRequests } from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';
import { clientAddressKey, requireD1 } from '$lib/server/http';
import { consumeRateLimit } from '$lib/server/rate-limit';

function text(formData: FormData, key: string, max: number): string {
	return (formData.get(key)?.toString() ?? '').trim().slice(0, max);
}

function validEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const actions: Actions = {
	default: async (event) => {
		const d1 = requireD1(event.platform);
		if (!d1) return fail(503, { message: 'The contact form is temporarily unavailable.' });

		const allowed = await consumeRateLimit(
			d1,
			clientAddressKey(event, 'support'),
			5,
			60 * 60 * 1000
		);
		if (!allowed) {
			return fail(429, { message: 'Too many messages from this network. Please try again later.' });
		}

		const formData = await event.request.formData();
		const website = text(formData, 'website', 200);
		if (website) return { success: true };

		const name = text(formData, 'name', 120);
		const email = text(formData, 'email', 254).toLowerCase();
		const subject = text(formData, 'subject', 180);
		const message = text(formData, 'message', 5000);

		const values = { name, email, subject, message };
		if (!name || !validEmail(email) || !subject || !message) {
			return fail(400, {
				message: 'Please complete all required fields with a valid email address.',
				values
			});
		}

		const now = new Date();
		await getDb(d1)
			.insert(supportRequests)
			.values({
				id: crypto.randomUUID(),
				userId: event.locals.user?.id ?? null,
				name,
				email,
				category: 'General Inquiry',
				product: null,
				subject,
				message,
				status: 'open',
				createdAt: now,
				updatedAt: now
			});

		return { success: true };
	}
};
