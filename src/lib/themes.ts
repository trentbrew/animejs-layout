export type Theme = {
	id: string;
	label: string;
};

/** Kept in sync with `scripts/gen-themes.mjs`. */
export const THEMES: Theme[] = [
	{ id: 'modern-minimal', label: 'Modern Minimal' },
	{ id: 'vercel', label: 'Vercel' },
	{ id: 'claude', label: 'Claude' },
	{ id: 'catppuccin', label: 'Catppuccin' },
	{ id: 'quantum-rose', label: 'Quantum Rose' },
	{ id: 'cosmic-night', label: 'Cosmic Night' },
	{ id: 'amethyst-haze', label: 'Amethyst Haze' },
	{ id: 't3-chat', label: 'T3 Chat' }
];

export const DEFAULT_THEME = 'modern-minimal';
