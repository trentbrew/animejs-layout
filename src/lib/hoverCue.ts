import { play } from '@foleyjs/core';
import { prefs } from './prefs.svelte';
import {
	DEFAULT_HOVER_CUE_TUNING,
	cueFor,
	speedOf,
	type HoverCueTuning,
	type PointerSample
} from './hoverCueMath';

export * from './hoverCueMath';

/**
 * One hover cue per entry.
 *
 * foley's own `data-foley-hover` already latches per element, so a plain tick on
 * entry would need nothing from us. This exists to carry the cursor's state into
 * that single cue: pitch from how fast the pointer was travelling as it crossed
 * the boundary, pan from where on screen it crossed. It fires on the transition
 * *into* a region and stays silent while the pointer remains inside — moving
 * within a card does not repeat, and neither does sitting still.
 *
 * Anything marked `data-hover-cue` is a region; keyboard focus gets a centered
 * cue of its own.
 */
export function createHoverCue(tuning: HoverCueTuning = DEFAULT_HOVER_CUE_TUNING) {
	let last: PointerSample | null = null;
	let smoothed: number | null = null;
	let pointerTarget: Element | null = null;
	let focusTarget: Element | null = null;

	function sample(event: PointerEvent): void {
		// Touch and pen move during drags and taps; velocity there is noise.
		if (event.pointerType !== 'mouse') return;

		const now = event.timeStamp || performance.now();
		const next: PointerSample = { x: event.clientX, y: event.clientY, t: now };
		const prev = last;
		last = next;

		// Track speed even outside a region: the entry cue needs to know how fast
		// the pointer was travelling when it crossed the boundary.
		if (prev) {
			const raw = speedOf(prev, next);
			smoothed = smoothed === null ? raw : smoothed + tuning.smoothing * (raw - smoothed);
		}

		const target = (event.target as Element | null)?.closest('[data-hover-cue]') ?? null;
		if (target === pointerTarget) return; // still inside the same region — silent
		pointerTarget = target;
		if (!target) return; // left a region, nothing to play

		// foley's `hover` setting only gates its own bind() handler, so this has
		// to honour the same prefs itself.
		if (!prefs.hover || prefs.muted) return;

		play('tick', cueFor(smoothed ?? 0, next.x, window.innerWidth, tuning));
	}

	/**
	 * Keyboard users get one cue per region, centered — there is no cursor to
	 * read a position or a velocity from. The focused element itself must carry
	 * the marker, so tabbing through a dialog's fields stays quiet.
	 */
	function focus(event: FocusEvent): void {
		const el = event.target as Element | null;
		if (!el?.matches?.('[data-hover-cue]')) {
			focusTarget = null;
			return;
		}
		if (el === focusTarget) return;
		focusTarget = el;

		if (!prefs.hover || prefs.muted) return;
		play('tick', { pitch: 0, volume: tuning.volume, pan: 0 });
	}

	return { sample, focus };
}
