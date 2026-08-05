<svelte:head>
	<title>Production Deployment | Morelord Gaming</title>
	<meta
		name="description"
		content="Configure GitHub Actions, Cloudflare Workers, D1 migrations and production authentication for the Morelord Gaming website."
	/>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Operations guide</div>
		<h1>Production deployment</h1>
		<p class="lead">
			The website is deployed from GitHub Actions to Cloudflare Workers. Every production
			deployment validates the application, applies D1 migrations, publishes the Worker and
			checks the public health endpoints.
		</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell prose-layout">
		<article class="card prose-card">
			<h2>1. Create the GitHub production environment</h2>
			<p>
				In the GitHub repository, open <strong>Settings → Environments</strong> and create an
				environment named <code>production</code>. The deployment workflow uses that environment
				so approval rules can be added later without changing the workflow.
			</p>

			<h2>2. Add required repository environment secrets</h2>
			<p>Add these secrets to the <code>production</code> environment:</p>
			<pre><code>CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
BETTER_AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
RELEASE_PUBLISH_TOKEN</code></pre>
			<p>
				GitHub credentials, Stripe values and Discord values may be added when those integrations
				are enabled. Never commit production secrets to <code>wrangler.jsonc</code> or an environment
				file.
			</p>

			<h2>3. Add non-secret production variables</h2>
			<p>
				Cloudflare Worker variables are configured separately from encrypted secrets. Add these
				through the Cloudflare dashboard or with Wrangler after the first deployment:
			</p>
			<pre><code>ORIGIN=https://your-domain.example
ADMIN_EMAILS=your-google-email@example.com
DISCORD_REDIRECT_URI=https://your-domain.example/api/discord/callback
DISCORD_GUILD_ID=
DISCORD_ROLE_COMMUNITY=
DISCORD_ROLE_PREMIUM=
DISCORD_ROLE_CHAMPION=
DISCORD_INVITE_URL=</code></pre>

			<h2>4. Add the production URL to GitHub</h2>
			<p>
				Under the production environment's variables, add <code>PRODUCTION_URL</code>. The workflow
				uses it to verify <code>/api/health</code> and <code>/api/system/auth-status</code> after deployment.
			</p>

			<h2>5. Register the production Google callback</h2>
			<p>Add the exact production redirect URI to the Google OAuth client:</p>
			<pre><code>https://your-domain.example/api/auth/callback/google</code></pre>
			<p>
				A separate production OAuth client is recommended so local and production credentials remain
				independent.
			</p>

			<h2>6. Deploy</h2>
			<p>
				Push to <code>main</code>, or open the repository's <strong>Actions</strong> tab and run
				<strong>Deploy Morelord Gaming Website</strong> manually. The workflow will stop before
				deployment when validation or a database migration fails.
			</p>
		</article>
	</div>
</section>
