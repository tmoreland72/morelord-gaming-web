<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let search = $state('');
	let activity = $state<'all' | 'active30' | 'inactive' | 'revoked'>('all');

	const visible = $derived(data.installations.filter((row) => {
		const stateMatch = activity === 'all'
			|| (activity === 'active30' && row.active30)
			|| (activity === 'inactive' && !row.active30 && !row.revokedAt)
			|| (activity === 'revoked' && Boolean(row.revokedAt));
		const needle = search.trim().toLowerCase();
		const searchMatch = !needle || [row.name, row.email, row.label, row.worldName, row.foundryVersion, row.moduleVersion, row.tier]
			.filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
		return stateMatch && searchMatch;
	}));

	function date(value: number | null): string {
		return value ? new Date(value).toLocaleString() : 'Never';
	}
</script>

<svelte:head>
	<title>Installations | Morelord Administration</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord administration</div>
		<h1>Foundry installations</h1>
		<p class="lead">Measure connected Morelord Core worlds, product activity and paid conversion.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell admin-dashboard installation-page">
		<div class="metric-grid install-metrics">
			<div class="metric-card"><strong>{data.summary.registered}</strong><span>Registered</span></div>
			<div class="metric-card"><strong>{data.summary.active7}</strong><span>Active 7 days</span></div>
			<div class="metric-card"><strong>{data.summary.active30}</strong><span>Active 30 days</span></div>
			<div class="metric-card"><strong>{data.summary.activeAccounts}</strong><span>Active accounts</span></div>
			<div class="metric-card"><strong>{data.summary.paidAccounts}</strong><span>Paid accounts</span></div>
			<div class="metric-card"><strong>{data.summary.conversion}%</strong><span>Paid conversion</span></div>
		</div>

		<div class="grid-2 analytics-grid">
			<article class="card analytics-card">
				<div class="eyebrow">30-day active accounts</div>
				<h2>Membership mix</h2>
				<div class="tier-list">
					<div><span>Standard</span><strong>{data.tierCounts.standard}</strong></div>
					<div><span>Premium</span><strong>{data.tierCounts.premium}</strong></div>
					<div><span>Champion</span><strong>{data.tierCounts.champion}</strong></div>
				</div>
				<p class="muted">Conversion uses unique active accounts, not GitHub downloads or individual Foundry worlds.</p>
			</article>

			<article class="card analytics-card">
				<div class="eyebrow">Morelord Core</div>
				<h2>Version distribution</h2>
				{#if data.versions.length}
					<div class="rank-list">{#each data.versions as item}<div><code>{item.version}</code><strong>{item.count}</strong></div>{/each}</div>
				{:else}<p>No active installation versions recorded yet.</p>{/if}
			</article>
		</div>

		<div class="grid-2 analytics-grid">
			<article class="card analytics-card">
				<div class="eyebrow">Product adoption</div>
				<h2>Entitlement activity</h2>
				{#if data.products.length}
					<div class="product-list">{#each data.products as product}<div><span><strong>{product.name}</strong><small>{product.slug}</small></span><span><strong>{product.active30}</strong><small>30d / {product.total} total</small></span></div>{/each}</div>
				{:else}<p>Product activity will appear as Morelord modules request entitlements.</p>{/if}
			</article>

			<article class="card analytics-card">
				<div class="eyebrow">Last 12 months</div>
				<h2>New connections</h2>
				<div class="month-list">{#each data.monthly as month}<div><span>{month.label}</span><strong>{month.count}</strong></div>{/each}</div>
			</article>
		</div>

		<div class="card install-controls">
			<label><span>Search installations</span><input bind:value={search} placeholder="Account, world, version or tier" /></label>
			<div class="filter-buttons">
				<button class:active={activity === 'all'} onclick={() => activity = 'all'}>All</button>
				<button class:active={activity === 'active30'} onclick={() => activity = 'active30'}>Active 30d</button>
				<button class:active={activity === 'inactive'} onclick={() => activity = 'inactive'}>Inactive</button>
				<button class:active={activity === 'revoked'} onclick={() => activity = 'revoked'}>Revoked</button>
			</div>
			<small>Active means the installation successfully checked Morelord access during the selected period. Updated {new Date(data.checkedAt).toLocaleString()}.</small>
		</div>

		<div class="card table-wrap installation-table">
			<table>
				<thead><tr><th>Account</th><th>Installation</th><th>Membership</th><th>Versions</th><th>Last active</th></tr></thead>
				<tbody>
					{#each visible as row}
						<tr class:revoked={Boolean(row.revokedAt)}>
							<td><strong>{row.name}</strong><small>{row.email}</small></td>
							<td><strong>{row.worldName || row.label}</strong><small>{row.label}</small></td>
							<td><span class="tier {row.tier}">{row.tier}</span>{#if row.revokedAt}<small>Revoked {date(row.revokedAt)}</small>{/if}</td>
							<td><span>Core {row.moduleVersion || '—'}</span><small>Foundry {row.foundryVersion || '—'}</small></td>
							<td><span class:active-now={row.active30}>{date(row.lastValidatedAt)}</span><small>Connected {date(row.createdAt)}</small></td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if !visible.length}<p class="empty-row">No installations match this filter.</p>{/if}
		</div>
	</div>
</section>

<style>
	.installation-page { gap: 1.25rem; }
	.install-metrics { grid-template-columns: repeat(6, minmax(0, 1fr)); }
	.analytics-grid { gap: 1rem; }
	.analytics-card { padding: 1.25rem; }
	.analytics-card h2 { margin: .35rem 0 1rem; }
	.analytics-card .muted { margin: .9rem 0 0; color: #8f8374; font-size: .82rem; }
	.tier-list, .rank-list, .month-list { display: grid; gap: .45rem; }
	.tier-list div, .rank-list div, .month-list div { display: flex; justify-content: space-between; gap: 1rem; padding: .55rem .65rem; border: 1px solid #d49b2c22; border-radius: 7px; background: #100c0970; }
	.tier-list strong, .rank-list strong, .month-list strong { color: #f4d98f; }
	.rank-list code { color: #d9c7a4; }
	.product-list { display: grid; gap: .55rem; }
	.product-list > div { display: flex; justify-content: space-between; gap: 1rem; padding: .7rem; border: 1px solid #d49b2c22; border-radius: 8px; }
	.product-list span { display: grid; gap: .15rem; } .product-list span:last-child { text-align: right; }
	.product-list small { color: #827667; }
	.install-controls { display: grid; grid-template-columns: minmax(260px, 1fr) auto; gap: .8rem 1rem; align-items: end; padding: 1rem 1.15rem; }
	.install-controls label { display: grid; gap: .4rem; } .install-controls label span { color: #e8d7b9; font-size: .78rem; font-weight: 800; }
	.install-controls input { width: 100%; min-height: 43px; padding: .65rem .8rem; border: 1px solid #d49b2c55; border-radius: 8px; background: #100c09; color: #fff1d3; font: inherit; }
	.install-controls small { grid-column: 1 / -1; color: #817568; }
	.filter-buttons { display: flex; gap: .4rem; flex-wrap: wrap; }
	.filter-buttons button { min-height: 39px; padding: .55rem .75rem; border: 1px solid #d49b2c44; border-radius: 8px; background: #18110d; color: #a99c8b; font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }
	.filter-buttons button.active { border-color: #d49b2c99; color: #ffe09a; background: #3a290f; }
	.installation-table { padding: .35rem 1rem 1rem; }
	.installation-table strong, .installation-table span { display: block; }
	.installation-table tr.revoked { opacity: .55; }
	.installation-table .tier { display: inline-block; text-transform: capitalize; padding: .2rem .45rem; border-radius: 999px; border: 1px solid #d49b2c44; }
	.tier.standard { color: #c8bcaa; } .tier.premium { color: #f0cc78; } .tier.champion { color: #d0b6ff; border-color: #9a76ce88; }
	.active-now { color: #b9dda9; }
	.empty-row { padding: 1rem; color: #887d70; }
	@media (max-width: 1100px) { .install-metrics { grid-template-columns: repeat(3, 1fr); } }
	@media (max-width: 760px) { .install-metrics { grid-template-columns: repeat(2, 1fr); } .analytics-grid { grid-template-columns: 1fr; } .install-controls { grid-template-columns: 1fr; } .install-controls small { grid-column: auto; } }
</style>
