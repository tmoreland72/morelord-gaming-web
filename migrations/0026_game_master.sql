-- Morelord Game Master product page. Pricing tier is not decided yet, so no
-- product_features rows are added; the landing copy lives in product-landing.ts.
INSERT INTO products (
	id, slug, name, summary, status, github_repository, manifest_url, created_at, updated_at
) VALUES (
	'product-game-master',
	'morelord-game-master',
	'Morelord Game Master',
	'Your in-game Dungeon Master Screen for D&D 2024: roll requests, party rewards, macros, sound, triggers and a rules cheat sheet, all in one place your players never see.',
	'active',
	'tmoreland72/morelord-game-master',
	'https://raw.githubusercontent.com/tmoreland72/morelord-game-master/master/module.json',
	unixepoch() * 1000,
	unixepoch() * 1000
)
ON CONFLICT(slug) DO UPDATE SET
	manifest_url = COALESCE(NULLIF(products.manifest_url, ''), excluded.manifest_url),
	github_repository = COALESCE(NULLIF(products.github_repository, ''), excluded.github_repository),
	status = 'active',
	updated_at = excluded.updated_at;
