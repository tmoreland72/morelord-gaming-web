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
