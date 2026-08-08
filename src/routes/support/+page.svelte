<script lang="ts">
	type FieldName = 'name' | 'email' | 'subject' | 'message';
	type ContactForm = { success?: boolean; message?: string; values?: Partial<Record<FieldName, string>> } | null;

	let { form }: { form: ContactForm } = $props();

	function prior(field: FieldName): string {
		return form?.values?.[field] ?? '';
	}
</script>

<svelte:head>
	<title>Contact Us | Morelord Gaming</title>
	<meta name="description" content="Contact Morelord Gaming with a general inquiry." />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Contact Morelord Gaming</div>
		<h1>Contact Us</h1>
		<p class="lead">Have a general question or want to get in touch? Send us a message.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell support-layout">
		<div>
			<div class="section-heading support-heading">
				<div>
					<div class="eyebrow">Get in touch</div>
					<h2>Send a message</h2>
				</div>
			</div>

			{#if form?.success}
				<div class="card support-success" role="status">
					<h3>Message received</h3>
					<p>Thanks for contacting Morelord Gaming. Your message has been received.</p>
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
					<label class="form-span-2">
						<span>Subject *</span>
						<input name="subject" required maxlength="180" placeholder="What would you like to contact us about?" value={prior('subject')} />
					</label>
					<label class="form-span-2">
						<span>Message *</span>
						<textarea name="message" required rows="9" maxlength="5000" placeholder="Your message">{prior('message')}</textarea>
					</label>
					<label class="support-honeypot" aria-hidden="true">
						<span>Website</span><input name="website" tabindex="-1" autocomplete="off" />
					</label>
					<div class="form-span-2 support-submit">
						<button class="button primary" type="submit">Send message</button>
					</div>
				</form>
			{/if}
		</div>

		<aside class="card support-aside">
			<div class="eyebrow">Need product help?</div>
			<h2>Use the Morelord Gaming Discord</h2>
			<p>For help with Morelord Gaming products, Foundry modules, setup questions, bug reports, or community support, please use the Morelord Gaming Discord.</p>
			<p>This contact form is intended for general inquiries rather than technical support.</p>
		</aside>
	</div>
</section>
