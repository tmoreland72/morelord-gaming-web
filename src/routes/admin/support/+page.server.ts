import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const statuses = ['open', 'in_progress', 'resolved'] as const;

type SupportRow = {
	id: string;
	userId: string | null;
	name: string;
	email: string;
	category: string;
	product: string | null;
	subject: string;
	message: string;
	status: string;
	createdAt: number;
	updatedAt: number;
};

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');
	const result = await platform.env.DB.prepare(`SELECT id, user_id AS userId, name, email, category, product,
		subject, message, status, created_at AS createdAt, updated_at AS updatedAt
		FROM support_requests ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, created_at DESC
		LIMIT 300`).all<SupportRow>();

	const requests = result.results as SupportRow[];
	return {
		requests,
		counts: {
			open: requests.filter((item) => item.status === 'open').length,
			inProgress: requests.filter((item) => item.status === 'in_progress').length,
			resolved: requests.filter((item) => item.status === 'resolved').length
		}
	};
};

export const actions: Actions = {
	status: async ({ request, platform }) => {
		if (!platform?.env?.DB) return fail(503, { message: 'D1 database binding is unavailable.' });
		const formData = await request.formData();
		const id = formData.get('id')?.toString() ?? '';
		const status = formData.get('status')?.toString() ?? '';
		if (!id || !statuses.includes(status as (typeof statuses)[number])) return fail(400, { message: 'Invalid contact message update.' });

		await platform.env.DB.prepare('UPDATE support_requests SET status = ?, updated_at = ? WHERE id = ?')
			.bind(status, Date.now(), id)
			.run();
		return { updated: id };
	}
};
