<script lang="ts">
	import { Select, Toggle, ToggleGroup } from 'bits-ui';
	import Icon from './Icon.svelte';
	import { ENTITY_CLASSES, type EntityClass, type Layout } from './entities';
	import { THEMES } from './themes';

	interface Props {
		layout: Layout;
		theme: string;
		dark: boolean;
		volume: number;
		muted: boolean;
		visibleCount: number;
		entityCount: number;
		entityClass: EntityClass;
		availableLayouts: Layout[];
		onLayoutChange: (layout: Layout) => void;
		onAction: (action: 'add' | 'remove' | 'shuffle') => void;
		onClassChange: (entityClass: EntityClass) => void;
		onCreate: () => void;
		onThemeChange: (theme: string) => void;
		onDarkChange: (dark: boolean) => void;
		onVolumeChange: (volume: number) => void;
		onMuteToggle: () => void;
	}

	let {
		layout,
		theme,
		dark,
		volume,
		muted,
		visibleCount,
		entityCount,
		entityClass,
		availableLayouts,
		onLayoutChange,
		onAction,
		onClassChange,
		onCreate,
		onThemeChange,
		onDarkChange,
		onVolumeChange,
		onMuteToggle
	}: Props = $props();

	const themeLabel = $derived(THEMES.find((entry) => entry.id === theme)?.label ?? theme);

	/** The calendar shows every dated entity, so the visible-slice actions are moot. */
	const showActions = $derived(layout !== 'calendar');
</script>

<div class="controls">
	<div class="controls-group">
		<Select.Root
			type="single"
			value={entityClass}
			onValueChange={(value) => value && onClassChange(value as EntityClass)}
			items={ENTITY_CLASSES.map((value) => ({ value, label: value }))}
		>
			<Select.Trigger
				class="theme-select-trigger class-select-trigger"
				aria-label="Entity class"
				data-foley-click="tick"
				data-hover-cue
			>
				{entityClass}
				<span aria-hidden="true">▾</span>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content class="theme-select-content" sideOffset={8}>
					<Select.Viewport>
						{#each ENTITY_CLASSES as value (value)}
							<Select.Item value={value} label={value} class="theme-select-item">
								{value}
							</Select.Item>
						{/each}
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	</div>

	<ToggleGroup.Root
		type="single"
		value={layout}
		onValueChange={(value) => value && onLayoutChange(value as Layout)}
		class="controls-group display"
		aria-label="Layout"
	>
		{#each availableLayouts as option (option)}
			<ToggleGroup.Item value={option} class="toggle">
				{#snippet child({ props })}
					<button {...props} aria-label={option} data-hover-cue>
						<Icon key={`layout.${option}`} />
					</button>
				{/snippet}
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>

	{#if showActions}
		<div class="controls-group actions">
			<button
				type="button"
				class="action is-primary"
				data-foley-click="pop"
				data-hover-cue
				onclick={onCreate}
			>
				<Icon key="action.add" />
				<span>new</span>
			</button>
			<button
				type="button"
				class="action"
				aria-label="Add"
				data-foley-click="pop"
				data-hover-cue
				disabled={visibleCount >= entityCount}
				onclick={() => onAction('add')}><Icon key="action.add" /></button
			>
			<button
				type="button"
				class="action"
				aria-label="Remove"
				data-foley-click="off"
				data-hover-cue
				disabled={visibleCount <= 1}
				onclick={() => onAction('remove')}><Icon key="action.remove" /></button
			>
			<button
				type="button"
				class="action"
				aria-label="Shuffle"
				data-foley-click="swoosh"
				data-hover-cue
				onclick={() => onAction('shuffle')}><Icon key="action.shuffle" /></button
			>
		</div>
	{/if}

	<div class="controls-group theme">
		<Select.Root
			type="single"
			value={theme}
			onValueChange={(value) => value && onThemeChange(value)}
			items={THEMES.map((entry) => ({ value: entry.id, label: entry.label }))}
		>
			<Select.Trigger
				class="theme-select-trigger"
				aria-label="tweakcn theme"
				data-foley-click="tick"
				data-hover-cue
			>
				{themeLabel}
				<span aria-hidden="true">▾</span>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content class="theme-select-content" sideOffset={8}>
					<Select.Viewport>
						{#each THEMES as entry (entry.id)}
							<Select.Item value={entry.id} label={entry.label} class="theme-select-item">
								{entry.label}
							</Select.Item>
						{/each}
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>

		<Toggle.Root
			pressed={dark}
			onPressedChange={onDarkChange}
			class="mode"
			aria-label="Dark mode"
			data-foley-click="switch"
			data-hover-cue
		>
			<Icon key={dark ? 'mode.dark' : 'mode.light'} />
		</Toggle.Root>

		<Toggle.Root
			pressed={!muted}
			onPressedChange={() => onMuteToggle()}
			class="mode"
			aria-label={muted ? 'Unmute' : 'Mute'}
			data-hover-cue
		>
			<Icon key={muted ? 'sound.off' : 'sound.on'} />
		</Toggle.Root>

		<input
			class="volume"
			type="range"
			min="0"
			max="1"
			step="0.01"
			value={volume}
			aria-label="Sound volume"
			oninput={(event) => onVolumeChange(Number(event.currentTarget.value))}
		/>
	</div>
</div>
