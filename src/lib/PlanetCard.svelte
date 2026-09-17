<script lang="ts">
	import type { Planet } from './planets';

	interface Props {
		planet: Planet;
		index: number;
		total: number;
		removed?: boolean;
		open?: boolean;
		/** Rendered inside the dialog: enables the close button and the extra copy. */
		overlay?: boolean;
		onselect?: (planet: Planet) => void;
		onclose?: () => void;
	}

	let {
		planet,
		index,
		total,
		removed = false,
		open = false,
		overlay = false,
		onselect,
		onclose
	}: Props = $props();

	/*
	 * anime.js `createLayout` keys every node by `data-layout-id` and matches
	 * elements across layout roots by that id. The dialog card is a *separate*
	 * render of the same planet, so both copies must declare identical ids for
	 * the parts the dialog layout tracks — that is what turns a clone into a
	 * per-element FLIP morph instead of a cross-fade.
	 */
	const id = $derived(`card-${planet.id}`);
</script>

<a
	href="#{planet.id}"
	class="card"
	class:is-removed={removed}
	class:is-open={open}
	data-color={planet.color}
	data-layout-id={id}
	style="--index: {index}; --total: {total}"
	onclick={(event) => {
		event.preventDefault();
		if (!overlay) onselect?.(planet);
	}}
>
	<button
		type="button"
		class="close-overlay"
		data-layout-id="{id}-close"
		disabled={!overlay}
		tabindex={overlay ? 0 : -1}
		aria-hidden={!overlay}
		onclick={(event) => {
			event.preventDefault();
			event.stopPropagation();
			onclose?.();
		}}>×</button
	>
	<div class="card-image" data-layout-id="{id}-image">
		<div class="card-image-grid" data-layout-id="{id}-image-grid"></div>
		<svg class="planet" viewBox="0 0 600 600" aria-hidden="true">
			<circle cx="300" cy="300" r={planet.radius} />
		</svg>
		{#if planet.rings.length}
			<svg class="rings" viewBox="0 0 600 600" aria-hidden="true">
				{#each planet.rings as ring}
					<circle cx="300" cy="300" r={ring} />
				{/each}
			</svg>
		{/if}
	</div>
	<div class="card-text" data-layout-id="{id}-text">
		<h2 class="card-title" data-layout-id="{id}-title">{planet.name}</h2>
		<p class="card-type" data-layout-id="{id}-type">{planet.type}</p>
		<div class="card-info" data-layout-id="{id}-info">
			<span class="card-intro-description" data-layout-id="{id}-intro">{planet.description}</span>
			<span class="card-more-info" data-layout-id="{id}-more">
				<ul data-layout-id="{id}-facts">
					{#each planet.facts as fact}
						<li>{fact}</li>
					{/each}
				</ul>
			</span>
		</div>
	</div>
</a>
