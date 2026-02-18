import type { TimelineEvent, ApiConfig } from './db';

export const timelineState = $state({
	events: [] as TimelineEvent[],
	centerYear: 2000,
	zoomIndex: 3,
	selectedEventId: null as number | null,
	isLoading: true
});

export const apiConfigState = $state({
	config: null as ApiConfig | null,
	isConfigured: false
});

export const chatState = $state({
	messages: [] as { role: 'user' | 'assistant'; content: string }[],
	isOpen: false,
	isLoading: false,
	pendingQuery: '' as string
});

export const searchState = $state({
	query: ''
});
