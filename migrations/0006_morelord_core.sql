INSERT OR IGNORE INTO products (id, slug, name, summary, status, github_repository, created_at, updated_at) VALUES
('product-core', 'morelord-core', 'Morelord Core', 'Shared account connection and entitlement services for Morelord Tools modules.', 'active', 'morelord-gaming/morelord-core', unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO features (id, key, name, description, created_at, updated_at) VALUES
('feature-core-linking', 'core.account-linking', 'Morelord account connection', 'Connect Foundry to a Morelord Gaming account and retrieve product entitlements.', unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO product_features (product_id, feature_id, tier) VALUES
('product-core', 'feature-core-linking', 'standard');
