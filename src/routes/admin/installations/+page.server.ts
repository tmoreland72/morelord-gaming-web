import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type InstallationRow = {
\tid: string;
\tuserId: string;
\tlabel: string;
\tworldName: string | null;
\tfoundryVersion: string | null;
\tmoduleVersion: string | null;
\tlastValidatedAt: number | null;
\tcreatedAt: number;
\trevokedAt: number | null;
\temail: string;
\tname: string;
\tplan: string | null;
\tstatus: string | null;
};

type ProductActivityRow = {
\tinstallationId: string;
\tproductSlug: string;
\tproductName: string;
\tfirstSeenAt: number;
\tlastSeenAt: number;
};

function tierFor(plan: string | null, status: string | null): 'standard' | 'premium' | 'champion' {
\tif (!status || !['active', 'trialing', 'past_due'].includes(status)) return 'standard';
\tif (plan?.startsWith('champion')) return 'champion';
\tif (plan?.startsWith('premium')) return 'premium';
\treturn 'standard';
}

export const load: PageServerLoad = async ({ platform }) => {
\tif (!platform?.env?.DB) error(503, 'D1 database binding is unavailable.');
\tconst db = platform.env.DB;
\tconst now = Date.now();
\tconst day = 86_400_000;

\tconst [installResult, activityResult] = await Promise.all([
\t\tdb.prepare(`SELECT fi.id, fi.user_id AS userId, fi.label, fi.world_name AS worldName,
\t\t\tfi.foundry_version AS foundryVersion, fi.module_version AS moduleVersion,
\t\t\tfi.last_validated_at AS lastValidatedAt, fi.created_at AS createdAt,
\t\t\tfi.revoked_at AS revokedAt, u.email, u.name,
\t\t\ts.plan, s.status
\t\t\tFROM foundry_installations fi
\t\t\tINNER JOIN user u ON u.id = fi.user_id
\t\t\tLEFT JOIN stripe_customers sc ON sc.user_id = fi.user_id
\t\t\tLEFT JOIN subscriptions s ON s.stripe_customer_id = sc.stripe_customer_id AND s.is_current = 1
\t\t\tORDER BY COALESCE(fi.last_validated_at, fi.created_at) DESC`).all<InstallationRow>(),
\t\tdb.prepare(`SELECT a.installation_id AS installationId, p.slug AS productSlug,
\t\t\tp.name AS productName, a.first_seen_at AS firstSeenAt, a.last_seen_at AS lastSeenAt
\t\t\tFROM foundry_product_activity a
\t\t\tINNER JOIN products p ON p.id = a.product_id
\t\t\tORDER BY a.last_seen_at DESC`).all<ProductActivityRow>()
\t]);

\tconst installs = (installResult.results as InstallationRow[]).map((row) => ({
\t\t...row,
\t\ttier: tierFor(row.plan, row.status),
\t\tactive7: !row.revokedAt && Boolean(row.lastValidatedAt && row.lastValidatedAt >= now - 7 * day),
\t\tactive30: !row.revokedAt && Boolean(row.lastValidatedAt && row.lastValidatedAt >= now - 30 * day),
\t\tactive90: !row.revokedAt && Boolean(row.lastValidatedAt && row.lastValidatedAt >= now - 90 * day)
\t}));
\tconst activities = activityResult.results as ProductActivityRow[];
\tconst active30 = installs.filter((row) => row.active30);
\tconst activeUserIds = new Set(active30.map((row) => row.userId));
\tconst activeAccounts = [...activeUserIds].map((userId) => active30.find((row) => row.userId === userId)!);
\tconst paidAccounts = activeAccounts.filter((row) => row.tier !== 'standard').length;

\tconst tierCounts = {
\t\tstandard: activeAccounts.filter((row) => row.tier === 'standard').length,
\t\tpremium: activeAccounts.filter((row) => row.tier === 'premium').length,
\t\tchampion: activeAccounts.filter((row) => row.tier === 'champion').length
\t};

\tconst versionMap = new Map<string, number>();
\tfor (const row of active30) {
\t\tconst version = row.moduleVersion || 'Unknown';
\t\tversionMap.set(version, (versionMap.get(version) ?? 0) + 1);
\t}
\tconst versions = [...versionMap.entries()].map(([version, count]) => ({ version, count })).sort((a, b) => b.count - a.count);

\tconst productMap = new Map<string, { slug: string; name: string; active30: number; total: number }>();
\tfor (const activity of activities) {
\t\tconst current = productMap.get(activity.productSlug) ?? { slug: activity.productSlug, name: activity.productName, active30: 0, total: 0 };
\t\tcurrent.total += 1;
\t\tif (activity.lastSeenAt >= now - 30 * day) current.active30 += 1;
\t\tproductMap.set(activity.productSlug, current);
\t}
\tconst products = [...productMap.values()].sort((a, b) => b.active30 - a.active30 || a.name.localeCompare(b.name));

\tconst monthKeys: string[] = [];
\tfor (let offset = 11; offset >= 0; offset -= 1) {
\t\tconst date = new Date();
\t\tdate.setUTCDate(1);
\t\tdate.setUTCHours(0, 0, 0, 0);
\t\tdate.setUTCMonth(date.getUTCMonth() - offset);
\t\tmonthKeys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
\t}
\tconst monthly = monthKeys.map((key) => {
\t\tconst [year, month] = key.split('-').map(Number);
\t\treturn {
\t\t\tkey,
\t\t\tlabel: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
\t\t\tcount: installs.filter((row) => {
\t\t\t\tconst d = new Date(row.createdAt);
\t\t\t\treturn `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` === key;
\t\t\t}).length
\t\t};
\t});

\treturn {
\t\tsummary: {
\t\t\tregistered: installs.filter((row) => !row.revokedAt).length,
\t\t\tactive7: installs.filter((row) => row.active7).length,
\t\t\tactive30: active30.length,
\t\t\tactive90: installs.filter((row) => row.active90).length,
\t\t\tactiveAccounts: activeAccounts.length,
\t\t\tpaidAccounts,
\t\t\tconversion: activeAccounts.length ? Math.round((paidAccounts / activeAccounts.length) * 1000) / 10 : 0,
\t\t\trevoked: installs.filter((row) => Boolean(row.revokedAt)).length
\t\t},
\t\ttierCounts,
\t\tversions,
\t\tproducts,
\t\tmonthly,
\t\tinstallations: installs.slice(0, 200),
\t\tcheckedAt: now
\t};
};
