import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as listAccountInstallations } from '../../routes/api/account/installations/+server';
import {
	approveActivation,
	createActivationRequest,
	listUserInstallations,
	pollActivation,
	validateInstallationToken
} from './foundry';

let worker: Miniflare;
let database: D1Database;

async function apply(file: string) {
	for (const statement of readFileSync(`migrations/${file}`, 'utf8').split(';')) {
		if (statement.trim()) await database.prepare(statement).run();
	}
}

beforeAll(async () => {
	worker = new Miniflare({
		modules: true,
		script: 'export default { fetch() { return new Response("ok"); } }',
		compatibilityDate: '2026-08-01',
		d1Databases: ['DB']
	});
	database = (await worker.getD1Database('DB')) as unknown as D1Database;
	for (const file of [
		'0000_initial.sql',
		'0002_billing.sql',
		'0003_foundry_activation.sql',
		'0005_entitlement_display_names.sql',
		'0011_installation_analytics.sql',
		'0017_product_feature_order.sql'
	]) {
		await apply(file);
	}
	const now = Date.now();
	await database
		.prepare(
			`INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
			 VALUES ('user-1', 'GM', 'gm@example.com', 1, ?1, ?1)`
		)
		.bind(now)
		.run();
	await database
		.prepare(
			`INSERT INTO products (id, slug, name, summary, status, created_at, updated_at)
			 VALUES ('core', 'morelord-core', 'Morelord Core', 'Core', 'active', ?1, ?1)`
		)
		.bind(now)
		.run();
});

afterAll(async () => {
	await worker?.dispose();
});

describe('installation validation timestamp', () => {
	it('records lastValidatedAt on the first Core token check-in', async () => {
		const started = await createActivationRequest(database, {
			productSlug: 'morelord-core',
			worldName: 'West Marches',
			foundryVersion: '13.346',
			moduleVersion: '1.2.3'
		});
		await approveActivation(database, 'user-1', started.userCode);
		const approved = await listUserInstallations(database, 'user-1');
		expect(approved).toHaveLength(1);
		expect(approved[0]?.lastValidatedAt).toBeNull();

		const polled = await pollActivation(database, started.activationId, started.deviceSecret);
		expect(polled.status).toBe('approved');
		if (polled.status !== 'approved') return;

		const entitlement = await validateInstallationToken(database, polled.token, 'morelord-core', {
			foundryVersion: '13.346',
			coreVersion: '1.2.3'
		});
		expect(entitlement?.validatedAt).toBeInstanceOf(Date);
		expect(entitlement?.expiresAt.getTime()).toBe(
			entitlement!.validatedAt.getTime() + 7 * 24 * 60 * 60 * 1000
		);

		const raw = await database
			.prepare(
				'SELECT last_validated_at AS lastValidatedAt FROM foundry_installations WHERE id = ?1'
			)
			.bind(polled.installationId)
			.first<{ lastValidatedAt: number | null }>();
		expect(raw?.lastValidatedAt).toBeTypeOf('number');

		const listed = await listUserInstallations(database, 'user-1');
		expect(listed[0]?.lastValidatedAt).toBeInstanceOf(Date);
		expect(listed[0]?.lastValidatedAt?.getTime()).toBe(entitlement?.validatedAt.getTime());

		const response = await listAccountInstallations({
			locals: { user: { id: 'user-1' } },
			platform: { env: { DB: database } }
		} as unknown as Parameters<typeof listAccountInstallations>[0]);
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		const body = (await response.json()) as Array<{ lastValidatedAt: string | null }>;
		expect(new Date(body[0]?.lastValidatedAt ?? '').getTime()).toBe(
			entitlement?.validatedAt.getTime()
		);

		const unsigned = await listAccountInstallations({
			locals: {},
			platform: { env: { DB: database } }
		} as unknown as Parameters<typeof listAccountInstallations>[0]);
		expect(unsigned.status).toBe(401);
		const unavailable = await listAccountInstallations({
			locals: { user: { id: 'user-1' } },
			platform: {}
		} as unknown as Parameters<typeof listAccountInstallations>[0]);
		expect(unavailable.status).toBe(503);
	});
});
