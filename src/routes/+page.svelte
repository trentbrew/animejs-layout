<script lang="ts">
	import { flushSync, tick } from 'svelte';
	import { createLayout, stagger, utils } from 'animejs';
	import { Dialog } from 'bits-ui';
	import EntityCard, { type Placement } from '$lib/EntityCard.svelte';
	import { buildMonth, WEEKDAYS } from '$lib/calendar';
	import EntityControls from '$lib/EntityControls.svelte';
	import {
		ENTITIES,
		ENTITY_CLASSES,
		INITIAL_VISIBLE,
		layoutsFor,
		type Entity,
		type EntityClass,
		type Layout
	} from '$lib/entities';
	import { DEFAULT_THEME } from '$lib/themes';

	let layout = $state<Layout>('grid');
	let theme = $state(DEFAULT_THEME);
	let dark = $state(true);

	/** One entity class at a time, so ids stay unique and layouts stay simple. */
	let entityClass = $state<EntityClass>('demo');

	const entities = $derived(ENTITIES[entityClass]);
	const availableLayouts = $derived(layoutsFor(entities));

	/** Indices into `entities`, in display order. Every entity stays mounted; the
	 * tail beyond `visibleCount` is hidden with `.is-removed` so anime.js can
	 * animate it in and out instead of it simply vanishing from the DOM. */
	let order = $state(ENTITIES.demo.map((_, index) => index));
	let visibleCount = $state(INITIAL_VISIBLE);

	/** Which entity the dialog is showing, and which grid card is currently hidden. */
	let selectedId = $state<string | null>(null);
	let openIds = $state<string[]>([]);
	let dialogOpen = $state(false);
	let opening = false;

	let rootEl = $state<HTMLDivElement | null>(null);
	let overlayEl = $state<HTMLDivElement | null>(null);

	let cardsLayout: ReturnType<typeof createLayout> | null = null;
	let modalLayout: ReturnType<typeof createLayout> | null = null;

	/**
	 * Entities from the class we just left, kept mounted with `.is-removed` for
	 * the length of the switch. anime.js only animates a leave for elements that
	 * are still in the DOM but hidden, so dropping them outright would make the
	 * outgoing set pop instead of fly out.
	 */
	let leaving = $state<Entity[]>([]);
	let switchToken = 0;

	const visible = $derived(order.slice(0, visibleCount).map((index) => entities[index]));
	const ordered = $derived(order.map((index) => entities[index]));
	const selected = $derived(
		selectedId ? (entities.find((entity) => entity.id === selectedId) ?? null) : null
	);

	type Slot = { entity: Entity; index: number; removed: boolean; placement: Placement | null };

	/**
	 * Read-only month grid. The anchor is the current month on whichever side is
	 * rendering; the fixtures are generated from the same clock, so server and
	 * client agree unless the month rolls over between the two renders.
	 */
	const month = $derived(buildMonth(new Date()));

	/**
	 * `calendar` shows every dated entity rather than the `visibleCount` slice,
	 * and entities without a `startDate` have nowhere to sit, so they are hidden.
	 * Same-day entities get an increasing `slot` for the margin offset.
	 *
	 * The rendered day chrome is a visual scaffold only: it is marked
	 * `aria-hidden`, because the dates it encodes ride on each chip's
	 * `aria-label` instead, and the flat grid placement means there are no
	 * `role="row"` elements to make a real ARIA grid out of.
	 */
	const calendar = $derived.by(() => {
		if (layout !== 'calendar') return null;
		const placements = new Map<string, Placement>();
		const counts = new Map<string, number>();
		for (const entity of ordered) {
			if (!entity.startDate) continue;
			const cell = month.index.get(entity.startDate);
			if (!cell) continue;
			const slot = counts.get(entity.startDate) ?? 0;
			counts.set(entity.startDate, slot + 1);
			placements.set(entity.id, { col: cell.weekday + 1, row: cell.week + 3, slot });
		}
		return placements;
	});

	const slots = $derived<Slot[]>([
		...leaving.map((entity) => ({ entity, index: 0, removed: true, placement: null })),
		...ordered.map((entity, position) => ({
			entity,
			index: position + 1,
			removed: calendar ? !calendar.has(entity.id) : position >= visibleCount,
			placement: calendar?.get(entity.id) ?? null
		}))
	]);

	/** Layout animation is the point of the demo, so honour reduced motion by
	 * collapsing durations rather than skipping the state change. */
	const motion = (duration: number) =>
		window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : duration;

	$effect(() => {
		document.documentElement.dataset.theme = theme;
		document.documentElement.classList.toggle('dark', dark);
	});

	/*
	 * Both layouts are created once, against a stable root element, and then
	 * driven imperatively: anime.js `createLayout` needs to measure the DOM
	 * before and after a mutation, which Svelte's async rendering would
	 * otherwise interleave with.
	 */
	$effect(() => {
		if (!rootEl) return;
		const instance = createLayout(rootEl, {
			properties: ['font-size'],
			enterFrom: {
				opacity: (el) => (el instanceof Element && el.classList.contains('card') ? 1 : 0),
				transform: (el) =>
					el instanceof Element && el.classList.contains('card')
						? 'translateY(150%) scale(.5)'
						: 'none'
			},
			leaveTo: {
				opacity: 0,
				transform: (el) => {
					if (!(el instanceof Element)) return 'none';
					const siblings = [...(el.parentElement?.children ?? [])];
					const direction = siblings.indexOf(el) % 2 ? -1 : 1;
					return el.classList.contains('card')
						? `translate(${50 * direction}%, 50%) rotate(${20 * direction}deg) scale(.5)`
						: 'none';
				}
			}
		});
		cardsLayout = instance;
		return () => {
			instance.revert();
			cardsLayout = null;
		};
	});

	$effect(() => {
		if (!overlayEl) return;
		const instance = createLayout(overlayEl, {
			children: [
				'.card',
				'.card-visual',
				'.card-visual-grid',
				'.card-title',
				'.card-type',
				'.close-overlay'
			],
			properties: ['--overlay-alpha'],
			duration: motion(500)
		});
		modalLayout = instance;
		return () => {
			instance.revert();
			modalLayout = null;
		};
	});

	const gridCardEl = (entityId: string) =>
		rootEl?.querySelector<HTMLElement>(`[data-layout-id="e-${entityId}"]`) ?? null;

	const visibleCardEls = () =>
		order
			.slice(0, visibleCount)
			.map((index) => gridCardEl(entities[index].id))
			.filter((el): el is HTMLElement => el !== null);

	function applyTransforms(next: Layout, cards: HTMLElement[]) {
		if (!cards.length) return;
		if (next === 'stack') {
			utils.set(cards, {
				x: 0,
				y: stagger(10, { reversed: true }),
				z: stagger(-20, { reversed: true }),
				rotateX: 0,
				rotateY: 0,
				rotateZ: 0,
				scale: 1
			});
		} else if (next === 'chaos') {
			utils.set(cards, {
				x: () => utils.random(-10, 10) + 'vw',
				y: () => utils.random(-10, 10) + 'vh',
				z: () => utils.random(600, 750),
				rotateX: () => utils.random(-45, 45),
				rotateY: () => utils.random(-45, 45),
				rotateZ: () => utils.random(-45, 45),
				scale: () => utils.random(0.2, 0.3, 2)
			});
		} else {
			utils.set(cards, { transform: 'none' });
		}
	}

	function changeLayout(next: Layout) {
		if (!cardsLayout || next === layout) return;
		layout = next;
		cardsLayout.update(
			() => {
				// Push the new `data-layout` / transform state into the DOM before
				// anime.js measures the "after" frame.
				flushSync(() => {});
				applyTransforms(next, visibleCardEls());
			},
			{ duration: motion(450), ease: 'inOut(3)', delay: stagger([0, 350]) }
		);
	}

	function runAction(action: 'add' | 'remove' | 'shuffle') {
		if (!cardsLayout) return;
		cardsLayout.update(
			() => {
				flushSync(() => {
					if (action === 'add') visibleCount = Math.min(visibleCount + 1, entities.length);
					else if (action === 'remove') visibleCount = Math.max(visibleCount - 1, 1);
					else order = shuffleVisible(order, visibleCount);
				});
				applyTransforms(layout, visibleCardEls());
			},
			{ duration: motion(350), ease: 'out(3)', delay: 0 }
		);
	}

	/**
	 * Swapping the class replaces every node, so anime.js sees the outgoing set
	 * leave and the incoming set enter. The layout falls back to `grid` when the
	 * new class can't satisfy the current one (only `calendar` is gated).
	 */
	function changeClass(next: EntityClass) {
		if (!cardsLayout || next === entityClass) return;
		const outgoing = ordered.slice();
		const token = ++switchToken;
		cardsLayout
			.update(
				() => {
					flushSync(() => {
						leaving = outgoing;
						entityClass = next;
						const list = ENTITIES[next];
						order = list.map((_, index) => index);
						visibleCount = Math.min(INITIAL_VISIBLE, list.length);
						if (!layoutsFor(list).includes(layout)) layout = 'grid';
					});
					applyTransforms(layout, visibleCardEls());
				},
				{ duration: motion(400), ease: 'inOut(3)', delay: stagger([0, 250]) }
			)
			.then(() => {
				// A newer switch owns `leaving` now; let it finish its own cleanup.
				if (token === switchToken) leaving = [];
			});
	}

	function shuffleVisible(current: number[], count: number) {		const shuffled = current.slice(0, count);
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return [...shuffled, ...current.slice(count)];
	}

	async function openCard(entity: Entity) {
		if (dialogOpen || opening || !modalLayout) return;
		// The dialog card has to exist (hidden) before anime.js records the
		// "from" frame, so that it can borrow the grid card's measurements.
		opening = true;
		selectedId = entity.id;
		await tick();
		modalLayout.update(
			() => {
				flushSync(() => {
					dialogOpen = true;
					openIds = [...openIds, entity.id];
				});
				overlayEl?.querySelector<HTMLElement>('.close-overlay')?.focus({ preventScroll: true });
			},
			{ duration: motion(500) }
		);
		opening = false;
	}

	function closeCard() {
		const id = selectedId;
		if (!dialogOpen || !id || !modalLayout) return;
		const source = gridCardEl(id);
		modalLayout
			.update(
				() => {
					flushSync(() => {
						dialogOpen = false;
						openIds = openIds.filter((openId) => openId !== id);
					});
					// Focusing while the grid card is visible again keeps the closing
					// FLIP aligned: focus-induced scrolling would move the target.
					source?.focus({ preventScroll: true });
				},
				{ duration: motion(500) }
			)
			.then(() => {
				source?.focus({ preventScroll: true });
				selectedId = null;
			});
	}

	const overlayStyle = (bitsStyle: unknown) => {
		const base =
			typeof bitsStyle === 'string'
				? bitsStyle
				: Object.entries((bitsStyle ?? {}) as Record<string, string | number>)
						.map(([key, value]) => {
							const property = key.startsWith('--')
								? key
								: key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
							return `${property}: ${value}`;
						})
						.join('; ');
		return `${base}; pointer-events: ${dialogOpen ? 'auto' : 'none'}`;
	};
</script>

<EntityControls
	{layout}
	{theme}
	{dark}
	{visibleCount}
	entityCount={entities.length}
	{entityClass}
	{availableLayouts}
	onLayoutChange={changeLayout}
	onAction={runAction}
	onClassChange={changeClass}
	onThemeChange={(next) => (theme = next)}
	onDarkChange={(next) => (dark = next)}
/>

<div
	id="root"
	class="container"
	data-layout={layout}
	role={layout === 'calendar' ? 'group' : undefined}
	aria-label={layout === 'calendar' ? `${month.label}, calendar` : undefined}
	bind:this={rootEl}
>
	{#if layout === 'calendar'}
		<div class="calendar-label" data-layout-id="cal-label" aria-hidden="true">{month.label}</div>
		{#each WEEKDAYS as weekday, column (weekday)}
			<div
				class="calendar-weekday"
				data-layout-id="cal-weekday-{column}"
				style="--col: {column + 1}"
				aria-hidden="true"
			>
				{weekday}
			</div>
		{/each}
		{#each month.cells as cell (cell.iso)}
			<div
				class="calendar-day"
				class:is-outside={!cell.inMonth}
				class:is-today={cell.isToday}
				data-layout-id="cal-day-{cell.iso}"
				style="--col: {cell.weekday + 1}; --row: {cell.week + 3}"
				aria-hidden="true"
			>
				<span class="calendar-day-number">{cell.day}</span>
			</div>
		{/each}
	{/if}

	{#each slots as slot (slot.entity.id)}
		<EntityCard
			entity={slot.entity}
			index={slot.index}
			total={visibleCount}
			removed={slot.removed}
			open={openIds.includes(slot.entity.id)}
			placement={slot.placement}
			onselect={openCard}
		/>
	{/each}
</div>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content
		forceMount
		aria-label={selected ? `${selected.title} details` : 'Entity details'}
		onEscapeKeydown={(event) => {
			event.preventDefault();
			closeCard();
		}}
		onInteractOutside={(event) => event.preventDefault()}
		onOpenAutoFocus={(event) => event.preventDefault()}
		onCloseAutoFocus={(event) => event.preventDefault()}
	>
		{#snippet child({ props })}
			<div
				{...props}
				id="overlay"
				class="container"
				bind:this={overlayEl}
				// `inert` both hides the closed dialog from assistive tech and keeps
				// its contents unfocusable; `aria-hidden` is deliberately avoided
				// because it is rejected while a descendant still holds focus.
				inert={dialogOpen ? undefined : true}
				style={overlayStyle(props.style)}
				onclick={(event) => {
					if (event.target === overlayEl) closeCard();
				}}
			>
				{#if selected}
					<EntityCard
						entity={selected}
						index={visible.findIndex((entity) => entity.id === selected.id) + 1}
						total={visibleCount}
						overlay
						onclose={closeCard}
					/>
				{/if}
			</div>
		{/snippet}
	</Dialog.Content>
</Dialog.Root>
