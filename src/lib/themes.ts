import themes from './themes.json';

/**
 * The theme contract. Colors / fonts / radius come from `themes.css`
 * (generated from tweakcn); `motion`, `sound`, and `icon` are preset
 * references resolved in `theme-manifest.ts` and `icons.ts`.
 */
export type Theme = {
	id: string;
	label: string;
	/** Motion preset id — see `MOTION` in `theme-manifest.ts`. */
	motion: string;
	/** Sound preset id — see `SOUND` in `theme-manifest.ts`. */
	sound: string;
	/** Iconify icon-set prefix — see `icons.ts`. */
	icon: string;
};

/** Single source: also read by `scripts/gen-themes.mjs`. */
export const THEMES: Theme[] = themes;

export const DEFAULT_THEME = 'modern-minimal';
