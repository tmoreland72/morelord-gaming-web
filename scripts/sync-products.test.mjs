import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { buildSync, tables } from './sync-products.mjs';

test('syncs exact IDs and values in both directions while preserving dependent records', () => {
	const db = new DatabaseSync(':memory:');
	try {
		db.exec(`CREATE TABLE products (id TEXT PRIMARY KEY, slug TEXT UNIQUE, name TEXT);
   CREATE TABLE features (id TEXT PRIMARY KEY, key TEXT UNIQUE, name TEXT);
   CREATE TABLE product_features (product_id TEXT REFERENCES products(id), feature_id TEXT REFERENCES features(id), tier TEXT, PRIMARY KEY(product_id,feature_id));
   CREATE TABLE releases (id TEXT PRIMARY KEY, product_id TEXT REFERENCES products(id), version TEXT);
   CREATE TABLE release_changes (id TEXT PRIMARY KEY, release_id TEXT REFERENCES releases(id), description TEXT);
   CREATE TABLE installations (id TEXT PRIMARY KEY, product_id TEXT REFERENCES products(id));
   INSERT INTO products VALUES ('local-product','example','Old'), ('unused','unused','Unused');
   INSERT INTO features VALUES ('local-feature','feature','Old');
   INSERT INTO product_features VALUES ('local-product','local-feature','standard');
   INSERT INTO releases VALUES ('local-release','local-product','1.0');
   INSERT INTO release_changes VALUES ('local-change','local-release','Old');
   INSERT INTO installations VALUES ('world','local-product');`);
		const source = {
			products: [{ id: 'live-product', slug: 'example', name: "GM's toolkit" }],
			features: [{ id: 'live-feature', key: 'feature', name: 'Feature' }],
			product_features: [
				{ product_id: 'live-product', feature_id: 'live-feature', tier: 'premium' }
			],
			releases: [{ id: 'live-release', product_id: 'live-product', version: '1.0' }],
			release_changes: [{ id: 'live-change', release_id: 'live-release', description: 'New' }]
		};
		const read = () =>
			Object.fromEntries(
				tables.map((table) => [
					table,
					db
						.prepare(`SELECT * FROM ${table}`)
						.all()
						.map((row) => ({ ...row }))
				])
			);
		const refs = [
			{ table: 'product_features', column: 'product_id', parent: 'products' },
			{ table: 'releases', column: 'product_id', parent: 'products' },
			{ table: 'installations', column: 'product_id', parent: 'products' },
			{ table: 'product_features', column: 'feature_id', parent: 'features' },
			{ table: 'release_changes', column: 'release_id', parent: 'releases' }
		];
		db.exec('BEGIN;');
		db.exec(buildSync(source, read(), refs).sql);
		db.exec('COMMIT;');
		assert.deepEqual(read(), source);
		assert.equal(
			db.prepare('SELECT product_id FROM installations').get().product_id,
			'live-product'
		);
		assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
		source.products[0].slug = 'renamed';
		source.products[0].name = 'Locally edited';
		db.exec('BEGIN;');
		db.exec(buildSync(source, read(), refs).sql);
		db.exec('COMMIT;');
		assert.deepEqual(read(), source);
	} finally {
		db.close();
	}
});
