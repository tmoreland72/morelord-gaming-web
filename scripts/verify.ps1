$ErrorActionPreference = 'Stop'

Write-Host 'Applying local D1 migrations...' -ForegroundColor Cyan
npm run db:migrate:local

Write-Host 'Running Svelte and TypeScript checks...' -ForegroundColor Cyan
npm run check

Write-Host 'Building production output...' -ForegroundColor Cyan
npm run build

Write-Host 'Running Playwright smoke tests...' -ForegroundColor Cyan
npm run test:smoke

Write-Host ''
Write-Host 'Verification completed successfully.' -ForegroundColor Green
