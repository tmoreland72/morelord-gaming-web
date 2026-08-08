CREATE TABLE IF NOT EXISTS discord_settings (
  id TEXT PRIMARY KEY NOT NULL,
  guild_id TEXT,
  role_tools_id TEXT,
  role_premium_id TEXT,
  role_champion_id TEXT,
  invite_url TEXT,
  announcements_channel_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO discord_settings (
  id,
  guild_id,
  role_tools_id,
  role_premium_id,
  role_champion_id,
  invite_url,
  announcements_channel_id,
  created_at,
  updated_at
) VALUES (
  'primary',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  unixepoch('now') * 1000,
  unixepoch('now') * 1000
);
