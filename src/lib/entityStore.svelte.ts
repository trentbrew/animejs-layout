/**
 * In-memory op-log store.
 *
 * Writes append an op; reads fold the log over the seed. This is the Trellis
 * shape in miniature — state is derived, the log is authoritative — and it is
 * what lets the card, the calendar chip and the dialog all read from one source
 * instead of three copies of the same entity.
 *
 * Swap `SEED` for a fetch and `#append` for a POST and the UI layer is unchanged.
 */

import { ENTITIES, type Entity, type EntityClass } from './entities';
import { blankEntity, draftId } from './schema';

export type Op = {
	seq: number;
	entityId: string;
	/** Partial patch; `undefined` values clear a field. */
	patch: Record<string, unknown>;
	at: string;
	by: string;
};

const SEED: Record<string, Entity> = Object.fromEntries(
	Object.values(ENTITIES)
		.flat()
		.map((entity) => [entity.id, entity])
);

class EntityStore {
	/** Reactive: reading `ops` in a component subscribes it to every write. */
	ops = $state<Op[]>([]);
	by = $state('you');

	/** Newest first, so a created entity lands at index 0 and is immediately visible. */
	#created = $state<Entity[]>([]);

	#seq = 0;

	/** Fold the log for one entity. O(ops), which is the point at this size. */
	read(id: string): Entity | undefined {
		const base = SEED[id] ?? this.#created.find((entity) => entity.id === id);
		if (!base) return undefined;
		let entity = base;
		for (const op of this.ops) {
			if (op.entityId !== id) continue;
			entity = { ...entity, ...op.patch, updatedAt: op.at } as Entity;
		}
		return entity;
	}

	list(entityClass: EntityClass): Entity[] {
		const seeds = ENTITIES[entityClass]
			.map((seed) => this.read(seed.id))
			.filter((entity): entity is Entity => entity !== undefined);
		const created = this.#created
			.filter((entity) => entity.class === entityClass)
			.map((entity) => this.read(entity.id))
			.filter((entity): entity is Entity => entity !== undefined);
		return [...created, ...seeds];
	}

	/** Append a patch. Empty patches are dropped so autosave can't spam the log. */
	write(id: string, patch: Record<string, unknown>) {
		const keys = Object.keys(patch).filter((key) => {
			const next = patch[key];
			const current = this.read(id)?.[key as keyof Entity];
			return JSON.stringify(next) !== JSON.stringify(current);
		});
		if (!keys.length) return;
		const trimmed = Object.fromEntries(keys.map((key) => [key, patch[key]]));
		this.#append(id, trimmed);
	}

	/** Materialise a blank entity and put it at the head of its class list. */
	create(entityClass: EntityClass): Entity {
		const entity = { ...blankEntity(entityClass), id: '' };
		entity.id = draftId(entity);
		this.#created = [entity, ...this.#created];
		return entity;
	}

	#append(id: string, patch: Record<string, unknown>) {
		this.ops = [
			...this.ops,
			{ seq: this.#seq++, entityId: id, patch, at: new Date().toISOString(), by: this.by }
		];
	}

	/** Ops touching one entity, newest first — the dialog's activity list. */
	history(id: string): Op[] {
		return this.ops.filter((op) => op.entityId === id).reverse();
	}
}

export const store = new EntityStore();
