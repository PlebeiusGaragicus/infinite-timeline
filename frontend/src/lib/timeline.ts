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

export function getVisibleEvents<T extends { year: number; endYear?: number }>(
	events: T[],
	viewStart: number,
	viewEnd: number,
	maxVisible: number = 20,
	screenWidth: number = 1000,
	minPixelSpacing: number = 80
): T[] {
	const inView = events.filter(e => {
		const eventEnd = e.endYear ?? e.year;
		return e.year <= viewEnd && eventEnd >= viewStart;
	});

	if (inView.length === 0) return [];

	const viewRange = viewEnd - viewStart;
	const pixelsPerYear = screenWidth / viewRange;
	
	const sorted = [...inView].sort((a, b) => a.year - b.year);
	
	const visible: T[] = [];
	let lastVisibleX = -Infinity;
	
	for (const event of sorted) {
		const eventX = (event.year - viewStart) * pixelsPerYear;
		
		if (eventX - lastVisibleX >= minPixelSpacing) {
			visible.push(event);
			lastVisibleX = eventX;
			
			if (visible.length >= maxVisible) break;
		}
	}

	return visible;
}

export { PRESENT_YEAR, BIG_BANG_YEAR };
