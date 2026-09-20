import { isAdminEmail } from './admin';
import { AppError } from './errors';

// This is deliberately an exact allowlist, not an email supplied by the reset form.
export const TEST_ACCOUNT_EMAIL = 'graypesowrathe@gmail.com';

type TestAccount = {
	id: string;
	name: string;
	createdAt: number;
	sessions: number;
	characters: number;
	installations: number;
	contactMessages: number;
	hasBilling: number;
	hasDiscord: number;
};

export async function getTestAccount(db: D1Database) {
	const account = await db
		.prepare(
			`SELECT u.id, u.name, u.created_at AS createdAt,
		(SELECT COUNT(*) FROM session WHERE user_id = u.id) AS sessions,
		(SELECT COUNT(*) FROM characters WHERE user_id = u.id) AS characters,
		(SELECT COUNT(*) FROM foundry_installations WHERE user_id = u.id) AS installations,
		(SELECT COUNT(*) FROM support_requests WHERE user_id = u.id) AS contactMessages,
		EXISTS(SELECT 1 FROM stripe_customers WHERE user_id = u.id) AS hasBilling,
		EXISTS(SELECT 1 FROM discord_connections WHERE user_id = u.id) AS hasDiscord
		FROM user u WHERE lower(u.email) = ?`
		)
		.bind(TEST_ACCOUNT_EMAIL)
		.first<TestAccount>();
	const blockers: string[] = [];
	if (isAdminEmail(TEST_ACCOUNT_EMAIL))
		blockers.push('Remove the test email from ADMIN_EMAILS before resetting it.');
	if (account?.hasBilling)
		blockers.push(
			'This account has a Stripe customer record. Reset is disabled to preserve billing history and any live payments. Use a signup-only account for this reset tool.'
		);
	if (account?.hasDiscord)
		blockers.push(
			'Sign in as the test account and disconnect Discord from Account before resetting, so its managed roles can be removed.'
		);
	return { email: TEST_ACCOUNT_EMAIL, account, blockers };
}

export async function resetTestAccount(
	db: D1Database,
	actor: { id: string; email: string },
	input: { userId: string; confirmation: string }
) {
	if (!isAdminEmail(actor.email)) throw new AppError('Administrator access required.', 403);
	if (input.confirmation.trim().toLowerCase() !== TEST_ACCOUNT_EMAIL) {
		throw new AppError('Type the test account email to confirm the reset.');
	}
	const { account, blockers } = await getTestAccount(db);
	if (!account || account.id !== input.userId)
		throw new AppError('The test account changed or was already reset. Reload this page.', 409);
	if (actor.id === account.id)
		throw new AppError('Use your primary administrator account to reset the test account.', 403);
	if (blockers.length) throw new AppError(blockers.join(' '), 409);

	// Recheck identity and external connections inside the atomic batch. A stale form
	// must never delete a newly created account or partially clear a blocked account.
	const eligible = `SELECT id FROM user WHERE id = ? AND lower(email) = ?
		AND NOT EXISTS (SELECT 1 FROM stripe_customers WHERE user_id = user.id)
		AND NOT EXISTS (SELECT 1 FROM discord_connections WHERE user_id = user.id)`;
	const statement = (sql: string) => db.prepare(sql).bind(account.id, TEST_ACCOUNT_EMAIL);
	const result = await db.batch([
		statement(`DELETE FROM foundry_activation_requests WHERE approved_by_user_id IN (${eligible})`),
		statement(`DELETE FROM foundry_activation_requests WHERE installation_id IN
			(SELECT id FROM foundry_installations WHERE user_id IN (${eligible}))`),
		statement(`DELETE FROM support_requests WHERE user_id IN (${eligible})`),
		statement(`DELETE FROM verification WHERE lower(identifier) = '${TEST_ACCOUNT_EMAIL}'
			AND EXISTS (${eligible})`),
		// Foreign keys cascade to sessions, OAuth accounts, characters, installations
		// and installation activity. No Stripe, Discord, or shared records are removed.
		statement(`DELETE FROM user WHERE id IN (${eligible})`)
	]);
	if (result[result.length - 1].meta.changes !== 1) {
		throw new AppError(
			'The test account changed during reset. Reload and check its connections.',
			409
		);
	}
}
