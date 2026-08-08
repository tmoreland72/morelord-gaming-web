CREATE TABLE IF NOT EXISTS foundry_product_activity (
  installation_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (installation_id, product_id),
  FOREIGN KEY (installation_id) REFERENCES foundry_installations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS foundry_product_activity_last_seen_idx
  ON foundry_product_activity(last_seen_at);

CREATE INDEX IF NOT EXISTS foundry_product_activity_product_idx
  ON foundry_product_activity(product_id, last_seen_at);

INSERT OR IGNORE INTO foundry_product_activity (installation_id, product_id, first_seen_at, last_seen_at)
SELECT id, product_id, created_at, COALESCE(last_validated_at, created_at)
FROM foundry_installations;
