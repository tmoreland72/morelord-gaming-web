# Morelord Gaming Website

SvelteKit website for Morelord Adventures and Morelord Tools, deployed to Cloudflare Workers with a Cloudflare D1 database.

## Local development

```powershell
npm install
npm run gen
npx wrangler d1 migrations apply morelord-gaming --local
npm run dev
```

Copy `.env.example` to `.env` and provide local OAuth/authentication settings before testing sign-in.

## Validation

```powershell
npm run check
npm run build
```

## Production deployment

GitHub Actions deploys pushes to `main`. Add these repository environment secrets under the `production` environment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow validates the app, applies remote D1 migrations and deploys the Worker.

## Database migrations

```powershell
# Local
npx wrangler d1 migrations apply morelord-gaming --local

# Production (normally handled by GitHub Actions)
npx wrangler d1 migrations apply morelord-gaming --remote
```

## Initial routes

- `/` — Morelord Gaming landing page
- `/adventures` — professional game-master services
- `/tools` — Foundry VTT product catalog
- `/pricing` — membership structure
- `/releases` — product update feed foundation
- `/account` — future customer dashboard
- `/api/health` — Worker and D1 health check

## Stripe subscription setup

The project includes Stripe Checkout, Customer Portal, subscription webhook storage and Stripe Billing Entitlements synchronization without requiring a Stripe SDK package.

Configure these values locally in `.env` and as production secrets/variables in Cloudflare:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PREMIUM_MONTHLY`
- `STRIPE_PRICE_PREMIUM_ANNUAL`
- `STRIPE_PRICE_CHAMPION_MONTHLY`
- `STRIPE_PRICE_CHAMPION_ANNUAL`

Configure the Stripe webhook endpoint as:

`https://YOUR-DOMAIN/api/stripe/webhook`

Subscribe it to:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `entitlements.active_entitlement_summary.updated`

The pricing page remains safely disabled until matching price IDs are configured.

## Foundry installation activation

The website now includes the server side of a device-style Foundry account connection flow:

- `POST /api/foundry/activation/start` creates a 15-minute activation request for an active product.
- The signed-in customer enters the displayed code on `/account`.
- `POST /api/foundry/activation/poll` exchanges the approved request for a one-time installation token.
- `GET /api/foundry/entitlements` accepts that token as a Bearer credential and returns the installation's current tier and feature keys.
- Customers can view and revoke connected installations from their account dashboard.

Installation tokens are shown only once to the activating module and are stored as SHA-256 hashes. The entitlement response is intended to be cached by Morelord Core; an offline signed entitlement document can be added before public launch.

## Discord account linking and role synchronization

The account dashboard can connect a customer's Discord identity and synchronize only the roles managed by Morelord Tools. Campaign-specific roles are never changed.

Configure these values locally in `.env` and as Cloudflare secrets or variables in production:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI` — for production, `https://YOUR-DOMAIN/api/discord/callback`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_ROLE_COMMUNITY`
- `DISCORD_ROLE_PREMIUM`
- `DISCORD_ROLE_CHAMPION`
- `DISCORD_INVITE_URL`

In the Discord Developer Portal, add the exact callback URL to the application's OAuth2 redirect list. The website requests only the `identify` scope. The bot must already be in the Morelord Gaming server, have **Manage Roles**, and its highest role must be positioned above every role listed above. Customers who are not yet members are prompted to use the configured invite URL and then synchronize again.

## Administration dashboard

Set `ADMIN_EMAILS` to a comma-separated list of the exact email addresses allowed to open `/admin`:

```env
ADMIN_EMAILS=troy@example.com,another-admin@example.com
```

The private dashboard reports configuration readiness without exposing secret values, provides D1 record counts and shows the latest release and processed webhook. An authenticated user whose email is not listed receives a 403 response.

## Local verification

The project now includes a repeatable local validation workflow so changes can be tested beyond compilation.

First-time setup:

```powershell
npm run dev:setup
```

Start the normal development server:

```powershell
npm run dev
```

Run the public-site and local-D1 smoke tests:

```powershell
npx playwright install chromium
npm run test:smoke
```

Run the complete local verification sequence:

```powershell
npm run verify
```

`npm run verify` applies local migrations, runs Svelte/TypeScript checks, creates a production build, starts a local Wrangler worker, and verifies the main public pages and D1 health endpoint with Playwright. It never touches the remote production database.

## Automated product release publishing

The website accepts structured module release metadata at:

`POST /api/releases`

Requests require:

```text
Authorization: Bearer <RELEASE_PUBLISH_TOKEN>
```

The release publishing token is a shared secret between the Morelord Gaming website and every Morelord product repository that publishes release metadata.

### Release publishing authentication

The production Morelord Gaming Cloudflare Worker must have `RELEASE_PUBLISH_TOKEN` stored as a Cloudflare secret. This is the value the `/api/releases` endpoint validates against.

From the **Morelord Gaming website project**, configure or replace the production secret with:

```powershell
npx wrangler secret put RELEASE_PUBLISH_TOKEN
```

Wrangler will prompt for the value. Paste the token when prompted; do not place the token directly on the command line.

This is normally a one-time production configuration. Normal deployments should preserve the Cloudflare secret.

If release publishing begins returning:

```json
{ "ok": false, "error": "Unauthorized" }
```

verify that the Cloudflare runtime secret still matches the token used by the product repository.

Each Morelord product repository that publishes releases should also define the same value as the GitHub Actions secret:

```text
RELEASE_PUBLISH_TOKEN
```

For local release publishing, the product project's uncommitted `.env` may contain:

```env
RELEASE_PUBLISH_TOKEN=your-token-here
```

A permanent Windows user or system environment variable is not required when the product release script loads the project's `.env` file.

The token must never be committed to source control or hard-coded in `release.ps1`, `wrangler.toml`, `module.json`, workflow files, or application source.

The expected configuration is:

- **Cloudflare Worker:** `RELEASE_PUBLISH_TOKEN` — authoritative token used by the website API.
- **GitHub repository secret:** `RELEASE_PUBLISH_TOKEN` — used by automated product releases.
- **Local product `.env`:** `RELEASE_PUBLISH_TOKEN` — optional, used when publishing from a local release script.

If Cloudflare environments such as production, staging, or preview are introduced later, configure the secret separately for each environment that hosts the release API.

A reusable PowerShell client and example payload are included. The client defaults to `https://morelordgaming.com` and automatically loads `RELEASE_PUBLISH_TOKEN` from the website project's uncommitted `.env` file when present:

```powershell
./scripts/publish-release.ps1 -PayloadPath "./release-payload.json"
```

`publish-release.ps1` is **only** for publishing Morelord product/module release metadata to the website. It is not part of the Morelord Gaming website deployment workflow. Running it without `-PayloadPath` exits with a reminder instead of interactively prompting for a token or payload path.

See `/docs/release-automation` for the payload format and workflow. Publishing the same product/version again updates the existing release and replaces its change list, making the operation safe to rerun after correcting release notes or URLs.

## Authentication setup

Google and GitHub sign-in are implemented through Better Auth. Google is intended to be the primary provider; GitHub is optional.

1. Copy `.env.example` to `.env`.
2. Run `npm run auth:secret` and place the result in `BETTER_AUTH_SECRET`.
3. Create OAuth applications with these local callback URLs:
   - Google: `http://localhost:5173/api/auth/callback/google`
   - GitHub: `http://localhost:5173/api/auth/callback/github`
4. Add your sign-in email to `ADMIN_EMAILS`.
5. Run `npm run db:migrate:local` and `npm run dev`.
6. Inspect `/api/system/auth-status`, then test `/login`, `/account`, and `/admin`.

Full instructions are available at `/docs/authentication`.

## GitHub Actions production deployment

For normal website code changes, the local release/deployment sequence is:

```powershell
npm run check
npm run build
git add .
git commit -m "Describe the website changes"
git push
```

Do **not** run `scripts/publish-release.ps1` for a website deployment. That helper publishes product/module release metadata only.

The repository includes `.github/workflows/deploy.yml`. Pushes to `main` validate the app, apply remote D1 migrations, deploy the Worker and optionally verify the production health endpoints.

Create a GitHub environment named `production`, then follow `/docs/deployment` for the required Cloudflare credentials, Worker variables and OAuth callback configuration.

## Stripe subscriptions

The site supports Stripe-hosted Checkout, the Customer Portal, subscription webhooks, and Billing Entitlements. Configure the four recurring Price IDs and the webhook signing secret as GitHub production environment secrets. The deployment workflow uploads Stripe secrets only when `STRIPE_SECRET_KEY` is present, so an unconfigured Stripe integration does not block normal deployments.

Production webhook endpoint:

```text
https://morelordgaming.com/api/stripe/webhook
```

Administrator diagnostics are available at `/admin/billing`, and the setup walkthrough is available at `/docs/stripe`.

## Drakkenheim Harvesting 0.2.0

Migration `0009_harvesting_membership_workflows.sql` updates the product catalog, premium capability, manifest URL, and release history for the Standard GM-managed and Premium collaborative workflows.
