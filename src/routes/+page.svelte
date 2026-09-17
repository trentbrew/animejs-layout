<script lang="ts">
	import { flushSync, tick } from 'svelte';
	import { createLayout, stagger, utils } from 'animejs';
	import { Dialog } from 'bits-ui';
	import PlanetCard from '$lib/PlanetCard.svelte';
	import PlanetControls from '$lib/PlanetControls.svelte';
	import { INITIAL_VISIBLE, PLANETS, type Layout, type Planet } from '$lib/planets';
	import { DEFAULT_THEME } from '$lib/themes';

	let layout = $state<Layout>('grid');
	let theme = $state(DEFAULT_THEME);
	let dark = $state(true);

	/** Planet indices in display order. Every planet stays mounted; the tail
	 * beyond `visibleCount` is hidden with `.is-removed` so anime.js can
	 * animate it in and out instead of it simply vanishing from the DOM. */
	let order = $state(PLANETS.map((_, index) => index));
	let visibleCount = $state(INITIAL_VISIBLE);

	/** Which planet the dialog is showing, and which grid card is currently hidden. */
	let selectedId = $state<string | null>(null);
	let openIds = $state<string[]>([]);
	let dialogOpen = $state(false);
	let opening = false;

	let rootEl = $state<HTMLDivElement | null>(null);
	let overlayEl = $state<HTMLDivElement | null>(null);

	let cardsLayout: ReturnType<typeof createLayout> | null = null;
	let modalLayout: ReturnType<typeof createLayout> | null = null;

	const visible = $derived(order.slice(0, visibleCount).map((index) => PLANETS[index]));
	const ordered = $derived(order.map((index) => PLANETS[index]));
	const selected = $derived(
		selectedId ? (PLANETS.find((planet) => planet.id === selectedId) ?? null) : null
	);

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
				'.card-image',
				'.card-image-grid',
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

	const gridCardEl = (planetId: string) =>
		rootEl?.querySelector<HTMLElement>(`[data-layout-id="card-${planetId}"]`) ?? null;

	const visibleCardEls = () =>
		order
			.slice(0, visibleCount)
			.map((index) => gridCardEl(PLANETS[index].id))
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
					if (action === 'add') visibleCount = Math.min(visibleCount + 1, PLANETS.length);
					else if (action === 'remove') visibleCount = Math.max(visibleCount - 1, 1);
					else order = shuffleVisible(order, visibleCount);
				});
				applyTransforms(layout, visibleCardEls());
			},
			{ duration: motion(350), ease: 'out(3)', delay: 0 }
		);
	}

	function shuffleVisible(current: number[], count: number) {
		const shuffled = current.slice(0, count);
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return [...shuffled, ...current.slice(count)];
	}

	async function openCard(planet: Planet) {
		if (dialogOpen || opening || !modalLayout) return;
		// The dialog card has to exist (hidden) before anime.js records the
		// "from" frame, so that it can borrow the grid card's measurements.
		opening = true;
		selectedId = planet.id;
		await tick();
		modalLayout.update(
			() => {
				flushSync(() => {
					dialogOpen = true;
					openIds = [...openIds, planet.id];
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

<PlanetControls
	{layout}
	{theme}
	{dark}
	{visibleCount}
	planetCount={PLANETS.length}
	onLayoutChange={changeLayout}
	onAction={runAction}
	onThemeChange={(next) => (theme = next)}
	onDarkChange={(next) => (dark = next)}
/>

<div id="root" class="container" data-layout={layout} bind:this={rootEl}>
	{#each ordered as planet, position (planet.id)}
		<PlanetCard
			{planet}
			index={position + 1}
			total={visibleCount}
			removed={position >= visibleCount}
			open={openIds.includes(planet.id)}
			onselect={openCard}
		/>
	{/each}
</div>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content
		forceMount
		aria-label={selected ? `${selected.name} details` : 'Planet details'}
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
					<PlanetCard
						planet={selected}
						index={visible.findIndex((planet) => planet.id === selected.id) + 1}
						total={visibleCount}
						overlay
						onclose={closeCard}
					/>
				{/if}
			</div>
		{/snippet}
	</Dialog.Content>
</Dialog.Root>
