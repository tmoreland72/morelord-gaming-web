CREATE TABLE foundry_telemetry_credentials (
 world TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL,
 last_seen_at INTEGER, revoked_at INTEGER
);
CREATE INDEX foundry_telemetry_world ON foundry_telemetry(world,occurred_at);
