-- Downtime is Premium-only. Copy is sourced from Core's Morelord Brand Guide.
INSERT INTO products (id, slug, name, summary, status, github_repository, manifest_url, created_at, updated_at)
VALUES ('product-downtime', 'morelord-downtime', 'Morelord Downtime',
'Morelord Downtime turns time between adventures into visible opportunities and ongoing Projects. GMs prepare and publish Sessions; players create permitted Projects and allocate time for the characters they own. Requires Tools Premium or Champion.',
'active', 'tmoreland72/morelord-downtime', 'https://raw.githubusercontent.com/tmoreland72/morelord-downtime/main/module.json', unixepoch() * 1000, unixepoch() * 1000)
ON CONFLICT(slug) DO UPDATE SET name=excluded.name, summary=excluded.summary, status=excluded.status, github_repository=excluded.github_repository, manifest_url=excluded.manifest_url, updated_at=excluded.updated_at;

INSERT INTO features (id, key, name, description, created_at, updated_at)
VALUES ('feature-downtime-projects', 'downtime.projects', 'Downtime Sessions and Projects',
'Prepare, publish, start, and finalize downtime Sessions while characters carry Project progress forward. Allocate character time, support instructors and Training, and use Marketplace wishlists to source magic-item offers after committed time and gold. Shared Core Locations provide campaign context, and an active GM validates player requests.',
unixepoch() * 1000, unixepoch() * 1000)
ON CONFLICT(key) DO UPDATE SET name=excluded.name, description=excluded.description, updated_at=excluded.updated_at;

INSERT INTO product_features (product_id, feature_id, tier, sort_order)
SELECT p.id, f.id, 'premium', 0 FROM products p CROSS JOIN features f
WHERE p.slug='morelord-downtime' AND f.key='downtime.projects'
ON CONFLICT(product_id, feature_id) DO UPDATE SET tier=excluded.tier, sort_order=excluded.sort_order;
