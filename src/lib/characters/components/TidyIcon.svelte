<svelte:options runes={false} />

<script lang="ts">
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

	import type { TidyIcon } from '../icons/tidy-icons';

	export let icon: TidyIcon;

	export let label: string | undefined = undefined;

	export let fixedWidth = true;

	export let className = '';
</script>

<span
	class={`tidy-icon-wrapper ${className}`.trim()}
	class:has-label={Boolean(label)}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	title={label}
>
	<FontAwesomeIcon {icon} {fixedWidth} />
</span>

<style>
	.tidy-icon-wrapper {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		color: currentColor;
		line-height: 1;
		vertical-align: middle;
	}

	.tidy-icon-wrapper :global(svg) {
		display: block;
		width: 1em;
		height: 1em;
	}

	.tidy-icon-wrapper.has-label {
		cursor: help;
	}
</style>
