import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type ReleaseChangeInput = {
	category: 'feature' | 'improvement' | 'fix' | 'breaking' | 'security';
	tier?: 'standard' | 'premium' | 'champion';
	description: string;
};

type ReleaseInput = {
	productSlug: string;
	version: string;
	title: string;
	summary?: string;
	publishedAt?: string;
	githubReleaseUrl?: string;
	downloadUrl?: string;
	manifestUrl?: string;
	changes?: ReleaseChangeInput[];
};

const categories = new Set(['feature', 'improvement', 'fix', 'breaking', 'security']);
const tiers = new Set(['standard', 'premium', 'champion']);
const semanticVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function unauthorized() {
	return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}

function optionalString(value: unknown, maximumLength: number): boolean {
	return value === undefined || value === null || (typeof value === 'string' && value.length <= maximumLength);
}

function optionalUrl(value: unknown): boolean {
	if (value === undefined || value === null || value === '') return true;
	if (typeof value !== 'string' || value.length > 2_048) return false;

	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:';
	} catch {
		return false;
	}
}

function validate(input: unknown): input is ReleaseInput {
	if (!input || typeof input !== 'object') return false;
	const value = input as Record<string, unknown>;

	if (typeof value.productSlug !== 'string' || !slugPattern.test(value.productSlug)) return false;
	if (typeof value.version !== 'string' || !semanticVersionPattern.test(value.version)) return false;
	if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 160) return false;
	if (!optionalString(value.summary, 2_000)) return false;
	if (!optionalString(value.publishedAt, 100)) return false;
	if (!optionalUrl(value.githubReleaseUrl)) return false;
	if (!optionalUrl(value.downloadUrl)) return false;
	if (!optionalUrl(value.manifestUrl)) return false;
	if (value.changes !== undefined && !Array.isArray(value.changes)) return false;
	if (Array.isArray(value.changes) && value.changes.length > 100) return false;

	return (
		(value.changes as unknown[] | undefined)?.every((change) => {
			if (!change || typeof change !== 'object') return false;
			const item = change as Record<string, unknown>;
			return (
				typeof item.description === 'string' &&
				item.description.trim().length > 0 &&
				item.description.length <= 1_000 &&
				typeof item.category === 'string' &&
				categories.has(item.category) &&
				(item.tier === undefined || (typeof item.tier === 'string' && tiers.has(item.tier)))
			);
		}) ?? true
	);
}

export const POST: RequestHandler = async ({ request, platform }) => {
	// On Cloudflare, RELEASE_PUBLISH_TOKEN is a runtime Worker secret binding.
	// Prefer platform.env so authentication uses the secret actually deployed to the Worker.
	// Keep $env/dynamic/private as a local-development fallback.
	const runtimeEnv = platform?.env as (Record<string, unknown> & { DB?: D1Database }) | undefined;
	const runtimeToken = runtimeEnv?.RELEASE_PUBLISH_TOKEN;
	const token =
		typeof runtimeToken === 'string' && runtimeToken.length > 0
			? runtimeToken
			: env.RELEASE_PUBLISH_TOKEN;
	const authorization = request.headers.get('authorization');
	if (!token || authorization !== `Bearer ${token}`) return unauthorized();
	if (!platform?.env?.DB) {
		return json({ ok: false, error: 'D1 database binding is unavailable.' }, { status: 503 });
	}

	let input: unknown;
	try {
		input = await request.json();
	} catch {
		return json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 });
	}

	if (!validate(input)) {
		return json(
			{
				ok: false,
				error:
					'Invalid release payload. Check the product slug, semantic version, URLs and change entries.'
			},
			{ status: 400 }
		);
	}

	const db = platform.env.DB;
	const product = await db
		.prepare('SELECT id FROM products WHERE slug = ?1 AND status = ?2')
		.bind(input.productSlug, 'active')
		.first<{ id: string }>();

	if (!product) {
		return json(
			{ ok: false, error: `Unknown active product: ${input.productSlug}` },
			{ status: 404 }
		);
	}

	const existing = await db
		.prepare('SELECT id FROM releases WHERE product_id = ?1 AND version = ?2')
		.bind(product.id, input.version)
		.first<{ id: string }>();
	const releaseId = existing?.id ?? crypto.randomUUID();
	const publishedAt = input.publishedAt ? Date.parse(input.publishedAt) : Date.now();

	if (!Number.isFinite(publishedAt)) {
		return json({ ok: false, error: 'publishedAt must be a valid date.' }, { status: 400 });
	}

	const statements = [
		db
			.prepare(`INSERT INTO releases (id, product_id, version, title, summary, published_at, github_release_url, download_url, manifest_url, created_at)
			VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
			ON CONFLICT(product_id, version) DO UPDATE SET title=excluded.title, summary=excluded.summary,
			published_at=excluded.published_at, github_release_url=excluded.github_release_url,
			download_url=excluded.download_url, manifest_url=excluded.manifest_url`)
			.bind(
				releaseId,
				product.id,
				input.version,
				input.title.trim(),
				input.summary?.trim() || null,
				publishedAt,
				input.githubReleaseUrl || null,
				input.downloadUrl || null,
				input.manifestUrl || null,
				Date.now()
			),
		db.prepare('DELETE FROM release_changes WHERE release_id = ?1').bind(releaseId)
	];

	for (const [index, change] of (input.changes ?? []).entries()) {
		statements.push(
			db
				.prepare(`INSERT INTO release_changes (id, release_id, category, tier, description, sort_order)
			VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
				.bind(
					crypto.randomUUID(),
					releaseId,
					change.category,
					change.tier ?? 'standard',
					change.description.trim(),
					index
				)
		);
	}

	await db.batch(statements);

	return json({
		ok: true,
		action: existing ? 'updated' : 'created',
		releaseId,
		productSlug: input.productSlug,
		version: input.version,
		publicUrl: `/releases#${input.productSlug}-${input.version}`
	});
};
