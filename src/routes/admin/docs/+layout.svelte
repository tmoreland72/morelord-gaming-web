<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import { adminDocGuides } from '$lib/admin-docs';
	import type { LayoutProps } from './$types';
	let { children }: LayoutProps = $props();
	let sections = $state<{ title: string; id: string; nested: boolean }[]>([]);
	afterNavigate(async () => {
		await tick();
		sections = Array.from(
			document.querySelectorAll<HTMLElement>('.admin-wiki-article h2, .admin-wiki-article h3')
		).map((heading, index) => {
			if (!heading.id) heading.id = `section-${index + 1}`;
			return { title: heading.textContent ?? '', id: heading.id, nested: heading.tagName === 'H3' };
		});
		if (page.url.hash)
			document.getElementById(decodeURIComponent(page.url.hash.slice(1)))?.scrollIntoView();
	});
</script>

<div class="shell admin-wiki">
	<aside>
		<a class="wiki-title" href={resolve('/admin/docs')}>Administration documentation</a>
		<nav aria-label="Administrator documentation">
			<a
				href={resolve('/admin/docs')}
				aria-current={page.url.pathname === '/admin/docs' ? 'page' : undefined}>All guides</a
			>
			{#each adminDocGuides as guide (guide.slug)}
				{@const selected = page.url.pathname === `/admin/docs/${guide.slug}`}
				<a href={resolve(`/admin/docs/${guide.slug}`)} aria-current={selected ? 'page' : undefined}
					>{guide.title}</a
				>
				{#if selected}
					<div class="wiki-sections">
						{#each sections as section (section.id)}
							<a href={`#${section.id}`} class:nested={section.nested}>{section.title}</a>
						{/each}
					</div>
				{/if}
			{/each}
		</nav>
	</aside>
	<div class="admin-wiki-article">{@render children()}</div>
</div>

<style>
	:global(main:has(.admin-wiki)) {
		overflow: clip;
	}
	.admin-wiki {
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		gap: 3rem;
		padding-block: 2.5rem 4rem;
	}
	aside {
		align-self: start;
		position: sticky;
		top: 9.5rem;
		max-height: calc(100dvh - 11rem);
		overflow-y: auto;
	}
	.wiki-title {
		display: block;
		color: var(--gold-light);
		font-weight: 750;
		margin-bottom: 1.5rem;
	}
	nav {
		display: block;
	}
	nav a {
		display: block;
		padding: 0.55rem 0.7rem;
		font-size: 0.9rem;
		font-weight: 400;
		line-height: 1.4;
	}
	nav a::after {
		display: none;
	}
	nav a[aria-current='page'] {
		color: var(--gold-light);
		background: #d49b2c16;
	}
	.wiki-sections {
		margin-left: 0.85rem;
		border-left: 1px solid #d49b2c40;
	}
	.wiki-sections a {
		font-size: 0.8rem;
		padding-block: 0.3rem;
	}
	.wiki-sections .nested {
		padding-left: 1.4rem;
	}
	.admin-wiki-article {
		min-width: 0;
	}
	.admin-wiki-article :global(.shell) {
		width: 100%;
	}
	.admin-wiki-article :global(.page-hero) {
		padding: 0;
		background: none;
		border: 0;
	}
	.admin-wiki-article :global(.page-hero::before) {
		display: none;
	}
	.admin-wiki-article :global(h2) {
		font-size: clamp(1.6rem, 3vw, 2.1rem);
		margin-top: 2rem;
	}
	.admin-wiki-article :global(h1) {
		font-size: clamp(2.3rem, 5vw, 3.5rem);
	}
	.admin-wiki-article :global(.section) {
		padding-block: 1.5rem;
		background: none;
	}
	.admin-wiki-article :global(.card) {
		padding: 0;
		background: none;
		border: 0;
		box-shadow: none;
	}
	.admin-wiki-article :global(h2),
	.admin-wiki-article :global(h3) {
		scroll-margin-top: 10rem;
	}
	@media (max-width: 880px) {
		.admin-wiki {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		aside {
			position: static;
			max-height: 22rem;
			border-bottom: 1px solid #d49b2c40;
			padding-bottom: 1rem;
		}
	}
</style>
