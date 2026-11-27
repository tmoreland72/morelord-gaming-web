<svelte:head><title>Discord Integration | Morelord Gaming Admin Docs</title><meta name="robots" content="noindex,nofollow" /></svelte:head>
<section class="page-hero compact-hero"><div class="shell"><div class="eyebrow">Admin docs</div><h1>Discord integration</h1><p class="lead">Configure account linking and automatic Morelord Tools, Morelord Adventures, and subscriber role sync.</p></div></section>
<section class="section brand-panel-section"><div class="shell prose-card card">
<h2>1. Create the Discord application</h2>
<p>In the Discord Developer Portal, create or use the Morelord Gaming application. Record the Application ID and create a client secret. On the OAuth2 page add <code>https://morelordgaming.com/api/discord/callback</code> as an exact redirect URI.</p>
<h2>2. Create the bot</h2>
<p>Add a bot to the application and copy its bot token. Store the Application ID, client secret and bot token in the GitHub production environment as <code>DISCORD_CLIENT_ID</code>, <code>DISCORD_CLIENT_SECRET</code>, and <code>DISCORD_BOT_TOKEN</code>. <code>CRON_SECRET</code> is optional and only protects manual HTTP triggers of the catch-up endpoint.</p>
<h2>3. Install and position the bot</h2>
<p>Use Admin → Discord → Install bot in Discord. The bot needs Manage Roles. In Server Settings → Roles, move the bot role above <strong>Morelord Tools</strong>, <strong>Morelord Adventures</strong>, <strong>Tools Premium</strong>, and <strong>Tools Champion</strong>, but leave it below administrator and staff roles.</p>
<h2>4. Configure the server</h2>
<p>Open Admin → Discord. Enter the server Guild ID and save. After the page can read the server roles, select Morelord Tools, Morelord Adventures, Tools Premium, and Tools Champion from the dropdowns. Add the permanent Discord invite URL. The tools-announcements channel ID can also be stored for future automated release announcements.</p>
<h2>5. Role policy</h2>
<p>Every linked account receives Morelord Tools and Morelord Adventures. Premium adds Tools Premium. Champion adds Tools Champion. The integration never changes campaign, GM, moderator, or other manually managed roles.</p>
<h2>6. Synchronization</h2>
<p>Discord sign-in automatically creates or refreshes <code>discord_connections</code> and runs a sync. A sync also runs after optional manual linking, after Stripe subscription updates, on rate-limited Account page retries for <code>not_in_server</code>, on a 15-minute Cloudflare cron, and from Admin → Discord (Backfill Discord sign-ins / Synchronize all).</p>
<h2>Discord sign-in</h2>
<p>The same client ID and secret support website sign-in. Also register <code>https://morelordgaming.com/api/auth/callback/discord</code> and <code>http://localhost:5173/api/auth/callback/discord</code>. Sign-in requires a verified email. The existing <code>/api/discord/callback</code> remains an optional consent-based role-linking callback for users who signed in with Google.</p>
<h2>7. Disconnecting</h2>
<p>Disconnecting Discord removes the site-managed roles before deleting the website connection. Other Discord roles are left unchanged.</p>
</div></section>