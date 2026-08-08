import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const categories = ['General Question', 'Technical Support', 'Billing / Subscription', 'Bug Report', 'Feature Request'] as const;
const products = ['Website / Account', 'Morelord Marketplace', 'Morelord Drakkenheim Harvesting', 'Morelord Character Export', 'Morelord Craftworks', 'Other'] as const;

function text(formData: FormData, key: string, max: number): string {
	return (formData.get(key)?.toString() ?? '').trim().slice(0, max);
}

function validEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const load: PageServerLoad = ({ locals }) => ({
	user: locals.user ?? null,
	categories,
	products
});

export const actions: Actions = {
	default: async ({ request, locals, platform }) => {
		if (!platform?.env?.DB) return fail(503, { message: 'Support requests are temporarily unavailable.' });

		const formData = await request.formData();
		const website = text(formData, 'website', 200);
		if (website) return { success: true };

		const name = text(formData, 'name', 120);
		const email = text(formData, 'email', 254).toLowerCase();
		const category = text(formData, 'category', 80);
		const product = text(formData, 'product', 120);
		const subject = text(formData, 'subject', 180);
		const message = text(formData, 'message', 5000);

		const values = { name, email, category, product, subject, message };
		if (!name || !validEmail(email) || !categories.includes(category as (typeof categories)[number]) || !subject || !message) {
			return fail(400, { message: 'Please complete all required fields with a valid email address.', values });
		}
		if (product && !products.includes(product as (typeof products)[number])) {
			return fail(400, { message: 'Please select a valid product.', values });
		}

		const now = Date.now();
		await platform.env.DB.prepare(`INSERT INTO support_requests
			(id, user_id, name, email, category, product, subject, message, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`)
			.bind(crypto.randomUUID(), locals.user?.id ?? null, name, email, category, product || null, subject, message, now, now)
			.run();

		return { success: true };
	}
};
