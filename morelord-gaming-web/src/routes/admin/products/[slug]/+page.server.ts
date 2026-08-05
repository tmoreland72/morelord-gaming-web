import { fail, error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdminEmail } from '$lib/server/admin';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FEATURE_KEY_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

function value(formData: FormData, key: string): string {
	return String(formData.get(key) ?? '').trim();
}

function nullable(value: string): string | null {
	return value.length ? value : null;
}

function requireAdmin(locals: App.Locals): void {
	if (!locals.user) redirect(303, '/login?returnTo=/admin/products');
	if (!isAdminEmail(locals.user.email)) error(403, 'Administrator access required.');
}

async function resolveProduct(db: D1Database, slug: string) {
	if (slug === 'new') return null;
	return db.prepare(`
		SELECT id, slug, name, summary, status,
			github_repository AS githubRepository,
			manifest_url AS manifestUrl
		FROM products WHERE slug = ? LIMIT 1
	`).bind(slug).first<{
		id: string;
		slug: string;
		name: string;
		summary: string;
		status: 'draft' | 'active' | 'retired';
		githubRepository: string | null;
		manifestUrl: string | null;
	}>();
}

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	requireAdmin(locals);
	if (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');

	const product = await resolveProduct(platform.env.DB, params.slug);
	if (params.slug !== 'new' && !product) error(404, 'Product not found.');

	const featureRows = product
		? await platform.env.DB.prepare(`
			SELECT f.id, f.key, f.name, f.description, pf.tier
			FROM product_features pf
			INNER JOIN features f ON f.id = pf.feature_id
			WHERE pf.product_id = ?
			ORDER BY CASE pf.tier WHEN 'standard' THEN 1 WHEN 'premium' THEN 2 ELSE 3 END, f.name
		`).bind(product.id).all<{
			id: string;
			key: string;
			name: string;
			description: string | null;
			tier: 'standard' | 'premium' | 'champion';
		}>()
		: { results: [] };

	return { product, features: featureRows.results, isNew: params.slug === 'new' };
};

export const actions: Actions = {
	saveProduct: async ({ request, locals, platform, params }) => {
		requireAdmin(locals);
		if (!platform?.env?.DB) return fail(503, { productError: 'D1 database binding is unavailable.' });

		const formData = await request.formData();
		const slug = value(formData, 'slug').toLowerCase();
		const name = value(formData, 'name');
		const summary = value(formData, 'summary');
		const status = value(formData, 'status');
		const githubRepository = value(formData, 'githubRepository');
		const manifestUrl = value(formData, 'manifestUrl');

		if (!SLUG_PATTERN.test(slug)) return fail(400, { productError: 'Use a lowercase, hyphenated product slug.', fields: { slug, name, summary, status, githubRepository, manifestUrl } });
		if (name.length < 3 || name.length > 100) return fail(400, { productError: 'Product name must be 3–100 characters.', fields: { slug, name, summary, status, githubRepository, manifestUrl } });
		if (summary.length < 10 || summary.length > 500) return fail(400, { productError: 'Summary must be 10–500 characters.', fields: { slug, name, summary, status, githubRepository, manifestUrl } });
		if (!['draft', 'active', 'retired'].includes(status)) return fail(400, { productError: 'Select a valid status.', fields: { slug, name, summary, status, githubRepository, manifestUrl } });

		const existing = await resolveProduct(platform.env.DB, params.slug);
		const duplicate = await platform.env.DB.prepare('SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1')
			.bind(slug, existing?.id ?? '').first<{ id: string }>();
		if (duplicate) return fail(409, { productError: 'That product slug is already in use.', fields: { slug, name, summary, status, githubRepository, manifestUrl } });

		const now = Date.now();
		if (existing) {
			await platform.env.DB.prepare(`
				UPDATE products SET slug = ?, name = ?, summary = ?, status = ?, github_repository = ?, manifest_url = ?, updated_at = ? WHERE id = ?
			`).bind(slug, name, summary, status, nullable(githubRepository), nullable(manifestUrl), now, existing.id).run();
		} else {
			const id = crypto.randomUUID();
			await platform.env.DB.prepare(`
				INSERT INTO products (id, slug, name, summary, status, github_repository, manifest_url, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).bind(id, slug, name, summary, status, nullable(githubRepository), nullable(manifestUrl), now, now).run();
		}

		redirect(303, `/admin/products/${slug}?saved=product`);
	},

	addFeature: async ({ request, locals, platform, params }) => {
		requireAdmin(locals);
		if (!platform?.env?.DB) return fail(503, { featureError: 'D1 database binding is unavailable.' });
		const product = await resolveProduct(platform.env.DB, params.slug);
		if (!product) return fail(404, { featureError: 'Save the product before adding features.' });

		const formData = await request.formData();
		const key = value(formData, 'key').toLowerCase();
		const name = value(formData, 'name');
		const description = value(formData, 'description');
		const tier = value(formData, 'tier');

		if (!FEATURE_KEY_PATTERN.test(key)) return fail(400, { featureError: 'Feature keys may contain lowercase letters, numbers, periods and hyphens.' });
		if (name.length < 3 || name.length > 120) return fail(400, { featureError: 'Feature name must be 3–120 characters.' });
		if (!['standard', 'premium', 'champion'].includes(tier)) return fail(400, { featureError: 'Select a valid feature tier.' });

		const existingFeature = await platform.env.DB.prepare('SELECT id FROM features WHERE key = ? LIMIT 1').bind(key).first<{ id: string }>();
		const featureId = existingFeature?.id ?? crypto.randomUUID();
		const now = Date.now();

		if (existingFeature) {
			await platform.env.DB.prepare('UPDATE features SET name = ?, description = ?, updated_at = ? WHERE id = ?')
				.bind(name, nullable(description), now, featureId).run();
		} else {
			await platform.env.DB.prepare(`INSERT INTO features (id, key, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
				.bind(featureId, key, name, nullable(description), now, now).run();
		}

		await platform.env.DB.prepare(`
			INSERT INTO product_features (product_id, feature_id, tier) VALUES (?, ?, ?)
			ON CONFLICT(product_id, feature_id) DO UPDATE SET tier = excluded.tier
		`).bind(product.id, featureId, tier).run();

		redirect(303, `/admin/products/${product.slug}?saved=feature`);
	},

	updateFeature: async ({ request, locals, platform, params }) => {
		requireAdmin(locals);
		if (!platform?.env?.DB) return fail(503, { featureError: 'D1 database binding is unavailable.' });
		const product = await resolveProduct(platform.env.DB, params.slug);
		if (!product) return fail(404, { featureError: 'Product not found.' });

		const formData = await request.formData();
		const featureId = value(formData, 'featureId');
		const tier = value(formData, 'tier');
		if (!featureId || !['standard', 'premium', 'champion'].includes(tier)) return fail(400, { featureError: 'Invalid feature update.' });

		await platform.env.DB.prepare('UPDATE product_features SET tier = ? WHERE product_id = ? AND feature_id = ?')
			.bind(tier, product.id, featureId).run();
		redirect(303, `/admin/products/${product.slug}?saved=feature`);
	},

	removeFeature: async ({ request, locals, platform, params }) => {
		requireAdmin(locals);
		if (!platform?.env?.DB) return fail(503, { featureError: 'D1 database binding is unavailable.' });
		const product = await resolveProduct(platform.env.DB, params.slug);
		if (!product) return fail(404, { featureError: 'Product not found.' });
		const formData = await request.formData();
		const featureId = value(formData, 'featureId');
		await platform.env.DB.prepare('DELETE FROM product_features WHERE product_id = ? AND feature_id = ?').bind(product.id, featureId).run();
		redirect(303, `/admin/products/${product.slug}?saved=removed`);
	}
};
