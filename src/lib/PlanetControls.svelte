<script lang="ts">
	import { Select, Toggle, ToggleGroup } from 'bits-ui';
	import { LAYOUTS, type Layout } from './planets';
	import { THEMES } from './themes';

	interface Props {
		layout: Layout;
		theme: string;
		dark: boolean;
		visibleCount: number;
		planetCount: number;
		onLayoutChange: (layout: Layout) => void;
		onAction: (action: 'add' | 'remove' | 'shuffle') => void;
		onThemeChange: (theme: string) => void;
		onDarkChange: (dark: boolean) => void;
	}

	let {
		layout,
		theme,
		dark,
		visibleCount,
		planetCount,
		onLayoutChange,
		onAction,
		onThemeChange,
		onDarkChange
	}: Props = $props();

	const themeLabel = $derived(THEMES.find((entry) => entry.id === theme)?.label ?? theme);
</script>

<div class="controls">
	<ToggleGroup.Root
		type="single"
		value={layout}
		onValueChange={(value) => value && onLayoutChange(value as Layout)}
		class="controls-group display"
		aria-label="Layout"
	>
		{#each LAYOUTS as option (option)}
			<ToggleGroup.Item value={option} class="toggle">
				{#snippet child({ props })}
					<button {...props}>{option}</button>
				{/snippet}
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>

	<div class="controls-group actions">
		<button
			type="button"
			class="action"
			disabled={visibleCount >= planetCount}
			onclick={() => onAction('add')}>add</button
		>
		<button
			type="button"
			class="action"
			disabled={visibleCount <= 1}
			onclick={() => onAction('remove')}>remove</button
		>
		<button type="button" class="action" onclick={() => onAction('shuffle')}>shuffle</button>
	</div>

	<div class="controls-group theme">
		<Select.Root
			type="single"
			value={theme}
			onValueChange={(value) => value && onThemeChange(value)}
			items={THEMES.map((entry) => ({ value: entry.id, label: entry.label }))}
		>
			<Select.Trigger class="theme-select-trigger" aria-label="tweakcn theme">
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
		>
			{dark ? 'dark' : 'light'}
		</Toggle.Root>
	</div>
</div>
