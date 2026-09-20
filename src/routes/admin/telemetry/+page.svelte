<script lang="ts">
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let featureModule = $state('all');
	let featureActivity = $state('all');
	const visibleFeatures = $derived(
		data.features.filter(
			(row) =>
				(featureModule === 'all' || row.module === featureModule) &&
				(featureActivity === 'all' ||
					(featureActivity === 'unused' ? row.count === 0 : row.count > 0))
		)
	);
</script>

<svelte:head
	><title>Usage and errors | Morelord Administration</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord administration</div>
		<h1>Usage and errors</h1>
		<p class="lead">
			Feature activity and reliability across participating worlds, including unconnected free
			users.
		</p>
	</div>
</section>
<section class="section brand-panel-section">
	<div class="shell admin-dashboard">
		<form method="GET">
			<label
				>Reporting date (UTC) <input type="date" name="date" value={data.date} required /></label
			><button type="submit">Show date</button>
		</form>
		<p>
			These are opted-in reporting worlds, not installations or people. Zero means no observed
			activity. Available means the module was enabled when a GM reported; used means a feature
			event was observed. Events include opens, attempts, returns and failures and are not a
			workflow completion total. Developer Mode is excluded.
		</p>
		<div class="card table-wrap">
			<table>
				<thead
					><tr
						><th>Module</th><th>Available worlds</th><th>Worlds using features</th><th
							>Feature events</th
						><th>Error reports</th></tr
					></thead
				><tbody>
					{#each data.modules as row (row.module)}<tr
							><td>{row.module}</td><td>{row.available}</td><td>{row.worlds}</td><td
								>{row.actions}</td
							><td>{row.errors}</td></tr
						>{/each}
				</tbody>
			</table>
		</div>
		<h2>Feature activity</h2>
		<label
			>Module <select bind:value={featureModule}
				><option value="all">All modules</option>{#each data.modules as row (row.module)}<option
						value={row.module}>{row.module}</option
					>{/each}</select
			></label
		>
		<label
			>Observed activity <select bind:value={featureActivity}
				><option value="all">All known features</option><option value="used"
					>With observed usage</option
				><option value="unused">No observed usage</option></select
			></label
		>
		<div class="card table-wrap">
			<table>
				<thead><tr><th>Module</th><th>Feature event</th><th>Worlds</th><th>Events</th></tr></thead
				><tbody>
					{#each visibleFeatures as row (row.module + ':' + row.event)}<tr
							><td>{row.module}</td><td>{row.event}</td><td>{row.worlds}</td><td>{row.count}</td
							></tr
						>{:else}<tr><td colspan="4">No feature events for this date.</td></tr>{/each}
				</tbody>
			</table>
		</div>
		<p>
			“returned” means a service call resolved, including a possible no-op. Only explicitly named
			completion events confirm a completed workflow.
		</p>
		<h2>Errors</h2>
		<p>
			Grouped by operation, versions, error type and code locations. Up to 100 groups. Raw custom
			error messages are excluded to protect campaign content. Recent actions are one sample per
			group.
		</p>
		{#each data.failures as row}
			<article class="card">
				<h3>{row.module}: {row.event}</h3>
				<p>{row.worlds} affected worlds · {row.count} reports · {row.error_type}</p>
				<p>
					Module {row.module_version} · Foundry {row.foundry_version} · {row.system}
					{row.system_version}
				</p>
				<details>
					<summary>Code locations and recent actions</summary>
					<pre>{row.frames}</pre>
					<pre>{row.recent}</pre>
					<p>Last seen {row.last_seen}</p>
				</details>
			</article>
		{:else}<p>No error reports for this date.</p>{/each}
		<h2>Reporting credentials</h2>
		<p>
			The 50 most recently seen reporting worlds. Credentials identify enrolled clients without a
			Morelord account; they do not attest that client code is unmodified. Revocation blocks further
			reports using that credential. Secret tokens are never displayed.
		</p>
		<div class="card table-wrap">
			<table>
				<thead><tr><th>Reporting world</th><th>Last seen (UTC)</th><th>Status</th></tr></thead
				><tbody>
					{#each data.credentials as row (row.world)}<tr
							><td><code>{row.world}</code></td><td
								>{new Date(row.last_seen_at ?? row.created_at).toISOString()}</td
							><td
								>{#if row.revoked_at}Revoked{:else}<form method="POST" action="?/revoke">
										<input type="hidden" name="world" value={row.world} /><button type="submit"
											>Revoke reporting</button
										>
									</form>{/if}</td
							></tr
						>{:else}<tr><td colspan="3">No reporting credentials registered.</td></tr>{/each}
				</tbody>
			</table>
		</div>
		<h2>GitHub ZIP downloads</h2>
		<p>
			Cumulative release-asset downloads include updates, reinstalls and automation. They are not
			unique installs. Changes are since the previous recorded UTC day, not necessarily a 24-hour
			interval. The first snapshot establishes a baseline. Deleted assets retain their last
			observation.
		</p>
		<form method="POST" action="?/downloads">
			<button type="submit">Refresh GitHub download snapshots</button>
		</form>
		{#if form?.snapshots}<ul>
				{#each form.snapshots as result (result.module)}<li>
						{result.module}: {result.status}{result.downloads === undefined
							? ''
							: ' (' + result.downloads + ' downloads)'}
					</li>{/each}
			</ul>{/if}
		<div class="card table-wrap">
			<table>
				<thead
					><tr
						><th>Module / release</th><th>Total downloads</th><th>Change since previous snapshot</th
						><th>Checked</th></tr
					></thead
				><tbody>
					{#each data.downloads as row (row.module + ':' + row.asset_id)}<tr
							><td>{row.module} / {row.release}</td><td>{row.downloads}</td><td
								>{row.previous === null
									? 'Baseline'
									: row.downloads < row.previous
										? 'Counter decreased'
										: '+' + (row.downloads - row.previous)}{#if row.previous_at}<small
										>Since {new Date(row.previous_at).toISOString()}</small
									>{/if}</td
							><td>{new Date(row.checked_at).toISOString()}</td></tr
						>
					{:else}<tr><td colspan="4">No snapshots yet. Refresh to establish the baseline.</td></tr
						>{/each}
				</tbody>
			</table>
		</div>
		<p><a href="/admin/installations">Connected installations and account activity</a></p>
	</div>
</section>
