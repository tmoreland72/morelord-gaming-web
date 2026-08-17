CREATE TABLE IF NOT EXISTS release_announcements (
  release_id TEXT PRIMARY KEY NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_message_id TEXT NOT NULL,
  announced_at INTEGER NOT NULL
);
