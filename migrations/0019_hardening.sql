-- Additive columns and tables. Checking out main afterwards remains safe:
-- extra columns and unused tables are ignored by the previous application code.

ALTER TABLE characters ADD COLUMN summary_json TEXT;
ALTER TABLE characters ADD COLUMN imported_at TEXT;
ALTER TABLE characters ADD COLUMN uses_token_image INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rate_limit_events (
	key TEXT NOT NULL,
	created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limit_events_key_created_idx
	ON rate_limit_events(key, created_at);
