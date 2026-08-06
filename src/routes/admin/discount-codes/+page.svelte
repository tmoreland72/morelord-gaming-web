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
		if (tier === 'champion') return 'Tools Champion';
		return 'Tools Premium';
	}

	function statusLabel(code: PageData['codes'][number]): string {
		if (!code.active) return 'Inactive';
		if (code.expires_at && code.expires_at * 1000 <= Date.now()) return 'Expired';
		if (code.max_redemptions !== null && code.times_redeemed >= code.max_redemptions) return 'Fully redeemed';
		return 'Available';
	}

	function statusClass(code: PageData['codes'][number]): string {
		const status = statusLabel(code);
		if (status === 'Available') return 'success';
		if (status === 'Fully redeemed') return 'warning';
		return 'muted';
	}

	function recipientName(redemption: PageData['codes'][number]['redemptions'][number]): string {
		return redemption.customerName || redemption.customerEmail || redemption.customerId || 'Stripe customer';
	}

	function subscriptionStatus(redemption: PageData['codes'][number]['redemptions'][number]): string {
		if (redemption.cancelAtPeriodEnd) return 'Cancels at period end';
		return redemption.status.replaceAll('_', ' ');
	}

	const activeCount = $derived(data.codes.filter((code) => statusLabel(code) === 'Available').length);
	const redeemedCount = $derived(data.codes.reduce((total, code) => total + code.times_redeemed, 0));
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

			<div class="code-summary" aria-label="Friends and Family code summary">
				<div class="card summary-card"><span>Codes</span><strong>{data.codes.length}</strong></div>
				<div class="card summary-card"><span>Available</span><strong>{activeCount}</strong></div>
				<div class="card summary-card"><span>Redemptions</span><strong>{redeemedCount}</strong></div>
			</div>

			{#if data.codes.length}
				<div class="code-list">
					{#each data.codes as code}
						<article class="card code-row">
							<header class="code-row-header">
								<div class="code-identity">
									<div class="code-tags">
										<span class="tag {statusClass(code)}">{statusLabel(code)}</span>
										<span class="tag tier">{tierLabel(code)}</span>
									</div>
									<h3>{code.code}</h3>
									<p>{couponName(code)}</p>
								</div>
								<form method="POST" action="?/setActive">
									<input type="hidden" name="id" value={code.id} />
									<input type="hidden" name="active" value={code.active ? 'false' : 'true'} />
									<button class="button secondary compact" type="submit">{code.active ? 'Deactivate' : 'Reactivate'}</button>
								</form>
							</header>

							<div class="code-facts">
								<div><span>Created</span><strong>{new Date(code.created * 1000).toLocaleDateString()}</strong></div>
								<div><span>Used</span><strong>{code.times_redeemed} of {code.max_redemptions ?? '∞'}</strong></div>
								<div><span>Expires</span><strong>{code.expires_at ? new Date(code.expires_at * 1000).toLocaleString() : 'Never'}</strong></div>
							</div>

							{#if code.redemptions.length}
								<div class="redemption-section">
									<h4>Redeemed by</h4>
									<div class="redemption-list">
										{#each code.redemptions as redemption}
											<div class="redemption-row">
												<div>
													<strong>{recipientName(redemption)}</strong>
													{#if redemption.customerName && redemption.customerEmail}<small>{redemption.customerEmail}</small>{/if}
												</div>
												<div class="redemption-status">
													<span>{subscriptionStatus(redemption)}</span>
													<small>Redeemed {new Date(redemption.created * 1000).toLocaleDateString()}{redemption.currentPeriodEnd ? ` · Period ends ${new Date(redemption.currentPeriodEnd * 1000).toLocaleDateString()}` : ''}</small>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{:else if code.times_redeemed > 0}
								<p class="redemption-note">Stripe reports a redemption, but the related subscription could not be matched. It may have been deleted or created under an older Stripe API record.</p>
							{/if}
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
	.code-section { display: grid; gap: 1.5rem; }
	.code-heading { align-items: end; margin-bottom: 0; }
	.code-heading h2 { max-width: 650px; }
	.code-form { display: grid; grid-template-columns: minmax(220px, 1.15fr) minmax(280px, 1.5fr) minmax(190px, .95fr); gap: 1.25rem 1.35rem; align-items: end; padding: 1.75rem; }
	.field { display: grid; gap: .48rem; min-width: 0; }
	.field label { color: #f2e6d1; font-size: .86rem; font-weight: 800; letter-spacing: .02em; }
	.field input, .field select { width: 100%; min-height: 48px; padding: .72rem .85rem; border: 1px solid #d49b2c55; border-radius: 9px; outline: none; background: #100c09; color: #fff3d6; font: inherit; color-scheme: dark; }
	.field input::placeholder { color: #786d61; }
	.field input:focus, .field select:focus { border-color: var(--gold-light); box-shadow: 0 0 0 3px #e5a51220; }
	.field small { min-height: 1.15rem; color: #8f8373; font-size: .75rem; line-height: 1.45; }
	.field-code { grid-column: 1; }
	.field-label { grid-column: 2 / 4; }
	.form-actions { display: flex; justify-content: flex-end; align-items: end; }
	.form-actions .button { width: 100%; }

	.code-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
	.summary-card { display: flex; align-items: baseline; justify-content: space-between; padding: 1rem 1.2rem; }
	.summary-card span { color: #9f9384; font-size: .82rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
	.summary-card strong { color: #fff0cd; font-family: var(--font-display); font-size: 1.8rem; }
	.code-list { display: grid; gap: 1rem; }
	.code-row { padding: 1.35rem 1.45rem; }
	.code-row-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.25rem; }
	.code-identity { min-width: 0; }
	.code-identity h3 { margin: .55rem 0 .2rem; font-size: 1.45rem; letter-spacing: .025em; }
	.code-identity p { margin: 0; color: #a99c8c; }
	.code-tags { display: flex; flex-wrap: wrap; gap: .5rem; }
	.tag.success { border-color: #759a6c88; color: #b9dda9; background: #23401c66; }
	.tag.warning { border-color: #d49b2c88; color: #f2ca6b; background: #49350d66; }
	.tag.muted { border-color: #746a6088; color: #b9aea1; background: #29231f88; }
	.tag.tier { border-color: #8f6dbe77; color: #d1b8f2; background: #33224366; }
	.button.compact { min-height: 38px; padding: .55rem .85rem; white-space: nowrap; }
	.code-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; margin-top: 1.1rem; padding-top: 1rem; border-top: 1px solid #d49b2c22; }
	.code-facts div { display: grid; gap: .22rem; }
	.code-facts span { color: #807568; font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
	.code-facts strong { color: #d9ccba; font-size: .9rem; font-weight: 650; }
	.redemption-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #d49b2c22; }
	.redemption-section h4 { margin: 0 0 .75rem; color: #d8c4a4; font-size: .78rem; text-transform: uppercase; letter-spacing: .09em; }
	.redemption-list { display: grid; gap: .55rem; }
	.redemption-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .75rem .85rem; border-radius: 8px; background: #0d0a0870; }
	.redemption-row > div { display: grid; gap: .15rem; min-width: 0; }
	.redemption-row strong { color: #eee0ca; overflow-wrap: anywhere; }
	.redemption-row small { color: #8e8376; }
	.redemption-status { text-align: right; }
	.redemption-status span { color: #cdb68e; text-transform: capitalize; }
	.redemption-note { margin: 1rem 0 0; padding-top: 1rem; border-top: 1px solid #d49b2c22; color: #8f8373; font-size: .85rem; }

	@media (max-width: 980px) {
		.code-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.field-code, .field-label { grid-column: auto; }
	}
	@media (max-width: 700px) {
		.code-summary, .code-facts { grid-template-columns: 1fr; }
		.code-row-header, .redemption-row { align-items: stretch; flex-direction: column; }
		.redemption-status { text-align: left; }
		.code-row-header form, .code-row-header button { width: 100%; }
	}
	@media (max-width: 640px) {
		.code-form { grid-template-columns: 1fr; padding: 1.25rem; }
		.form-actions .button { width: 100%; }
	}
</style>
