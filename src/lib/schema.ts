/**
 * Field schema — the single declaration that drives *both* the read projection
 * (card, chip, calendar label) and the write surface (dialog fields).
 *
 * Why one descriptor instead of the three parallel models the Nuxt client
 * carries (`PropertyFieldConfig` + `FieldEditorConfig` + `OntologyFieldWidgetMeta`):
 * three models means three places to update per field, and the card path and the
 * dialog path drift. Here a field is declared once; `resolveWidget` derives the
 * editor, and `projection` derives the card from the same row.
 *
 * The shape is deliberately Trellis-shaped: `valueType` is the ontology's
 * `valueType`, `options` is the schema's `selectOptions`, and `computed` marks
 * fields a formula owns so the UI never offers them as input.
 */

import type { Entity, EntityClass } from './entities';

export type ValueType =
	| 'title'
	| 'text'
	| 'rich_text'
	| 'number'
	| 'progress'
	| 'select'
	| 'multi_select'
	| 'status'
	| 'checkbox'
	| 'date'
	| 'time'
	| 'people'
	| 'relation'
	| 'url'
	| 'email'
	| 'phone'
	| 'orb';

/** How a value is edited and displayed. A pure function of `valueType`. */
export type WidgetKind =
	| 'text'
	| 'rich_text'
	| 'number'
	| 'select'
	| 'multi_select'
	| 'status'
	| 'checkbox'
	| 'date'
	| 'time'
	| 'people'
	| 'progress'
	| 'readonly';

export type FieldGroup =
	| 'identity'
	| 'scheduling'
	| 'triage'
	| 'classification'
	| 'people'
	| 'annotation'
	| 'body';

export type DialogMode = 'view' | 'create' | 'edit';

export type SelectOption = {
	value: string;
	label: string;
	/** Accent slot 0..10, resolved against the theme in `app.css`. */
	tone?: number;
};

export type FieldDescriptor = {
	/** Key on the entity. */
	name: string;
	label: string;
	valueType: ValueType;
	group: FieldGroup;
	options?: SelectOption[];
	required?: boolean;
	/** Owned by a formula — rendered read-only, never offered as input. */
	computed?: boolean;
	/** Omit to show in every mode. */
	modes?: readonly DialogMode[];
	/**
	 * Where this field surfaces on the *card*. Exactly one field per slot per
	 * schema; `projection` reads these instead of hardcoding branches.
	 */
	summary?: 'title' | 'visual' | 'chip' | 'meta' | 'accent' | 'badge';
	placeholder?: string;
	defaultValue?: unknown;
};

const WIDGET_BY_VALUE_TYPE: Record<ValueType, WidgetKind> = {
	title: 'text',
	text: 'text',
	rich_text: 'rich_text',
	number: 'number',
	progress: 'progress',
	select: 'select',
	multi_select: 'multi_select',
	status: 'status',
	checkbox: 'checkbox',
	date: 'date',
	time: 'time',
	people: 'people',
	relation: 'people',
	url: 'text',
	email: 'text',
	phone: 'text',
	orb: 'readonly'
};

export const resolveWidget = (field: FieldDescriptor): WidgetKind =>
	WIDGET_BY_VALUE_TYPE[field.valueType];

/** Groups that render in the dialog's compact property strip rather than its body. */
const PROPERTY_GROUPS = new Set<FieldGroup>([
	'identity',
	'scheduling',
	'triage',
	'classification',
	'people',
	'annotation'
]);

export const isPropertyField = (field: FieldDescriptor) => PROPERTY_GROUPS.has(field.group);

export const visibleIn = (field: FieldDescriptor, mode: DialogMode) =>
	!field.modes || field.modes.includes(mode);

export const writableIn = (field: FieldDescriptor, mode: DialogMode) =>
	!field.computed && field.valueType !== 'orb' && field.name !== 'type' && visibleIn(field, mode);

/**
 * Split a schema into the header strip and the body — the entity-dialog layout.
 *
 * Two slots are owned by the card chrome rather than the field list: `title` is
 * the card's heading (edited in place there), and a `computed` field is derived
 * for a visual slot, so listing it as a row would be noise.
 */
export function partitionFields(fields: FieldDescriptor[], mode: DialogMode) {
	const visible = fields.filter(
		(field) => visibleIn(field, mode) && !field.computed && field.valueType !== 'title'
	);
	return {
		property: visible.filter(isPropertyField),
		body: visible.filter((field) => !isPropertyField(field))
	};
}

export const summaryField = (fields: FieldDescriptor[], slot: NonNullable<FieldDescriptor['summary']>) =>
	fields.find((field) => field.summary === slot);

export const optionLabel = (field: FieldDescriptor | undefined, value: unknown) =>
	field?.options?.find((option) => option.value === value)?.label ?? (value == null ? '' : String(value));

export const optionTone = (field: FieldDescriptor | undefined, value: unknown) =>
	field?.options?.find((option) => option.value === value)?.tone;

/* ── option sets ─────────────────────────────────────────────────────────── */

export const PRIORITY_OPTIONS: SelectOption[] = [
	{ value: 'critical', label: 'Critical', tone: 6 },
	{ value: 'high', label: 'High', tone: 1 },
	{ value: 'medium', label: 'Medium', tone: 2 },
	{ value: 'low', label: 'Low', tone: 3 }
];

export const TASK_STATUS_OPTIONS: SelectOption[] = [
	{ value: 'pending', label: 'Pending', tone: 9 },
	{ value: 'in-progress', label: 'In progress', tone: 1 },
	{ value: 'on-track', label: 'On track', tone: 3 },
	{ value: 'due-soon', label: 'Due soon', tone: 2 },
	{ value: 'overdue', label: 'Overdue', tone: 6 },
	{ value: 'completed', label: 'Completed', tone: 4 }
];

export const CONTAINER_STATUS_OPTIONS: SelectOption[] = [
	{ value: 'active', label: 'Active', tone: 1 },
	{ value: 'on-hold', label: 'On hold', tone: 2 },
	{ value: 'completed', label: 'Completed', tone: 4 },
	{ value: 'archived', label: 'Archived', tone: 9 }
];

export const URGENCY_OPTIONS: SelectOption[] = [
	{ value: 'urgent', label: 'Urgent', tone: 6 },
	{ value: 'not-urgent', label: 'Not urgent', tone: 9 }
];

const optionsFrom = (values: readonly string[]): SelectOption[] =>
	values.map((value) => ({ value, label: value.replace(/\b\w/g, (c) => c.toUpperCase()) }));

const TEMPORAL_TYPES = ['task', 'event', 'appointment', 'reminder', 'deadline', 'milestone', 'payment', 'trip'];
const DOCUMENT_TYPES = ['note', 'page', 'bookmark', 'template', 'file'];
const ACTOR_TYPES = ['person', 'contact', 'organization', 'vendor'];
const CONTAINER_TYPES = ['project', 'folder', 'collection', 'goal'];

/* ── schemas, one per entity class ───────────────────────────────────────── */

/**
 * `type` is `create`-only: retyping an entity after the fact would invalidate
 * every field below it, which is the same call the Nuxt client makes.
 */
const typeField = (values: readonly string[], chip = true): FieldDescriptor => ({
	name: 'type',
	label: 'Type',
	valueType: 'select',
	group: 'identity',
	options: optionsFrom(values),
	required: true,
	modes: ['create'],
	summary: chip ? 'chip' : undefined
});

const titleField = (summary: FieldDescriptor['summary'] = 'title'): FieldDescriptor => ({
	name: 'title',
	label: 'Title',
	valueType: 'title',
	group: 'identity',
	required: true,
	summary,
	placeholder: 'Untitled'
});

const descriptionField = (summary?: FieldDescriptor['summary']): FieldDescriptor => ({
	name: 'description',
	label: 'Description',
	valueType: 'rich_text',
	group: 'body',
	summary,
	placeholder: 'Add a description…'
});

const tagsField: FieldDescriptor = {
	name: 'tags',
	label: 'Tags',
	valueType: 'multi_select',
	group: 'annotation',
	options: []
};

export const SCHEMAS: Record<EntityClass, FieldDescriptor[]> = {
	temporal: [
		typeField(TEMPORAL_TYPES),
		titleField(),
		{
			name: 'startDate',
			label: 'Starts',
			valueType: 'date',
			group: 'scheduling',
			required: true,
			summary: 'visual'
		},
		{ name: 'startTime', label: 'Start time', valueType: 'time', group: 'scheduling' },
		{ name: 'endTime', label: 'End time', valueType: 'time', group: 'scheduling' },
		{ name: 'allDay', label: 'All day', valueType: 'checkbox', group: 'scheduling' },
		{
			name: 'priority',
			label: 'Priority',
			valueType: 'select',
			group: 'triage',
			options: PRIORITY_OPTIONS,
			summary: 'accent',
			// First-option would be `critical`; new work is medium until triaged.
			defaultValue: 'medium'
		},
		{
			name: 'taskStatus',
			label: 'Status',
			valueType: 'status',
			group: 'triage',
			options: TASK_STATUS_OPTIONS
		},
		{ name: 'urgency', label: 'Urgency', valueType: 'status', group: 'triage', options: URGENCY_OPTIONS },
		descriptionField('meta'),
		tagsField
	],

	document: [
		typeField(DOCUMENT_TYPES),
		titleField(),
		{
			name: 'excerpt',
			label: 'Excerpt',
			valueType: 'rich_text',
			group: 'body',
			summary: 'visual',
			placeholder: 'What is this about?'
		},
		{ name: 'url', label: 'URL', valueType: 'url', group: 'classification' },
		{ name: 'pinned', label: 'Pinned', valueType: 'checkbox', group: 'annotation', summary: 'badge' },
		descriptionField('meta'),
		tagsField
	],

	actor: [
		typeField(ACTOR_TYPES),
		titleField('visual'),
		{ name: 'role', label: 'Role', valueType: 'text', group: 'classification' },
		{ name: 'email', label: 'Email', valueType: 'email', group: 'people' },
		{ name: 'phone', label: 'Phone', valueType: 'phone', group: 'people' },
		{ name: 'avatar', label: 'Avatar URL', valueType: 'url', group: 'people', computed: true },
		descriptionField('meta'),
		tagsField
	],

	container: [
		typeField(CONTAINER_TYPES),
		titleField(),
		{
			name: 'progress',
			label: 'Progress',
			valueType: 'progress',
			group: 'triage',
			summary: 'visual'
		},
		{
			name: 'status',
			label: 'Status',
			valueType: 'select',
			group: 'triage',
			options: CONTAINER_STATUS_OPTIONS
		},
		descriptionField('meta'),
		tagsField
	],

	demo: [
		// Every planet shares one type, so `category` carries the chip instead.
		typeField(['planet'], false),
		titleField(),
		{
			name: 'category',
			label: 'Category',
			valueType: 'select',
			group: 'classification',
			options: optionsFrom(['Rocky planet', 'Gas giant', 'Ice giant']),
			summary: 'chip'
		},
		{
			name: 'orb',
			label: 'Orb',
			valueType: 'orb',
			group: 'identity',
			computed: true,
			summary: 'visual'
		},
		descriptionField('meta')
	]
};

export const schemaFor = (entityClass: EntityClass) => SCHEMAS[entityClass];

/* ── create ──────────────────────────────────────────────────────────────── */

const isoDay = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Seed a blank entity from its schema, so create mode needs no per-type code:
 * a field's default is `defaultValue`, else the first option, else a
 * type-appropriate empty. A new temporal entity therefore lands on today and
 * shows up on the calendar immediately.
 */
export function blankEntity(entityClass: EntityClass, now = new Date()): Entity {
	const entity = {
		id: '',
		type: '',
		class: entityClass,
		title: '',
		tags: [] as string[],
		createdAt: now.toISOString(),
		updatedAt: now.toISOString()
	} as Entity;

	for (const field of SCHEMAS[entityClass]) {
		if (field.defaultValue !== undefined) {
			(entity as Record<string, unknown>)[field.name] = field.defaultValue;
			continue;
		}
		if (field.options?.length) {
			(entity as Record<string, unknown>)[field.name] = field.options[0].value;
			continue;
		}
		switch (field.valueType) {
			case 'date':
				(entity as Record<string, unknown>)[field.name] = isoDay(now);
				break;
			case 'checkbox':
				(entity as Record<string, unknown>)[field.name] = false;
				break;
			case 'number':
			case 'progress':
				(entity as Record<string, unknown>)[field.name] = 0;
				break;
			case 'multi_select':
				(entity as Record<string, unknown>)[field.name] = [];
				break;
		}
	}

	// The orb is a computed visual, not user input — give it something drawable.
	if (entityClass === 'demo') entity.view = { color: 2, orb: { radius: 90, rings: [] } };
	// Temporal rows are only useful on the calendar if they have a slot.
	if (entityClass === 'temporal') {
		entity.startTime = '09:00';
		entity.endTime = '09:30';
	}

	return entity;
}

/** `task-1a2b3c` — Trellis namespaces ids by type. */
export function draftId(entity: Entity): string {
	const slug = entity.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	const suffix = Math.random().toString(36).slice(2, 8);
	return slug ? `${entity.type}-${slug}` : `${entity.type}-${suffix}`;
}
