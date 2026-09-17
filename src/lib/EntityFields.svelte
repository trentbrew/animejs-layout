<script lang="ts">
	import EntityField from './EntityField.svelte';
	import type { EntityDraft } from './entityDraft.svelte';
	import { store } from './entityStore.svelte';
	import type { Entity } from './entities';
	import { partitionFields, schemaFor } from './schema';

	interface Props {
		entity: Entity;
		/** Shared with the card chrome, which owns the title. */
		draft: EntityDraft;
	}

	let { entity, draft }: Props = $props();

	const schema = $derived(schemaFor(entity.class));
	const parts = $derived(partitionFields(schema, draft.mode));
	const history = $derived(store.history(entity.id).slice(0, 4));
</script>

<div class="fields">
	<div class="fields-bar">
		<div class="fields-mode" role="group" aria-label="Dialog mode">
			<button
				type="button"
				class="fields-mode-button"
				aria-pressed={draft.mode === 'view'}
				onclick={() => draft.setMode('view')}>read</button
			>
			<button
				type="button"
				class="fields-mode-button"
				aria-pressed={draft.mode === 'edit'}
				onclick={() => draft.setMode('edit')}>write</button
			>
		</div>
		<span class="fields-status" data-status={draft.status}>{draft.statusLabel}</span>
	</div>

	{#if parts.property.length}
		<div class="fields-props">
			{#each parts.property as field (field.name)}
				<EntityField
					{field}
					mode={draft.mode}
					variant="pill"
					value={draft.valueOf(field.name)}
					onchange={(value) => draft.update(field.name, value)}
				/>
			{/each}
		</div>
	{/if}

	<div class="fields-body">
		{#each parts.body as field (field.name)}
			<EntityField
				{field}
				mode={draft.mode}
				value={draft.valueOf(field.name)}
				onchange={(value) => draft.update(field.name, value)}
			/>
		{/each}
	</div>

	{#if history.length}
		<div class="fields-history">
			<span class="fields-history-label">op log</span>
			<ol>
				{#each history as op (op.seq)}
					<li>
						<code>{op.seq}</code>
						<span>{Object.keys(op.patch).join(', ')}</span>
						<span class="fields-history-time">{op.at.slice(11, 16)} · {op.by}</span>
					</li>
				{/each}
			</ol>
		</div>
	{/if}
</div>
