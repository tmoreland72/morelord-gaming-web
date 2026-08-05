INSERT OR IGNORE INTO subscription_tiers (id, slug, name, description, active, created_at, updated_at) VALUES
('tier-community', 'community', 'Standard', 'Free standard features for every supported Morelord Tools module.', 1, unixepoch() * 1000, unixepoch() * 1000),
('tier-premium', 'premium', 'Tools Premium', 'Premium module capabilities, early access and enhanced support.', 1, unixepoch() * 1000, unixepoch() * 1000),
('tier-champion', 'champion', 'Tools Champion', 'Everything in Premium plus priority support and closer involvement in development.', 1, unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO products (id, slug, name, summary, status, github_repository, created_at, updated_at) VALUES
('product-marketplace', 'morelord-marketplace', 'Morelord Marketplace', 'Player-facing buying and selling workflows, merchant controls and optional GM approval.', 'active', 'morelord-gaming/morelord-marketplace', unixepoch() * 1000, unixepoch() * 1000),
('product-character-export', 'morelord-character-export', 'Morelord Character Export', 'Export Foundry characters into polished, web-accessible presentations.', 'active', 'morelord-gaming/morelord-character-export', unixepoch() * 1000, unixepoch() * 1000),
('product-harvesting', 'morelord-drakkenheim-harvesting', 'Morelord Drakkenheim Harvesting', 'A structured harvesting workflow for campaigns using supported Drakkenheim content.', 'active', 'morelord-gaming/morelord-drakkenheim-harvesting', unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO features (id, key, name, description, created_at, updated_at) VALUES
('feature-market-basic', 'marketplace.standard', 'Marketplace transactions', 'Buy and sell items through a player-friendly merchant workflow.', unixepoch() * 1000, unixepoch() * 1000),
('feature-market-approval', 'marketplace.gm-approvals', 'GM transaction approval', 'Require individual GM approval for player purchases and sales.', unixepoch() * 1000, unixepoch() * 1000),
('feature-export-basic', 'character-export.standard', 'Character export', 'Export supported Foundry character data into a web presentation.', unixepoch() * 1000, unixepoch() * 1000),
('feature-export-advanced', 'character-export.advanced', 'Advanced presentation options', 'Additional presentation, publishing and customization controls.', unixepoch() * 1000, unixepoch() * 1000),
('feature-harvest-basic', 'harvesting.standard', 'Guided harvesting', 'Run a structured harvesting session for supported creatures.', unixepoch() * 1000, unixepoch() * 1000),
('feature-harvest-advanced', 'harvesting.advanced', 'Advanced harvesting automation', 'Expanded workflow automation and premium configuration options.', unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO product_features (product_id, feature_id, tier) VALUES
('product-marketplace', 'feature-market-basic', 'standard'),
('product-marketplace', 'feature-market-approval', 'premium'),
('product-character-export', 'feature-export-basic', 'standard'),
('product-character-export', 'feature-export-advanced', 'premium'),
('product-harvesting', 'feature-harvest-basic', 'standard'),
('product-harvesting', 'feature-harvest-advanced', 'premium');

INSERT OR IGNORE INTO releases (id, product_id, version, title, summary, published_at, created_at) VALUES
('release-marketplace-020', 'product-marketplace', '0.2.0', 'GM approval workflows', 'Added optional GM approval for purchases and sales, pending transaction cards and improved actor selection.', 1785880800000, unixepoch() * 1000);

INSERT OR IGNORE INTO release_changes (id, release_id, category, tier, description, sort_order) VALUES
('change-marketplace-020-1', 'release-marketplace-020', 'feature', 'standard', 'Player transactions now prioritize the selected token before falling back to user configuration.', 1),
('change-marketplace-020-2', 'release-marketplace-020', 'feature', 'premium', 'Added optional GM approval for player purchases and sales.', 2),
('change-marketplace-020-3', 'release-marketplace-020', 'improvement', 'standard', 'GM transactions clearly identify when approval was bypassed.', 3);
