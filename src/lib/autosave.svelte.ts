/**
 * Debounced autosave.
 *
 * The dialog has no save button: edits land in a local draft, and the draft is
 * flushed to the store after a quiet period. Mirrors the Nuxt client's
 * `useAutoSave`, but reads its dirty state from the draft it is handed rather
 * than deep-watching a reactive object, so there is no snapshot stringify on
 * every keystroke.
 */

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export class Autosave {
	status = $state<SaveStatus>('idle');
	lastSavedAt = $state<Date | null>(null);

	#delay: number;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#resetTimer: ReturnType<typeof setTimeout> | null = null;
	#flush: (() => void) | null = null;

	constructor(delay = 700) {
		this.#delay = delay;
	}

	get label(): string {
		switch (this.status) {
			case 'dirty':
				return 'editing…';
			case 'saving':
				return 'saving…';
			case 'saved':
				return this.lastSavedAt
					? `saved ${this.lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
					: 'saved';
			case 'error':
				return 'save failed';
			default:
				return '';
		}
	}

	/** Record an edit and (re)arm the debounce. */
	schedule(flush: () => void) {
		this.#flush = flush;
		this.status = 'dirty';
		if (this.#timer) clearTimeout(this.#timer);
		this.#timer = setTimeout(() => this.flush(), this.#delay);
	}

	flush() {
		if (this.#timer) {
			clearTimeout(this.#timer);
			this.#timer = null;
		}
		const flush = this.#flush;
		this.#flush = null;
		if (!flush) return;
		try {
			this.status = 'saving';
			flush();
			this.lastSavedAt = new Date();
			this.status = 'saved';
		} catch {
			this.status = 'error';
		}
		if (this.#resetTimer) clearTimeout(this.#resetTimer);
		this.#resetTimer = setTimeout(() => {
			if (this.status === 'saved') this.status = 'idle';
		}, 2000);
	}

	/** Drop any pending flush — used when the dialog closes or the entity swaps. */
	cancel() {
		if (this.#timer) clearTimeout(this.#timer);
		if (this.#resetTimer) clearTimeout(this.#resetTimer);
		this.#timer = null;
		this.#resetTimer = null;
		this.#flush = null;
		this.status = 'idle';
	}
}
