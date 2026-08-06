UPDATE products
SET github_repository = 'tmoreland72/morelord-drakkenheim-harvesting',
    manifest_url = 'https://raw.githubusercontent.com/tmoreland72/morelord-drakkenheim-harvesting/main/module.json',
    updated_at = unixepoch() * 1000
WHERE slug = 'morelord-drakkenheim-harvesting';

UPDATE features
SET key = 'drakkenheim-harvesting.player-claims',
    name = 'Collaborative Player Harvesting',
    description = 'Let players join the harvesting session and claim components for their own characters.',
    updated_at = unixepoch() * 1000
WHERE id = 'feature-harvest-advanced';

UPDATE features
SET name = 'GM-Managed Harvesting',
    description = 'Run the complete harvesting workflow as the GM and assign claims to selected characters.',
    updated_at = unixepoch() * 1000
WHERE id = 'feature-harvest-basic';

INSERT OR IGNORE INTO releases (
  id, product_id, version, title, summary, published_at,
  github_release_url, download_url, manifest_url, created_at
) VALUES (
  'release-harvesting-020',
  'product-harvesting',
  '0.2.0',
  'Standard and Premium harvesting workflows',
  'Adds GM-managed harvesting for Standard members and collaborative player claiming for Tools Premium and Champion members.',
  unixepoch() * 1000,
  'https://github.com/tmoreland72/morelord-drakkenheim-harvesting/releases/tag/v0.2.0',
  'https://github.com/tmoreland72/morelord-drakkenheim-harvesting/releases/download/v0.2.0/morelord-drakkenheim-harvesting.zip',
  'https://raw.githubusercontent.com/tmoreland72/morelord-drakkenheim-harvesting/main/module.json',
  unixepoch() * 1000
);

INSERT OR IGNORE INTO release_changes (id, release_id, category, tier, description, sort_order) VALUES
('change-harvesting-020-1', 'release-harvesting-020', 'feature', 'standard', 'Added a complete GM-managed harvesting workflow.', 1),
('change-harvesting-020-2', 'release-harvesting-020', 'feature', 'standard', 'Added a single character selector so the GM can use existing Claim buttons to assign components.', 2),
('change-harvesting-020-3', 'release-harvesting-020', 'feature', 'premium', 'Added collaborative player claiming through Morelord Core membership access.', 3),
('change-harvesting-020-4', 'release-harvesting-020', 'improvement', 'standard', 'Fixed the session mode when harvesting begins so membership changes cannot disrupt an active session.', 4),
('change-harvesting-020-5', 'release-harvesting-020', 'improvement', 'standard', 'Added Morelord Core as an installable required dependency.', 5);
