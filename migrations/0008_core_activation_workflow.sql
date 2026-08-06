INSERT OR IGNORE INTO releases (
  id, product_id, version, title, summary, published_at,
  github_release_url, download_url, manifest_url, created_at
) VALUES (
  'release-core-011',
  'product-core',
  '0.1.1',
  'Improved account connection workflow',
  'Prefills the activation code, opens the account page at the approval form and clearly guides users back to Foundry after approval.',
  unixepoch() * 1000,
  'https://github.com/tmoreland72/morelord-core/releases/tag/v0.1.1',
  'https://github.com/tmoreland72/morelord-core/releases/download/v0.1.1/morelord-core.zip',
  'https://raw.githubusercontent.com/tmoreland72/morelord-core/main/module.json',
  unixepoch() * 1000
);

INSERT OR IGNORE INTO release_changes (id, release_id, category, tier, description, sort_order) VALUES
('change-core-011-1', 'release-core-011', 'improvement', 'standard', 'Open the account page directly at the Foundry approval form with the temporary code prefilled.', 1),
('change-core-011-2', 'release-core-011', 'improvement', 'Clarify the approval steps in Foundry and on the website.', 2),
('change-core-011-3', 'release-core-011', 'improvement', 'Show a clear completion state directing the user back to Foundry.', 3);
