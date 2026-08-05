import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isAdminEmail } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) redirect(303, '/login?returnTo=/admin/products');
	if (!isAdminEmail(locals.user.email)) error(403, 'Administrator access required.');
	if (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');

	const products = await platform.env.DB.prepare(`
		SELECT
			p.id,
			p.slug,
			p.name,
			p.summary,
			p.status,
			p.github_repository AS githubRepository,
			p.manifest_url AS manifestUrl,
			COUNT(DISTINCT pf.feature_id) AS featureCount,
			COUNT(DISTINCT r.id) AS releaseCount,
			MAX(r.published_at) AS latestReleaseAt
		FROM products p
		LEFT JOIN product_features pf ON pf.product_id = p.id
		LEFT JOIN releases r ON r.product_id = p.id
		GROUP BY p.id
		ORDER BY p.name ASC
	`).all<{
		id: string;
		slug: string;
		name: string;
		summary: string;
		status: 'draft' | 'active' | 'retired';
		githubRepository: string | null;
		manifestUrl: string | null;
		featureCount: number;
		releaseCount: number;
		latestReleaseAt: number | null;
	}>();

	return { products: products.results };
};
