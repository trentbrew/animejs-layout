/**
 * Month grid builder for the `calendar` layout.
 *
 * Deliberately free of any view concern: it produces plain data that the page
 * maps onto `grid-column` / `grid-row`, which is what lets anime.js treat the
 * calendar as just another geometry state and FLIP cards in and out of it.
 */

export type DayCell = {
	/** `YYYY-MM-DD`, matching the fixture format exactly. */
	iso: string;
	day: number;
	/** 0 = Sunday. */
	weekday: number;
	/** 0..5, the row index within the grid. */
	week: number;
	inMonth: boolean;
	isToday: boolean;
};

export type Month = {
	label: string;
	cells: DayCell[];
	/** `iso` → cell, so placement is a lookup instead of a scan. */
	index: Map<string, DayCell>;
};

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

const pad = (value: number) => String(value).padStart(2, '0');

/** Local-time ISO day, never `toISOString()` — that would shift across UTC. */
export const isoDay = (date: Date) =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Six fixed rows so the grid never reflows between months. */
export const WEEKS = 6;

/** `2026-09-17` → `September 17`, with an optional time suffix. */
export function longDate(iso: string, time?: string) {
	const { year, month, day } = parseIso(iso);
	const label = `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
	return time ? `${label} at ${time}` : label;
}

function parseIso(iso: string) {
	const [year, month, day] = iso.split('-').map(Number);
	return { year, month, day };
}

export function buildMonth(anchor: Date): Month {
	const year = anchor.getFullYear();
	const month = anchor.getMonth();
	const todayIso = isoDay(anchor);
	// Rewind to the Sunday on or before the 1st.
	const start = new Date(year, month, 1 - new Date(year, month, 1).getDay());

	const cells: DayCell[] = [];
	const index = new Map<string, DayCell>();

	for (let i = 0; i < WEEKS * 7; i++) {
		const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
		const iso = isoDay(date);
		const cell: DayCell = {
			iso,
			day: date.getDate(),
			weekday: date.getDay(),
			week: Math.floor(i / 7),
			inMonth: date.getMonth() === month,
			isToday: iso === todayIso
		};
		cells.push(cell);
		index.set(iso, cell);
	}

	return { label: `${MONTH_NAMES[month]} ${year}`, cells, index };
}
