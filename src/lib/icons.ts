import registry from './icon-registry.json';
import generated from './icons.generated.json';

/**
 * Iconify sets don't share icon names, so a theme can't just swap a prefix.
 * `icon-registry.json` maps semantic keys to names per set; `gen-icons.mjs`
 * pre-renders exactly those icons into `icons.generated.json` (run it after
 * editing the registry). Bundling the full sets instead would add ~13 MB.
 */
export const ICON_KEYS = [
	'layout.grid',
	'layout.list',
	'layout.stripes',
	'layout.stack',
	'layout.chaos',
	'layout.calendar',
	'action.add',
	'action.remove',
	'action.shuffle',
	'action.close',
	'mode.dark',
	'mode.light',
	'sound.on',
	'sound.off'
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export type RenderedIcon = {
	attributes: Record<string, string>;
	viewBox: number[];
	body: string;
};

const SETS = generated as unknown as Record<string, Record<string, RenderedIcon>>;
const REGISTRY = registry as Record<string, Record<string, string>>;

export const DEFAULT_ICON_SET = 'lucide';
export const iconSets = Object.keys(SETS);

// Cheap drift guard: the type-level keys and the registry must agree.
for (const [set, icons] of Object.entries(REGISTRY)) {
	for (const key of ICON_KEYS) {
		if (!(key in icons)) console.warn(`[icons] registry "${set}" is missing "${key}"`);
	}
}

/**
 * Resolve a semantic key against a theme's icon set, falling back to the
 * default set (and warning) rather than rendering nothing.
 */
export function resolveIcon(
	set: string,
	key: IconKey
): { set: string; name: string; svg: RenderedIcon } | null {
	const resolvedSet = SETS[set] ? set : DEFAULT_ICON_SET;
	const svg = SETS[resolvedSet]?.[key];

	if (!svg) {
		console.warn(`[icons] no rendered icon for "${resolvedSet}:${key}" — run scripts/gen-icons.mjs`);
		return null;
	}

	return { set: resolvedSet, name: REGISTRY[resolvedSet]?.[key] ?? key, svg };
}
