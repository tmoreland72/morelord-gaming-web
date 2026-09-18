import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { supportRequests } from '$lib/server/db/schema';

const statuses = ['open', 'in_progress', 'resolved'] as const;
const statusRank: Record<string, number> = { open: 0, in_progress: 1, resolved: 2 };

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');
	const rows = await getDb(platform.env.DB).select().from(supportRequests).limit(300);
	const requests = rows
		.map((row) => ({
			id: row.id,
			userId: row.userId,
			name: row.name,
			email: row.email,
			category: row.category,
			product: row.product,
			subject: row.subject,
			message: row.message,
			status: row.status,
			createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt),
			updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : Number(row.updatedAt)
		}))
		.sort(
			(left, right) =>
				(statusRank[left.status] ?? 9) - (statusRank[right.status] ?? 9) ||
				right.createdAt - left.createdAt
		);

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
		if (!id || !statuses.includes(status as (typeof statuses)[number])) {
			return fail(400, { message: 'Invalid contact message update.' });
		}

		await getDb(platform.env.DB)
			.update(supportRequests)
			.set({ status: status as (typeof statuses)[number], updatedAt: new Date() })
			.where(eq(supportRequests.id, id));
		return { updated: id };
	}
};
