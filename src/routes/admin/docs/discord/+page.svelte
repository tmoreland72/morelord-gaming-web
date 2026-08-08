<svelte:head><title>Discord Integration | Morelord Gaming Admin Docs</title><meta name="robots" content="noindex,nofollow" /></svelte:head>
<section class="page-hero compact-hero"><div class="shell"><div class="eyebrow">Admin docs</div><h1>Discord integration</h1><p class="lead">Configure account linking and automatic Morelord Tools membership roles.</p></div></section>
<section class="section brand-panel-section"><div class="shell prose-card card">
<h2>1. Create the Discord application</h2>
<p>In the Discord Developer Portal, create or use the Morelord Gaming application. Record the Application ID and create a client secret. On the OAuth2 page add <code>https://morelordgaming.com/api/discord/callback</code> as an exact redirect URI.</p>
<h2>2. Create the bot</h2>
<p>Add a bot to the application and copy its bot token. Store the Application ID, client secret and bot token in the GitHub production environment as <code>DISCORD_CLIENT_ID</code>, <code>DISCORD_CLIENT_SECRET</code> and <code>DISCORD_BOT_TOKEN</code>.</p>
<h2>3. Install and position the bot</h2>
<p>Use Admin → Discord → Install bot in Discord. The bot needs Manage Roles. In Server Settings → Roles, move the bot role above <strong>Morelord Tools</strong>, <strong>Tools Premium</strong> and <strong>Tools Champion</strong>, but leave it below administrator and staff roles.</p>
<h2>4. Configure the server</h2>
<p>Open Admin → Discord. Enter the server Guild ID and save. After the page can read the server roles, select the Morelord Tools, Tools Premium and Tools Champion roles from the dropdowns. Add the permanent Discord invite URL. The tools-announcements channel ID can also be stored for future automated release announcements.</p>
<h2>5. Role policy</h2>
<p>Standard linked accounts receive Morelord Tools. Premium receives Morelord Tools plus Tools Premium. Champion receives all three. The integration never changes campaign, GM, moderator or other manually managed roles.</p>
<h2>6. Synchronization</h2>
<p>A role sync runs immediately after Discord linking and after Stripe subscription updates. Users can manually synchronize from Account. Administrators can synchronize one member or all linked members from Admin → Discord.</p>
<h2>7. Disconnecting</h2>
<p>Disconnecting Discord removes the three website-managed roles before deleting the website connection. Other Discord roles are left unchanged.</p>
</div></section>
