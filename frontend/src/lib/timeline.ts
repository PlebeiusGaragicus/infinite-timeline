const PRESENT_YEAR = new Date().getFullYear();
const BIG_BANG_YEAR = -13_800_000_000;

export const ZOOM_LEVELS = [
	{ label: '1 Month', yearsVisible: 1/12 },
	{ label: '1 Year', yearsVisible: 1 },
	{ label: '10 Years', yearsVisible: 10 },
	{ label: '100 Years', yearsVisible: 100 },
	{ label: '1,000 Years', yearsVisible: 1_000 },
	{ label: '10,000 Years', yearsVisible: 10_000 },
	{ label: '100,000 Years', yearsVisible: 100_000 },
	{ label: '1 Million Years', yearsVisible: 1_000_000 },
	{ label: '10 Million Years', yearsVisible: 10_000_000 },
	{ label: '100 Million Years', yearsVisible: 100_000_000 },
	{ label: '1 Billion Years', yearsVisible: 1_000_000_000 },
	{ label: '14 Billion Years', yearsVisible: 14_000_000_000 }
];

export function getZoomLevel(zoomIndex: number): { label: string; yearsVisible: number } {
	return ZOOM_LEVELS[Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zoomIndex))];
}

export function yearToScreenPosition(year: number, centerYear: number, yearsVisible: number, screenWidth: number): number {
	const yearsFromCenter = year - centerYear;
	const pixelsPerYear = screenWidth / yearsVisible;
	return (screenWidth / 2) + (yearsFromCenter * pixelsPerYear);
}

export function screenPositionToYear(screenX: number, centerYear: number, yearsVisible: number, screenWidth: number): number {
	const pixelsPerYear = screenWidth / yearsVisible;
	const yearsFromCenter = (screenX - screenWidth / 2) / pixelsPerYear;
	return Math.round(centerYear + yearsFromCenter);
}

export function yearToVerticalPosition(year: number, centerYear: number, yearsVisible: number, screenHeight: number): number {
	const yearsFromCenter = year - centerYear;
	const pixelsPerYear = screenHeight / yearsVisible;
	return (screenHeight / 2) - (yearsFromCenter * pixelsPerYear);
}

export function verticalPositionToYear(screenY: number, centerYear: number, yearsVisible: number, screenHeight: number): number {
	const pixelsPerYear = screenHeight / yearsVisible;
	const yearsFromCenter = (screenHeight / 2 - screenY) / pixelsPerYear;
	return Math.round(centerYear + yearsFromCenter);
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatYear(year: number): string {
	const absYear = Math.abs(year);
	if (absYear >= 1_000_000_000) {
		return `${(year / 1_000_000_000).toFixed(1)} Bya`;
	} else if (absYear >= 1_000_000) {
		return `${(year / 1_000_000).toFixed(1)} Mya`;
	} else if (absYear >= 10_000) {
		return `${(year / 1_000).toFixed(0)}k ${year < 0 ? 'BCE' : 'CE'}`;
	} else if (year < 0) {
		return `${absYear} BCE`;
	} else {
		return `${year} CE`;
	}
}

export function formatDate(year: number, month?: number, day?: number, short: boolean = true): string {
	const yearStr = formatYear(year);
	const absYear = Math.abs(year);
	if (absYear >= 10_000 || (!month && !day)) return yearStr;
	const names = short ? MONTH_NAMES : MONTH_NAMES_FULL;
	if (month && day) {
		return `${names[month - 1]} ${day}, ${yearStr}`;
	} else if (month) {
		return `${names[month - 1]} ${yearStr}`;
	}
	return yearStr;
}

export function eventSortValue(year: number, month?: number, day?: number): number {
	return year + ((month ?? 1) - 1) / 12 + ((day ?? 1) - 1) / 365;
}

export interface EventCluster<T> {
	events: T[];
	representative: T;
	year: number;
}

export function getVisibleClusters<T extends { year: number; endYear?: number; starred?: boolean; month?: number; day?: number }>(
	events: T[],
	viewStart: number,
	viewEnd: number,
	screenHeight: number = 800,
	minPixelSpacing: number = 50
): EventCluster<T>[] {
	const inView = events.filter(e => {
		const eventEnd = e.endYear ?? e.year;
		return e.year <= viewEnd && eventEnd >= viewStart;
	});

	if (inView.length === 0) return [];

	const viewRange = viewEnd - viewStart;
	const pixelsPerYear = screenHeight / viewRange;

	const sorted = [...inView].sort((a, b) => {
		const aVal = eventSortValue(a.year, a.month, a.day);
		const bVal = eventSortValue(b.year, b.month, b.day);
		return aVal - bVal;
	});

	// Group events that are too close together into clusters
	// Compare each event against the last event added to the current cluster
	const clusters: EventCluster<T>[] = [];
	let currentCluster: T[] = [sorted[0]];
	let lastEventY = (sorted[0].year - viewStart) * pixelsPerYear;

	for (let i = 1; i < sorted.length; i++) {
		const eventY = (sorted[i].year - viewStart) * pixelsPerYear;
		if (Math.abs(eventY - lastEventY) < minPixelSpacing) {
			currentCluster.push(sorted[i]);
		} else {
			clusters.push(buildCluster(currentCluster));
			currentCluster = [sorted[i]];
		}
		lastEventY = eventY;
	}
	clusters.push(buildCluster(currentCluster));

	return clusters;
}

function buildCluster<T extends { year: number; starred?: boolean }>(events: T[]): EventCluster<T> {
	// Pick the best representative: prefer starred, then first
	const starred = events.filter(e => e.starred);
	const representative = starred.length > 0 ? starred[0] : events[0];
	return {
		events: events,
		representative,
		year: representative.year
	};
}

export { PRESENT_YEAR, BIG_BANG_YEAR };
