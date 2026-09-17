#!/usr/bin/env node
/**
 * Generates src/lib/icons.generated.json from the bundled Iconify sets.
 *
 * `icons.ts` resolves semantic keys against whichever icon set a theme names.
 * Importing the full @iconify-json sets would pull ~13 MB into the client
 * bundle (material-symbols alone is 16k icons), so we pre-render just the
 * icons `icon-registry.json` names — attributes and SVG body — at build time.
 *
 * The registry is the single source of truth for key → icon name. A name that
 * doesn't exist in its set fails this script rather than rendering blank.
 *
 * Usage: node scripts/gen-icons.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getIconData, iconToSVG } from '@iconify/utils';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src', 'lib');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const setPath = (id) => join(here, '..', 'node_modules', '@iconify-json', id, 'icons.json');

const registry = await readJson(join(src, 'icon-registry.json'));

const output = {};
let missing = 0;

for (const [set, icons] of Object.entries(registry)) {
	const data = await readJson(setPath(set));
	output[set] = {};

	for (const [key, name] of Object.entries(icons)) {
		const icon = getIconData(data, name);
		if (!icon) {
			console.error(`✗ ${set}:${name} (${key}) does not exist in the set`);
			missing++;
			continue;
		}
		output[set][key] = iconToSVG(icon, { height: '1em' });
	}
}

if (missing) {
	console.error(`\n${missing} missing icon(s) — fix icon-registry.json`);
	process.exit(1);
}

const out = join(src, 'icons.generated.json');
await writeFile(out, JSON.stringify(output, null, '\t') + '\n', 'utf8');

const count = Object.values(output).reduce((total, set) => total + Object.keys(set).length, 0);
console.log(`wrote ${out} (${Object.keys(output).length} sets, ${count} icons, ${(await readFile(out)).length} bytes)`);
