import {
	getSpec,
	normalizeSpec,
	playSpec,
	type CueName,
	type PlayOptions,
	type Spec
} from '@foleyjs/core';

/**
 * foley has no `duration` option: a cue's length is baked into its layer
 * timings, and foley clamps them (`d` ≤ 2.5s, `at` ≤ 1.5s, cluster `step` ≤
 * 0.2s, ≤ 8 layers). So to stretch a cue we take a normalized copy of its spec,
 * scale the timing fields, and play that back — the clamps become the ceiling.
 */

/** How long a spec rings, mirroring foley's own (unexported) calculation. */
export function specLength(spec: Spec): number {
	let end = 0;
	for (const layer of spec) {
		const at = layer.at ?? 0;
		const tail =
			layer.kind === 'cluster'
				? (layer.n - 1) * layer.step + (layer.d ?? 0.1) + 0.01
				: (layer.a ?? 0.004) + (layer.d ?? 0.15);
		if (at + tail > end) end = at + tail;
	}
	return end;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type StretchedSpec = {
	/** Normalized, scaled spec — ready for `playSpec`. */
	spec: Spec;
	/** Multiplier applied (1 = left at its natural length). */
	factor: number;
	/** The cue's unstretched length, in ms. */
	naturalMs: number;
};

/**
 * Scale a cue's timing so it rings for roughly `targetMs`. Pure — it never
 * touches the audio graph, so it can be reasoned about (and tested) on its own.
 * `maxFactor` caps the stretch, since foley's field limits will silently clip
 * anything beyond it.
 */
export function stretchSpec(cue: CueName, targetMs: number, maxFactor = 3): StretchedSpec {
	const spec = normalizeSpec(getSpec(cue) ?? []);
	const naturalMs = specLength(spec) * 1000;
	const factor = clamp(targetMs / naturalMs, 1, maxFactor);

	if (factor > 1) {
		for (const layer of spec) {
			layer.at = (layer.at ?? 0) * factor;
			layer.d = (layer.d ?? 0.1) * factor;
			if (layer.kind === 'cluster') layer.step = layer.step * factor;
		}
	}

	return { spec, factor, naturalMs };
}

/**
 * Play a cue stretched to last roughly `targetMs` — for matching a sound to a
 * slower transition. A `targetMs` at or below the cue's natural length leaves it
 * untouched.
 */
export function playStretched(
	cue: CueName,
	targetMs: number,
	{ maxFactor = 3, ...opts }: PlayOptions & { maxFactor?: number } = {}
): void {
	playSpec(stretchSpec(cue, targetMs, maxFactor).spec, { id: cue, ...opts });
}
