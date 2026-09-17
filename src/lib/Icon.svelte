<script lang="ts">
	import { resolveIcon, type IconKey } from './icons';
	import { prefs } from './prefs.svelte';
	import { themeById } from './theme-manifest';

	interface Props {
		/** Semantic key, resolved against the active theme's icon set. */
		key: IconKey;
		/** Any CSS length; sets the icon's font-size. Defaults to 1em. */
		size?: number | string;
		class?: string;
		/** Accessible name. Omit for icons that sit beside a visible label. */
		label?: string;
	}

	let { key, size, class: className = '', label }: Props = $props();

	const iconSet = $derived(themeById(prefs.theme).icon);
	const resolved = $derived(resolveIcon(iconSet, key));
	const fontSize = $derived(
		size === undefined ? undefined : typeof size === 'number' ? `${size}px` : size
	);
</script>

{#if resolved}
	<svg
		{...resolved.svg.attributes}
		class="icon {className}"
		style:font-size={fontSize}
		role={label ? 'img' : undefined}
		aria-label={label}
		aria-hidden={label ? undefined : 'true'}
	>
		{@html resolved.svg.body}
	</svg>
{/if}
