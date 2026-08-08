<script lang="ts">
	import type { PageData } from './$types';

	type FieldName = 'name' | 'email' | 'category' | 'product' | 'subject' | 'message';
	type SupportForm = { success?: boolean; message?: string; values?: Partial<Record<FieldName, string>> } | null;

	let { data, form }: { data: PageData; form: SupportForm } = $props();

	function prior(field: FieldName, fallback = ''): string {
		return form?.values?.[field] ?? fallback;
	}
</script>

<svelte:head>
	<title>Support | Morelord Gaming</title>
	<meta name="description" content="Contact Morelord Gaming for product, account, billing, bug and feature-request support." />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord support</div>
		<h1>How can I help?</h1>
		<p class="lead">Send a support request and it will be tracked directly through Morelord Gaming.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell support-layout">
		<div>
			<div class="section-heading support-heading">
				<div>
					<div class="eyebrow">Contact support</div>
					<h2>Send a request</h2>
				</div>
			</div>

			{#if form?.success}
				<div class="card support-success" role="status">
					<h3>Request received</h3>
					<p>Thanks. Your request has been saved and can now be reviewed by Morelord Gaming.</p>
				</div>
			{:else}
				<form method="POST" class="card support-form form-grid">
					{#if form?.message}<p class="form-error form-span-2">{form.message}</p>{/if}
					<label>
						<span>Name *</span>
						<input name="name" autocomplete="name" required maxlength="120" placeholder="Your name" value={prior('name')} />
					</label>
					<label>
						<span>Email *</span>
						<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com" value={prior('email')} />
					</label>
					<label>
						<span>Category *</span>
						<select name="category" required value={prior('category', 'Technical Support')}>
							{#each data.categories as category}<option value={category}>{category}</option>{/each}
						</select>
					</label>
					<label>
						<span>Product</span>
						<select name="product" value={prior('product')}>
							<option value="">Not product-specific</option>
							{#each data.products as product}<option value={product}>{product}</option>{/each}
						</select>
					</label>
					<label class="form-span-2">
						<span>Subject *</span>
						<input name="subject" required maxlength="180" placeholder="Brief summary of your request" value={prior('subject')} />
					</label>
					<label class="form-span-2">
						<span>Message *</span>
						<textarea name="message" required rows="9" maxlength="5000" placeholder="Tell us what happened, what you expected, and any details that may help us reproduce or resolve the issue.">{prior('message')}</textarea>
					</label>
					<label class="support-honeypot" aria-hidden="true">
						<span>Website</span><input name="website" tabindex="-1" autocomplete="off" />
					</label>
					<div class="form-span-2 support-submit">
						<button class="button primary" type="submit">Send support request</button>
						<small>Support requests are stored securely on the Morelord Gaming site. No personal support email address is exposed.</small>
					</div>
				</form>
			{/if}
		</div>

		<aside class="card support-aside">
			<div class="eyebrow">Before submitting</div>
			<h2>Include the useful details</h2>
			<p>For a Foundry issue, include the module name and version, your Foundry version, the game system and version, and what you expected to happen.</p>
			<p>For billing or account questions, use the same email address associated with your Morelord Gaming account when possible.</p>
			<a class="text-link" href="/releases">Check recent product updates <span>→</span></a>
		</aside>
	</div>
</section>
