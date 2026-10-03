<script lang="ts">
	import { resolve } from '$app/paths';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { getProductDocGroups } from '$lib/product-docs';
	import type { LayoutProps } from './$types';
	let { children }: LayoutProps = $props();
	const groups = getProductDocGroups();
	let sections = $state<{ title: string; href: string; nested: boolean }[]>([]);
	afterNavigate(async () => {
		await tick();
		const parts = Array.from(document.querySelectorAll<HTMLElement>('[data-doc-part]'));
		for (const part of parts) {
			const ids: string[] = [];
			for (const [index, heading] of Array.from(
				part.querySelectorAll<HTMLElement>('h2, h3, h4')
			).entries()) {
				heading.dataset.originalId ??=
					heading.id ||
					heading.textContent
						?.toLowerCase()
						.replace(/[^\w\s-]/g, '')
						.trim()
						.replace(/\s+/g, '-') ||
					`section-${index + 1}`;
				heading.id = `${part.id}--${heading.dataset.originalId}`;
				if (ids.includes(heading.id)) heading.id += `-${index + 1}`;
				ids.push(heading.id);
			}
			for (const link of part.querySelectorAll<HTMLAnchorElement>('a[href]')) {
				link.dataset.originalHref ??= link.getAttribute('href') ?? '';
				const href = link.dataset.originalHref;
				if (href.startsWith('#')) link.setAttribute('href', `#${part.id}--${href.slice(1)}`);
				else {
					const [route, hash] = href.split('#');
					const target = parts.find((candidate) => candidate.dataset.docRoute === route);
					if (target) link.setAttribute('href', `#${target.id}${hash ? `--${hash}` : ''}`);
				}
			}
		}
		sections = Array.from(
			document.querySelectorAll<HTMLElement>(
				'.wiki-article .docs-prose h2, .wiki-article .docs-prose h3'
			)
		).map((heading) => ({
			title: heading.textContent ?? '',
			href: `${page.url.pathname}#${heading.id}`,
			nested: heading.tagName === 'H3'
		}));
		const requested = document.querySelector<HTMLElement>('[data-requested-document]')?.dataset
			.requestedDocument;
		if (page.url.hash) {
			const hash = decodeURIComponent(page.url.hash.slice(1));
			(
				document.getElementById(hash) ?? document.getElementById(`${requested}--${hash}`)
			)?.scrollIntoView();
		} else {
			if (requested && requested !== parts[0]?.id)
				document.getElementById(requested)?.scrollIntoView();
		}
	});
</script>

<div class="shell wiki-layout">
	<aside class="wiki-sidebar">
		<a class="wiki-title" href={resolve('/docs')}>Morelord Tools <span>Documentation</span></a>
		<nav aria-label="Module documentation">
			<a href={resolve('/docs')} aria-current={page.url.pathname === '/docs' ? 'page' : undefined}
				>All modules</a
			>
			{#each groups as group (group.product)}
				{@const selected =
					page.url.pathname === group.href || page.url.pathname.startsWith(`${group.href}/`)}
				<details open={selected}>
					<summary
						class:active={selected}
						onclick={(event) => {
							if (!selected && !(event.target instanceof HTMLAnchorElement))
								goto(resolve('/docs/[product]/[...path]', { product: group.product, path: '' }));
						}}
					>
						<a
							href={resolve('/docs/[product]/[...path]', { product: group.product, path: '' })}
							aria-current={page.url.pathname === group.href ? 'page' : undefined}>{group.title}</a
						>
					</summary>
					<div class="wiki-pages">
						{#if selected}
							<div class="wiki-sections module-sections">
								{#each sections as section (section.href)}
									<a href={'#' + section.href.split('#')[1]} class:nested={section.nested}
										>{section.title}</a
									>
								{/each}
							</div>
						{/if}
					</div>
				</details>
			{/each}
		</nav>
	</aside>
	<div class="wiki-article">{@render children()}</div>
</div>

<style>
	:global(main:has(.wiki-layout)) {
		overflow: clip;
	}
	.wiki-layout {
		display: grid;
		grid-template-columns: 275px minmax(0, 1fr);
		gap: clamp(2rem, 4vw, 4rem);
		padding-block: 2.5rem 4rem;
	}
	.wiki-sidebar {
		align-self: start;
		position: sticky;
		top: 6.5rem;
		max-height: calc(100dvh - 8rem);
		overflow-y: auto;
		padding-right: 1rem;
	}
	.wiki-title {
		display: block;
		margin-bottom: 1.5rem;
		color: var(--gold-light);
		font-weight: 750;
	}
	.wiki-title span {
		display: block;
		margin-top: 0.3rem;
		color: var(--muted);
		font-size: 0.85rem;
		font-weight: 400;
	}
	nav {
		display: block;
	}
	nav a,
	summary {
		display: block;
		padding: 0.55rem 0.7rem;
		color: var(--muted);
		font-size: 0.9rem;
		font-weight: 400;
		line-height: 1.4;
		border-radius: 5px;
	}
	summary a {
		display: inline;
		padding: 0;
	}
	summary {
		display: list-item;
		cursor: pointer;
		list-style-position: inside;
	}
	nav a::after {
		display: none;
	}
	nav a:hover,
	summary:hover {
		color: #fff5d8;
		background: #ffffff08;
	}
	.active,
	nav a[aria-current='page'] {
		color: var(--gold-light);
		background: #d49b2c16;
	}
	.wiki-pages {
		margin: 0.3rem 0 0.7rem 0.85rem;
		padding-left: 0.65rem;
		border-left: 1px solid #d49b2c40;
	}
	.wiki-sections {
		margin-left: 0.65rem;
		border-left: 1px dotted #d49b2c40;
	}
	.wiki-sections a {
		font-size: 0.8rem;
		padding-block: 0.3rem;
	}
	.wiki-sections a.nested {
		padding-left: 1.4rem;
	}
	.module-sections {
		margin-left: 0;
		border-left: 0;
	}
	.wiki-article {
		min-width: 0;
	}
	@media (max-width: 880px) {
		.wiki-layout {
			grid-template-columns: 1fr;
			gap: 2rem;
			padding-top: 1.5rem;
		}
		.wiki-sidebar {
			position: static;
			max-height: 22rem;
			padding-bottom: 1rem;
			border-bottom: 1px solid #d49b2c40;
		}
	}
</style>
