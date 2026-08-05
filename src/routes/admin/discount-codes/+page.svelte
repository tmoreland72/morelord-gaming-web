<script lang="ts">
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();

	function couponName(code: PageData['codes'][number]): string {
		const coupon = code.promotion?.coupon;
		return typeof coupon === 'object' && coupon?.name ? coupon.name : 'Friends & Family — Free';
	}

	function tierLabel(code: PageData['codes'][number]): string {
		const tier = code.metadata?.morelord_tier;
		if (tier === 'both') return 'Premium or Champion';
		if (tier === 'champion') return 'Champion';
		return 'Premium';
	}
</script>

<svelte:head>
	<title>Friends & Family Codes | Morelord Gaming</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord administration</div>
		<h1>Friends & Family codes</h1>
		<p class="lead">Create controlled 100%-off, forever subscription codes backed by Stripe.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell admin-dashboard">
		<div class="admin-toolbar">
			<a class="button secondary" href="/admin">System readiness</a>
			<a class="button secondary" href="/admin/billing">Billing</a>
			<a class="button secondary" href="/admin/docs/stripe">Stripe guide</a>
		</div>

		{#if form?.message}<div class="error-banner">{form.message}</div>{/if}
		{#if data.stripeError}<div class="error-banner">Stripe API: {data.stripeError}</div>{/if}

		<section class="account-section">
			<div class="section-heading">
				<div><div class="eyebrow">Create</div><h2>New free-subscription code</h2></div>
				<p>Codes default to one redemption. Redeeming one creates a normal Stripe subscription at $0.</p>
			</div>
			<form method="POST" action="?/create" class="card admin-form">
				<label><span>Code</span><input name="code" required minlength="4" placeholder="FRIEND-DAVE" autocomplete="off" /></label>
				<label><span>Internal label</span><input name="label" placeholder="Dave — Friends & Family" autocomplete="off" /></label>
				<label><span>Membership</span><select name="tier"><option value="premium">Tools Premium</option><option value="champion">Tools Champion</option><option value="both">Premium or Champion</option></select></label>
				<label><span>Maximum redemptions</span><input name="maxRedemptions" type="number" min="1" max="1000" value="1" required /></label>
				<label><span>Expires (optional)</span><input name="expiresAt" type="datetime-local" /></label>
				<div><button class="button" type="submit" disabled={!data.stripeReady}>Create code</button></div>
			</form>
		</section>

		<section class="account-section">
			<div class="section-heading"><div><div class="eyebrow">Stripe</div><h2>Existing codes</h2></div><p>Deactivation prevents future use but does not remove an already redeemed discount.</p></div>
			{#if data.codes.length}
				<div class="installation-list">
					{#each data.codes as code}
						<article class="card installation-row">
							<div>
								<span class="tag">{code.active ? 'Active' : 'Inactive'}</span>
								<h3>{code.code}</h3>
								<p>{couponName(code)} · {tierLabel(code)}</p>
								<small>{code.times_redeemed} of {code.max_redemptions ?? 'unlimited'} redeemed{code.expires_at ? ` · Expires ${new Date(code.expires_at * 1000).toLocaleString()}` : ''}</small>
							</div>
							<form method="POST" action="?/setActive">
								<input type="hidden" name="id" value={code.id} />
								<input type="hidden" name="active" value={code.active ? 'false' : 'true'} />
								<button class="button secondary" type="submit">{code.active ? 'Deactivate' : 'Reactivate'}</button>
							</form>
						</article>
					{/each}
				</div>
			{:else}
				<article class="card empty-state"><h3>No Friends & Family codes</h3><p>Create the first code above. Only codes created through this page are listed here.</p></article>
			{/if}
		</section>
	</div>
</section>
