<script lang="ts">
	import { renderReleaseMarkdown } from '$lib/release-notes';

	let { text, inline = false }: { text: string | null | undefined; inline?: boolean } = $props();
	const html = $derived(renderReleaseMarkdown(text));
</script>

<!-- renderReleaseMarkdown escapes input and only emits strong, em, code, and http(s) links. -->
{#if html}
	{#if inline}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<span class="release-copy">{@html html}</span>
	{:else}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<p class="release-copy">{@html html}</p>
	{/if}
{/if}
