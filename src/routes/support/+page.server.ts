import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

function text(formData: FormData, key: string, max: number): string {
	return (formData.get(key)?.toString() ?? '').trim().slice(0, max);
}

function validEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const actions: Actions = {
	default: async ({ request, locals, platform }) => {
		if (!platform?.env?.DB) return fail(503, { message: 'The contact form is temporarily unavailable.' });

		const formData = await request.formData();
		const website = text(formData, 'website', 200);
		if (website) return { success: true };

		const name = text(formData, 'name', 120);
		const email = text(formData, 'email', 254).toLowerCase();
		const subject = text(formData, 'subject', 180);
		const message = text(formData, 'message', 5000);

		const values = { name, email, subject, message };
		if (!name || !validEmail(email) || !subject || !message) {
			return fail(400, { message: 'Please complete all required fields with a valid email address.', values });
		}

		const now = Date.now();
		await platform.env.DB.prepare(`INSERT INTO support_requests
			(id, user_id, name, email, category, product, subject, message, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, 'General Inquiry', NULL, ?, ?, 'open', ?, ?)`)
			.bind(crypto.randomUUID(), locals.user?.id ?? null, name, email, subject, message, now, now)
			.run();

		return { success: true };
	}
};
