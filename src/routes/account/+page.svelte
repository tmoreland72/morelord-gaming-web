<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();

	const membership = $derived(
		data.billing?.subscription?.plan?.startsWith('champion')
			? 'Tools Champion'
			: data.billing?.subscription?.plan?.startsWith('premium')
				? 'Tools Premium'
				: 'Standard'
	);

	const discordAvatar = $derived(
		data.discord
			? discordAvatarUrl(data.discord.discordUserId, data.discord.avatar)
			: null
	);

	function getActivationCode(value: unknown): string {
		if (typeof value !== 'object' || value === null || !('activationCode' in value)) return '';
		const activationCode = (value as { activationCode?: unknown }).activationCode;
		return typeof activationCode === 'string' ? activationCode : '';
	}

	function discordNotice(result: string | null): string | null {
		switch (result) {
			case 'connected': return 'Discord connected and role synchronization attempted.';
			case 'cancelled': return 'Discord connection was cancelled.';
			case 'invalid-state': return 'Discord connection expired or could not be verified. Please try again.';
			case 'not-configured': return 'Discord OAuth is not configured yet.';
			case 'database-unavailable': return 'The database was unavailable while connecting Discord.';
			case 'failed': return 'Discord could not be connected. Please try again.';
			default: return null;
		}
	}

	function getFormString(value: unknown, key: string): string {
		if (typeof value !== 'object' || value === null || !(key in value)) return '';
		const result = (value as Record<string, unknown>)[key];
		return typeof result === 'string' ? result : '';
	}

	function discordAvatarUrl(discordUserId: string, avatar: string | null): string | null {
		return avatar ? `https://cdn.discordapp.com/avatars/${discordUserId}/${avatar}.png?size=128` : null;
	}
</script>

<svelte:head>
	<title>Morelord Account</title>
</svelte:head>

{#if data.user}
	<section class="page-hero account-hero compact-hero">
		<div class="shell">
			<div class="eyebrow">Morelord account</div>
			<h1>Welcome, {data.user.name}.</h1>
			<p class="lead">Manage your membership, Foundry installations and connected community services.</p>
		</div>
	</section>

	<section class="section brand-panel-section">
		<div class="shell account-dashboard">
			{#if data.checkoutSuccess}
				<div class="success-banner"><strong>Thank you!</strong> Stripe is confirming your membership. Your account will update when the subscription webhook arrives.</div>
			{/if}
			{#if form?.activationSuccess}
				<div class="success-banner"><strong>Foundry connected.</strong> Return to Foundry; the module will finish activation automatically.</div>
			{/if}
			{#if form?.revokeSuccess}
				<div class="success-banner"><strong>Installation revoked.</strong> Its saved access token can no longer retrieve premium entitlements.</div>
			{/if}
			{#if form?.discordSyncSuccess}
				<div class="success-banner"><strong>Discord synchronized.</strong> {getFormString(form, 'discordMessage')}</div>
			{/if}
			{#if form?.discordDisconnectSuccess}
				<div class="success-banner"><strong>Discord disconnected.</strong> Your website account is no longer linked to Discord.</div>
			{/if}
			{#if form?.discordError}
				<div class="error-banner"><strong>Discord error.</strong> {getFormString(form, 'discordError')}</div>
			{/if}
			{#if discordNotice(data.discordResult)}
				<div class={data.discordResult === 'connected' ? 'success-banner' : 'error-banner'}>{discordNotice(data.discordResult)}</div>
			{/if}

			<article class="card account-summary">
				<div class="user-row">
					{#if data.user.image}<img class="user-avatar" src={data.user.image} alt="" />{/if}
					<div><span class="tag">Signed in</span><h2>{data.user.name}</h2><p>{data.user.email}</p></div>
				</div>
				<div class="compact-actions">{#if data.isAdmin}<a class="button secondary" href="/admin">Administration</a>{/if}<form method="post" action="?/signOut" use:enhance><button class="button secondary" type="submit">Sign out</button></form></div>
			</article>

			<div class="grid-3 dashboard-grid">
				<article class="card">
					<span class="tag">Membership</span><h3>{membership}</h3>
					{#if data.billing?.subscription}
						<p>Status: <strong>{data.billing.subscription.status}</strong></p>
						{#if data.billing.subscription.currentPeriodEnd}<p>Current period ends {new Date(data.billing.subscription.currentPeriodEnd).toLocaleDateString()}.</p>{/if}
						<form method="POST" action="/api/billing/portal"><button class="button secondary" type="submit">Manage billing</button></form>
					{:else}
						<p>Use every standard module feature for free, or unlock premium functionality across supported tools.</p>
						<a class="button secondary" href="/pricing">View memberships</a>
					{/if}
				</article>

				<article class="card">
					<span class="tag">Premium access</span><h3>{data.billing?.entitlements.length ?? 0} entitlements</h3>
					{#if data.billing?.entitlements.length}<ul class="feature-list">{#each data.billing.entitlements as entitlement}<li>{entitlement.lookupKey}</li>{/each}</ul>{:else}<p>Premium feature permissions will appear here after a paid membership is active.</p>{/if}
				</article>

				<article class="card">
					<span class="tag">Connected services</span><h3>Discord</h3>
					{#if data.discord}<p>Connected as <strong>{data.discord.globalName ?? data.discord.username}</strong>.</p><p>{data.discord.roleSyncMessage}</p>{:else}<p>Connect Discord to receive community and subscriber roles automatically.</p>{/if}
				</article>
			</div>

			<section class="account-section">
				<div class="section-heading">
					<div><div class="eyebrow">Community access</div><h2>Discord connection</h2></div>
					<p>Linking Discord allows the website to synchronize Community, Tools Premium and Tools Champion roles without affecting your campaign-specific roles.</p>
				</div>

				{#if data.discord}
					<article class="card account-summary discord-summary">
						<div class="user-row">
							{#if discordAvatar}<img class="user-avatar" src={discordAvatar} alt="" />{/if}
							<div>
								<span class="tag">Discord connected</span>
								<h3>{data.discord.globalName ?? data.discord.username}</h3>
								<p>@{data.discord.username} · {data.discord.roleSyncStatus}</p>
								{#if data.discord.lastSyncedAt}<small>Last synchronized {new Date(data.discord.lastSyncedAt).toLocaleString()}</small>{/if}
							</div>
						</div>
						<div class="actions compact-actions">
							<form method="POST" action="?/syncDiscord" use:enhance><button class="button secondary" type="submit">Synchronize roles</button></form>
							<form method="POST" action="?/disconnectDiscord" use:enhance><button class="button secondary danger-button" type="submit">Disconnect</button></form>
						</div>
					</article>
				{:else}
					<article class="card activation-card">
						<h3>Connect your Discord account</h3>
						<p>The website requests only your basic Discord identity. A Morelord bot handles role updates inside the server.</p>
						{#if data.discordOAuthConfigured}<a class="button" href="/api/discord/connect">Connect Discord</a>{:else}<button class="button" type="button" disabled>Discord setup pending</button><small>Add the Discord application credentials before enabling account linking.</small>{/if}
					</article>
				{/if}
			</section>

			<section class="account-section">
				<div class="section-heading"><div><div class="eyebrow">Foundry VTT</div><h2>Connect an installation</h2></div><p>Start activation inside a supported Morelord module, then enter the temporary code here. You never enter your Morelord password inside Foundry.</p></div>
				<div class="activation-grid">
					<form class="card activation-card" method="POST" action="?/approveActivation" use:enhance>
						<label for="activation-code">Activation code</label>
						<input id="activation-code" name="code" autocomplete="one-time-code" inputmode="text" maxlength="9" placeholder="ABCD-2345" value={getActivationCode(form)} />
						{#if form?.activationError}<p class="form-error">{form.activationError}</p>{/if}
						<button class="button" type="submit">Connect Foundry</button>
						<small>Codes expire after 15 minutes and can be used only once.</small>
					</form>
					<article class="card activation-help"><span class="tag">How it works</span><ol><li>Open a supported Morelord module in Foundry as a GM.</li><li>Select <strong>Connect Morelord Account</strong>.</li><li>Enter the displayed code here.</li><li>Return to Foundry; premium access refreshes automatically.</li></ol></article>
				</div>
			</section>

			<section class="account-section">
				<div class="section-heading"><div><div class="eyebrow">Authorized devices</div><h2>Foundry installations</h2></div><p>Revoke an installation you no longer recognize or use. Revocation does not delete any world or module data.</p></div>
				{#if data.installations.length}
					<div class="installation-list">{#each data.installations as installation}<article class="card installation-row"><div><span class="tag">{installation.productName}</span><h3>{installation.label}</h3><p>{installation.worldName ? `World: ${installation.worldName}` : 'No world name supplied'}{installation.foundryVersion ? ` · Foundry ${installation.foundryVersion}` : ''}{installation.moduleVersion ? ` · Module ${installation.moduleVersion}` : ''}</p><small>Connected {new Date(installation.createdAt).toLocaleDateString()}{installation.lastValidatedAt ? ` · Last checked ${new Date(installation.lastValidatedAt).toLocaleString()}` : ' · Not yet validated'}</small></div><form method="POST" action="?/revokeInstallation" use:enhance><input type="hidden" name="installationId" value={installation.id} /><button class="button secondary danger-button" type="submit">Revoke</button></form></article>{/each}</div>
				{:else}<article class="card empty-state"><h3>No Foundry installations connected</h3><p>Your connected worlds and hosted servers will appear here after you activate a Morelord module.</p></article>{/if}
			</section>
		</div>
	</section>
{:else}
	<section class="page-hero account-hero"><div class="shell account-layout"><div><div class="eyebrow">Morelord account</div><h1>Manage tools, subscriptions and connected services.</h1><p class="lead">One account connects your Tools membership, Foundry installations, Discord benefits and billing.</p><div class="actions"><a class="button" href="/login">Sign in or create an account</a></div></div><div class="account-panel"><img src="/branding/morelord-mascot.png" alt="Morelord Gaming mascot" /><h3>Your account will include</h3><ul class="feature-list"><li>Google and GitHub sign-in</li><li>Stripe subscription management</li><li>Discord account linking</li><li>Foundry installation activation</li></ul></div></div></section>
{/if}
