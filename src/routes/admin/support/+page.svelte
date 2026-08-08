<script lang="ts">
	import type { PageData } from './$types';
	type SupportAction = { message?: string; updated?: string } | null;
	let { data, form }: { data: PageData; form: SupportAction } = $props();
	let filter = $state<'active' | 'all' | 'resolved'>('active');
	let search = $state('');

	const visible = $derived(data.requests.filter((request) => {
		const stateMatch = filter === 'all' || (filter === 'active' && request.status !== 'resolved') || (filter === 'resolved' && request.status === 'resolved');
		const needle = search.trim().toLowerCase();
		const searchMatch = !needle || [request.name, request.email, request.category, request.product, request.subject, request.message]
			.filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
		return stateMatch && searchMatch;
	}));

	function label(status: string): string {
		if (status === 'in_progress') return 'In progress';
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<svelte:head>
	<title>Support Requests | Morelord Administration</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord administration</div>
		<h1>Support requests</h1>
		<p class="lead">Review and track requests submitted through the public support form.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell support-admin">
		<div class="metric-grid support-metrics">
			<div class="metric-card"><strong>{data.counts.open}</strong><span>Open</span></div>
			<div class="metric-card"><strong>{data.counts.inProgress}</strong><span>In progress</span></div>
			<div class="metric-card"><strong>{data.counts.resolved}</strong><span>Resolved</span></div>
		</div>

		<div class="card support-toolbar">
			<input aria-label="Search support requests" placeholder="Search requests…" bind:value={search} />
			<div class="support-filter" role="group" aria-label="Support status filter">
				<button class:active={filter === 'active'} type="button" onclick={() => filter = 'active'}>Active</button>
				<button class:active={filter === 'all'} type="button" onclick={() => filter = 'all'}>All</button>
				<button class:active={filter === 'resolved'} type="button" onclick={() => filter = 'resolved'}>Resolved</button>
			</div>
		</div>

		{#if form?.message}<p class="form-error">{form.message}</p>{/if}

		<div class="support-request-list">
			{#each visible as request}
				<article class="card support-request-card">
					<div class="support-request-head">
						<div>
							<div class="support-request-meta">
								<span class="tag">{request.category}</span>
								{#if request.product}<span>{request.product}</span>{/if}
								<time>{new Date(request.createdAt).toLocaleString()}</time>
							</div>
							<h2>{request.subject}</h2>
							<p class="support-from">{request.name} · <a href={`mailto:${request.email}`}>{request.email}</a></p>
						</div>
						<span class={`support-status ${request.status}`}>{label(request.status)}</span>
					</div>
					<p class="support-message">{request.message}</p>
					<form method="POST" action="?/status" class="support-status-form">
						<input type="hidden" name="id" value={request.id} />
						<label><span>Status</span>
							<select name="status" value={request.status}>
								<option value="open">Open</option>
								<option value="in_progress">In progress</option>
								<option value="resolved">Resolved</option>
							</select>
						</label>
						<button class="button secondary" type="submit">Update</button>
					</form>
				</article>
			{:else}
				<div class="card empty-state"><h2>No matching requests</h2><p>Try another filter or search term.</p></div>
			{/each}
		</div>
	</div>
</section>
