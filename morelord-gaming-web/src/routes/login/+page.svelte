<script lang="ts">
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Sign in | Morelord Gaming</title>
	<meta
		name="description"
		content="Sign in to your Morelord Gaming account with Google or GitHub."
	/>
</svelte:head>

<section class="page-hero account-hero login-hero">
	<div class="shell login-layout">
		<div>
			<div class="eyebrow">Morelord account</div>
			<h1>One account for every Morelord Tool.</h1>
			<p class="lead">
				Sign in to manage subscriptions, connect Foundry installations, synchronize Discord
				benefits and view your product access.
			</p>
		</div>

		<div class="account-panel login-panel">
			<img src="/branding/morelord-mascot.png" alt="Morelord Gaming mascot" />
			<h2>Sign in</h2>
			<p>Choose a trusted identity provider. Morelord Gaming never stores a separate password.</p>

			{#if form?.message}
				<p class="form-error" role="alert">{form.message}</p>
			{/if}

			<div class="login-actions">
				{#if data.providers.google}
					<form method="post" action="?/signInSocial">
						<input type="hidden" name="provider" value="google" />
						<input type="hidden" name="returnTo" value={data.returnTo} />
						<button class="button full-button" type="submit">Continue with Google</button>
					</form>
				{:else}
					<button class="button full-button" disabled>Google sign-in not configured</button>
				{/if}

				{#if data.providers.github}
					<form method="post" action="?/signInSocial">
						<input type="hidden" name="provider" value="github" />
						<input type="hidden" name="returnTo" value={data.returnTo} />
						<button class="button secondary full-button" type="submit">Continue with GitHub</button>
					</form>
				{:else}
					<button class="button secondary full-button" disabled>GitHub sign-in not configured</button>
				{/if}
			</div>

			<small>
				Discord is connected separately after sign-in so it can be used for subscriber role
				synchronization.
			</small>
		</div>
	</div>
</section>
