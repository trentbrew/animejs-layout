<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { bind, observe, set as foleySet } from '@foleyjs/core';
	import favicon from '$lib/assets/favicon.svg';
	import { applyTheme } from '$lib/theme-manifest';
	import { hydratePrefs, prefs } from '$lib/prefs.svelte';

	let { children } = $props();

	// The theme contract is applied once, at the root: colors (via the
	// `data-theme` attribute `themes.css` keys off), motion, icons, and the
	// themed half of the sound. Dark mode is global too.
	$effect(() => {
		applyTheme(prefs.theme);
		document.documentElement.classList.toggle('dark', prefs.dark);
	});

	// The un-themed half of the sound: loudness and mute are user prefs,
	// never part of a theme.
	$effect(() => {
		foleySet({ volume: prefs.volume, muted: prefs.muted, hover: prefs.hover });
	});

	// One bind covers interaction sounds for the whole page, including markup
	// rendered later; observe() sounds elements that appear or change state.
	// Persisted prefs are applied here too, so the SSR markup stays the default
	// theme and the stored one lands after hydration.
	onMount(() => {
		hydratePrefs();
		bind();
		return observe();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Entities — anime.js layouts on Bits UI + tweakcn</title>
</svelte:head>

{@render children()}
