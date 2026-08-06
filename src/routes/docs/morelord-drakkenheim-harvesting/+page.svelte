<svelte:head>
	<title>Drakkenheim Harvesting Documentation | Morelord Gaming</title>
	<meta
		name="description"
		content="Run GM-managed or collaborative Drakkenheim harvesting sessions in Foundry VTT."
	/>
</svelte:head>

<section class="page-hero tools-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Product guide</div>
		<h1>Morelord Drakkenheim Harvesting</h1>
		<p class="lead">Run a structured harvesting attempt and distribute finalized monster components to the party.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell prose-content">
		<article class="card docs-card">
			<h2>Install and enable</h2>
			<ol>
				<li>Install the module from its manifest URL on the product page.</li>
				<li>Foundry will identify Morelord Core as a required dependency and offer to install it.</li>
				<li>Enable Morelord Core and Morelord Drakkenheim Harvesting in the world.</li>
				<li>Connect Morelord Core to your Morelord Gaming account to use membership features.</li>
			</ol>
		</article>

		<article class="card docs-card">
			<h2>Content requirements</h2>
			<p>The module supports harvesting content from compatible Drakkenheim sources. <strong>Monsters of Drakkenheim</strong> is a paid Foundry package. The supported Antics &amp; Rolls harvesting content is free as of the current release.</p>
		</article>

		<article class="card docs-card">
			<h2>Start a harvesting session</h2>
			<ol>
				<li>Select or open the defeated creature.</li>
				<li>Launch the harvesting workflow from the provided actor control or GM macro.</li>
				<li>Review the available components and begin the session.</li>
			</ol>
			<p>The session mode is fixed when the harvest begins, so a later membership or connection change will not alter an active session.</p>
		</article>

		<article class="card docs-card">
			<div class="eyebrow">Included free</div>
			<h2>GM-Managed Harvesting</h2>
			<p>Standard members receive the complete harvesting workflow controlled by the GM.</p>
			<ol>
				<li>Use <strong>Claim for character</strong> at the top of the harvesting window to select a recipient.</li>
				<li>Choose <strong>Claim</strong> beside a component to assign it to that character.</li>
				<li>Switch the selected character and continue assigning the remaining components.</li>
				<li>Review all assignments and finalize the session.</li>
			</ol>
			<p>Only the GM uses the harvesting window in this mode. The existing harvesting rules, checks, awards, and finalization remain available.</p>
		</article>

		<article class="card docs-card">
			<div class="eyebrow">Tools Premium</div>
			<h2>Collaborative Player Harvesting</h2>
			<p>Premium and Champion members can include the whole table in the harvesting workflow.</p>
			<ul>
				<li>Participating players receive synchronized harvesting windows.</li>
				<li>Players use the existing Claim buttons to claim components for their own assigned characters.</li>
				<li>The GM reviews the shared results and finalizes the session.</li>
				<li>Participant windows close and completion notifications are sent after finalization.</li>
			</ul>
		</article>

		<article class="card docs-card">
			<h2>Membership changes</h2>
			<p>If Premium access ends, existing claims, awarded items, and harvesting records are preserved. Active collaborative sessions can finish normally; newly created sessions use GM-Managed Harvesting.</p>
		</article>

		<article class="card docs-card">
			<h2>Missing harvesting data</h2>
			<p>Some actors reference harvesting information through embedded journal content instead of storing it directly in the biography. Ensure the required source modules and compendiums are enabled and accessible in the world.</p>
		</article>
	</div>
</section>
