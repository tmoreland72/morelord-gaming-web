<svelte:head>
	<title>Authentication setup | Morelord Gaming</title>
	<meta
		name="description"
		content="Configure Google and Discord OAuth for the Morelord Gaming SvelteKit website."
	/>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Website administration</div>
		<h1>Authentication setup</h1>
		<p class="lead">
			Configure Google and Discord as equally supported sign-in options.
		</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell prose-content">
		<article class="card docs-card">
			<h2>1. Prepare local environment values</h2>
			<p>Copy <code>.env.example</code> to <code>.env</code> and configure:</p>
			<pre><code>ORIGIN=http://localhost:5173
BETTER_AUTH_SECRET=&lt;at-least-32-random-characters&gt;
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
ADMIN_EMAILS=your-email@example.com</code></pre>
			<p>
				Generate a strong local secret with
				<code>npm run auth:secret</code>. Never commit <code>.env</code> or OAuth client secrets.
			</p>
		</article>

		<article class="card docs-card">
			<h2>2. Configure Google OAuth</h2>
			<ol>
				<li>Create a Google Cloud project and configure its OAuth consent screen.</li>
				<li>Create an OAuth client with application type <strong>Web application</strong>.</li>
				<li>Add the local authorized redirect URI shown below.</li>
				<li>Copy the client ID and client secret into <code>.env</code>.</li>
			</ol>
			<pre><code>http://localhost:5173/api/auth/callback/google</code></pre>
			<p>
				For production, add the same path on the final HTTPS domain, for example
				<code>https://morelordgaming.com/api/auth/callback/google</code>.
			</p>
		</article>

		<article class="card docs-card">
			<h2>3. Configure Discord OAuth</h2>
			<ol>
				<li>Create or select an application in the Discord Developer Portal.</li>
				<li>Open OAuth2 and add the sign-in redirect URLs.</li>
				<li>Add the local callback below and the production callback on your HTTPS domain.</li>
				<li>Copy the client ID and generated client secret into <code>.env</code>.</li>
			</ol>
			<pre><code>http://localhost:5173/api/auth/callback/discord</code></pre>
			<p>
				For production, add <code>https://morelordgaming.com/api/auth/callback/discord</code>.
				Keep <code>/api/discord/callback</code> registered separately for subscriber role linking.
				Sign-in requires a verified Discord email and does not require a bot token.
			</p>
		</article>

		<article class="card docs-card">
			<h2>4. Test the complete flow</h2>
			<pre><code>npm run db:migrate:local
npm run dev</code></pre>
			<ol>
				<li>Open <code>http://localhost:5173/login</code> and sign in.</li>
				<li>Confirm that you return to <code>/account</code>.</li>
				<li>Open <code>/admin</code> using an email listed in <code>ADMIN_EMAILS</code>.</li>
				<li>While signed in as an administrator, inspect <code>/api/system/auth-status</code> to confirm the provider configuration.</li>
				<li>Sign out and confirm that protected administration pages redirect or reject access.</li>
			</ol>
		</article>

		<article class="card docs-card">
			<h2>5. Production secrets</h2>
			<p>Store secret values in Cloudflare, not in <code>wrangler.jsonc</code> or GitHub:</p>
			<pre><code>npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put DISCORD_CLIENT_ID
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put ADMIN_EMAILS</code></pre>
			<p>
				Set the non-secret production origin as a Worker variable after the final domain is known.
			</p>
		</article>
	</div>
</section>
