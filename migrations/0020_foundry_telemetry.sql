CREATE TABLE foundry_telemetry (
 id TEXT PRIMARY KEY, world TEXT NOT NULL, occurred_at TEXT NOT NULL, received_at INTEGER NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('usage','error')), module TEXT NOT NULL, event TEXT NOT NULL,
 module_version TEXT NOT NULL, foundry_version TEXT NOT NULL, system TEXT NOT NULL, system_version TEXT NOT NULL,
 role TEXT NOT NULL, error_type TEXT, frames TEXT, recent TEXT
);
CREATE INDEX foundry_telemetry_date ON foundry_telemetry(occurred_at, module, kind);
CREATE INDEX foundry_telemetry_retention ON foundry_telemetry(received_at);
CREATE TABLE github_download_snapshots (
 module TEXT NOT NULL, asset_id INTEGER NOT NULL, day TEXT NOT NULL,
 release TEXT NOT NULL, downloads INTEGER NOT NULL, checked_at INTEGER NOT NULL,
 PRIMARY KEY(module, asset_id, day)
);
