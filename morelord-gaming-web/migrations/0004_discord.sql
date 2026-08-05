CREATE TABLE IF NOT EXISTS discord_connections (
  user_id TEXT PRIMARY KEY NOT NULL,
  discord_user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  global_name TEXT,
  avatar TEXT,
  role_sync_status TEXT NOT NULL DEFAULT 'pending',
  role_sync_message TEXT,
  last_synced_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
);
