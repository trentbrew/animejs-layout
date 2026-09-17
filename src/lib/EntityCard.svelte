<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { longDate } from './calendar';
	import Icon from './Icon.svelte';
	import { projection, type Entity } from './entities';
	import EntityFields from './EntityFields.svelte';
	import { createEntityDraft } from './entityDraft.svelte';
	import { schemaFor, type DialogMode } from './schema';

	/** Grid placement used only by the `calendar` layout. */
	export type Placement = { col: number; row: number; slot: number };

	interface Props {
		entity: Entity;
		index: number;
		total: number;
		removed?: boolean;
		open?: boolean;
		/** Rendered inside the dialog: enables the close button and the extra copy. */
		overlay?: boolean;
		placement?: Placement | null;
		/** Dialog opens in this mode; `create` flows start in `edit`. */
		startMode?: DialogMode;
		onselect?: (entity: Entity) => void;
		onclose?: () => void;
	}

	let {
		entity,
		index,
		total,
		removed = false,
		open = false,
		overlay = false,
		placement = null,
		startMode = 'view',
		onselect,
		onclose
	}: Props = $props();

	const view = $derived(projection(entity));

	/*
	 * One draft per dialog render, shared by the title (edited in place below)
	 * and the field list. The overlay unmounts when the selection clears, so a
	 * reopened dialog starts in `read` with a clean draft.
	 */
	// `startMode` is read once, at mount, and never tracked — later changes to it
	// must not re-mode a dialog the user is already using.
	const draft = createEntityDraft(() => entity, { mode: untrack(() => startMode) });
	const titleField = $derived(schemaFor(entity.class).find((field) => field.valueType === 'title'));

	/*
	 * Cleanup is tied to unmount, not to an `$effect`. The overlay render is
	 * unmounted between selections, so a reopened dialog already gets a fresh
	 * draft — and an effect here would re-run on every `entity` prop identity
	 * change (i.e. after every write) and cancel the pending flush.
	 */
	onDestroy(() => draft.destroy());

	/*
	 * `--col` / `--row` / `--slot` are placement, not motion: anime.js mutes
	 * transforms before measuring but margins are part of the rect, so the
	 * slot offset has to be a margin rather than a translate.
	 */
	const placementStyle = $derived(
		placement
			? `; --col: ${placement.col}; --row: ${placement.row}; --slot: ${placement.slot}`
			: ''
	);

	/*
	 * In calendar mode the visual region, type chip and summary are all hidden,
	 * so the card would otherwise announce as a bare title. The date lives in the
	 * day-cell chrome, which is decorative, so it has to ride on the chip label.
	 */
	const ariaLabel = $derived(
		placement && entity.startDate
			? `${longDate(entity.startDate, entity.allDay ? undefined : entity.startTime)} — ${view.title}, ${view.subtitle}`
			: undefined
	);

	/*
	 * anime.js `createLayout` keys every node by `data-layout-id` and matches
	 * elements across layout roots by that id. The dialog card is a *separate*
	 * render of the same entity, so both copies must declare identical ids for
	 * the parts the dialog layout tracks — that is what turns a clone into a
	 * per-element FLIP morph instead of a cross-fade.
	 *
	 * The id set below must stay in lockstep with `modalLayout.children` in
	 * `+page.svelte`; dropping a part degrades that part to a cross-fade.
	 */
	const id = $derived(`e-${entity.id}`);
</script>

<a
	href="#{entity.id}"
	class="card"
	class:is-removed={removed}
	class:is-open={open}
	data-color={view.color}
	data-visual={view.visual.kind}
	data-layout-id={id}
	aria-label={ariaLabel}
	data-hover-cue
	style="--index: {index}; --total: {total}{placementStyle}"
	onclick={(event) => {
		event.preventDefault();
		if (!overlay) onselect?.(entity);
	}}
>
	<button
		type="button"
		class="close-overlay"
		data-layout-id="{id}-close"
		disabled={!overlay}
		tabindex={overlay ? 0 : -1}
		aria-hidden={!overlay}
		data-foley-click="whoosh"
		onclick={(event) => {
			event.preventDefault();
			event.stopPropagation();
			onclose?.();
		}}><Icon key="action.close" /></button
	>

	<div class="card-visual" data-layout-id="{id}-visual">
		<div class="card-visual-grid" data-layout-id="{id}-visual-grid"></div>

		{#if view.visual.kind === 'orb'}
			<svg class="planet" viewBox="0 0 600 600" aria-hidden="true">
				<circle cx="300" cy="300" r={view.visual.radius} />
			</svg>
			{#if view.visual.rings.length}
				<svg class="rings" viewBox="0 0 600 600" aria-hidden="true">
					{#each view.visual.rings as ring}
						<circle cx="300" cy="300" r={ring} />
					{/each}
				</svg>
			{/if}
		{:else if view.visual.kind === 'date'}
			<span class="visual-date">
				<span class="visual-date-month">{view.visual.month}</span>
				<span class="visual-date-day">{view.visual.day}</span>
			</span>
			{#if view.visual.time || view.visual.tone}
				<span class="visual-meta">
					{#if view.visual.time}
						<span class="visual-time">{view.visual.time}</span>
					{/if}
					{#if view.visual.tone}
						<span class="visual-tone">{view.visual.tone}</span>
					{/if}
				</span>
			{/if}
		{:else if view.visual.kind === 'monogram'}
			{#if view.visual.image}
				<img class="visual-avatar" src={view.visual.image} alt="" />
			{:else}
				<span class="visual-monogram">{view.visual.initials}</span>
			{/if}
		{:else if view.visual.kind === 'progress'}
			<span class="visual-progress" style="--progress: {view.visual.value}">
				<span class="visual-progress-track">
					<span class="visual-progress-fill"></span>
				</span>
				<span class="visual-progress-label">{Math.round(view.visual.value * 100)}%</span>
			</span>
		{:else}
			<span class="visual-excerpt">{view.visual.text}</span>
			{#if view.visual.pinned}
				<span class="visual-pin" aria-label="Pinned">◆</span>
			{/if}
		{/if}
	</div>

	<div class="card-text" data-layout-id="{id}-text">
		{#if overlay && draft.mode === 'edit'}
			<input
				class="card-title card-title-input"
				data-layout-id="{id}-title"
				aria-label={titleField?.label ?? 'Title'}
				placeholder={titleField?.placeholder ?? 'Untitled'}
				value={view.title === 'Untitled' ? '' : view.title}
				data-foley-type="thock"
				oninput={(event) => draft.update('title', event.currentTarget.value)}
			/>
		{:else}
			<h2 class="card-title" data-layout-id="{id}-title">{view.title}</h2>
		{/if}
		<p class="card-type" data-layout-id="{id}-type">{view.subtitle}</p>
		<div class="card-info" data-layout-id="{id}-info">
			<span class="card-intro-description" data-layout-id="{id}-intro">{view.meta}</span>
			<span class="card-more-info" data-layout-id="{id}-more">
				{#if overlay}
					<EntityFields {entity} {draft} />
				{/if}
			</span>
		</div>
	</div>
</a>
