<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	function tier(plan: string | null): string {
		if (plan?.startsWith('champion')) return 'Champion';
		if (plan?.startsWith('premium')) return 'Premium';
		return 'Standard';
	}

	function roleName(roleId: string | null): string {
		if (!roleId) return 'Not selected';
		return data.check?.roles?.find((role: { id: string; name: string }) => role.id === roleId)?.name ?? roleId;
	}
</script>

<svelte:head><title>Discord | Morelord Gaming Administration</title></svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Administration</div>
		<h1>Discord integration</h1>
		<p class="lead">Connect Morelord Gaming accounts to Discord and synchronize only the Morelord Tools membership roles.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell admin-page-stack">
		{#if form?.discordAdminSuccess}<div class="success-banner">{form.discordAdminSuccess}</div>{/if}
		{#if form?.discordAdminError}<div class="error-banner">{form.discordAdminError}</div>{/if}

		<div class="status-grid">
			<article class:ready={data.configuration.clientId && data.configuration.clientSecret} class="card status-card">
				<div class="status-line"><span class="status-dot"></span><strong>OAuth application</strong><span>{data.configuration.clientId && data.configuration.clientSecret ? 'Ready' : 'Missing'}</span></div>
				<p>DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET are stored as deployment secrets.</p>
			</article>
			<article class:ready={data.configuration.botToken} class="card status-card">
				<div class="status-line"><span class="status-dot"></span><strong>Bot token</strong><span>{data.configuration.botToken ? 'Ready' : 'Missing'}</span></div>
				<p>The bot token stays server-side and is never stored in D1 or exposed to users.</p>
			</article>
			<article class:ready={Boolean(data.check?.guildReachable)} class="card status-card">
				<div class="status-line"><span class="status-dot"></span><strong>Discord server</strong><span>{data.check?.guildReachable ? 'Ready' : 'Pending'}</span></div>
				<p>{data.check?.guildName ?? 'Save the Discord Guild ID, then verify the connection.'}</p>
			</article>
		</div>

		<article class="card admin-form-card">
			<div class="section-heading compact-heading">
				<div><div class="eyebrow">Server configuration</div><h2>Managed roles</h2></div>
				<p>The website will add or remove only these three roles. Campaign and staff roles are never modified.</p>
			</div>
			<form method="POST" action="?/save" use:enhance class="discord-config-form">
				<label><span>Discord Guild ID</span><input name="guildId" value={data.settings.guildId ?? ''} placeholder="123456789012345678" /></label>
				<label><span>Server invite URL</span><input name="inviteUrl" value={data.settings.inviteUrl ?? ''} placeholder="https://discord.gg/..." /></label>
				<label>
					<span>Morelord Tools role</span>
					{#if data.check?.roles?.length}
						<select name="roleToolsId" value={data.settings.roleToolsId ?? ''}><option value="">Select role</option>{#each data.check.roles as role}{#if !role.managed && role.name !== '@everyone'}<option value={role.id}>{role.name}</option>{/if}{/each}</select>
					{:else}<input name="roleToolsId" value={data.settings.roleToolsId ?? ''} placeholder="Role ID" />{/if}
				</label>
				<label>
					<span>Tools Premium role</span>
					{#if data.check?.roles?.length}
						<select name="rolePremiumId" value={data.settings.rolePremiumId ?? ''}><option value="">Select role</option>{#each data.check.roles as role}{#if !role.managed && role.name !== '@everyone'}<option value={role.id}>{role.name}</option>{/if}{/each}</select>
					{:else}<input name="rolePremiumId" value={data.settings.rolePremiumId ?? ''} placeholder="Role ID" />{/if}
				</label>
				<label>
					<span>Tools Champion role</span>
					{#if data.check?.roles?.length}
						<select name="roleChampionId" value={data.settings.roleChampionId ?? ''}><option value="">Select role</option>{#each data.check.roles as role}{#if !role.managed && role.name !== '@everyone'}<option value={role.id}>{role.name}</option>{/if}{/each}</select>
					{:else}<input name="roleChampionId" value={data.settings.roleChampionId ?? ''} placeholder="Role ID" />{/if}
				</label>
				<label><span>Tools announcements channel ID <small>(optional, for future release notifications)</small></span><input name="announcementsChannelId" value={data.settings.announcementsChannelId ?? ''} placeholder="Channel ID" /></label>
				<div class="actions"><button class="button" type="submit">Save Discord settings</button></div>
			</form>
		</article>

		<div class="grid-2">
			<article class="card">
				<span class="tag">OAuth callback</span><h3>Website account linking</h3>
				<p>Add this exact Redirect URI to the Discord Developer Portal:</p>
				<code class="code-line">{data.configuration.redirectUri ?? 'Configure ORIGIN first'}</code>
				<p>The website requests only the <code>identify</code> OAuth scope.</p>
			</article>
			<article class="card">
				<span class="tag">Discord bot</span><h3>Role synchronization</h3>
				<p>The bot needs <strong>Manage Roles</strong>, and its highest role must be above Morelord Tools, Tools Premium and Tools Champion.</p>
				{#if data.botInstallUrl}<a class="button secondary" href={data.botInstallUrl} target="_blank" rel="noreferrer">Install bot in Discord</a>{/if}
				<form method="POST" action="?/test" use:enhance><button class="button secondary" type="submit">Verify configuration</button></form>
			</article>
		</div>

		{#if data.check}
			<article class="card">
				<div class="section-heading compact-heading"><div><div class="eyebrow">Diagnostics</div><h2>Role hierarchy</h2></div><p>Bot: {data.check.botUsername ?? 'Unavailable'} · Highest bot role position: {data.check.botHighestRolePosition ?? '—'}</p></div>
				<div class="discord-role-grid">
					{#each data.check.managedRoles as role}
						<div class:ready={role.manageable} class="discord-role-status"><strong>{role.key === 'tools' ? 'Morelord Tools' : role.key === 'premium' ? 'Tools Premium' : 'Tools Champion'}</strong><span>{role.name ?? role.roleId ?? 'Not configured'}</span><em>{role.manageable ? 'Manageable' : 'Needs attention'}</em></div>
					{/each}
				</div>
				{#if data.check.errors.length}<ul class="diagnostic-errors">{#each data.check.errors as item}<li>{item}</li>{/each}</ul>{/if}
			</article>
		{/if}

		<article class="card">
			<div class="section-heading compact-heading">
				<div><div class="eyebrow">Linked members</div><h2>{data.connections.length} Discord connections</h2></div>
				<form method="POST" action="?/syncAll" use:enhance><button class="button secondary" type="submit" disabled={!data.connections.length}>Synchronize all</button></form>
			</div>
			{#if data.connections.length}
				<div class="table-wrap"><table><thead><tr><th>Morelord account</th><th>Discord</th><th>Membership</th><th>Sync</th><th></th></tr></thead><tbody>
					{#each data.connections as connection}<tr><td><strong>{connection.name ?? connection.email ?? connection.userId}</strong>{#if connection.email}<small>{connection.email}</small>{/if}</td><td>{connection.globalName ?? connection.username}<small>@{connection.username}</small></td><td>{tier(connection.plan)}</td><td><span class="tag">{connection.roleSyncStatus}</span>{#if connection.lastSyncedAt}<small>{new Date(connection.lastSyncedAt).toLocaleString()}</small>{/if}</td><td><form method="POST" action="?/syncOne" use:enhance><input type="hidden" name="userId" value={connection.userId} /><button class="button secondary compact-button" type="submit">Sync</button></form></td></tr>{/each}
				</tbody></table></div>
			{:else}<p>No Morelord Gaming accounts have linked Discord yet.</p>{/if}
		</article>

		<article class="card callout-card">
			<span class="tag">Role policy</span>
			<h3>Cumulative Tools roles</h3>
			<p><strong>Standard:</strong> Morelord Tools · <strong>Premium:</strong> Morelord Tools + Tools Premium · <strong>Champion:</strong> all three roles.</p>
			<p>Subscription changes synchronize automatically from Stripe. Users can also synchronize manually from their account page.</p>
		</article>
	</div>
</section>
