CREATE TABLE IF NOT EXISTS stripe_customers (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  plan TEXT,
  price_id TEXT,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON subscriptions(stripe_customer_id);

CREATE TABLE IF NOT EXISTS active_entitlements (
  id TEXT PRIMARY KEY NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  lookup_key TEXT NOT NULL,
  stripe_feature_id TEXT,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS active_entitlements_customer_key_unique
  ON active_entitlements(stripe_customer_id, lookup_key);
