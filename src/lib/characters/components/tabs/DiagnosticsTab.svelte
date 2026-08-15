<svelte:options runes={false} />

<script lang="ts">
	import type { FoundryActor, FoundryActorItem } from '../../models/foundry-actor';

	export let actor: FoundryActor;

	interface ItemTypeCount {
		type: string;
		count: number;
	}

	interface DiagnosticItem {
		id?: string;
		name: string;
		type: string;
		systemKeys: string[];
		system: unknown;
	}

	interface DiagnosticReport {
		generatedAt: string;

		actor: {
			name: string;
			id?: string;
			type: string;
			imagePath?: string;
			foundryVersion?: string;
			systemId?: string;
			systemVersion?: string;
			systemKeys: string[];
			itemCount: number;
			effectCount: number;
		};

		actorSystem: {
			abilities?: unknown;
			attributes?: unknown;
			currency?: unknown;
			details?: unknown;
			resources?: unknown;
			skills?: unknown;
			spells?: unknown;
			traits?: unknown;
		};

		itemTypes: ItemTypeCount[];

		representativeItems: DiagnosticItem[];
	}

	let selectedItemType = '';
	let selectedItemId = '';

	let copyStatus = '';
	let downloadStatus = '';

	$: itemTypeCounts = createItemTypeCounts(actor.items);

	$: filteredItems = selectedItemType
		? actor.items.filter((item) => item.type === selectedItemType)
		: actor.items;

	$: selectedItem = actor.items.find((item) => getItemIdentifier(item) === selectedItemId) ?? null;

	$: systemKeys = Object.keys(actor.system).sort();

	function createItemTypeCounts(items: FoundryActorItem[]): ItemTypeCount[] {
		const counts = new Map<string, number>();

		for (const item of items) {
			counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
		}

		return Array.from(counts.entries())
			.map(([type, count]) => ({
				type,
				count
			}))
			.sort((left, right) => left.type.localeCompare(right.type));
	}

	function getItemIdentifier(item: FoundryActorItem): string {
		return item._id ?? `${item.type}:${item.name}`;
	}

	function getItemSystemKeys(item: FoundryActorItem): string[] {
		if (!item.system) {
			return [];
		}

		return Object.keys(item.system).sort();
	}

	function formatJson(value: unknown): string {
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			return 'The selected value could not be displayed.';
		}
	}

	function handleItemTypeChange(event: Event): void {
		const select = event.currentTarget as HTMLSelectElement;

		selectedItemType = select.value;
		selectedItemId = '';
	}

	function handleItemChange(event: Event): void {
		const select = event.currentTarget as HTMLSelectElement;

		selectedItemId = select.value;
	}

	function createRepresentativeItems(): DiagnosticItem[] {
		const representatives: DiagnosticItem[] = [];
		const encounteredTypes = new Set<string>();

		for (const item of actor.items) {
			if (encounteredTypes.has(item.type)) {
				continue;
			}

			encounteredTypes.add(item.type);

			representatives.push({
				id: item._id,
				name: item.name,
				type: item.type,
				systemKeys: getItemSystemKeys(item),
				system: sanitizeItemSystem(item.system)
			});
		}

		return representatives.sort((left, right) => left.type.localeCompare(right.type));
	}

	function sanitizeItemSystem(
		system: Record<string, unknown> | undefined
	): Record<string, unknown> {
		if (!system) {
			return {};
		}

		const sanitized = structuredClone(system) as Record<string, unknown>;

		removeDescriptionContent(sanitized);

		return sanitized;
	}

	function removeDescriptionContent(value: unknown): void {
		if (typeof value !== 'object' || value === null) {
			return;
		}

		if (Array.isArray(value)) {
			for (const entry of value) {
				removeDescriptionContent(entry);
			}

			return;
		}

		const record = value as Record<string, unknown>;

		for (const key of Object.keys(record)) {
			const normalizedKey = key.toLowerCase();

			if (
				normalizedKey === 'description' ||
				normalizedKey === 'biography' ||
				normalizedKey === 'notes' ||
				normalizedKey === 'chatflavor'
			) {
				record[key] = '[content removed]';
				continue;
			}

			if (
				normalizedKey === 'value' &&
				typeof record[key] === 'string' &&
				record[key].length > 300
			) {
				record[key] = '[long text removed]';
				continue;
			}

			removeDescriptionContent(record[key]);
		}
	}

	function createDiagnosticReport(): DiagnosticReport {
		return {
			generatedAt: new Date().toISOString(),

			actor: {
				name: actor.name,
				id: actor._id,
				type: actor.type,
				imagePath: actor.img,
				foundryVersion: actor._stats?.coreVersion,
				systemId: actor._stats?.systemId,
				systemVersion: actor._stats?.systemVersion,
				systemKeys,
				itemCount: actor.items.length,
				effectCount: actor.effects.length
			},

			actorSystem: {
				abilities: actor.system.abilities,
				attributes: actor.system.attributes,
				currency: actor.system.currency,
				details: sanitizeDetails(actor.system.details),
				resources: actor.system.resources,
				skills: actor.system.skills,
				spells: actor.system.spells,
				traits: actor.system.traits
			},

			itemTypes: itemTypeCounts,

			representativeItems: createRepresentativeItems()
		};
	}

	function sanitizeDetails(details: unknown): unknown {
		if (typeof details !== 'object' || details === null) {
			return details;
		}

		const sanitized = structuredClone(details);

		removeDescriptionContent(sanitized);

		return sanitized;
	}

	async function copyDiagnosticReport(): Promise<void> {
		copyStatus = '';
		downloadStatus = '';

		const report = createDiagnosticReport();
		const text = formatJson(report);

		try {
			await navigator.clipboard.writeText(text);

			copyStatus = 'Diagnostic report copied to the clipboard.';
		} catch (error) {
			console.error(error);

			copyStatus = 'The browser could not copy the report. Use Download Report instead.';
		}
	}

	function downloadDiagnosticReport(): void {
		copyStatus = '';
		downloadStatus = '';

		try {
			const report = createDiagnosticReport();
			const json = formatJson(report);

			const blob = new Blob([json], {
				type: 'application/json'
			});

			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');

			link.href = url;
			link.download = `${createSafeFileName(actor.name)}-diagnostics.json`;

			document.body.appendChild(link);
			link.click();
			link.remove();

			URL.revokeObjectURL(url);

			downloadStatus = 'Diagnostic report downloaded.';
		} catch (error) {
			console.error(error);

			downloadStatus = 'The diagnostic report could not be downloaded.';
		}
	}

	function createSafeFileName(value: string): string {
		const safeName = value
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');

		return safeName || 'character';
	}
</script>

<section class="tab-panel">
	<div class="panel-heading">
		<div>
			<h3>Diagnostics</h3>

			<p>Inspect the structure of this imported Foundry Actor.</p>
		</div>
	</div>

	<section class="report-section">
		<div class="report-heading">
			<div>
				<h4>Diagnostic Report</h4>

				<p>
					Creates a compact report containing the Actor schema and one representative Item of each
					type.
				</p>
			</div>

			<div class="report-actions">
				<button type="button" on:click={copyDiagnosticReport}> Copy Report </button>

				<button type="button" on:click={downloadDiagnosticReport}> Download Report </button>
			</div>
		</div>

		{#if copyStatus}
			<p class="status-message">
				{copyStatus}
			</p>
		{/if}

		{#if downloadStatus}
			<p class="status-message">
				{downloadStatus}
			</p>
		{/if}
	</section>

	<section class="diagnostic-section">
		<h4>Actor Information</h4>

		<dl class="metadata-grid">
			<div>
				<dt>Name</dt>
				<dd>{actor.name}</dd>
			</div>

			<div>
				<dt>Actor Type</dt>
				<dd>{actor.type}</dd>
			</div>

			<div>
				<dt>Actor ID</dt>
				<dd>{actor._id ?? 'Unavailable'}</dd>
			</div>

			<div>
				<dt>Foundry Version</dt>
				<dd>
					{actor._stats?.coreVersion ?? 'Unknown'}
				</dd>
			</div>

			<div>
				<dt>System ID</dt>
				<dd>
					{actor._stats?.systemId ?? 'Unknown'}
				</dd>
			</div>

			<div>
				<dt>dnd5e Version</dt>
				<dd>
					{actor._stats?.systemVersion ?? 'Unknown'}
				</dd>
			</div>

			<div>
				<dt>Embedded Items</dt>
				<dd>{actor.items.length}</dd>
			</div>

			<div>
				<dt>Active Effects</dt>
				<dd>{actor.effects.length}</dd>
			</div>
		</dl>
	</section>

	<section class="diagnostic-section">
		<h4>Actor System Sections</h4>

		{#if systemKeys.length === 0}
			<p class="empty-message">No Actor system sections were found.</p>
		{:else}
			<div class="key-list">
				{#each systemKeys as key}
					<span>{key}</span>
				{/each}
			</div>
		{/if}
	</section>

	<section class="diagnostic-section">
		<h4>Embedded Item Types</h4>

		{#if itemTypeCounts.length === 0}
			<p class="empty-message">No embedded Items were found.</p>
		{:else}
			<div class="type-grid">
				{#each itemTypeCounts as itemType}
					<div class="type-card">
						<strong>{itemType.type}</strong>
						<span>{itemType.count}</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section class="diagnostic-section">
		<h4>Inspect Embedded Item</h4>

		<div class="selector-grid">
			<label>
				<span>Item Type</span>

				<select value={selectedItemType} on:change={handleItemTypeChange}>
					<option value=""> All item types </option>

					{#each itemTypeCounts as itemType}
						<option value={itemType.type}>
							{itemType.type}
							({itemType.count})
						</option>
					{/each}
				</select>
			</label>

			<label>
				<span>Item</span>

				<select value={selectedItemId} on:change={handleItemChange}>
					<option value=""> Select an item </option>

					{#each filteredItems as item}
						<option value={getItemIdentifier(item)}>
							{item.name} [{item.type}]
						</option>
					{/each}
				</select>
			</label>
		</div>

		{#if selectedItem}
			<div class="json-block">
				<div class="json-heading">
					<div>
						<strong>
							{selectedItem.name}
						</strong>

						<span>
							{selectedItem.type}
						</span>
					</div>
				</div>

				<pre>{formatJson(selectedItem)}</pre>
			</div>
		{:else}
			<p class="empty-message">Select an embedded Item to inspect its raw data.</p>
		{/if}
	</section>

	<section class="diagnostic-section">
		<details>
			<summary>Abilities JSON</summary>
			<pre>{formatJson(actor.system.abilities)}</pre>
		</details>

		<details>
			<summary>Attributes JSON</summary>
			<pre>{formatJson(actor.system.attributes)}</pre>
		</details>

		<details>
			<summary>Skills JSON</summary>
			<pre>{formatJson(actor.system.skills)}</pre>
		</details>

		<details>
			<summary>Traits JSON</summary>
			<pre>{formatJson(actor.system.traits)}</pre>
		</details>

		<details>
			<summary>Details JSON</summary>
			<pre>{formatJson(actor.system.details)}</pre>
		</details>

		<details>
			<summary> Complete Actor System JSON </summary>

			<pre>{formatJson(actor.system)}</pre>
		</details>
	</section>
</section>

<style>
	h3,
	h4,
	p {
		margin-top: 0;
	}

	button,
	select {
		font: inherit;
	}

	.tab-panel {
		padding: 1.25rem;
		border: 1px solid #454038;
		border-radius: 0.5rem;
		background: #24211d;
	}

	.panel-heading {
		margin-bottom: 1rem;
	}

	.panel-heading h3 {
		margin-bottom: 0.25rem;
	}

	.panel-heading p {
		margin-bottom: 0;
		color: #aaa398;
	}

	.report-section,
	.diagnostic-section {
		margin-top: 1rem;
		padding: 1rem;
		border: 1px solid #454038;
		border-radius: 0.4rem;
		background: #1d1b18;
	}

	.report-section {
		margin-top: 0;
		border-color: #806c48;
	}

	.report-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.report-heading h4 {
		margin-bottom: 0.25rem;
	}

	.report-heading p {
		margin-bottom: 0;
		color: #aaa398;
	}

	.report-actions {
		display: flex;
		flex: 0 0 auto;
		gap: 0.5rem;
	}

	.report-actions button {
		padding: 0.6rem 0.85rem;
		border: 1px solid #806c48;
		border-radius: 0.35rem;
		background: #4d3927;
		color: #ffffff;
		cursor: pointer;
	}

	.report-actions button:hover {
		background: #624a34;
	}

	.report-actions button:focus-visible {
		outline: 2px solid #c09a5b;
		outline-offset: 2px;
	}

	.status-message {
		margin: 0.85rem 0 0;
		color: #bad5b9;
	}

	.diagnostic-section h4 {
		margin-bottom: 1rem;
	}

	.metadata-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin: 0;
	}

	.metadata-grid dt {
		margin-bottom: 0.25rem;
		color: #8f887d;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.metadata-grid dd {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.key-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.key-list span {
		padding: 0.35rem 0.6rem;
		border: 1px solid #514c43;
		border-radius: 999px;
		background: #24211d;
		color: #c4bdae;
		font-family: monospace;
		font-size: 0.8rem;
	}

	.type-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: var(--content-card-gap);
	}

	.type-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem 0.75rem;
		border: 1px solid #514c43;
		border-radius: 0.35rem;
		background: #24211d;
	}

	.type-card strong {
		overflow-wrap: anywhere;
	}

	.type-card span {
		display: grid;
		min-width: 1.75rem;
		height: 1.75rem;
		place-items: center;
		border-radius: 999px;
		background: #302c26;
		color: #c4bdae;
		font-size: 0.8rem;
	}

	.selector-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	label {
		display: grid;
		gap: 0.4rem;
	}

	label > span {
		color: #aaa398;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	select {
		width: 100%;
		padding: 0.65rem 0.75rem;
		border: 1px solid #514c43;
		border-radius: 0.35rem;
		background: #24211d;
		color: #ece7dc;
	}

	select:focus-visible {
		outline: 2px solid #c09a5b;
		outline-offset: 2px;
	}

	.json-block {
		overflow: hidden;
		border: 1px solid #514c43;
		border-radius: 0.4rem;
	}

	.json-heading {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem;
		background: #302c26;
	}

	.json-heading strong,
	.json-heading span {
		display: block;
	}

	.json-heading span {
		margin-top: 0.2rem;
		color: #aaa398;
		font-size: 0.8rem;
	}

	details {
		margin-top: 0.75rem;
		border: 1px solid #454038;
		border-radius: 0.35rem;
		background: #24211d;
	}

	details:first-child {
		margin-top: 0;
	}

	summary {
		padding: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	summary:hover {
		background: #302c26;
	}

	pre {
		max-height: 500px;
		margin: 0;
		padding: 1rem;
		overflow: auto;
		border-top: 1px solid #454038;
		background: #141310;
		color: #d7d0c4;
		font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
		font-size: 0.78rem;
		line-height: 1.45;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.empty-message {
		margin-bottom: 0;
		color: #8f887d;
	}

	@media (max-width: 750px) {
		.report-heading {
			flex-direction: column;
		}

		.report-actions {
			width: 100%;
		}

		.report-actions button {
			flex: 1;
		}
	}

	@media (max-width: 650px) {
		.selector-grid {
			grid-template-columns: 1fr;
		}

		.report-actions {
			flex-direction: column;
		}
	}
</style>
