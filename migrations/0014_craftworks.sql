-- Merge the retired standalone Harvesting catalog entry into Craftworks.
-- Production may already contain Craftworks, while a fresh database contains only
-- product-harvesting. Every statement supports both starting states.

UPDATE products
SET slug = 'morelord-craftworks'
WHERE id = 'product-harvesting'
  AND NOT EXISTS (SELECT 1 FROM products WHERE slug = 'morelord-craftworks');

INSERT OR IGNORE INTO products (
  id, slug, name, summary, status, github_repository, manifest_url, created_at, updated_at
) VALUES (
  'product-craftworks',
  'morelord-craftworks',
  'Morelord Craftworks',
  'Gather, harvest, loot, manage materials and recipes, and run crafting workflows with tiered content packs.',
  'active',
  'tmoreland72/morelord-craftworks',
  'https://raw.githubusercontent.com/tmoreland72/morelord-craftworks/main/module.json',
  unixepoch() * 1000,
  unixepoch() * 1000
);

UPDATE products
SET name = 'Morelord Craftworks',
    summary = 'Gather, harvest, loot, manage materials and recipes, and run crafting workflows with tiered content packs.',
    status = 'active',
    github_repository = 'tmoreland72/morelord-craftworks',
    manifest_url = 'https://raw.githubusercontent.com/tmoreland72/morelord-craftworks/main/module.json',
    updated_at = unixepoch() * 1000
WHERE slug = 'morelord-craftworks';

-- Move old product references only when Craftworks is already a separate row.
UPDATE foundry_installations
SET product_id = (SELECT id FROM products WHERE slug = 'morelord-craftworks')
WHERE product_id = 'product-harvesting'
  AND 'product-harvesting' <> (SELECT id FROM products WHERE slug = 'morelord-craftworks');

UPDATE foundry_activation_requests
SET product_id = (SELECT id FROM products WHERE slug = 'morelord-craftworks')
WHERE product_id = 'product-harvesting'
  AND 'product-harvesting' <> (SELECT id FROM products WHERE slug = 'morelord-craftworks');

INSERT OR IGNORE INTO foundry_product_activity (
  installation_id, product_id, first_seen_at, last_seen_at
)
SELECT
  installation_id,
  (SELECT id FROM products WHERE slug = 'morelord-craftworks'),
  first_seen_at,
  last_seen_at
FROM foundry_product_activity
WHERE product_id = 'product-harvesting'
  AND 'product-harvesting' <> (SELECT id FROM products WHERE slug = 'morelord-craftworks');

DELETE FROM foundry_product_activity
WHERE product_id = 'product-harvesting'
  AND 'product-harvesting' <> (SELECT id FROM products WHERE slug = 'morelord-craftworks');

-- Remove only the retired standalone release. Craftworks release history published
-- through the release API remains attached to the existing Craftworks product.
DELETE FROM release_changes WHERE release_id = 'release-harvesting-020';
DELETE FROM releases WHERE id = 'release-harvesting-020';

DELETE FROM product_features
WHERE product_id = 'product-harvesting'
   OR product_id = (SELECT id FROM products WHERE slug = 'morelord-craftworks');

DELETE FROM tier_features WHERE feature_id IN ('feature-harvest-basic', 'feature-harvest-advanced');
DELETE FROM features WHERE id IN ('feature-harvest-basic', 'feature-harvest-advanced');

INSERT INTO features (id, key, name, description, created_at, updated_at) VALUES
('feature-craftworks-standard', 'craftworks.standard', 'Craftworks workflows', 'Gather, harvest, generate loot, and browse shared materials and recipes.', unixepoch() * 1000, unixepoch() * 1000),
('feature-craftworks-srd51', 'craftworks.content-srd51', 'SRD 5.1 content pack', 'Materials and recipes whose finished items resolve to the D&D5e SRD 5.1 compendiums.', unixepoch() * 1000, unixepoch() * 1000),
('feature-craftworks-srd52', 'craftworks.content-srd52', 'SRD 5.2 content pack', 'Materials and recipes whose finished items resolve to the D&D5e SRD 5.2 compendium.', unixepoch() * 1000, unixepoch() * 1000),
('feature-craftworks-crafting', 'craftworks.advanced-crafting', 'Complete crafting workflow', 'Consume recipe materials, make native D&D5e checks, track progress, and award completed items.', unixepoch() * 1000, unixepoch() * 1000),
('feature-craftworks-phb', 'craftworks.content-phb', 'Player''s Handbook content pack', 'Craftworks recipes backed by an installed D&D5e Player''s Handbook compendium.', unixepoch() * 1000, unixepoch() * 1000),
('feature-craftworks-dmg', 'craftworks.content-dmg', 'Dungeon Master''s Guide content pack', 'Craftworks recipes backed by an installed D&D5e Dungeon Master''s Guide compendium.', unixepoch() * 1000, unixepoch() * 1000),
('feature-craftworks-drakkenheim', 'craftworks.content-mod', 'Monsters of Drakkenheim content pack', 'Specialized Drakkenheim materials, harvesting data, recipes, and acquisition logic.', unixepoch() * 1000, unixepoch() * 1000)
ON CONFLICT(key) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  updated_at = excluded.updated_at;

INSERT INTO product_features (product_id, feature_id, tier)
SELECT (SELECT id FROM products WHERE slug = 'morelord-craftworks'), id, 'standard'
FROM features WHERE key IN ('craftworks.standard', 'craftworks.content-srd51', 'craftworks.content-srd52');

INSERT INTO product_features (product_id, feature_id, tier)
SELECT (SELECT id FROM products WHERE slug = 'morelord-craftworks'), id, 'premium'
FROM features WHERE key IN ('craftworks.advanced-crafting', 'craftworks.content-phb', 'craftworks.content-dmg');

INSERT INTO product_features (product_id, feature_id, tier)
SELECT (SELECT id FROM products WHERE slug = 'morelord-craftworks'), id, 'champion'
FROM features WHERE key = 'craftworks.content-mod';

DELETE FROM products
WHERE id = 'product-harvesting'
  AND 'product-harvesting' <> (SELECT id FROM products WHERE slug = 'morelord-craftworks');
