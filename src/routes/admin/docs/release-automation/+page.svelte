<svelte:head>
	<title>Release Automation | Morelord Tools</title>
	<meta
		name="description"
		content="Standard Morelord Foundry release workflow for GitHub, Foundry manifests and the Morelord Gaming public release feed."
	/>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Publishing</div>
		<h1>Standard module release workflow</h1>
		<p class="lead">
			All Morelord Foundry modules use the same release script. Repository-specific settings live in
			<code>release.config.json</code>, while one release-notes file drives both GitHub and the public website feed.
		</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell prose-layout">
		<article class="card prose-card">
			<h2>1. Standard files in every module repository</h2>
			<p>Each module repository should contain:</p>
			<pre><code>release.ps1
release.config.json
RELEASE-NOTES-x.y.z.md
module.json</code></pre>
			<p>
				The PowerShell script is intentionally identical across Morelord module repositories. Only
				<code>release.config.json</code> changes between products.
			</p>

			<h2>2. Configure the local website publishing token</h2>
			<p>
				Normal releases publish to <code>/releases</code> automatically through the protected
				<code>/api/releases</code> endpoint. Store the publishing token in the local PowerShell environment;
				never commit it to a repository.
			</p>
			<pre><code>$env:MORELORD_RELEASE_TOKEN = "&lt;RELEASE_PUBLISH_TOKEN&gt;"</code></pre>
			<p>
				The script also accepts <code>RELEASE_PUBLISH_TOKEN</code> or an explicit
				<code>-WebsiteToken</code> parameter.
			</p>

			<h2>3. Write release notes first</h2>
			<p>
				Create <code>RELEASE-NOTES-x.y.z.md</code> before running the release. The same file becomes the
				GitHub Release body and is parsed into the Morelord website changelog.
			</p>
			<pre><code># Morelord Marketplace 0.4.0

## Added

- Added transaction history.
- [Premium] Added advanced transaction audit filters.

## Fixed

- Corrected actor selection after switching tokens.</code></pre>
			<p>
				Recognized change headings are <strong>Added</strong>, <strong>Features</strong>,
				<strong>Improvements</strong>, <strong>Changed</strong>, <strong>Fixed</strong>,
				<strong>Breaking Changes</strong>, and <strong>Security</strong>. Prefix a bullet with
				<code>[Premium]</code> or <code>[Champion]</code> for tier-specific entries. Unmarked entries are Standard.
			</p>

			<h2>4. Always run a dry run</h2>
			<pre><code>.\release.ps1 -Version 0.4.0 -DryRun</code></pre>
			<p>The dry run validates:</p>
			<ul>
				<li>Git repository, branch, remote and clean working tree.</li>
				<li>Version and manifest structure.</li>
				<li>Release notes and website payload generation.</li>
				<li>Foundry ZIP contents, manifest URLs and forbidden development files.</li>
				<li>Existing local and remote tags.</li>
			</ul>
			<p>No project files, commits, tags, GitHub releases or website records are changed.</p>

			<h2>5. Publish a normal release</h2>
			<pre><code>.\release.ps1 -Version 0.4.0</code></pre>
			<p>A successful normal release performs the complete workflow:</p>
			<ol>
				<li>Updates <code>module.json</code> with the new version and permanent URLs.</li>
				<li>Builds and validates the Foundry release ZIP.</li>
				<li>Commits the manifest update.</li>
				<li>Creates and pushes the annotated Git tag.</li>
				<li>Creates the GitHub Release using the same release-notes file.</li>
				<li>Publishes or updates the matching Morelord Gaming website release record.</li>
			</ol>

			<h2>6. Drafts and prereleases</h2>
			<pre><code>.\release.ps1 -Version 0.4.0 -Prerelease
.\release.ps1 -Version 0.4.0 -Draft</code></pre>
			<p>
				Drafts and prereleases are not sent to the public Morelord website release feed. This prevents
				unfinished builds from appearing as normal product updates.
			</p>

			<h2>7. Recover a failed website publication</h2>
			<p>
				The website endpoint is idempotent by product and version. If GitHub release creation succeeds but
				website publication fails, do not recreate the Git tag or GitHub Release. Retry only the website step:
			</p>
			<pre><code>.\release.ps1 -Version 0.4.0 -WebsiteOnly</code></pre>
			<p>
				This is also how older releases can be backfilled into <code>/releases</code> after adopting the
				standard workflow.
			</p>

			<h2>8. Exceptional bypass</h2>
			<pre><code>.\release.ps1 -Version 0.4.0 -SkipWebsitePublish</code></pre>
			<p>
				Use this only when a normal GitHub/Foundry release intentionally should not appear in the website
				release feed. It should not be part of the normal workflow.
			</p>
		</article>
	</div>
</section>
