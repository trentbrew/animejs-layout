/**
 * The dialog's single editable-item owner.
 *
 * The card chrome edits `title` in place while the field list edits everything
 * else, so neither can own the draft. This is the piece the Nuxt client gets
 * right with `useEntityDialog()`: one editable item per dialog, N field surfaces
 * reading and writing it, one debounced flush into the store.
 *
 * Reads fall through to the live entity, so an op arriving from elsewhere (or
 * the store echoing our own write) is reflected without clobbering a field the
 * user is mid-edit on.
 */

import { Autosave, type SaveStatus } from './autosave.svelte';
import type { Entity } from './entities';
import { store } from './entityStore.svelte';
import type { DialogMode } from './schema';

export type EntityDraft = ReturnType<typeof createEntityDraft>;

export function createEntityDraft(
	getEntity: () => Entity,
	options: { delay?: number; mode?: DialogMode } = {}
) {
	const autosave = new Autosave(options.delay ?? 700);

	// A newly created entity opens straight into write mode; a reopened one reads.
	let mode = $state<DialogMode>(options.mode ?? 'view');
	let draft = $state<Record<string, unknown>>({});

	const valueOf = (name: string): unknown =>
		name in draft ? draft[name] : (getEntity() as Record<string, unknown>)[name];

	function update(name: string, value: unknown) {
		draft = { ...draft, [name]: value };
		autosave.schedule(() => store.write(getEntity().id, draft));
	}

	function setMode(next: DialogMode) {
		if (next === mode) return;
		if (next === 'view') {
			// Leaving write mode commits the tail rather than dropping it.
			autosave.flush();
			draft = {};
		}
		mode = next;
	}

	/** Forget local edits — used when the dialog swaps to a different entity. */
	function reset() {
		autosave.cancel();
		draft = {};
	}

	return {
		get mode() {
			return mode;
		},
		get status(): SaveStatus {
			return autosave.status;
		},
		get statusLabel(): string {
			return autosave.label;
		},
		valueOf,
		update,
		setMode,
		reset,
		flush: () => autosave.flush(),
		destroy: () => autosave.cancel()
	};
}
