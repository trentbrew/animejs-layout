#!/usr/bin/env node
/**
 * Generates src/lib/themes.css from the public tweakcn theme registry.
 *
 * tweakcn publishes each theme as a shadcn registry item containing
 * `cssVars.theme` (fonts / radius / tracking), `cssVars.light` and
 * `cssVars.dark` (oklch design tokens). We flatten those into plain
 * `[data-theme="<name>"]` blocks so the app can swap themes at runtime
 * without a Tailwind rebuild.
 *
 * Usage: node scripts/gen-themes.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** Single source of truth — shared with the app (`src/lib/themes.ts`). */
const THEMES = JSON.parse(await readFile(join(here, '..', 'src', 'lib', 'themes.json'), 'utf8'));

const REGISTRY = 'https://tweakcn.com/r/themes';

const TOKENS = [
	'background',
	'foreground',
	'card',
	'card-foreground',
	'popover',
	'popover-foreground',
	'primary',
	'primary-foreground',
	'secondary',
	'secondary-foreground',
	'muted',
	'muted-foreground',
	'accent',
	'accent-foreground',
	'destructive',
	'destructive-foreground',
	'border',
	'input',
	'ring',
	'chart-1',
	'chart-2',
	'chart-3',
	'chart-4',
	'chart-5',
	'sidebar',
	'sidebar-foreground',
	'sidebar-primary',
	'sidebar-primary-foreground',
	'sidebar-accent',
	'sidebar-accent-foreground',
	'sidebar-border',
	'sidebar-ring'
];

const THEME_TOKENS = [
	'font-sans',
	'font-serif',
	'font-mono',
	'radius',
	'spacing',
	'tracking-tighter',
	'tracking-tight',
	'tracking-normal',
	'tracking-wide',
	'tracking-wider',
	'tracking-widest',
	'shadow-2xs',
	'shadow-xs',
	'shadow-sm',
	'shadow',
	'shadow-md',
	'shadow-lg',
	'shadow-xl',
	'shadow-2xl'
];

const fetchTheme = async (id) => {
	const res = await fetch(`${REGISTRY}/${id}.json`);
	if (!res.ok) throw new Error(`${id}: ${res.status} ${res.statusText}`);
	return res.json();
};

const block = (selector, vars, indent = '\t') =>
	`${selector} {\n` +
	Object.entries(vars)
		.filter(([, value]) => value !== undefined && value !== null && value !== '')
		.map(([key, value]) => `${indent}--${key}: ${value};`)
		.join('\n') +
	`\n}`;

const pick = (source, keys) =>
	Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));

const main = async () => {
	const loaded = await Promise.all(THEMES.map(({ id }) => fetchTheme(id)));

	const sections = loaded.map((theme, i) => {
		const { name, cssVars } = theme;
		const meta = THEMES[i];
		const themeVars = pick(cssVars.theme ?? {}, THEME_TOKENS);
		const light = { ...pick(cssVars.light ?? {}, TOKENS), ...themeVars };
		const dark = { ...pick(cssVars.dark ?? {}, TOKENS), ...themeVars };
		return [
			`/* ${meta.label} — https://tweakcn.com/themes/${name} */`,
			block(`[data-theme="${name}"]`, light),
			block(`[data-theme="${name}"].dark`, dark)
		].join('\n');
	});

	const fallback = pick(loaded[0].cssVars.light ?? {}, TOKENS);
	const header = `/*
 * GENERATED FILE — do not edit by hand.
 * Run \`node scripts/gen-themes.mjs\` to refresh from tweakcn.
 *
 * ${THEMES.length} themes · ${new Date().toISOString().slice(0, 10)}
 */\n`;

	const output = [header, block(':root', { ...fallback, ...pick(loaded[0].cssVars.theme ?? {}, THEME_TOKENS) }), ...sections].join('\n\n');

	const out = join(here, '..', 'src', 'lib', 'themes.css');
	await writeFile(out, output + '\n', 'utf8');
	console.log(`wrote ${out} (${THEMES.length} themes, ${output.length} bytes)`);
};

await main();
