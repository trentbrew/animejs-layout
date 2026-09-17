/**
 * The pure half of the hover cue: no DOM, no foley, no state, so it can be
 * reasoned about (and tested) on its own. The stateful integration lives in
 * `hoverCue.ts`.
 */

export type HoverCueTuning = {
	/** Pointer speed, in px/ms, that maps to the top of `pitchRange`. */
	speedCeiling: number;
	/** Semitones added at `speedCeiling`; foley adds ±30¢ humanization on top. */
	pitchRange: number;
	/** Fixed level multiplier. Approach velocity rides pitch, not loudness. */
	volume: number;
	/** Exponential smoothing on speed; a single sample is noisy. */
	smoothing: number;
};

export const DEFAULT_HOVER_CUE_TUNING: HoverCueTuning = {
	speedCeiling: 2.5,
	pitchRange: 12,
	volume: 0.18,
	smoothing: 0.3
};

export type PointerSample = { x: number; y: number; t: number };

export type HoverCue = {
	/** Extra transpose in semitones. */
	pitch: number;
	/** Level multiplier. */
	volume: number;
	/** Stereo placement, -1 (left) to 1 (right). */
	pan: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Pointer speed between two samples, in px/ms. */
export function speedOf(prev: PointerSample, next: PointerSample): number {
	const dt = next.t - prev.t;
	return dt > 0 ? Math.hypot(next.x - prev.x, next.y - prev.y) / dt : 0;
}

/** Approach speed as 0–1 against `speedCeiling`. */
export function intensityOf(speed: number, tuning: HoverCueTuning = DEFAULT_HOVER_CUE_TUNING): number {
	return clamp(speed / tuning.speedCeiling, 0, 1);
}

/**
 * Build the cue for one entry: pitch from how fast the pointer was travelling,
 * pan from where on screen it crossed the boundary. Pure.
 */
export function cueFor(
	speed: number,
	x: number,
	viewportWidth: number,
	tuning: HoverCueTuning = DEFAULT_HOVER_CUE_TUNING
): HoverCue {
	return {
		pitch: intensityOf(speed, tuning) * tuning.pitchRange,
		volume: tuning.volume,
		pan: clamp((x / viewportWidth) * 2 - 1, -1, 1)
	};
}

/** Convenience composition of `speedOf` and `cueFor`. */
export function cueAt(
	prev: PointerSample,
	next: PointerSample,
	viewportWidth: number,
	tuning: HoverCueTuning = DEFAULT_HOVER_CUE_TUNING
): HoverCue {
	return cueFor(speedOf(prev, next), next.x, viewportWidth, tuning);
}
