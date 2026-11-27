import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: '.',
	testMatch: '**/*.e2e.{ts,js}',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command:
			'npm run db:migrate:local && BETTER_AUTH_SECRET=playwright-test-secret-32-characters-min npm run build && BETTER_AUTH_SECRET=playwright-test-secret-32-characters-min npx wrangler dev --local --port 4173',
		url: 'http://127.0.0.1:4173/api/health',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
