<script lang="ts">
\timport type { PageData } from './$types';
\tlet { data }: { data: PageData } = $props();
\tlet search = $state('');
\tlet activity = $state<'all' | 'active30' | 'inactive' | 'revoked'>('all');

\tconst visible = $derived(data.installations.filter((row) => {
\t\tconst stateMatch = activity === 'all'
\t\t\t|| (activity === 'active30' && row.active30)
\t\t\t|| (activity === 'inactive' && !row.active30 && !row.revokedAt)
\t\t\t|| (activity === 'revoked' && Boolean(row.revokedAt));
\t\tconst needle = search.trim().toLowerCase();
\t\tconst searchMatch = !needle || [row.name, row.email, row.label, row.worldName, row.foundryVersion, row.moduleVersion, row.tier]
\t\t\t.filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
\t\treturn stateMatch && searchMatch;
\t}));

\tfunction date(value: number | null): string {
\t\treturn value ? new Date(value).toLocaleString() : 'Never';
\t}
</script>

<svelte:head>
\t<title>Installations | Morelord Administration</title>
\t<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
\t<div class="shell">
\t\t<div class="eyebrow">Morelord administration</div>
\t\t<h1>Foundry installations</h1>
\t\t<p class="lead">Measure connected Morelord Core worlds, product activity and paid conversion.</p>
\t</div>
</section>

<section class="section brand-panel-section">
\t<div class="shell admin-dashboard installation-page">
\t\t<div class="metric-grid install-metrics">
\t\t\t<div class="metric-card"><strong>{data.summary.registered}</strong><span>Registered</span></div>
\t\t\t<div class="metric-card"><strong>{data.summary.active7}</strong><span>Active 7 days</span></div>
\t\t\t<div class="metric-card"><strong>{data.summary.active30}</strong><span>Active 30 days</span></div>
\t\t\t<div class="metric-card"><strong>{data.summary.activeAccounts}</strong><span>Active accounts</span></div>
\t\t\t<div class="metric-card"><strong>{data.summary.paidAccounts}</strong><span>Paid accounts</span></div>
\t\t\t<div class="metric-card"><strong>{data.summary.conversion}%</strong><span>Paid conversion</span></div>
\t\t</div>

\t\t<div class="grid-2 analytics-grid">
\t\t\t<article class="card analytics-card">
\t\t\t\t<div class="eyebrow">30-day active accounts</div>
\t\t\t\t<h2>Membership mix</h2>
\t\t\t\t<div class="tier-list">
\t\t\t\t\t<div><span>Standard</span><strong>{data.tierCounts.standard}</strong></div>
\t\t\t\t\t<div><span>Premium</span><strong>{data.tierCounts.premium}</strong></div>
\t\t\t\t\t<div><span>Champion</span><strong>{data.tierCounts.champion}</strong></div>
\t\t\t\t</div>
\t\t\t\t<p class="muted">Conversion uses unique active accounts, not GitHub downloads or individual Foundry worlds.</p>
\t\t\t</article>

\t\t\t<article class="card analytics-card">
\t\t\t\t<div class="eyebrow">Morelord Core</div>
\t\t\t\t<h2>Version distribution</h2>
\t\t\t\t{#if data.versions.length}
\t\t\t\t\t<div class="rank-list">{#each data.versions as item}<div><code>{item.version}</code><strong>{item.count}</strong></div>{/each}</div>
\t\t\t\t{:else}<p>No active installation versions recorded yet.</p>{/if}
\t\t\t</article>
\t\t</div>

\t\t<div class="grid-2 analytics-grid">
\t\t\t<article class="card analytics-card">
\t\t\t\t<div class="eyebrow">Product adoption</div>
\t\t\t\t<h2>Entitlement activity</h2>
\t\t\t\t{#if data.products.length}
\t\t\t\t\t<div class="product-list">{#each data.products as product}<div><span><strong>{product.name}</strong><small>{product.slug}</small></span><span><strong>{product.active30}</strong><small>30d / {product.total} total</small></span></div>{/each}</div>
\t\t\t\t{:else}<p>Product activity will appear as Morelord modules request entitlements.</p>{/if}
\t\t\t</article>

\t\t\t<article class="card analytics-card">
\t\t\t\t<div class="eyebrow">Last 12 months</div>
\t\t\t\t<h2>New connections</h2>
\t\t\t\t<div class="month-list">{#each data.monthly as month}<div><span>{month.label}</span><strong>{month.count}</strong></div>{/each}</div>
\t\t\t</article>
\t\t</div>

\t\t<div class="card install-controls">
\t\t\t<label><span>Search installations</span><input bind:value={search} placeholder="Account, world, version or tier" /></label>
\t\t\t<div class="filter-buttons">
\t\t\t\t<button class:active={activity === 'all'} onclick={() => activity = 'all'}>All</button>
\t\t\t\t<button class:active={activity === 'active30'} onclick={() => activity = 'active30'}>Active 30d</button>
\t\t\t\t<button class:active={activity === 'inactive'} onclick={() => activity = 'inactive'}>Inactive</button>
\t\t\t\t<button class:active={activity === 'revoked'} onclick={() => activity = 'revoked'}>Revoked</button>
\t\t\t</div>
\t\t\t<small>Active means the installation successfully checked Morelord access during the selected period. Updated {new Date(data.checkedAt).toLocaleString()}.</small>
\t\t</div>

\t\t<div class="card table-wrap installation-table">
\t\t\t<table>
\t\t\t\t<thead><tr><th>Account</th><th>Installation</th><th>Membership</th><th>Versions</th><th>Last active</th></tr></thead>
\t\t\t\t<tbody>
\t\t\t\t\t{#each visible as row}
\t\t\t\t\t\t<tr class:revoked={Boolean(row.revokedAt)}>
\t\t\t\t\t\t\t<td><strong>{row.name}</strong><small>{row.email}</small></td>
\t\t\t\t\t\t\t<td><strong>{row.worldName || row.label}</strong><small>{row.label}</small></td>
\t\t\t\t\t\t\t<td><span class="tier {row.tier}">{row.tier}</span>{#if row.revokedAt}<small>Revoked {date(row.revokedAt)}</small>{/if}</td>
\t\t\t\t\t\t\t<td><span>Core {row.moduleVersion || '—'}</span><small>Foundry {row.foundryVersion || '—'}</small></td>
\t\t\t\t\t\t\t<td><span class:active-now={row.active30}>{date(row.lastValidatedAt)}</span><small>Connected {date(row.createdAt)}</small></td>
\t\t\t\t\t\t</tr>
\t\t\t\t\t{/each}
\t\t\t\t</tbody>
\t\t\t</table>
\t\t\t{#if !visible.length}<p class="empty-row">No installations match this filter.</p>{/if}
\t\t</div>
\t</div>
</section>

<style>
\t.installation-page { gap: 1.25rem; }
\t.install-metrics { grid-template-columns: repeat(6, minmax(0, 1fr)); }
\t.analytics-grid { gap: 1rem; }
\t.analytics-card { padding: 1.25rem; }
\t.analytics-card h2 { margin: .35rem 0 1rem; }
\t.analytics-card .muted { margin: .9rem 0 0; color: #8f8374; font-size: .82rem; }
\t.tier-list, .rank-list, .month-list { display: grid; gap: .45rem; }
\t.tier-list div, .rank-list div, .month-list div { display: flex; justify-content: space-between; gap: 1rem; padding: .55rem .65rem; border: 1px solid #d49b2c22; border-radius: 7px; background: #100c0970; }
\t.tier-list strong, .rank-list strong, .month-list strong { color: #f4d98f; }
\t.rank-list code { color: #d9c7a4; }
\t.product-list { display: grid; gap: .55rem; }
\t.product-list > div { display: flex; justify-content: space-between; gap: 1rem; padding: .7rem; border: 1px solid #d49b2c22; border-radius: 8px; }
\t.product-list span { display: grid; gap: .15rem; } .product-list span:last-child { text-align: right; }
\t.product-list small { color: #827667; }
\t.install-controls { display: grid; grid-template-columns: minmax(260px, 1fr) auto; gap: .8rem 1rem; align-items: end; padding: 1rem 1.15rem; }
\t.install-controls label { display: grid; gap: .4rem; } .install-controls label span { color: #e8d7b9; font-size: .78rem; font-weight: 800; }
\t.install-controls input { width: 100%; min-height: 43px; padding: .65rem .8rem; border: 1px solid #d49b2c55; border-radius: 8px; background: #100c09; color: #fff1d3; font: inherit; }
\t.install-controls small { grid-column: 1 / -1; color: #817568; }
\t.filter-buttons { display: flex; gap: .4rem; flex-wrap: wrap; }
\t.filter-buttons button { min-height: 39px; padding: .55rem .75rem; border: 1px solid #d49b2c44; border-radius: 8px; background: #18110d; color: #a99c8b; font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }
\t.filter-buttons button.active { border-color: #d49b2c99; color: #ffe09a; background: #3a290f; }
\t.installation-table { padding: .35rem 1rem 1rem; }
\t.installation-table strong, .installation-table span { display: block; }
\t.installation-table tr.revoked { opacity: .55; }
\t.installation-table .tier { display: inline-block; text-transform: capitalize; padding: .2rem .45rem; border-radius: 999px; border: 1px solid #d49b2c44; }
\t.tier.standard { color: #c8bcaa; } .tier.premium { color: #f0cc78; } .tier.champion { color: #d0b6ff; border-color: #9a76ce88; }
\t.active-now { color: #b9dda9; }
\t.empty-row { padding: 1rem; color: #887d70; }
\t@media (max-width: 1100px) { .install-metrics { grid-template-columns: repeat(3, 1fr); } }
\t@media (max-width: 760px) { .install-metrics { grid-template-columns: repeat(2, 1fr); } .analytics-grid { grid-template-columns: 1fr; } .install-controls { grid-template-columns: 1fr; } .install-controls small { grid-column: auto; } }
</style>
