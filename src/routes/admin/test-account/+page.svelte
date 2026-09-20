<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let resetting = $state(false);
</script>

<svelte:head>
	<title>Test account | Morelord Gaming Admin</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord administration</div>
		<h1>Test account</h1>
		<p class="lead">Repeat the signup experience with {data.email}.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell admin-dashboard">
		{#if form?.message}
			<p role="status" class:form-error={!form.success}>{form.message}</p>
		{/if}
		<article class="card">
			<h2>{data.email}</h2>
			{#if data.account}
				<p>This test account is registered as {data.account.name}.</p>
				<ul>
					<li>{data.account.sessions} saved sessions</li>
					<li>{data.account.characters} characters</li>
					<li>{data.account.installations} Foundry installations</li>
					<li>{data.account.contactMessages} signed-in contact messages</li>
				</ul>
				<h3>Reset for a fresh signup</h3>
				<p>
					Reset permanently deletes this Morelord account and the data above, including its login
					methods and Foundry activation history. Its sessions and installation tokens stop working.
				</p>
				<p>
					Your Google account and Google permissions remain in place. Google may sign you straight
					back in without repeating its consent screen.
				</p>
				{#if data.blockers.length}
					{#each data.blockers as blocker (blocker)}
						<p class="form-error">{blocker}</p>
					{/each}
				{:else}
					<form
						method="POST"
						action="?/reset"
						use:enhance={() => {
							resetting = true;
							return async ({ update }) => {
								try {
									await update();
								} finally {
									resetting = false;
								}
							};
						}}
					>
						<input type="hidden" name="userId" value={data.account.id} />
						<label for="confirmation">Type {data.email} to confirm</label>
						<input id="confirmation" name="confirmation" type="email" required autocomplete="off" />
						<button class="button secondary danger-button" type="submit" disabled={resetting}>
							{resetting ? 'Resetting…' : 'Reset test account'}
						</button>
					</form>
				{/if}
			{:else}
				<p>No Morelord account exists for this email. It is ready for a fresh signup.</p>
			{/if}
		</article>
		<article class="card">
			<h2>Run the signup test</h2>
			<p>
				Keep your administrator account open here. In a private window or separate browser profile,
				open <code>https://morelordgaming.com/login</code>, choose Google, and select {data.email}.
			</p>
			<p>
				This email receives ordinary customer access. Being designated as a test account does not
				grant administrator or paid access.
			</p>
			<p>
				Reset supports signup testing before billing is connected. Accounts with a Stripe customer
				record cannot be reset here. Disconnect any Discord role connection from Account before
				resetting.
			</p>
		</article>
	</div>
</section>
