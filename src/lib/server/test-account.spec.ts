import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { env } = vi.hoisted(() => ({ env: { ADMIN_EMAILS: 'admin@example.com' } }));
vi.mock('$env/dynamic/private', () => ({ env }));
import { getTestAccount, resetTestAccount, TEST_ACCOUNT_EMAIL } from './test-account';
import { actions } from '../../routes/admin/test-account/+page.server';

let sqlite: DatabaseSync;
let db: D1Database;
let beforeBatch: (() => void) | undefined;
const actor = { id: 'admin', email: 'admin@example.com' };
const input = { userId: 'test', confirmation: TEST_ACCOUNT_EMAIL };

function insert(table: string, row: Record<string, SQLInputValue>) {
	const keys = Object.keys(row);
	sqlite
		.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
		.run(...Object.values(row));
}

beforeEach(() => {
	env.ADMIN_EMAILS = actor.email;
	beforeBatch = undefined;
	sqlite = new DatabaseSync(':memory:');
	sqlite.exec('PRAGMA foreign_keys = ON');
	for (const migration of [
		'0000_initial',
		'0002_billing',
		'0003_foundry_activation',
		'0004_discord',
		'0011_installation_analytics',
		'0012_support_requests',
		'0013_characters'
	]) {
		sqlite.exec(readFileSync(`migrations/${migration}.sql`, 'utf8'));
	}
	insert('products', {
		id: 'product',
		slug: 'product',
		name: 'Product',
		summary: 'Test',
		created_at: 1,
		updated_at: 1
	});
	for (const id of ['test', 'other']) {
		const email = id === 'test' ? TEST_ACCOUNT_EMAIL : 'other@example.com';
		insert('user', { id, email, name: id, created_at: 1, updated_at: 1 });
		insert('session', {
			id,
			token: id,
			user_id: id,
			expires_at: 99999,
			created_at: 1,
			updated_at: 1
		});
		insert('account', {
			id,
			account_id: id,
			provider_id: 'google',
			user_id: id,
			created_at: 1,
			updated_at: 1
		});
		insert('characters', {
			id,
			user_id: id,
			name: id,
			content_json: '{}',
			created_at: 1,
			updated_at: 1
		});
		insert('foundry_installations', {
			id,
			user_id: id,
			product_id: 'product',
			label: id,
			token_hash: id,
			created_at: 1,
			updated_at: 1
		});
		insert('foundry_product_activity', {
			installation_id: id,
			product_id: 'product',
			first_seen_at: 1,
			last_seen_at: 1
		});
		insert('foundry_activation_requests', {
			id,
			product_id: 'product',
			user_code: id,
			device_secret_hash: id,
			installation_label: id,
			approved_by_user_id: id,
			installation_id: id,
			issued_token: id,
			expires_at: 99999,
			created_at: 1
		});
		insert('support_requests', {
			id,
			user_id: id,
			name: id,
			email,
			category: 'test',
			subject: 'test',
			message: 'test',
			created_at: 1,
			updated_at: 1
		});
		insert('verification', { id, identifier: email, value: id, expires_at: 99999 });
	}
	const prepare = (sql: string) => {
		let values: SQLInputValue[] = [];
		return {
			bind(...args: SQLInputValue[]) {
				values = args;
				return this;
			},
			async first() {
				return sqlite.prepare(sql).get(...values) ?? null;
			},
			run() {
				return { meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } };
			}
		};
	};
	db = {
		prepare,
		async batch(statements: ReturnType<typeof prepare>[]) {
			beforeBatch?.();
			sqlite.exec('BEGIN');
			try {
				const result = statements.map((statement) => statement.run());
				sqlite.exec('COMMIT');
				return result;
			} catch (cause) {
				sqlite.exec('ROLLBACK');
				throw cause;
			}
		}
	} as unknown as D1Database;
});

afterEach(() => sqlite.close());

describe('test account reset', () => {
	it('clears only the designated account and allows a new signup with the same email', async () => {
		expect((await getTestAccount(db)).account?.characters).toBe(1);
		await resetTestAccount(db, actor, input);
		for (const table of [
			'user',
			'session',
			'account',
			'characters',
			'foundry_installations',
			'foundry_activation_requests',
			'support_requests',
			'verification'
		]) {
			expect(sqlite.prepare(`SELECT id FROM ${table}`).all()).toEqual([{ id: 'other' }]);
		}
		expect(sqlite.prepare('SELECT installation_id FROM foundry_product_activity').all()).toEqual([
			{ installation_id: 'other' }
		]);
		expect((await getTestAccount(db)).account).toBeNull();
		insert('user', {
			id: 'fresh',
			email: TEST_ACCOUNT_EMAIL,
			name: 'New signup',
			created_at: 2,
			updated_at: 2
		});
		expect((await getTestAccount(db)).account?.id).toBe('fresh');
	});

	it('rejects non-admins and confirmation for another email', async () => {
		await expect(
			resetTestAccount(db, { id: 'other', email: 'other@example.com' }, input)
		).rejects.toMatchObject({ status: 403 });
		await expect(
			resetTestAccount(db, actor, { ...input, confirmation: 'other@example.com' })
		).rejects.toThrow('Type the test account email');
		expect((await getTestAccount(db)).account?.sessions).toBe(1);
	});

	it('rejects forged target IDs and stale forms after a fresh signup', async () => {
		await expect(resetTestAccount(db, actor, { ...input, userId: 'other' })).rejects.toMatchObject({
			status: 409
		});
		await resetTestAccount(db, actor, input);
		insert('user', {
			id: 'fresh',
			email: TEST_ACCOUNT_EMAIL,
			name: 'Fresh',
			created_at: 2,
			updated_at: 2
		});
		await expect(resetTestAccount(db, actor, input)).rejects.toMatchObject({ status: 409 });
		expect((await getTestAccount(db)).account?.id).toBe('fresh');
	});

	it('protects the current administrator and emails granted administrator access', async () => {
		await expect(resetTestAccount(db, { ...actor, id: 'test' }, input)).rejects.toMatchObject({
			status: 403
		});
		env.ADMIN_EMAILS += `,${TEST_ACCOUNT_EMAIL}`;
		await expect(resetTestAccount(db, actor, input)).rejects.toThrow('ADMIN_EMAILS');
	});

	it('preserves accounts with external billing or Discord role connections', async () => {
		insert('stripe_customers', {
			user_id: 'test',
			stripe_customer_id: 'cus_test',
			created_at: 1,
			updated_at: 1
		});
		await expect(resetTestAccount(db, actor, input)).rejects.toThrow('Stripe customer record');
		sqlite.exec('DELETE FROM stripe_customers');
		insert('discord_connections', {
			user_id: 'test',
			discord_user_id: 'discord',
			username: 'test',
			created_at: 1,
			updated_at: 1
		});
		await expect(resetTestAccount(db, actor, input)).rejects.toThrow('disconnect Discord');
		expect((await getTestAccount(db)).account?.sessions).toBe(1);
	});

	it('does not partially clear an account when billing is connected just before deletion', async () => {
		beforeBatch = () =>
			insert('stripe_customers', {
				user_id: 'test',
				stripe_customer_id: 'cus_race',
				created_at: 1,
				updated_at: 1
			});
		await expect(resetTestAccount(db, actor, input)).rejects.toMatchObject({ status: 409 });
		expect((await getTestAccount(db)).account).toMatchObject({
			sessions: 1,
			characters: 1,
			installations: 1,
			contactMessages: 1
		});
		expect(
			sqlite.prepare('SELECT COUNT(*) AS total FROM foundry_activation_requests').get()?.total
		).toBe(2);
	});

	it('rolls back related deletions if the account deletion fails', async () => {
		sqlite.exec(
			"CREATE TRIGGER fail_reset BEFORE DELETE ON user BEGIN SELECT RAISE(ABORT, 'test failure'); END;"
		);
		await expect(resetTestAccount(db, actor, input)).rejects.toThrow('test failure');
		expect((await getTestAccount(db)).account?.contactMessages).toBe(1);
		expect(
			sqlite.prepare('SELECT COUNT(*) AS total FROM foundry_activation_requests').get()?.total
		).toBe(2);
	});

	it('checks administrator access on direct form submissions', async () => {
		const event = { locals: { user: { id: 'other', email: 'other@example.com' } } } as Parameters<
			NonNullable<typeof actions.reset>
		>[0];
		await expect(actions.reset!(event)).rejects.toMatchObject({ status: 403 });
	});
});
