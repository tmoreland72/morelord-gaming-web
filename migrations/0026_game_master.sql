-- Game Master is free on the standard tier. Copy follows the "in-game Dungeon Master Screen" positioning.
INSERT INTO products (id, slug, name, summary, status, github_repository, manifest_url, created_at, updated_at)
VALUES ('product-game-master', 'morelord-game-master', 'Morelord Game Master',
'Morelord Game Master is your in-game Dungeon Master Screen. Send roll requests, reward the party, run macros and sound, manage triggers, and check a D&D 2024 rules cheat sheet from one GM-only window your players never see.',
'active', 'tmoreland72/morelord-game-master', 'https://raw.githubusercontent.com/tmoreland72/morelord-game-master/master/module.json', unixepoch() * 1000, unixepoch() * 1000)
ON CONFLICT(slug) DO UPDATE SET name=excluded.name, summary=excluded.summary, status=excluded.status, github_repository=excluded.github_repository, manifest_url=excluded.manifest_url, updated_at=excluded.updated_at;

INSERT INTO features (id, key, name, description, created_at, updated_at)
VALUES ('feature-game-master-screen', 'game-master.screen', 'Dungeon Master Screen',
'One GM-only window inside Foundry for roll requests, party rewards, macros, sound, triggers you can turn on or off, and a D&D 2024 rules cheat sheet. Players never see it, but they receive the roll requests you send.',
unixepoch() * 1000, unixepoch() * 1000)
ON CONFLICT(key) DO UPDATE SET name=excluded.name, description=excluded.description, updated_at=excluded.updated_at;

INSERT INTO product_features (product_id, feature_id, tier, sort_order)
SELECT p.id, f.id, 'standard', 0 FROM products p CROSS JOIN features f
WHERE p.slug='morelord-game-master' AND f.key='game-master.screen'
ON CONFLICT(product_id, feature_id) DO UPDATE SET tier=excluded.tier, sort_order=excluded.sort_order;
