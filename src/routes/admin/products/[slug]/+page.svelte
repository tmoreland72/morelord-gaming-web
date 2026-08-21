<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();

	const keepForm: SubmitFunction = () => async ({ update }) => {
		await update({ reset: false, invalidateAll: true });
	};

	const resetForm: SubmitFunction = () => async ({ result, update }) => {
		await update({ reset: result.type === 'success', invalidateAll: true });
	};

	const saveFeatureForm: SubmitFunction = ({ formElement }) => async ({ result, update }) => {
		await update({ reset: false, invalidateAll: true });
		if (result.type === 'success') formElement.closest('details')?.removeAttribute('open');
	};

	function field(name: 'slug' | 'name' | 'summary' | 'status' | 'githubRepository' | 'manifestUrl', fallback: string): string {
		if (!form || typeof form !== 'object' || !('fields' in form)) return fallback;
		const fields = (form as { fields?: Record<string, unknown> }).fields;
		const current = fields?.[name];
		return typeof current === 'string' ? current : fallback;
	}
</script>

<svelte:head>
	<title>{data.isNew ? 'Add product' : `Edit ${data.product?.name}`} | Morelord Administration</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<section class="page-hero compact-hero">
	<div class="shell">
		<div class="eyebrow">Morelord administration</div>
		<h1>{data.isNew ? 'Add a product' : data.product?.name}</h1>
		<p class="lead">Manage public catalog metadata and the features unlocked at each membership level.</p>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell admin-dashboard">
		<div class="admin-toolbar">
			<a class="button secondary" href="/admin/products">Back to products</a>
			{#if data.product?.status === 'active'}
				<a class="button secondary" href={`/tools/${data.product.slug}`}>View public page</a>
			{/if}
		</div>

		{#if form && 'productError' in form && form.productError}
			<div class="error-banner">{form.productError}</div>
		{/if}
		{#if form && 'featureError' in form && form.featureError}
			<div class="error-banner">{form.featureError}</div>
		{/if}

		<form class="card admin-editor" method="POST" action="?/saveProduct" use:enhance={keepForm}>
			<div class="section-heading">
				<div><div class="eyebrow">Catalog record</div><h2>Product details</h2></div>
				<p>Changing the slug changes the public product URL.</p>
			</div>

			<div class="form-grid">
				<label>
					<span>Name</span>
					<input name="name" required maxlength="100" value={field('name', data.product?.name ?? '')} />
				</label>
				<label>
					<span>Slug</span>
					<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={field('slug', data.product?.slug ?? '')} />
				</label>
				<label class="form-span-2">
					<span>Summary</span>
					<textarea name="summary" required rows="4" maxlength="500">{field('summary', data.product?.summary ?? '')}</textarea>
				</label>
				<label>
					<span>Status</span>
					<select name="status" value={field('status', data.product?.status ?? 'draft')}>
						<option value="draft">Draft</option>
						<option value="active">Active</option>
						<option value="retired">Retired</option>
					</select>
				</label>
				<label>
					<span>GitHub repository URL</span>
					<input name="githubRepository" type="url" value={field('githubRepository', data.product?.githubRepository ?? '')} />
				</label>
				<label class="form-span-2">
					<span>Foundry manifest URL</span>
					<input name="manifestUrl" type="url" value={field('manifestUrl', data.product?.manifestUrl ?? '')} />
				</label>
			</div>

			<div class="actions"><button class="button" type="submit">{data.isNew ? 'Create product' : 'Save product'}</button></div>
		</form>

		{#if data.product}
			<section class="account-section">
				<div class="section-heading">
					<div><div class="eyebrow">Feature gating</div><h2>Standard and premium features</h2></div>
					<p>Foundry entitlement responses are generated from these assignments.</p>
				</div>

				<div class="admin-feature-list">
					{#each data.features as feature, index (feature.id)}
						<article class="card admin-feature-row">
							<div><span class="tag">{feature.key}</span><h3>{feature.name}</h3><p>{feature.description ?? 'No description supplied.'}</p></div>
							<form method="POST" action="?/reorderFeature" use:enhance={keepForm} class="feature-order-form" aria-label={`Reorder ${feature.name}`}>
								<input type="hidden" name="featureId" value={feature.id} />
								<button class="button secondary order-button" type="submit" name="direction" value="up" disabled={index === 0} aria-label={`Move ${feature.name} up`}>↑</button>
								<button class="button secondary order-button" type="submit" name="direction" value="down" disabled={index === data.features.length - 1} aria-label={`Move ${feature.name} down`}>↓</button>
							</form>
							<details class="feature-edit-panel">
								<summary class="button secondary">Update</summary>
								<form method="POST" action="?/updateFeature" use:enhance={saveFeatureForm} class="admin-editor inline-feature-editor">
									<input type="hidden" name="featureId" value={feature.id} />
									<div class="form-grid">
										<label><span>Feature key</span><input name="key" required value={feature.key} pattern="[a-z0-9]+(?:[.-][a-z0-9]+)*" /></label>
										<label><span>Display name</span><input name="name" required maxlength="120" value={feature.name} /></label>
										<label class="form-span-2"><span>Description</span><textarea name="description" rows="3">{feature.description ?? ''}</textarea></label>
										<label><span>Required tier</span><select name="tier" value={feature.tier}><option value="standard">Standard</option><option value="premium">Premium</option><option value="champion">Champion</option></select></label>
									</div>
									<div class="actions"><button class="button" type="submit">Save feature</button></div>
								</form>
							</details>
							<form method="POST" action="?/removeFeature" use:enhance={keepForm} class="feature-remove-form">
								<input type="hidden" name="featureId" value={feature.id} />
								<button class="button secondary danger-button" type="submit">Remove</button>
							</form>
						</article>
					{/each}
				</div>

				<form class="card admin-editor feature-editor" method="POST" action="?/addFeature" use:enhance={resetForm}>
					<div><div class="eyebrow">Add or assign</div><h3>Product feature</h3><p>Using an existing feature key updates its shared name and description, then assigns it to this product.</p></div>
					<div class="form-grid">
						<label><span>Feature key</span><input name="key" required placeholder="marketplace.advanced-pricing" /></label>
						<label><span>Display name</span><input name="name" required maxlength="120" /></label>
						<label class="form-span-2"><span>Description</span><textarea name="description" rows="3"></textarea></label>
						<label><span>Required tier</span><select name="tier"><option value="standard">Standard</option><option value="premium">Premium</option><option value="champion">Champion</option></select></label>
					</div>
					<div class="actions"><button class="button" type="submit">Add feature</button></div>
				</form>
			</section>
		{/if}
	</div>
</section>
