<svelte:options runes={false} />

<script lang="ts">
	import TidyIcon from './TidyIcon.svelte';
	import { closeIcon } from '../icons/tidy-icons';

	import type { FoundryActorItem } from '../models/foundry-actor';
	import type { StoredCharacter } from '../models/stored-character';
	import { getItemImageSrc } from '../assets/image-resolver';

	export let character: StoredCharacter;
	export let item: FoundryActorItem | null = null;
	export let onClose: () => void;

	type UnknownRecord = Record<string, unknown>;

	$: image = item ? getItemImageSrc(character, item) : undefined;
	$: description = item ? renderDescription(getDescription(item)) : '';
	$: pills = item ? getPropertyPills(item) : [];
	$: source = item ? getSourceLabel(item) : '';

	function isRecord(value: unknown): value is UnknownRecord {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	function asString(value: unknown): string | undefined {
		return typeof value === 'string' && value.trim() ? value.trim() : undefined;
	}

	function getNestedValue(source: unknown, ...keys: string[]): unknown {
		let current = source;
		for (const key of keys) {
			if (!isRecord(current)) return undefined;
			current = current[key];
		}
		return current;
	}

	function getDescription(value: FoundryActorItem): string {
		return asString(getNestedValue(value.system, 'description', 'value')) ?? '';
	}

	function renderDescription(value: string): string {
		if (!value) return '';

		const transformed = value
			.replace(/@UUID\[[^\]]+\]\{([^}]+)\}/g, '<span class="detail-inline-pill">$1</span>')
			.replace(/@UUID\[[^\]]+\]/g, '<span class="detail-inline-pill">Reference</span>')
			.replace(
				/@Embed\[[^\]]+\](?:\{([^}]+)\})?/g,
				(_match, label) =>
					`<span class="detail-inline-pill">${label || 'Embedded reference'}</span>`
			)
			.replace(/\[\[\/([^\]]+)\]\]/g, '<span class="detail-inline-pill">$1</span>')
			.replace(/&Reference\[([^\]]+)\]/g, '<span class="detail-inline-pill">$1</span>')
			.replace(/<section[^>]*class="[^"]*secret[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '');

		if (typeof DOMParser === 'undefined') return transformed;

		const document = new DOMParser().parseFromString(transformed, 'text/html');
		document
			.querySelectorAll('script, style, iframe, object, embed, form, input, button')
			.forEach((node) => node.remove());
		document.querySelectorAll('*').forEach((element) => {
			for (const attribute of [...element.attributes]) {
				if (attribute.name.startsWith('on') || attribute.name === 'style') {
					element.removeAttribute(attribute.name);
				}
			}
		});
		return document.body.innerHTML;
	}

	function getSourceLabel(value: FoundryActorItem): string {
		const book = asString(getNestedValue(value.system, 'source', 'book'));
		const rules = asString(getNestedValue(value.system, 'source', 'rules'));
		return [book, rules].filter(Boolean).join(' · ');
	}

	function getPropertyPills(value: FoundryActorItem): string[] {
		const labels = new Set<string>();
		const properties = value.system?.properties;

		if (Array.isArray(properties)) {
			for (const property of properties) {
				if (typeof property === 'string' && property) labels.add(formatProperty(property));
			}
		}

		if (value.system?.equipped === true) labels.add('Equipped');
		if (value.system?.attuned === true) labels.add('Attuned');
		if (value.system?.identified === true) labels.add('Identified');

		const proficient = value.system?.proficient;
		if (proficient === true || proficient === 1) labels.add('Proficient');

		const rarity = asString(value.system?.rarity);
		if (rarity) labels.add(formatLabel(rarity));

		const activation =
			asString(getNestedValue(value.system, 'activation', 'type')) ??
			getFirstActivityActivation(value);
		if (activation) labels.add(formatActivation(activation));

		const range = getNestedValue(value.system, 'range', 'value');
		const rangeUnits = asString(getNestedValue(value.system, 'range', 'units'));
		if ((typeof range === 'number' || typeof range === 'string') && `${range}` !== '') {
			labels.add(`Range ${range}${rangeUnits ? ` ${rangeUnits}` : ''}`);
		}

		const reach = getNestedValue(value.system, 'range', 'reach');
		if (typeof reach === 'number' && reach > 0) labels.add(`Reach ${reach} ft`);

		const typeValue = asString(getNestedValue(value.system, 'type', 'value'));
		if (typeValue) labels.add(formatLabel(typeValue));

		if (value.type === 'spell') {
			const level = getNestedValue(value.system, 'level');
			labels.add(typeof level === 'number' && level > 0 ? `Level ${level}` : 'Cantrip');
			const school = asString(value.system?.school);
			if (school) labels.add(formatProperty(school));
		}

		return [...labels];
	}

	function getFirstActivityActivation(value: FoundryActorItem): string | undefined {
		const activities = value.system?.activities;
		if (!isRecord(activities)) return undefined;
		for (const activity of Object.values(activities)) {
			const activation = asString(getNestedValue(activity, 'activation', 'type'));
			if (activation) return activation;
		}
		return undefined;
	}

	function formatActivation(value: string): string {
		const labels: Record<string, string> = {
			action: 'Action',
			bonus: 'Bonus Action',
			reaction: 'Reaction',
			special: 'Special',
			minute: '1 Minute',
			hour: '1 Hour'
		};
		return labels[value] ?? formatLabel(value);
	}

	function formatProperty(value: string): string {
		const labels: Record<string, string> = {
			nat: 'Natural',
			fin: 'Finesse',
			lgt: 'Light',
			two: 'Two-Handed',
			hvy: 'Heavy',
			amm: 'Ammunition',
			ver: 'Versatile',
			rch: 'Reach',
			thr: 'Thrown',
			mgc: 'Magical',
			vocal: 'Verbal',
			somatic: 'Somatic',
			material: 'Material',
			concentration: 'Concentration',
			ritual: 'Ritual',
			abj: 'Abjuration',
			con: 'Conjuration',
			div: 'Divination',
			enc: 'Enchantment',
			evo: 'Evocation',
			ill: 'Illusion',
			nec: 'Necromancy',
			trs: 'Transmutation'
		};
		return labels[value] ?? formatLabel(value);
	}

	function formatLabel(value: string): string {
		return value
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ')
			.replace(/\b\w/g, (character) => character.toUpperCase());
	}

	function handleBackdrop(event: MouseEvent): void {
		if (event.target === event.currentTarget) onClose();
	}
</script>

{#if item}
	<div class="detail-backdrop" role="presentation" on:click={handleBackdrop}>
		<dialog open class="item-details-dialog" aria-label={`${item.name} details`}>
			<header class="detail-header">
				<div class="detail-title-block">
					<span class="detail-icon">
						{#if image}<img src={image} alt="" />{:else}{item.name.charAt(0).toUpperCase()}{/if}
					</span>
					<div>
						<h2>{item.name}</h2>
						<p>
							{formatLabel(item.type)}{#if source}
								· {source}{/if}
						</p>
					</div>
				</div>
				<button type="button" class="detail-close" aria-label="Close details" on:click={onClose}
					><TidyIcon icon={closeIcon} /></button
				>
			</header>

			{#if description}
				<div class="detail-description">{@html description}</div>
			{:else}
				<div class="detail-empty">No description was included in the export.</div>
			{/if}

			{#if pills.length > 0}
				<footer class="detail-pills" aria-label="Item properties">
					{#each pills as pill}<span>{pill}</span>{/each}
				</footer>
			{/if}
		</dialog>
	</div>
{/if}
