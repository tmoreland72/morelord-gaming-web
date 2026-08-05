$ErrorActionPreference = 'Stop'

Write-Host 'Installing dependencies...' -ForegroundColor Cyan
npm install

Write-Host 'Applying local D1 migrations...' -ForegroundColor Cyan
npm run db:migrate:local

Write-Host 'Generating Cloudflare types...' -ForegroundColor Cyan
npm run gen

Write-Host 'Checking the application...' -ForegroundColor Cyan
npm run check

Write-Host 'Building the application...' -ForegroundColor Cyan
npm run build

Write-Host ''
Write-Host 'Local setup is ready.' -ForegroundColor Green
Write-Host 'Run npm run dev to start the website.'
Write-Host 'Run npm run test:smoke to exercise the public site and local database.'
