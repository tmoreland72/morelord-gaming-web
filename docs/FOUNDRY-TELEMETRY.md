# Foundry usage, errors and downloads

Unreleased implementation. Apply migrations 0020 and 0021 before deploying. POST /api/foundry/telemetry requires a dedicated reporting bearer token and accepts schemaVersion 1 with its matching world UUID and at most 25 events. POST /api/foundry/telemetry/register issues a random world UUID and 256-bit reporting token without an account. Only the token hash is stored on the website. Admins can revoke credentials in the report; clients do not automatically re-enroll after rejection. No Morelord account, installation token, cookies or account association is used. Core requires a new explicit reporting choice; historical version-sharing consent does not enable feature/error reporting.

The admin-only /admin/telemetry report shows a selected UTC day, distinct reporting worlds, available modules, feature events and grouped errors. Every server load and action independently verifies administrator access. Events use UUIDs with INSERT OR IGNORE so retries cannot double-count. Batches are bounded to 48 KiB, dates to the past seven days plus five minutes of clock skew, and requests are rate-limited using a daily address hash and reporting-world ID. Raw addresses are not stored in the telemetry tables. Infrastructure request logs are separate.

Code frames contain only Morelord package-relative JavaScript paths and positions. Error messages, arguments and custom document content are omitted. Breadcrumbs contain only event codes and require usage consent as well as error consent. Reports contain module, Foundry and system versions and GM/player role. This is pseudonymous reporting, not anonymous install measurement. Random world IDs survive reloads; copying a whole world also copies its reporting ID. Reset that setting on a cloned world when independent reporting is wanted.

Raw telemetry has a 90-day retention target, with opportunistic cleanup during ingestion; no traffic means cleanup waits until ingestion resumes. No long-term aggregates exist yet. Queues are bounded and memory-only, so closing a client or extended outages may lose events. Counts are observations, not billing or authoritative totals. Returned calls may be no-ops; do not describe them as completed workflows. Core-disabled Character Export installations cannot report through Core. Morelord Compendium is private-game content and is excluded from ingestion, reports and GitHub download tracking.

GitHub downloads are separate. Refresh snapshots from the admin report; each release ZIP asset has a cumulative count. Snapshots retain the latest observation per UTC day and show a change from the previous observed day, with both timestamps. First observations are baselines. No historical daily backfill is inferred. Deleted assets keep their last recorded count. Refresh is currently manual: schedule ingestion only after deployment credentials and operating cadence are selected.

Verification: run npm run check, the telemetry Vitest tests, and a local D1 migration/ingestion/report exercise before deployment. Deploy the migration and endpoint before releasing reporting clients. No compatibility metadata is changed by this work.

## Local development and endpoint protections

Run npm run db:migrate:local and npm run dev, then visit /admin/telemetry and sign in with a local administrator account. The local database is separate from production; this dashboard does not automatically mirror production reports. A development Foundry world can target http://localhost:5173 through Core's server URL and explicitly opt in with Developer Mode off. Reporting credentials are bound to the target website origin. GitHub refresh retrieves real public release-asset counts even on the local website.

Enrollment allows 3 requests per hour and 10 per day per hashed address. Ingestion allows 30 per minute and 2,000 per day per hashed address, plus 30 per minute and 1,000 per day per reporting world. Limits use atomic database writes and fail closed on storage failures. Daily address hashes are rate-limit identifiers, not anonymization against determined lookup. Credentials cannot prove module authenticity: public clients and their credentials can be copied. Client-side embedded shared secrets and CORS are not authentication. Edge WAF/bot controls and an automatic GitHub refresh schedule are not configured by this change.


## Pre-deployment verification — 2026-09-20

- Svelte/TypeScript check: zero errors; one existing account-page autofocus warning.
- Telemetry tests: 11 passed across server and browser suites.
- Production Cloudflare build: passed; existing documentation deprecation and account-page accessibility warnings remain.
- Fresh isolated local D1: all migrations through 0021 applied successfully. Real registration and ingestion handlers, duplicate retry suppression, administrator report queries, anonymous-access rejection, and credential revocation passed against that database. Administrator identity was supplied by the test harness; interactive sign-in was not exercised.
- Production deployment and a live Foundry client reporting check remain required before releasing reporting clients.
