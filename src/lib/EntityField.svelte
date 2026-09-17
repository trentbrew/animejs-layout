<script lang="ts">
	import { longDate } from './calendar';
	import { resolveWidget, type DialogMode, type FieldDescriptor } from './schema';

	interface Props {
		field: FieldDescriptor;
		value: unknown;
		mode: DialogMode;
		/** `row` = labelled line in the dialog body, `pill` = compact strip chip. */
		variant?: 'row' | 'pill';
		onchange?: (value: unknown) => void;
	}

	let { field, value, mode, variant = 'row', onchange }: Props = $props();

	const widget = $derived(resolveWidget(field));
	const editable = $derived(
		mode !== 'view' && !field.computed && field.valueType !== 'orb' && field.name !== 'type'
	);
	const text = $derived(value == null ? '' : String(value));
	const list = $derived(Array.isArray(value) ? (value as string[]) : []);

	const label = (raw: unknown) =>
		field.options?.find((option) => option.value === raw)?.label ?? (raw == null ? '' : String(raw));

	const tone = $derived(
		field.options?.find((option) => option.value === value)?.tone ?? (field.computed ? 9 : 1)
	);

	const commit = (next: unknown) => onchange?.(next);

	/** Multi-select over a free-form list, so tags work without a fixed option set. */
	function toggleMember(member: string) {
		const next = list.includes(member) ? list.filter((item) => item !== member) : [...list, member];
		commit(next);
	}

	function addMember(event: KeyboardEvent) {
		const input = event.currentTarget as HTMLInputElement;
		const member = input.value.trim();
		if (!member) return;
		input.value = '';
		if (!list.includes(member)) commit([...list, member]);
	}
</script>

<div class="field" data-group={field.group} data-widget={widget} data-variant={variant}>
	{#if variant === 'row'}
		<span class="field-label">
			{field.label}
			{#if field.computed}<span class="field-computed" title="Computed">ƒ</span>{/if}
		</span>
	{/if}

	<div class="field-control">
		{#if widget === 'checkbox'}
			{#if editable}
				<label class="field-toggle">
					<input
						type="checkbox"
						checked={Boolean(value)}
						onchange={(event) => commit(event.currentTarget.checked)}
					/>
					<span>{value ? 'yes' : 'no'}</span>
				</label>
			{:else}
				<span class="field-chip" data-tone={value ? 1 : 9}>{value ? 'yes' : 'no'}</span>
			{/if}
		{:else if widget === 'select' || widget === 'status'}
			{#if editable}
				<select
					class="field-input field-select"
					data-tone={tone}
					value={text}
					onchange={(event) => commit(event.currentTarget.value)}
				>
					{#if !field.required}<option value="">—</option>{/if}
					{#each field.options ?? [] as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			{:else if value !== '' && value != null}
				<span class="field-chip" data-tone={tone}>{label(value)}</span>
			{:else}
				<span class="field-empty">—</span>
			{/if}
		{:else if widget === 'multi_select'}
			<div class="field-tags">
				{#each list as member (member)}
					<span class="field-chip" data-tone="9">
						{member}
						{#if editable}
							<button
								type="button"
								class="field-tag-remove"
								aria-label="Remove {member}"
								onclick={() => toggleMember(member)}>×</button
							>
						{/if}
					</span>
				{/each}
				{#if editable}
					<input
						class="field-input field-tag-input"
						placeholder="Add tag…"
						onkeydown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								addMember(event);
							}
						}}
					/>
				{:else if !list.length}
					<span class="field-empty">—</span>
				{/if}
			</div>
		{:else if widget === 'progress'}
			<span class="field-progress">
				<span class="field-progress-track">
					<span
						class="field-progress-fill"
						style="width: {Math.round(Number(value ?? 0) * 100)}%"
					></span>
				</span>
				{#if editable}
					<input
						class="field-range"
						type="range"
						min="0"
						max="1"
						step="0.05"
						value={Number(value ?? 0)}
						oninput={(event) => commit(Number(event.currentTarget.value))}
					/>
				{/if}
				<span class="field-progress-label">{Math.round(Number(value ?? 0) * 100)}%</span>
			</span>
		{:else if widget === 'rich_text'}
			{#if editable}
				<textarea
					class="field-input field-textarea"
					rows={variant === 'pill' ? 1 : 3}
					placeholder={field.placeholder}
					value={text}
					oninput={(event) => commit(event.currentTarget.value)}
				></textarea>
			{:else}
				<span class="field-readonly-text">{text || '—'}</span>
			{/if}
		{:else if widget === 'date' || widget === 'time'}
			{#if editable}
				<input
					class="field-input"
					type={widget === 'date' ? 'date' : 'time'}
					value={text}
					oninput={(event) => commit(event.currentTarget.value)}
				/>
			{:else}
				<span class="field-readonly-text">
					{value ? (widget === 'date' ? longDate(text) : text) : '—'}
				</span>
			{/if}
		{:else if widget === 'number'}
			{#if editable}
				<input
					class="field-input"
					type="number"
					value={text}
					oninput={(event) => commit(Number(event.currentTarget.value))}
				/>
			{:else}
				<span class="field-readonly-text">{text || '—'}</span>
			{/if}
		{:else if widget === 'people'}
			<span class="field-people">
				{#if value}
					<span class="field-avatar">{String(value).slice(0, 1).toUpperCase()}</span>
				{/if}
				{#if editable}
					<input
						class="field-input"
						type={field.valueType === 'email' ? 'email' : field.valueType === 'phone' ? 'tel' : 'text'}
						placeholder={field.placeholder}
						value={text}
						oninput={(event) => commit(event.currentTarget.value)}
					/>
				{:else}
					<span class="field-readonly-text">{text || '—'}</span>
				{/if}
			</span>
		{:else if widget === 'readonly'}
			<span class="field-readonly-text">{field.computed ? 'computed' : text || '—'}</span>
		{:else if editable}
			<input
				class="field-input"
				type={field.valueType === 'url' ? 'url' : 'text'}
				placeholder={field.placeholder}
				value={text}
				oninput={(event) => commit(event.currentTarget.value)}
			/>
		{:else}
			<span class="field-readonly-text">{text || '—'}</span>
		{/if}
	</div>
</div>
