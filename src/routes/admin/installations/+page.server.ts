import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type InstallationRow = {
	id: string;
	userId: string;
	label: string;
	worldName: string | null;
	foundryVersion: string | null;
	moduleVersion: string | null;
	lastValidatedAt: number | null;
	createdAt: number;
	revokedAt: number | null;
	email: string;
	name: string;
	plan: string | null;
	status: string | null;
};

type ProductActivityRow = {
	installationId: string;
	productSlug: string;
	productName: string;
	firstSeenAt: number;
	lastSeenAt: number;
};

function tierFor(plan: string | null, status: string | null): 'standard' | 'premium' | 'champion' {
	if (!status || !['active', 'trialing', 'past_due'].includes(status)) return 'standard';
	if (plan?.startsWith('champion')) return 'champion';
	if (plan?.startsWith('premium')) return 'premium';
	return 'standard';
}

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');
	const db = platform.env.DB;
	const now = Date.now();
	const day = 86_400_000;

	const [installResult, activityResult] = await Promise.all([
		db.prepare(`SELECT fi.id, fi.user_id AS userId, fi.label, fi.world_name AS worldName,
			fi.foundry_version AS foundryVersion, fi.module_version AS moduleVersion,
			fi.last_validated_at AS lastValidatedAt, fi.created_at AS createdAt,
			fi.revoked_at AS revokedAt, u.email, u.name,
			s.plan, s.status
			FROM foundry_installations fi
			INNER JOIN user u ON u.id = fi.user_id
			LEFT JOIN stripe_customers sc ON sc.user_id = fi.user_id
			LEFT JOIN subscriptions s ON s.stripe_customer_id = sc.stripe_customer_id AND s.is_current = 1
			ORDER BY COALESCE(fi.last_validated_at, fi.created_at) DESC`).all<InstallationRow>(),
		db.prepare(`SELECT a.installation_id AS installationId, p.slug AS productSlug,
			p.name AS productName, a.first_seen_at AS firstSeenAt, a.last_seen_at AS lastSeenAt
			FROM foundry_product_activity a
			INNER JOIN products p ON p.id = a.product_id
			ORDER BY a.last_seen_at DESC`).all<ProductActivityRow>()
	]);

	const installs = (installResult.results as InstallationRow[]).map((row) => ({
		...row,
		tier: tierFor(row.plan, row.status),
		active7: !row.revokedAt && Boolean(row.lastValidatedAt && row.lastValidatedAt >= now - 7 * day),
		active30: !row.revokedAt && Boolean(row.lastValidatedAt && row.lastValidatedAt >= now - 30 * day),
		active90: !row.revokedAt && Boolean(row.lastValidatedAt && row.lastValidatedAt >= now - 90 * day)
	}));
	const activities = activityResult.results as ProductActivityRow[];
	const active30 = installs.filter((row) => row.active30);
	const activeUserIds = new Set(active30.map((row) => row.userId));
	const activeAccounts = [...activeUserIds].map((userId) => active30.find((row) => row.userId === userId)!);
	const paidAccounts = activeAccounts.filter((row) => row.tier !== 'standard').length;

	const tierCounts = {
		standard: activeAccounts.filter((row) => row.tier === 'standard').length,
		premium: activeAccounts.filter((row) => row.tier === 'premium').length,
		champion: activeAccounts.filter((row) => row.tier === 'champion').length
	};

	const versionMap = new Map<string, number>();
	for (const row of active30) {
		const version = row.moduleVersion || 'Unknown';
		versionMap.set(version, (versionMap.get(version) ?? 0) + 1);
	}
	const versions = [...versionMap.entries()].map(([version, count]) => ({ version, count })).sort((a, b) => b.count - a.count);

	const productMap = new Map<string, { slug: string; name: string; active30: number; total: number }>();
	for (const activity of activities) {
		const current = productMap.get(activity.productSlug) ?? { slug: activity.productSlug, name: activity.productName, active30: 0, total: 0 };
		current.total += 1;
		if (activity.lastSeenAt >= now - 30 * day) current.active30 += 1;
		productMap.set(activity.productSlug, current);
	}
	const products = [...productMap.values()].sort((a, b) => b.active30 - a.active30 || a.name.localeCompare(b.name));

	const monthKeys: string[] = [];
	for (let offset = 11; offset >= 0; offset -= 1) {
		const date = new Date();
		date.setUTCDate(1);
		date.setUTCHours(0, 0, 0, 0);
		date.setUTCMonth(date.getUTCMonth() - offset);
		monthKeys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
	}
	const monthly = monthKeys.map((key) => {
		const [year, month] = key.split('-').map(Number);
		return {
			key,
			label: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
			count: installs.filter((row) => {
				const d = new Date(row.createdAt);
				return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` === key;
			}).length
		};
	});

	return {
		summary: {
			registered: installs.filter((row) => !row.revokedAt).length,
			active7: installs.filter((row) => row.active7).length,
			active30: active30.length,
			active90: installs.filter((row) => row.active90).length,
			activeAccounts: activeAccounts.length,
			paidAccounts,
			conversion: activeAccounts.length ? Math.round((paidAccounts / activeAccounts.length) * 1000) / 10 : 0,
			revoked: installs.filter((row) => Boolean(row.revokedAt)).length
		},
		tierCounts,
		versions,
		products,
		monthly,
		installations: installs.slice(0, 200),
		checkedAt: now
	};
};
