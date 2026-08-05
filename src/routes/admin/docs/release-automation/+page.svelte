<svelte:head>
	<title>Release Automation | Morelord Tools</title>
	<meta
		name="description"
		content="Publish a Morelord Tools release to GitHub, Foundry VTT and the Morelord Gaming website from one structured release payload."
	/>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero tools-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord Tools documentation</div>
		<h1>Automated release publishing</h1>
		<p class="lead">
			Use one structured release file to update the website changelog after your module build and
			GitHub release are complete.
		</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell docs-layout">
		<article class="card docs-card">
			<div class="eyebrow">Release flow</div>
			<h2>One command, one source of truth</h2>
			<ol class="docs-steps">
				<li>Build and validate the Foundry module.</li>
				<li>Create the GitHub release and upload the module ZIP.</li>
				<li>Update the Foundry package release.</li>
				<li>Submit the same structured metadata to the Morelord website.</li>
				<li>The product page and public release feed update immediately.</li>
			</ol>
		</article>

		<article class="card docs-card">
			<div class="eyebrow">PowerShell</div>
			<h2>Publish from a module repository</h2>
			<p>
				Copy <code>scripts/publish-release.ps1</code> into the module repository or call it from a
				shared release-tools location.
			</p>
			<pre><code>./scripts/publish-release.ps1 `
  -WebsiteUrl "https://morelordgaming.com" `
  -Token $env:MORELORD_RELEASE_TOKEN `
  -PayloadPath "./release-payload.json"</code></pre>
			<p>
				The script validates the payload locally, sends it to the protected endpoint and fails the
				release when the website rejects the update.
			</p>
		</article>

		<article class="card docs-card docs-wide">
			<div class="eyebrow">Payload</div>
			<h2>Structured release metadata</h2>
			<pre><code>{`{
  "productSlug": "morelord-marketplace",
  "version": "0.3.0",
  "title": "Advanced merchant controls",
  "summary": "Adds premium automation and improves actor selection.",
  "publishedAt": "2026-08-04T22:30:00-05:00",
  "githubReleaseUrl": "https://github.com/.../releases/tag/v0.3.0",
  "downloadUrl": "https://github.com/.../morelord-marketplace.zip",
  "manifestUrl": "https://github.com/.../module.json",
  "changes": [
    {
      "category": "improvement",
      "tier": "standard",
      "description": "Selected tokens now take priority for player transactions."
    },
    {
      "category": "feature",
      "tier": "premium",
      "description": "Added configurable GM approval workflows."
    }
  ]
}`}</code></pre>
		</article>

		<article class="card docs-card">
			<div class="eyebrow">Security</div>
			<h2>Keep the publishing token private</h2>
			<ul class="feature-list">
				<li>Store the production token in GitHub Actions secrets.</li>
				<li>Never commit it to a module or website repository.</li>
				<li>Use a separate local token for development.</li>
				<li>Rotate the token immediately if it is exposed.</li>
			</ul>
		</article>

		<article class="card docs-card">
			<div class="eyebrow">Idempotent updates</div>
			<h2>Safe to rerun</h2>
			<p>
				A product and version pair is unique. Republishing the same version updates its title,
				summary, URLs and change list instead of creating a duplicate release.
			</p>
			<a class="text-link" href="/releases">View published releases <span>→</span></a>
		</article>
	</div>
</section>
