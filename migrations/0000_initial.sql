CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  github_repository TEXT,
  manifest_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS product_features (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'standard',
  PRIMARY KEY (product_id, feature_id)
);
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  stripe_product_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tier_features (
  tier_id TEXT NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  PRIMARY KEY (tier_id, feature_id)
);
CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  published_at INTEGER NOT NULL,
  github_release_url TEXT,
  download_url TEXT,
  manifest_url TEXT,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS releases_product_version_unique ON releases(product_id, version);
CREATE TABLE IF NOT EXISTS release_changes (
  id TEXT PRIMARY KEY NOT NULL,
  release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'standard',
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processed_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);
