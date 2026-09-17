import { set as foleySet, type ThemeName } from '@foleyjs/core';
import { THEMES, type Theme } from './themes';

/**
 * The hand-authored half of the theme contract. `themes.css` is generated
 * from tweakcn and owns color / fonts / radius; this file owns the axes
 * tweakcn knows nothing about — motion, sound, and icons — plus the single
 * applier that puts all four on the document.
 */

export type MotionPreset = {
	id: string;
	/** anime.js ease expression. */
	ease: string;
	/** The same curve as a CSS timing function — the vocabularies differ. */
	easeCss: string;
	/** Multiplier on each interaction's base duration. */
	tempo: number;
	/** Cascade window across siblings, in ms — 0 means they move together. */
	stagger: number;
};

export type SoundPreset = {
	id: string;
	/** foley sound theme. */
	theme: ThemeName;
	/** foley reverb send, 0–1. */
	space: number;
	/** foley global transpose, semitones. */
	transpose: number;
};

export const MOTION: Record<string, MotionPreset> = {
	crisp: {
		id: 'crisp',
		ease: 'out(3)',
		easeCss: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
		tempo: 0.7,
		stagger: 0
	},
	soft: {
		id: 'soft',
		ease: 'inOut(2)',
		easeCss: 'cubic-bezier(0.45, 0, 0.55, 1)',
		tempo: 1.1,
		stagger: 350
	},
	springy: {
		id: 'springy',
		ease: 'outElastic(1, .5)',
		easeCss: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		tempo: 1.25,
		stagger: 220
	}
};

export const SOUND: Record<string, SoundPreset> = {
	neutral: { id: 'neutral', theme: 'default', space: 0.22, transpose: 0 },
	warm: { id: 'warm', theme: 'soft', space: 0.35, transpose: -2 },
	soft: { id: 'soft', theme: 'soft', space: 0.45, transpose: -1 },
	bright: { id: 'bright', theme: 'glass', space: 0.55, transpose: 3 },
	deep: { id: 'deep', theme: 'mechanical', space: 0.18, transpose: -5 }
};

export const DEFAULT_MOTION = 'crisp';
export const DEFAULT_SOUND = 'neutral';

/** Base durations the tempo multiplier scales, and their CSS variable names. */
const DURATIONS = { fast: 150, base: 250, slow: 450 } as const;

export const themeById = (id: string): Theme =>
	THEMES.find((theme) => theme.id === id) ?? THEMES[0];

export const motionFor = (themeId: string): MotionPreset =>
	MOTION[themeById(themeId).motion] ?? MOTION[DEFAULT_MOTION];

export const soundFor = (themeId: string): SoundPreset =>
	SOUND[themeById(themeId).sound] ?? SOUND[DEFAULT_SOUND];

/**
 * Scale an interaction's base duration by the active theme's tempo, and
 * collapse it to zero when the user has asked for reduced motion — that
 * preference outranks the theme.
 */
export const motionDuration = (base: number): number => {
	if (typeof window === 'undefined') return base;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
	return Math.round(base * motionFor(document.documentElement.dataset.theme ?? '').tempo);
};

/** Put every axis of the contract on the document in one place. */
export function applyTheme(themeId: string): void {
	if (typeof document === 'undefined') return;
	const theme = themeById(themeId);
	const motion = motionFor(theme.id);
	const sound = soundFor(theme.id);
	const root = document.documentElement;
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	root.dataset.theme = theme.id;
	root.dataset.motion = motion.id;
	root.dataset.icon = theme.icon;

	for (const [name, base] of Object.entries(DURATIONS)) {
		root.style.setProperty(
			`--dur-${name}`,
			reduce ? '0ms' : `${Math.round(base * motion.tempo)}ms`
		);
	}
	root.style.setProperty('--ease-ui', motion.easeCss);

	// Pure state — safe before the audio context is unlocked.
	foleySet({ theme: sound.theme, space: sound.space, transpose: sound.transpose });
}
