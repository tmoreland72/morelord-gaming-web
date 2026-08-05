<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Sign in | Morelord Gaming</title></svelte:head>
<section class="page-hero">
	<div class="shell">
		<div class="eyebrow">Morelord account</div>
		<h1>Sign in</h1>
		<p class="lead">Use Google or GitHub. Discord will be connected separately for role synchronization.</p>
		{#if form?.message}<p>{form.message}</p>{/if}
		<div class="actions">
			<form method="post" action="?/signInSocial" use:enhance>
				<input type="hidden" name="provider" value="google" />
				<input type="hidden" name="callbackURL" value="/demo/better-auth" />
				<button class="button" type="submit">Continue with Google</button>
			</form>
			<form method="post" action="?/signInSocial" use:enhance>
				<input type="hidden" name="provider" value="github" />
				<input type="hidden" name="callbackURL" value="/demo/better-auth" />
				<button class="button secondary" type="submit">Continue with GitHub</button>
			</form>
		</div>
	</div>
</section>
