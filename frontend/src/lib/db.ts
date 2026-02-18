import Dexie, { type EntityTable } from 'dexie';

export interface TimelineEvent {
	id?: number;
	title: string;
	description: string;
	year: number;
	endYear?: number;
	type: 'event' | 'period';
	imageUrl?: string;
	links?: { label: string; url: string }[];
	tags?: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface ApiConfig {
	id?: number;
	baseUrl: string;
	apiKey: string;
	model: string;
}

export interface AppSettings {
	id?: number;
	key: string;
	value: string;
}

const db = new Dexie('InfiniteTimeline') as Dexie & {
	events: EntityTable<TimelineEvent, 'id'>;
	apiConfig: EntityTable<ApiConfig, 'id'>;
	settings: EntityTable<AppSettings, 'id'>;
};

db.version(1).stores({
	events: '++id, title, year, endYear, type, createdAt',
	apiConfig: '++id',
	settings: '++id, key'
});

export { db };

export async function getApiConfig(): Promise<ApiConfig | undefined> {
	return await db.apiConfig.toCollection().first();
}

export async function saveApiConfig(config: Omit<ApiConfig, 'id'>): Promise<void> {
	const existing = await db.apiConfig.toCollection().first();
	if (existing?.id) {
		await db.apiConfig.update(existing.id, config);
	} else {
		await db.apiConfig.add(config);
	}
}

export async function getAllEvents(): Promise<TimelineEvent[]> {
	return await db.events.toArray();
}

export async function addEvent(event: Omit<TimelineEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
	const now = new Date();
	return await db.events.add({
		...event,
		createdAt: now,
		updatedAt: now
	});
}

export async function updateEvent(id: number, updates: Partial<TimelineEvent>): Promise<void> {
	await db.events.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteEvent(id: number): Promise<void> {
	await db.events.delete(id);
}

export async function seedInitialEvents(): Promise<void> {
	const count = await db.events.count();
	if (count > 0) return;

	const seedEvents: Omit<TimelineEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [
		{
			title: 'Big Bang',
			description: 'The origin of the universe, approximately 13.8 billion years ago.',
			year: -13_800_000_000,
			type: 'event',
			tags: ['cosmology', 'origin']
		},
		{
			title: 'Earth Forms',
			description: 'Formation of planet Earth from the solar nebula.',
			year: -4_500_000_000,
			type: 'event',
			tags: ['geology', 'earth']
		},
		{
			title: 'First Life on Earth',
			description: 'Earliest evidence of microbial life appears.',
			year: -3_800_000_000,
			type: 'event',
			tags: ['biology', 'origin']
		},
		{
			title: 'Cambrian Explosion',
			description: 'Rapid diversification of complex animal life forms.',
			year: -538_000_000,
			endYear: -485_000_000,
			type: 'period',
			tags: ['biology', 'evolution']
		},
		{
			title: 'Battle of Thermopylae',
			description: 'Spartan 300 last stand against the Persian Empire.',
			year: -480,
			type: 'event',
			tags: ['history', 'military', 'greece']
		},
		{
			title: 'American Revolution',
			description: 'Colonial America declares independence from Britain.',
			year: 1775,
			endYear: 1783,
			type: 'period',
			tags: ['history', 'america', 'revolution']
		},
		{
			title: 'iPhone Unveiled',
			description: 'Steve Jobs introduces the first iPhone, revolutionizing mobile computing.',
			year: 2007,
			type: 'event',
			tags: ['technology', 'apple']
		},
		{
			title: '"Attention Is All You Need" Published',
			description: 'The transformer architecture paper that sparked the AI revolution.',
			year: 2017,
			type: 'event',
			tags: ['technology', 'ai', 'research']
		},
		{
			title: 'SpaceX Starship Catch',
			description: 'SpaceX successfully catches Starship booster with tower arms.',
			year: 2024,
			type: 'event',
			tags: ['technology', 'space', 'spacex']
		}
	];

	const now = new Date();
	for (const event of seedEvents) {
		await db.events.add({
			...event,
			createdAt: now,
			updatedAt: now
		});
	}
}
