/**
 * Entity model for the explorer.
 *
 * Shaped after the Trellis two-axis type system (see the `trellis-graph` skill):
 * every entity has an **entity class** (structural shape, decides which views
 * make sense) and an **entity type** (specific kind, decides the card
 * projection). Fields are flat, exactly as Trellis stores them, so a fixture
 * can be swapped for a real graph node without touching the view layer.
 */

export type EntityClass = 'temporal' | 'document' | 'actor' | 'container' | 'demo';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'in-progress' | 'on-track' | 'due-soon' | 'overdue' | 'completed';

export type Entity = {
	/** Globally unique and namespaced in Trellis, e.g. `task-review-pr-42`. */
	id: string;
	type: string;
	class: EntityClass;
	/** Required by Trellis. */
	title: string;
	description?: string;
	/** Trellis common field; used as the card chip when present. */
	category?: string;
	tags: string[];
	createdAt: string;

	/* ── temporal ── */
	startDate?: string;
	endDate?: string;
	allDay?: boolean;
	startTime?: string;
	endTime?: string;
	priority?: Priority;
	urgency?: 'urgent' | 'not-urgent';
	taskStatus?: TaskStatus;

	/* ── document ── */
	content?: string;
	pinned?: boolean;
	url?: string;
	excerpt?: string;

	/* ── actor ── */
	email?: string;
	phone?: string;
	avatar?: string;
	role?: string;

	/* ── container ── */
	progress?: number;
	status?: 'active' | 'archived' | 'completed' | 'on-hold';

	/**
	 * Presentation hints. Not a Trellis field — only the `demo` fixtures use it,
	 * to keep the original planet visuals bit-for-bit while the real classes
	 * derive their colour from data.
	 */
	view?: { color?: number; orb?: { radius: number; rings: number[] } };
};

/* ── layouts ─────────────────────────────────────────────────────────────── */

export const BASE_LAYOUTS = ['grid', 'list', 'stripes', 'stack', 'chaos'] as const;

export type BaseLayout = (typeof BASE_LAYOUTS)[number];

export type Layout = BaseLayout | 'calendar';

/**
 * `calendar` is gated on the data, not on the class name: any set containing a
 * dated entity can be projected onto a month grid. A dated `note` would opt in
 * without a code change.
 */
export const layoutsFor = (entities: Entity[]): Layout[] =>
	entities.some((entity) => Boolean(entity.startDate))
		? [...BASE_LAYOUTS, 'calendar']
		: [...BASE_LAYOUTS];

export const INITIAL_VISIBLE = 4;

/* ── projection ──────────────────────────────────────────────────────────── */

export type Visual =
	| { kind: 'orb'; radius: number; rings: number[] }
	| { kind: 'date'; month: string; day: string; time?: string; tone?: string }
	| { kind: 'excerpt'; text: string; pinned: boolean }
	| { kind: 'avatar'; initials: string; image?: string }
	| { kind: 'progress'; value: number; status: string };

export type Projection = {
	/** Accent slot 0..10, resolved against the active theme in `app.css`. */
	color: number;
	title: string;
	/** The `.card-type` chip. */
	subtitle: string;
	/** One-line summary shown on grid/list cards. */
	meta: string;
	/** Field list shown in the dialog. */
	facts: string[];
	visual: Visual;
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Parse `YYYY-MM-DD` without going through `Date`, so no timezone drift. */
export const parseDay = (iso: string) => {
	const [year, month, day] = iso.split('-').map(Number);
	return { year, month, day };
};

const titleCase = (value: string) =>
	value.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const hash = (value: string) => {
	let acc = 0;
	for (let i = 0; i < value.length; i++) acc = (acc * 31 + value.charCodeAt(i)) | 0;
	return Math.abs(acc);
};

const PRIORITY_COLOR: Record<Priority, number> = {
	critical: 6,
	high: 1,
	medium: 2,
	low: 3
};

const initials = (name: string) =>
	name
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');

export function projection(entity: Entity): Projection {
	const color =
		entity.view?.color ?? (entity.priority ? PRIORITY_COLOR[entity.priority] : hash(entity.id) % 11);

	const facts: string[] = [];
	if (entity.startDate) {
		facts.push(
			entity.endDate && entity.endDate !== entity.startDate
				? `${entity.startDate} → ${entity.endDate}`
				: entity.startDate
		);
	}
	if (entity.startTime) {
		facts.push(entity.endTime ? `${entity.startTime} – ${entity.endTime}` : entity.startTime);
	}
	if (entity.priority) facts.push(`Priority: ${entity.priority}`);
	if (entity.taskStatus) facts.push(`Status: ${entity.taskStatus.replace('-', ' ')}`);
	if (entity.status) facts.push(`Status: ${entity.status}`);
	if (entity.role) facts.push(`Role: ${entity.role}`);
	if (entity.email) facts.push(entity.email);
	if (entity.phone) facts.push(entity.phone);
	if (typeof entity.progress === 'number') facts.push(`Progress: ${Math.round(entity.progress * 100)}%`);
	if (entity.url) facts.push(entity.url);
	if (entity.tags.length) facts.push(`Tags: ${entity.tags.join(', ')}`);
	facts.push(`Created ${entity.createdAt.slice(0, 10)}`);

	const subtitle = titleCase(entity.category ?? entity.type);
	const meta = entity.description ?? entity.excerpt ?? '';

	let visual: Visual;
	if (entity.view?.orb) {
		visual = { kind: 'orb', ...entity.view.orb };
	} else if (entity.startDate) {
		const { month, day } = parseDay(entity.startDate);
		visual = {
			kind: 'date',
			month: MONTHS[month - 1],
			day: String(day).padStart(2, '0'),
			time: entity.allDay ? undefined : entity.startTime,
			tone: entity.priority
		};
	} else if (entity.class === 'actor') {
		visual = { kind: 'avatar', initials: initials(entity.title), image: entity.avatar };
	} else if (entity.class === 'container') {
		visual = { kind: 'progress', value: entity.progress ?? 0, status: entity.status ?? 'active' };
	} else {
		visual = {
			kind: 'excerpt',
			text: (entity.excerpt ?? entity.content ?? entity.description ?? '').slice(0, 140),
			pinned: Boolean(entity.pinned)
		};
	}

	return { color, title: entity.title, subtitle, meta, facts, visual };
}

/* ── fixtures ────────────────────────────────────────────────────────────── */

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth();
const TODAY = now.getDate();
const DAYS_IN_MONTH = new Date(YEAR, MONTH + 1, 0).getDate();

/** A day inside the current month, so the calendar is never empty. */
const day = (offset: number) =>
	`${YEAR}-${String(MONTH + 1).padStart(2, '0')}-${String(Math.min(Math.max(TODAY + offset, 1), DAYS_IN_MONTH)).padStart(2, '0')}`;

/** A day pinned to a fixed slot in the current month (for multi-event days). */
const slot = (date: number) =>
	`${YEAR}-${String(MONTH + 1).padStart(2, '0')}-${String(Math.min(date, DAYS_IN_MONTH)).padStart(2, '0')}`;

const created = (daysAgo: number) =>
	new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

const temporal: Entity[] = [
	{
		id: 'event-design-review',
		type: 'event',
		class: 'temporal',
		title: 'Fractal responsiveness review',
		description: 'Walk the inset hierarchy against the three breakpoints.',
		tags: ['design', 'studio'],
		createdAt: created(12),
		startDate: slot(17),
		startTime: '10:00',
		endTime: '11:00',
		priority: 'high'
	},
	{
		id: 'event-investor-call',
		type: 'event',
		class: 'temporal',
		title: 'Seed call — Stochastic',
		description: 'Local-first thesis, 30 minutes, no deck.',
		tags: ['fundraising'],
		createdAt: created(9),
		startDate: slot(17),
		startTime: '14:30',
		endTime: '15:00',
		priority: 'critical'
	},
	{
		id: 'task-sprite-client',
		type: 'task',
		class: 'temporal',
		title: 'Ship sprite-client preview',
		description: 'Vue/Nuxt client talking to a Trellis room over Iroh.',
		tags: ['trellis', 'cloud'],
		createdAt: created(21),
		startDate: slot(8),
		startTime: '09:00',
		priority: 'high',
		taskStatus: 'in-progress'
	},
	{
		id: 'task-eql-join-perf',
		type: 'task',
		class: 'temporal',
		title: 'Profile EQL-S join path',
		description: 'Set a budget for the hot loop before optimising.',
		tags: ['trellis', 'perf'],
		createdAt: created(16),
		startDate: slot(12),
		priority: 'medium',
		taskStatus: 'on-track'
	},
	{
		id: 'milestone-yc-batch',
		type: 'milestone',
		class: 'temporal',
		title: 'YC S26 application',
		description: 'Submit before the deadline; cofounder gap stays honest.',
		tags: ['fundraising'],
		createdAt: created(30),
		startDate: slot(22),
		priority: 'critical'
	},
	{
		id: 'reminder-nlnet-window',
		type: 'reminder',
		class: 'temporal',
		title: 'NLnet grant window closes',
		description: 'Attach the op-log amortisation numbers.',
		tags: ['funding'],
		createdAt: created(5),
		startDate: slot(26),
		allDay: true,
		priority: 'medium'
	},
	{
		id: 'event-sf-commons',
		type: 'event',
		class: 'temporal',
		title: 'SF Commons walkthrough',
		description: 'Second look at the studio floor.',
		tags: ['sf', 'housing'],
		createdAt: created(3),
		startDate: day(2),
		startTime: '16:00',
		endTime: '17:30',
		priority: 'low'
	},
	{
		id: 'deadline-tax-filing',
		type: 'deadline',
		class: 'temporal',
		title: 'Quarterly filing',
		description: 'Hand the ledger to the accountant.',
		tags: ['finance'],
		createdAt: created(40),
		startDate: slot(30),
		allDay: true,
		priority: 'high',
		taskStatus: 'pending'
	}
];

const documents: Entity[] = [
	{
		id: 'note-calendar-morph',
		type: 'note',
		class: 'document',
		title: 'Why the calendar morph is cheap',
		description: 'Geometry-keyed FLIP, not structure-keyed.',
		excerpt:
			'anime.js keys layout nodes by data-layout-id and animates rects, so a month grid is just another geometry state.',
		content: '',
		pinned: true,
		tags: ['trellis', 'motion'],
		createdAt: created(2)
	},
	{
		id: 'note-campus-native',
		type: 'note',
		class: 'document',
		title: 'Campus-native planning',
		description: 'Facilities, zones, and the authority model.',
		excerpt:
			'One facility per task, zones grant capability, every mutation is logged against a zone.',
		content: '',
		tags: ['campus', 'planning'],
		createdAt: created(11)
	},
	{
		id: 'page-adr-0025',
		type: 'page',
		class: 'document',
		title: 'ADR 0025 — DSL first, then sync',
		description: 'One TQL, two transports.',
		excerpt:
			'The local VCS kernel and the cloud MCP speak the same query language; sync is a transport concern.',
		content: '',
		tags: ['trellis', 'adr'],
		createdAt: created(25)
	},
	{
		id: 'bookmark-iroh',
		type: 'bookmark',
		class: 'document',
		title: 'iroh — dial keys, not addresses',
		description: 'QUIC + hole punching for the sync layer.',
		url: 'https://iroh.computer',
		excerpt: 'Blobs and docs over a content-addressed transport; good fit for the op-log.',
		tags: ['trellis', 'sync'],
		createdAt: created(18)
	},
	{
		id: 'note-motion-doctrine',
		type: 'note',
		class: 'document',
		title: 'Motion doctrine notes',
		description: 'How you exit determines how you enter.',
		excerpt:
			'Vector law, the seam gate, and the ban on idle wobble — motion must perform, not breathe.',
		content: '',
		pinned: true,
		tags: ['motion', 'craft'],
		createdAt: created(6)
	},
	{
		id: 'note-raster-mpls',
		type: 'note',
		class: 'document',
		title: 'SPEAK MPLS onboarding',
		description: 'First real public-access partner.',
		excerpt: 'Schedule ingest, playlist rules, and the STL handoff; the rest were test fixtures.',
		tags: ['raster', 'clients'],
		createdAt: created(33)
	}
];

const actors: Entity[] = [
	{
		id: 'contact-mira',
		type: 'contact',
		class: 'actor',
		title: 'Mira Okonkwo',
		description: 'Programme lead at the access station.',
		email: 'mira@speakmpls.example',
		phone: '+1 612 555 0134',
		role: 'Programme lead',
		tags: ['raster', 'partner'],
		createdAt: created(44)
	},
	{
		id: 'contact-dane',
		type: 'contact',
		class: 'actor',
		title: 'Dane Whitfield',
		description: 'Angel, ex-infra. Cares about the amortisation story.',
		email: 'dane@whitfield.example',
		role: 'Angel investor',
		tags: ['fundraising'],
		createdAt: created(28)
	},
	{
		id: 'person-trent',
		type: 'person',
		class: 'actor',
		title: 'Trent Brew',
		description: 'Founder, Turtle Labs. Designer-engineer.',
		email: 'trent@turtlelabs.example',
		role: 'Founder',
		tags: ['founder'],
		createdAt: created(120)
	},
	{
		id: 'org-nlnet',
		type: 'organization',
		class: 'actor',
		title: 'NLnet Foundation',
		description: 'Open internet funding; NGI Zero track.',
		email: 'funding@nlnet.example',
		role: 'Funder',
		tags: ['funding'],
		createdAt: created(60)
	},
	{
		id: 'vendor-sprites',
		type: 'vendor',
		class: 'actor',
		title: 'Sprites',
		description: 'Hosts the Trellis rooms.',
		email: 'support@sprites.example',
		role: 'Infrastructure vendor',
		tags: ['trellis', 'infra'],
		createdAt: created(15)
	},
	{
		id: 'contact-june',
		type: 'contact',
		class: 'actor',
		title: 'June Park',
		description: 'Cofounder conversations — GTM gap is the open question.',
		email: 'june@park.example',
		role: 'Cofounder candidate',
		tags: ['hiring'],
		createdAt: created(19)
	}
];

const containers: Entity[] = [
	{
		id: 'project-trellis-cloud',
		type: 'project',
		class: 'container',
		title: 'Trellis Cloud',
		description: 'Sprite-client, rooms, and the sync story.',
		progress: 0.42,
		status: 'active',
		tags: ['trellis', 'cloud'],
		createdAt: created(52)
	},
	{
		id: 'project-raster-tv',
		type: 'project',
		class: 'container',
		title: 'Raster.tv',
		description: 'Live with one real public-access partner.',
		progress: 0.68,
		status: 'active',
		tags: ['raster'],
		createdAt: created(96)
	},
	{
		id: 'goal-fractal-responsiveness',
		type: 'goal',
		class: 'container',
		title: 'Fractal responsiveness',
		description: 'Inset hierarchy that holds at every zoom level.',
		progress: 0.3,
		status: 'active',
		tags: ['design', 'studio'],
		createdAt: created(23)
	},
	{
		id: 'collection-sf-jobs',
		type: 'collection',
		class: 'container',
		title: 'SF roles',
		description: 'Design-engineer roles worth the commute.',
		progress: 0.15,
		status: 'on-hold',
		tags: ['sf', 'jobs'],
		createdAt: created(31)
	},
	{
		id: 'project-trellis-studio',
		type: 'project',
		class: 'container',
		title: 'Trellis Studio',
		description: 'npx trellis studio, graph-native editing.',
		progress: 0.55,
		status: 'active',
		tags: ['trellis', 'studio'],
		createdAt: created(74)
	},
	{
		id: 'folder-brand',
		type: 'folder',
		class: 'container',
		title: 'Brand assets',
		description: 'Marks, palettes, type ramp.',
		progress: 1,
		status: 'completed',
		tags: ['branding'],
		createdAt: created(88)
	}
];

/**
 * The original planet demo, kept as the baseline visual. Modelled as a `demo`
 * class so the four real Trellis classes stay uncontaminated.
 */
const demos: Entity[] = [
	{
		id: 'planet-mercury',
		type: 'planet',
		class: 'demo',
		category: 'Rocky planet',
		title: 'Mercury',
		description: 'Smallest planet and closest to the Sun.',
		tags: [],
		createdAt: created(365),
		view: { color: 1, orb: { radius: 60, rings: [] } }
	},
	{
		id: 'planet-venus',
		type: 'planet',
		class: 'demo',
		category: 'Rocky planet',
		title: 'Venus',
		description: 'Slow-spinning world with runaway greenhouse heat.',
		tags: [],
		createdAt: created(365),
		view: { color: 2, orb: { radius: 90, rings: [] } }
	},
	{
		id: 'planet-earth',
		type: 'planet',
		class: 'demo',
		category: 'Rocky planet',
		title: 'Earth',
		description: 'It’s apparently pretty nice over there.',
		tags: [],
		createdAt: created(365),
		view: { color: 6, orb: { radius: 100, rings: [] } }
	},
	{
		id: 'planet-mars',
		type: 'planet',
		class: 'demo',
		category: 'Rocky planet',
		title: 'Mars',
		description: 'Cold desert planet with canyons and polar ice.',
		tags: [],
		createdAt: created(365),
		view: { color: 0, orb: { radius: 80, rings: [] } }
	},
	{
		id: 'planet-jupiter',
		type: 'planet',
		class: 'demo',
		category: 'Gas giant',
		title: 'Jupiter',
		description: 'Gigantic gas giant with a powerful magnetic field.',
		tags: [],
		createdAt: created(365),
		view: { color: 3, orb: { radius: 250, rings: [] } }
	},
	{
		id: 'planet-saturn',
		type: 'planet',
		class: 'demo',
		category: 'Gas giant',
		title: 'Saturn',
		description: 'Ringed gas giant with dozens of icy moons.',
		tags: [],
		createdAt: created(365),
		view: { color: 4, orb: { radius: 150, rings: [180, 200, 220, 240] } }
	},
	{
		id: 'planet-uranus',
		type: 'planet',
		class: 'demo',
		category: 'Ice giant',
		title: 'Uranus',
		description: 'An ice giant tipped almost completely on its side.',
		tags: [],
		createdAt: created(365),
		view: { color: 8, orb: { radius: 120, rings: [150] } }
	},
	{
		id: 'planet-neptune',
		type: 'planet',
		class: 'demo',
		category: 'Ice giant',
		title: 'Neptune',
		description: 'Distant ice giant with supersonic winds.',
		tags: [],
		createdAt: created(365),
		view: { color: 10, orb: { radius: 110, rings: [] } }
	}
];

export const ENTITIES: Record<EntityClass, Entity[]> = {
	temporal,
	document: documents,
	actor: actors,
	container: containers,
	demo: demos
};

export const ENTITY_CLASSES = Object.keys(ENTITIES) as EntityClass[];

export const CLASS_LABELS: Record<EntityClass, string> = {
	temporal: 'temporal',
	document: 'document',
	actor: 'actor',
	container: 'container',
	demo: 'demo'
};
