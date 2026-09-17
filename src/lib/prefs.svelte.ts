import { DEFAULT_THEME } from './themes';

/**
 * Global preferences — the parts of the experience that are *not* themed.
 * Sound volume / mute / hover and the user's last theme + mode persist;
 * per-theme sound character (space, transpose, sound theme) lives in
 * `theme-manifest.ts` instead.
 */
export type Prefs = {
	theme: string;
	dark: boolean;
	volume: number;
	muted: boolean;
	hover: boolean;
};

export type PrefKey = keyof Prefs;

const KEY = 'anime-trellis:prefs';

const DEFAULTS: Prefs = {
	theme: DEFAULT_THEME,
	dark: true,
	volume: 0.7,
	muted: false,
	hover: true
};

function read(): Prefs {
	if (typeof localStorage === 'undefined') return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
	} catch {
		return { ...DEFAULTS };
	}
}

/*
 * Start from the defaults, not from storage: the server can't read
 * localStorage, so initialising from it would make the first client render
 * disagree with the SSR markup (and `{@html}` icon bodies are not reconciled
 * during hydration, so they would stay on the server's icon set). `hydrate()`
 * applies the stored prefs once, after mount.
 */
export const prefs = $state<Prefs>({ ...DEFAULTS });

/** Apply persisted prefs. Call once, client-side, after mount. */
export function hydratePrefs(): void {
	Object.assign(prefs, read());
}

export function setPref<K extends PrefKey>(key: K, value: Prefs[K]): void {
	prefs[key] = value;
	try {
		localStorage.setItem(KEY, JSON.stringify({ ...prefs }));
	} catch {
		/* private mode / quota — prefs just won't persist */
	}
}
