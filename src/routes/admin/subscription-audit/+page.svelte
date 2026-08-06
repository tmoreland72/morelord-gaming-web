<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	let filter = $state<'all' | 'issues' | 'error' | 'warning' | 'healthy'>('all');
	let search = $state('');

	const visible = $derived(data.records.filter((record) => {
		const statusMatch = filter === 'all' || (filter === 'issues' ? record.severity !== 'healthy' : record.severity === filter);
		const needle = search.trim().toLowerCase();
		const searchMatch = !needle || [record.name, record.email, record.id, record.customerId, record.local?.plan, record.stripe?.productName]
			.filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
		return statusMatch && searchMatch;
	}));

	function planLabel(plan: string | null | undefined): string {
		if (!plan) return 'Unknown';
		return plan.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
	}

	function formatDate(value: number | null | undefined, seconds = false): string {
		if (!value) return '—';
		return new Date(seconds ? value * 1000 : value).toLocaleString();
	}
</script>

<svelte:head>
	<title>Subscription Audit | Morelord Administration</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord administration</div>
		<h1>Subscription audit</h1>
		<p class="lead">Compare Stripe subscriptions with synchronized website memberships and entitlements.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell admin-dashboard audit-page">
		<div class="audit-summary">
			<button class="card metric-filter" class:active={filter === 'all'} onclick={() => filter = 'all'}><span>Subscriptions</span><strong>{data.summary.total}</strong></button>
			<button class="card metric-filter healthy" class:active={filter === 'healthy'} onclick={() => filter = 'healthy'}><span>Healthy</span><strong>{data.summary.healthy}</strong></button>
			<button class="card metric-filter warning" class:active={filter === 'warning'} onclick={() => filter = 'warning'}><span>Warnings</span><strong>{data.summary.warnings}</strong></button>
			<button class="card metric-filter error" class:active={filter === 'error'} onclick={() => filter = 'error'}><span>Errors</span><strong>{data.summary.errors}</strong></button>
		</div>

		<div class="card audit-controls">
			<label><span>Search customers</span><input bind:value={search} placeholder="Name, email, subscription or customer ID" /></label>
			<div class="filter-buttons" aria-label="Audit status filter">
				<button class:active={filter === 'all'} onclick={() => filter = 'all'}>All</button>
				<button class:active={filter === 'issues'} onclick={() => filter = 'issues'}>Issues only</button>
				<button class:active={filter === 'healthy'} onclick={() => filter = 'healthy'}>Healthy</button>
			</div>
			<small>Checked {new Date(data.checkedAt).toLocaleString()} · Reload this page to run the audit again.</small>
		</div>

		{#if visible.length}
			<div class="audit-list">
				{#each visible as record}
					<article class="card audit-record {record.severity}">
						<header>
							<div>
								<div class="record-tags"><span class="tag {record.severity}">{record.severity === 'healthy' ? 'Synchronized' : record.severity}</span>{#if record.stripe?.promotionCode}<span class="tag promo">Code: {record.stripe.promotionCode}</span>{/if}</div>
								<h2>{record.name ?? record.email ?? 'Unknown customer'}</h2>
								{#if record.name && record.email}<p>{record.email}</p>{/if}
							</div>
							<div class="record-status"><strong>{record.stripe?.productName ?? planLabel(record.local?.plan)}</strong><span>{record.stripe?.status ?? record.local?.status ?? 'Missing'}</span></div>
						</header>

						{#if record.issues.length}
							<div class="issue-list">
								{#each record.issues as issue}<div class="issue {issue.severity}"><strong>{issue.severity === 'error' ? 'Mismatch' : 'Review'}</strong><span>{issue.message}</span></div>{/each}
							</div>
						{/if}

						<div class="comparison-grid">
							<section>
								<h3>Stripe</h3>
								<dl>
									<div><dt>Membership</dt><dd>{record.stripe?.productName ?? planLabel(record.stripe?.priceId)}</dd></div>
									<div><dt>Status</dt><dd>{record.stripe?.status ?? 'Missing'}</dd></div>
									<div><dt>Price</dt><dd><code>{record.stripe?.priceId ?? '—'}</code></dd></div>
									<div><dt>Period ends</dt><dd>{formatDate(record.stripe?.currentPeriodEnd, true)}</dd></div>
									<div><dt>Cancellation</dt><dd>{record.stripe?.cancelAtPeriodEnd ? 'Scheduled' : 'No'}</dd></div>
								</dl>
							</section>
							<section>
								<h3>Website</h3>
								<dl>
									<div><dt>Membership</dt><dd>{planLabel(record.local?.plan)}</dd></div>
									<div><dt>Status</dt><dd>{record.local?.status ?? 'Missing'}</dd></div>
									<div><dt>Price</dt><dd><code>{record.local?.priceId ?? '—'}</code></dd></div>
									<div><dt>Period ends</dt><dd>{formatDate(record.local?.currentPeriodEnd)}</dd></div>
									<div><dt>Last synchronized</dt><dd>{formatDate(record.local?.updatedAt)}</dd></div>
								</dl>
							</section>
						</div>

						<div class="entitlement-row">
							<strong>Active entitlements</strong>
							<div>{#each record.entitlements as entitlement}<span class="tag entitlement" title={entitlement.lookupKey}>{entitlement.displayName ?? entitlement.lookupKey}</span>{:else}<span class="empty-entitlement">None</span>{/each}</div>
						</div>
						<footer><code>{record.id}</code><span>Customer <code>{record.customerId || 'unknown'}</code></span></footer>
					</article>
				{/each}
			</div>
		{:else}
			<article class="card empty-state"><h2>No matching subscriptions</h2><p>Change the filter or search term to see more records.</p></article>
		{/if}
	</div>
</section>

<style>
	.audit-page { gap: 1.25rem; }
	.audit-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .85rem; }
	.metric-filter { display: flex; align-items: baseline; justify-content: space-between; padding: 1rem 1.15rem; color: inherit; font: inherit; cursor: pointer; }
	.metric-filter span { color: #9f9384; font-size: .76rem; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; }
	.metric-filter strong { color: #f6dd9e; font-size: 1.8rem; }
	.metric-filter.active { border-color: #d49b2c99; box-shadow: 0 0 0 2px #d49b2c18; }
	.metric-filter.healthy strong { color: #b9dda9; } .metric-filter.warning strong { color: #f2ca6b; } .metric-filter.error strong { color: #ef9b92; }
	.audit-controls { display: grid; grid-template-columns: minmax(260px, 1fr) auto; gap: .8rem 1rem; align-items: end; padding: 1rem 1.15rem; }
	.audit-controls label { display: grid; gap: .4rem; } .audit-controls label span { color: #e8d7b9; font-size: .78rem; font-weight: 800; }
	.audit-controls input { width: 100%; min-height: 43px; padding: .65rem .8rem; border: 1px solid #d49b2c55; border-radius: 8px; background: #100c09; color: #fff1d3; font: inherit; }
	.audit-controls small { grid-column: 1 / -1; color: #817568; }
	.filter-buttons { display: flex; gap: .4rem; }
	.filter-buttons button { min-height: 39px; padding: .55rem .75rem; border: 1px solid #d49b2c44; border-radius: 8px; background: #18110d; color: #a99c8b; font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }
	.filter-buttons button.active { border-color: #d49b2c99; color: #ffe09a; background: #3a290f; }
	.audit-list { display: grid; gap: 1rem; }
	.audit-record { padding: 1.25rem 1.35rem; border-left-width: 4px; }
	.audit-record.healthy { border-left-color: #789a6a; } .audit-record.warning { border-left-color: #d49b2c; } .audit-record.error { border-left-color: #b94d43; }
	.audit-record > header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
	.audit-record h2 { margin: .45rem 0 .15rem; font-size: 1.45rem; } .audit-record header p { margin: 0; }
	.record-tags { display: flex; flex-wrap: wrap; gap: .45rem; }
	.tag.healthy { color: #b9dda9; border-color: #789a6a88; background: #233d1e66; } .tag.warning { color: #f2ca6b; border-color: #d49b2c88; background: #49350d66; } .tag.error { color: #efaaa4; border-color: #b94d4388; background: #461d1966; }
	.tag.promo { color: #ccb6ee; border-color: #8f6dbe77; background: #33224366; }
	.record-status { display: grid; gap: .2rem; text-align: right; } .record-status strong { color: #f1dfbd; } .record-status span { color: #9d9182; text-transform: capitalize; }
	.issue-list { display: grid; gap: .45rem; margin-top: 1rem; }
	.issue { display: grid; grid-template-columns: 76px 1fr; gap: .65rem; padding: .65rem .75rem; border-radius: 7px; font-size: .84rem; }
	.issue.error { background: #4a1d1960; color: #e9b1ab; } .issue.warning { background: #4b350d60; color: #e3ca8e; }
	.issue strong { text-transform: uppercase; letter-spacing: .06em; font-size: .7rem; }
	.comparison-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; margin-top: 1rem; }
	.comparison-grid section { padding: .85rem .95rem; border: 1px solid #d49b2c22; border-radius: 9px; background: #0e0a0870; }
	.comparison-grid h3 { margin: 0 0 .7rem; color: #d8c49f; font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; }
	dl { display: grid; gap: .42rem; margin: 0; } dl div { display: grid; grid-template-columns: 110px 1fr; gap: .7rem; } dt { color: #817668; } dd { margin: 0; color: #d8cbb8; overflow-wrap: anywhere; }
	.entitlement-row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-top: .85rem; padding-top: .85rem; border-top: 1px solid #d49b2c22; }
	.entitlement-row > strong { color: #9f9384; font-size: .75rem; text-transform: uppercase; letter-spacing: .07em; } .entitlement-row > div { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: .4rem; }
	.tag.entitlement { color: #b9dda9; border-color: #789a6a66; background: #233d1e55; } .empty-entitlement { color: #776d62; font-size: .82rem; }
	.audit-record footer { display: flex; justify-content: space-between; gap: .8rem; margin-top: .8rem; color: #70675e; font-size: .72rem; }
	.audit-record code { color: #a9946d; overflow-wrap: anywhere; }
	@media (max-width: 850px) { .audit-summary { grid-template-columns: repeat(2, 1fr); } .audit-controls { grid-template-columns: 1fr; } .audit-controls small { grid-column: auto; } .comparison-grid { grid-template-columns: 1fr; } }
	@media (max-width: 600px) { .audit-summary { grid-template-columns: 1fr 1fr; } .audit-record > header, .entitlement-row, .audit-record footer { align-items: stretch; flex-direction: column; } .record-status { text-align: left; } .entitlement-row > div { justify-content: flex-start; } dl div { grid-template-columns: 90px 1fr; } }
</style>
