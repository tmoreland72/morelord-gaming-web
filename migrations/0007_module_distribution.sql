UPDATE products
SET github_repository = 'tmoreland72/morelord-core',
    manifest_url = 'https://raw.githubusercontent.com/tmoreland72/morelord-core/main/module.json',
    updated_at = unixepoch() * 1000
WHERE slug = 'morelord-core';

UPDATE products
SET github_repository = 'tmoreland72/morelord-marketplace',
    manifest_url = 'https://raw.githubusercontent.com/tmoreland72/morelord-marketplace/main/module.json',
    updated_at = unixepoch() * 1000
WHERE slug = 'morelord-marketplace';

INSERT OR IGNORE INTO releases (
  id, product_id, version, title, summary, published_at,
  github_release_url, download_url, manifest_url, created_at
) VALUES (
  'release-core-010',
  'product-core',
  '0.1.0',
  'Initial Morelord Core release',
  'Adds shared Morelord account connection, entitlement caching and membership access for supported Foundry modules.',
  unixepoch() * 1000,
  'https://github.com/tmoreland72/morelord-core/releases/tag/v0.1.0',
  'https://github.com/tmoreland72/morelord-core/releases/download/v0.1.0/morelord-core.zip',
  'https://raw.githubusercontent.com/tmoreland72/morelord-core/main/module.json',
  unixepoch() * 1000
);

INSERT OR IGNORE INTO release_changes (id, release_id, category, tier, description, sort_order) VALUES
('change-core-010-1', 'release-core-010', 'feature', 'standard', 'Connect a Foundry world to a Morelord Gaming account.', 1),
('change-core-010-2', 'release-core-010', 'feature', 'standard', 'Share membership and product entitlements with supported Morelord modules.', 2),
('change-core-010-3', 'release-core-010', 'feature', 'standard', 'Cache recently validated access for temporary offline use.', 3);
