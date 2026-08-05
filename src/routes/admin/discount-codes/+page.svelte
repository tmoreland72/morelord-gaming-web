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
		<p class="lead">Create and manage private, 100%-off subscription codes backed by Stripe.</p>
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

		<section class="account-section code-section">
			<div class="section-heading code-heading">
				<div>
					<div class="eyebrow">Create</div>
					<h2>New free-subscription code</h2>
				</div>
				<p>Each redemption creates a normal Stripe subscription at $0. Codes default to a single use.</p>
			</div>

			<form method="POST" action="?/create" class="card code-form">
				<div class="field field-code">
					<label for="code">Code</label>
					<input id="code" name="code" required minlength="4" placeholder="FRIEND-DAVE" autocomplete="off" />
					<small>The private code you give to the recipient.</small>
				</div>

				<div class="field field-label">
					<label for="label">Internal label</label>
					<input id="label" name="label" placeholder="Dave — Friends & Family" autocomplete="off" />
					<small>Only visible to administrators in Stripe.</small>
				</div>

				<div class="field">
					<label for="tier">Membership</label>
					<select id="tier" name="tier">
						<option value="premium">Tools Premium</option>
						<option value="champion">Tools Champion</option>
						<option value="both">Premium or Champion</option>
					</select>
				</div>

				<div class="field">
					<label for="maxRedemptions">Maximum redemptions</label>
					<input id="maxRedemptions" name="maxRedemptions" type="number" min="1" max="1000" value="1" required />
				</div>

				<div class="field">
					<label for="expiresAt">Expiration</label>
					<input id="expiresAt" name="expiresAt" type="datetime-local" />
					<small>Optional. Leave blank for no expiration.</small>
				</div>

				<div class="form-actions">
					<button class="button" type="submit" disabled={!data.stripeReady}>Create code</button>
				</div>
			</form>
		</section>

		<section class="account-section">
			<div class="section-heading">
				<div><div class="eyebrow">Stripe</div><h2>Existing codes</h2></div>
				<p>Deactivation prevents future use but does not remove a discount from an existing subscription.</p>
			</div>
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

<style>
	.code-section {
		display: grid;
		gap: 1.5rem;
	}

	.code-heading {
		align-items: end;
		margin-bottom: 0;
	}

	.code-heading h2 {
		max-width: 650px;
	}

	.code-form {
		display: grid;
		grid-template-columns: minmax(220px, 1.15fr) minmax(280px, 1.5fr) minmax(190px, .95fr);
		gap: 1.25rem 1.35rem;
		align-items: end;
		padding: 1.75rem;
	}

	.field {
		display: grid;
		gap: .48rem;
		min-width: 0;
	}

	.field label {
		color: #f2e6d1;
		font-size: .86rem;
		font-weight: 800;
		letter-spacing: .02em;
	}

	.field input,
	.field select {
		width: 100%;
		min-height: 48px;
		padding: .72rem .85rem;
		border: 1px solid #d49b2c55;
		border-radius: 9px;
		outline: none;
		background: #100c09;
		color: #fff3d6;
		font: inherit;
		color-scheme: dark;
	}

	.field input::placeholder {
		color: #786d61;
	}

	.field input:focus,
	.field select:focus {
		border-color: var(--gold-light);
		box-shadow: 0 0 0 3px #e5a51220;
	}

	.field small {
		min-height: 1.15rem;
		color: #8f8373;
		font-size: .75rem;
		line-height: 1.45;
	}

	.field-code {
		grid-column: 1;
	}

	.field-label {
		grid-column: 2 / 4;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		align-items: end;
	}

	.form-actions .button {
		width: 100%;
	}

	@media (max-width: 980px) {
		.code-form {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.field-code,
		.field-label {
			grid-column: auto;
		}
	}

	@media (max-width: 640px) {
		.code-form {
			grid-template-columns: 1fr;
			padding: 1.25rem;
		}

		.form-actions .button {
			width: 100%;
		}
	}
</style>
