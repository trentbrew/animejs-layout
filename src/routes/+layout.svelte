<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Planets — anime.js layouts on Bits UI + tweakcn</title>
</svelte:head>

{@render children()}
