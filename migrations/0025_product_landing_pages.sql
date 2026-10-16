-- Journeys and Encounters are published products. Fresh databases need them so the
-- shared product page can render. Existing rows keep their public copy and URLs.

INSERT INTO products (
	id, slug, name, summary, status, github_repository, manifest_url, created_at, updated_at
) VALUES (
	'product-journeys',
	'morelord-journeys',
	'Morelord Journeys',
	'Plan the route, run each travel day, and camp, keep watch, and rest even when the party is not traveling.',
	'active',
	'tmoreland72/morelord-journeys',
	'https://raw.githubusercontent.com/tmoreland72/morelord-journeys/main/module.json',
	unixepoch() * 1000,
	unixepoch() * 1000
)
ON CONFLICT(slug) DO UPDATE SET
	manifest_url = COALESCE(NULLIF(products.manifest_url, ''), excluded.manifest_url),
	github_repository = COALESCE(NULLIF(products.github_repository, ''), excluded.github_repository),
	status = 'active',
	updated_at = excluded.updated_at;

INSERT INTO products (
	id, slug, name, summary, status, github_repository, manifest_url, created_at, updated_at
) VALUES (
	'product-encounters',
	'morelord-encounters',
	'Morelord Encounters',
	'Choose a difficulty, review a roster built from monsters already in the world, and drag them onto the scene.',
	'active',
	'tmoreland72/morelord-encounters',
	'https://raw.githubusercontent.com/tmoreland72/morelord-encounters/main/module.json',
	unixepoch() * 1000,
	unixepoch() * 1000
)
ON CONFLICT(slug) DO UPDATE SET
	manifest_url = COALESCE(NULLIF(products.manifest_url, ''), excluded.manifest_url),
	github_repository = COALESCE(NULLIF(products.github_repository, ''), excluded.github_repository),
	status = 'active',
	updated_at = excluded.updated_at;

UPDATE products
SET manifest_url = 'https://raw.githubusercontent.com/tmoreland72/morelord-character-export/main/module.json',
	updated_at = unixepoch() * 1000
WHERE slug = 'morelord-character-export'
	AND (manifest_url IS NULL OR manifest_url = '');

-- Local catalogs have no Journeys or Character Export release rows. Production already
-- has these versions, so the NOT EXISTS guard leaves those records untouched.
INSERT INTO releases (
	id, product_id, version, title, summary, published_at, github_release_url, created_at
)
SELECT
	'release-journeys-040',
	p.id,
	'0.4.0',
	'Morelord Journeys 0.4.0',
	'Added named Saved Journeys. Use **Save Journey** to keep a planner setup and **Choose Saved Journey** to open its manager.',
	1759752000000,
	'https://github.com/tmoreland72/morelord-journeys/releases/tag/v0.4.0',
	unixepoch() * 1000
FROM products p
WHERE p.slug = 'morelord-journeys'
	AND NOT EXISTS (
		SELECT 1 FROM releases r WHERE r.product_id = p.id AND r.version = '0.4.0'
	);

INSERT INTO releases (
	id, product_id, version, title, summary, published_at, github_release_url, created_at
)
SELECT
	'release-character-export-036',
	p.id,
	'0.3.6',
	'Morelord Character Export 0.3.6',
	'Added a manifest changelog link and moved release history into `release-notes/`. Local working files belong in ignored `/tmp/`.',
	1759665600000,
	'https://github.com/tmoreland72/morelord-character-export/releases/tag/v0.3.6',
	unixepoch() * 1000
FROM products p
WHERE p.slug = 'morelord-character-export'
	AND NOT EXISTS (
		SELECT 1 FROM releases r WHERE r.product_id = p.id AND r.version = '0.3.6'
	);

INSERT INTO release_changes (id, release_id, category, tier, description, sort_order)
SELECT
	'change-export-036-public',
	r.id,
	'improvement',
	'standard',
	'Added a manifest changelog link and moved release history into `release-notes/`.',
	1
FROM releases r
WHERE r.id = 'release-character-export-036'
	AND NOT EXISTS (SELECT 1 FROM release_changes c WHERE c.release_id = r.id);

INSERT INTO release_changes (id, release_id, category, tier, description, sort_order)
SELECT
	'change-export-036-internal',
	r.id,
	'improvement',
	'standard',
	'Release staging and generated ZIP files use module-local `/tmp/`; ZIP validation rejects working files and release-note sources.',
	2
FROM releases r
WHERE r.id = 'release-character-export-036'
	AND NOT EXISTS (
		SELECT 1 FROM release_changes c WHERE c.id = 'change-export-036-internal'
	);
