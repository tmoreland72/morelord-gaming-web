import { env } from '$env/dynamic/private';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '$lib/server/db';
import { products, releaseAnnouncements, releases } from '$lib/server/db/schema';
import { getDiscordSettings } from '$lib/server/discord';
import { publishDiscordRelease } from '$lib/server/release-announcement';

const categories = ['feature', 'improvement', 'fix', 'breaking', 'security'] as const;
const tiers = ['standard', 'premium', 'champion'] as const;

function optionalHttpUrl(value: string): boolean {
	if (!value) return true;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:';
	} catch {
		return false;
	}
}

export const releaseInputSchema = z.object({
	productSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
	title: z.string().trim().min(1).max(160),
	summary: z.string().max(2_000).optional().nullable(),
	publishedAt: z.string().max(100).optional().nullable(),
	githubReleaseUrl: z
		.string()
		.max(2_048)
		.optional()
		.nullable()
		.refine((value) => !value || optionalHttpUrl(value)),
	downloadUrl: z
		.string()
		.max(2_048)
		.optional()
		.nullable()
		.refine((value) => !value || optionalHttpUrl(value)),
	manifestUrl: z
		.string()
		.max(2_048)
		.optional()
		.nullable()
		.refine((value) => !value || optionalHttpUrl(value)),
	changes: z
		.array(
			z.object({
				category: z.enum(categories),
				tier: z.enum(tiers).optional(),
				description: z.string().trim().min(1).max(1_000)
			})
		)
		.max(100)
		.optional()
});

export type ReleaseInput = z.infer<typeof releaseInputSchema>;

export async function publishProductRelease(
	d1: D1Database,
	input: ReleaseInput,
	options: { webhookUrl?: string; origin?: string; requestUrl: string }
) {
	const db = getDb(d1);
	const [product] = await db
		.select({ id: products.id, name: products.name, status: products.status })
		.from(products)
		.where(and(eq(products.slug, input.productSlug), eq(products.status, 'active')))
		.limit(1);

	if (!product) {
		return {
			ok: false as const,
			status: 404,
			error: `Unknown active product: ${input.productSlug}`
		};
	}

	const [existingRelease] = await db
		.select({ id: releases.id })
		.from(releases)
		.where(and(eq(releases.productId, product.id), eq(releases.version, input.version)))
		.limit(1);
	const releaseId = existingRelease?.id ?? crypto.randomUUID();
	const publishedAt = input.publishedAt ? Date.parse(input.publishedAt) : Date.now();
	if (!Number.isFinite(publishedAt)) {
		return { ok: false as const, status: 400, error: 'publishedAt must be a valid date.' };
	}

	const now = Date.now();
	const statements = [
		d1
			.prepare(
				`INSERT INTO releases (id, product_id, version, title, summary, published_at, github_release_url, download_url, manifest_url, created_at)
			VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
			ON CONFLICT(product_id, version) DO UPDATE SET title=excluded.title, summary=excluded.summary,
			published_at=excluded.published_at, github_release_url=excluded.github_release_url,
			download_url=excluded.download_url, manifest_url=excluded.manifest_url`
			)
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
				now
			),
		d1.prepare('DELETE FROM release_changes WHERE release_id = ?1').bind(releaseId)
	];

	for (const [index, change] of (input.changes ?? []).entries()) {
		statements.push(
			d1
				.prepare(
					`INSERT INTO release_changes (id, release_id, category, tier, description, sort_order)
			VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
				)
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

	await d1.batch(statements);

	const publicPath = `/releases#${input.productSlug}-${input.version}`;
	if (options.webhookUrl) {
		const announcement = await db.query.releaseAnnouncements.findFirst({
			where: eq(releaseAnnouncements.releaseId, releaseId)
		});

		if (!announcement) {
			const discordSettings = await getDiscordSettings(d1);
			const origin =
				typeof options.origin === 'string' && options.origin.length > 0
					? options.origin
					: env.ORIGIN;
			const publicUrl = new URL(publicPath, origin || options.requestUrl).toString();

			try {
				const messageId = await publishDiscordRelease(
					options.webhookUrl,
					{
						productName: product.name,
						productSlug: input.productSlug,
						version: input.version,
						title: input.title.trim(),
						summary: input.summary?.trim(),
						publicUrl,
						githubReleaseUrl: input.githubReleaseUrl ?? undefined,
						changes: input.changes ?? []
					},
					discordSettings.roleToolsId
				);
				await db.insert(releaseAnnouncements).values({
					releaseId,
					provider: 'discord',
					externalMessageId: messageId,
					announcedAt: new Date()
				});
			} catch (error) {
				console.error('Discord release announcement failed.', error);
				return {
					ok: false as const,
					status: 502,
					error:
						'The release was saved, but its Discord announcement failed. Retry this request safely.',
					releaseId,
					productSlug: input.productSlug,
					version: input.version
				};
			}
		}
	}

	return {
		ok: true as const,
		action: existingRelease ? ('updated' as const) : ('created' as const),
		releaseId,
		productSlug: input.productSlug,
		version: input.version,
		publicUrl: publicPath
	};
}
