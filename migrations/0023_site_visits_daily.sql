-- Privacy-light daily visit aggregates. Stores no IPs, user agents, cookies or user ids.
-- day is the calendar date in America/Chicago (YYYY-MM-DD); missing UTM values are ''.
CREATE TABLE site_visits_daily (
 day TEXT NOT NULL,
 path TEXT NOT NULL,
 utm_source TEXT NOT NULL DEFAULT '',
 utm_medium TEXT NOT NULL DEFAULT '',
 utm_campaign TEXT NOT NULL DEFAULT '',
 count INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day, path, utm_source, utm_medium, utm_campaign)
);
CREATE INDEX site_visits_daily_medium ON site_visits_daily(day, utm_medium);
