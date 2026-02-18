import Dexie, { type EntityTable } from 'dexie';

export interface TimelineEvent {
	id?: number;
	title: string;
	description: string;
	year: number;
	month?: number;
	day?: number;
	endYear?: number;
	endMonth?: number;
	endDay?: number;
	type: 'event' | 'period';
	starred?: boolean;
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

db.version(2).stores({
	events: '++id, title, year, endYear, type, starred, createdAt',
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
		// --- Deep Past & Prehistory ---
		{
			title: 'Big Bang',
			description: 'The origin of the universe, approximately 13.8 billion years ago.',
			year: -13_800_000_000,
			type: 'event',
			starred: true,
			tags: ['cosmology', 'origin']
		},
		{
			title: 'Formation of the Moon',
			description: 'A Mars-sized body (Theia) collides with Earth, creating the Moon.',
			year: -4_510_000_000,
			type: 'event',
			tags: ['astronomy', 'space']
		},
		{
			title: 'Earth Forms',
			description: 'Formation of planet Earth from the solar nebula.',
			year: -4_500_000_000,
			type: 'event',
			starred: true,
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
			title: 'Great Oxidation Event',
			description: 'Cyanobacteria produce oxygen, changing Earth\'s atmosphere.',
			year: -2_400_000_000,
			type: 'event',
			tags: ['geology', 'biology']
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
			title: 'First Dinosaurs',
			description: 'Dinosaurs first appear during the Triassic period.',
			year: -233_000_000,
			type: 'event',
			tags: ['biology', 'paleontology']
		},
		{
			title: 'Jurassic Period',
			description: 'The age of dinosaurs, characterized by a warm, wet climate.',
			year: -201_000_000,
			endYear: -145_000_000,
			type: 'period',
			tags: ['biology', 'paleontology']
		},
		{
			title: 'Cretaceous-Paleogene Extinction',
			description: 'Asteroid impact causes the extinction of non-avian dinosaurs.',
			year: -66_000_000,
			type: 'event',
			starred: true,
			tags: ['biology', 'extinction']
		},
		{
			title: 'First Homo Sapiens',
			description: 'Anatomically modern humans evolve in Africa.',
			year: -300_000,
			type: 'event',
			tags: ['anthropology', 'humanity']
		},
		{
			title: 'Agricultural Revolution',
			description: 'Transition from hunting and gathering to settled agriculture.',
			year: -10_000,
			endYear: -4_000,
			type: 'period',
			tags: ['history', 'humanity']
		},

		// --- Ancient History ---
		{
			title: 'Invention of the Wheel',
			description: 'The wheel is invented in Mesopotamia.',
			year: -3500,
			type: 'event',
			tags: ['technology', 'invention']
		},
		{
			title: 'Invention of Writing',
			description: 'Cuneiform script emerges in Sumer.',
			year: -3200,
			type: 'event',
			tags: ['technology', 'culture']
		},
		{
			title: 'Great Pyramid of Giza',
			description: 'Completion of the Great Pyramid for Pharaoh Khufu.',
			year: -2560,
			type: 'event',
			starred: true,
			tags: ['history', 'egypt', 'architecture']
		},
		{
			title: 'Code of Hammurabi',
			description: 'One of the earliest and most complete written legal codes.',
			year: -1754,
			type: 'event',
			tags: ['history', 'law', 'mesopotamia']
		},
		{
			title: 'Founding of Rome',
			description: 'Legendary founding of Rome by Romulus and Remus.',
			year: -753,
			month: 4,
			day: 21,
			type: 'event',
			tags: ['history', 'rome']
		},
		{
			title: 'Battle of Thermopylae',
			description: 'Spartan 300 last stand against the Persian Empire.',
			year: -480,
			month: 8,
			type: 'event',
			tags: ['history', 'military', 'greece']
		},
		{
			title: 'Death of Alexander the Great',
			description: 'Alexander dies in Babylon, leading to the division of his empire.',
			year: -323,
			month: 6,
			type: 'event',
			tags: ['history', 'greece']
		},
		{
			title: 'Great Wall of China',
			description: 'Unification of earlier walls by Qin Shi Huang.',
			year: -221,
			type: 'period',
			tags: ['history', 'china', 'architecture']
		},
		{
			title: 'Assassination of Julius Caesar',
			description: 'Caesar is stabbed by Roman senators on the Ides of March.',
			year: -44,
			month: 3,
			day: 15,
			type: 'event',
			tags: ['history', 'rome', 'politics']
		},
		{
			title: 'Augustus becomes Emperor',
			description: 'The Roman Republic effectively becomes the Roman Empire.',
			year: -27,
			month: 1,
			day: 16,
			type: 'event',
			tags: ['history', 'rome']
		},

		// --- Common Era / Middle Ages / Renaissance ---
		{
			title: 'Fall of Western Roman Empire',
			description: 'Romulus Augustulus is deposed by Odoacer.',
			year: 476,
			month: 9,
			day: 4,
			type: 'event',
			tags: ['history', 'rome']
		},
		{
			title: 'Charlemagne Crowned Emperor',
			description: 'Charlemagne is crowned Holy Roman Emperor.',
			year: 800,
			month: 12,
			day: 25,
			type: 'event',
			tags: ['history', 'europe']
		},
		{
			title: 'Norman Conquest',
			description: 'William the Conqueror defeats King Harold II at Hastings.',
			year: 1066,
			month: 10,
			day: 14,
			type: 'event',
			tags: ['history', 'england']
		},
		{
			title: 'Magna Carta',
			description: 'King John of England signs the "Great Charter" of liberties.',
			year: 1215,
			month: 6,
			day: 15,
			type: 'event',
			tags: ['history', 'law']
		},
		{
			title: 'Black Death',
			description: 'Bubonic plague pandemic devastates Europe and Asia.',
			year: 1347,
			endYear: 1351,
			type: 'period',
			tags: ['history', 'health']
		},
		{
			title: 'Gutenberg Printing Press',
			description: 'Johannes Gutenberg introduces movable type printing to Europe.',
			year: 1440,
			type: 'event',
			starred: true,
			tags: ['technology', 'invention']
		},
		{
			title: 'Fall of Constantinople',
			description: 'Capture of the Byzantine capital by the Ottoman Empire.',
			year: 1453,
			month: 5,
			day: 29,
			type: 'event',
			tags: ['history', 'byzantine']
		},
		{
			title: 'Columbus Reaches the Americas',
			description: 'Christopher Columbus lands in the Bahamas.',
			year: 1492,
			month: 10,
			day: 12,
			type: 'event',
			tags: ['history', 'exploration']
		},
		{
			title: 'Mona Lisa Painted',
			description: 'Leonardo da Vinci paints his masterpiece.',
			year: 1503,
			type: 'event',
			tags: ['art', 'culture']
		},
		{
			title: 'Protestant Reformation',
			description: 'Martin Luther posts his 95 Theses.',
			year: 1517,
			month: 10,
			day: 31,
			type: 'event',
			tags: ['history', 'religion']
		},

		// --- Modern History ---
		{
			title: 'Galileo\'s Telescope',
			description: 'Galileo demonstrates his telescope to the Venetian Senate.',
			year: 1609,
			month: 8,
			day: 25,
			type: 'event',
			tags: ['science', 'astronomy']
		},
		{
			title: 'Newton\'s Principia',
			description: 'Isaac Newton publishes laws of motion and universal gravitation.',
			year: 1687,
			month: 7,
			day: 5,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'Watt Steam Engine',
			description: 'James Watt patents his improved steam engine.',
			year: 1769,
			type: 'event',
			tags: ['technology', 'industrial']
		},
		{
			title: 'American Revolution',
			description: 'Colonial America declares independence from Britain.',
			year: 1775,
			month: 4,
			day: 19,
			endYear: 1783,
			endMonth: 9,
			endDay: 3,
			type: 'period',
			starred: true,
			tags: ['history', 'america', 'revolution']
		},
		{
			title: 'Declaration of Independence',
			description: 'The United States Declaration of Independence was adopted.',
			year: 1776,
			month: 7,
			day: 4,
			type: 'event',
			starred: true,
			tags: ['history', 'america']
		},
		{
			title: 'French Revolution',
			description: 'The French Revolution overthrows the monarchy and reshapes France.',
			year: 1789,
			endYear: 1799,
			type: 'period',
			tags: ['history', 'france', 'revolution']
		},
		{
			title: 'Napoleonic Wars',
			description: 'Series of conflicts involving Napoleon\'s French Empire.',
			year: 1803,
			endYear: 1815,
			type: 'period',
			tags: ['history', 'europe', 'war']
		},
		{
			title: 'Industrial Revolution',
			description: 'Transition to new manufacturing processes in Europe and the US.',
			year: 1760,
			endYear: 1840,
			type: 'period',
			tags: ['history', 'technology', 'industry']
		},
		{
			title: 'Origin of Species',
			description: 'Charles Darwin publishes his theory of evolution.',
			year: 1859,
			month: 11,
			day: 24,
			type: 'event',
			tags: ['science', 'biology']
		},
		{
			title: 'American Civil War',
			description: 'Civil war between the Union and the Confederacy.',
			year: 1861,
			endYear: 1865,
			type: 'period',
			tags: ['history', 'america', 'war']
		},
		{
			title: 'First Powered Flight',
			description: 'The Wright brothers fly the Wright Flyer at Kitty Hawk.',
			year: 1903,
			month: 12,
			day: 17,
			type: 'event',
			tags: ['technology', 'aviation']
		},
		{
			title: 'World War I',
			description: 'Global conflict originating in Europe.',
			year: 1914,
			month: 7,
			day: 28,
			endYear: 1918,
			endMonth: 11,
			endDay: 11,
			type: 'period',
			tags: ['history', 'war']
		},
		{
			title: 'Penicillin Discovered',
			description: 'Alexander Fleming discovers the first antibiotic.',
			year: 1928,
			month: 9,
			day: 28,
			type: 'event',
			tags: ['science', 'medicine']
		},
		{
			title: 'World War II',
			description: 'Global war involving most of the world\'s nations.',
			year: 1939,
			month: 9,
			day: 1,
			endYear: 1945,
			endMonth: 9,
			endDay: 2,
			type: 'period',
			tags: ['history', 'war']
		},
		{
			title: 'Atomic Bombings',
			description: 'Nuclear weapons used on Hiroshima and Nagasaki.',
			year: 1945,
			month: 8,
			type: 'event',
			tags: ['history', 'war', 'nuclear']
		},
		{
			title: 'DNA Structure Discovered',
			description: 'Watson and Crick describe the double helix structure of DNA.',
			year: 1953,
			month: 2,
			day: 28,
			type: 'event',
			tags: ['science', 'biology']
		},
		{
			title: 'Sputnik 1',
			description: 'The Soviet Union launches the first artificial satellite.',
			year: 1957,
			month: 10,
			day: 4,
			type: 'event',
			tags: ['technology', 'space']
		},
		{
			title: 'Moon Landing',
			description: 'Apollo 11 lands on the Moon. Neil Armstrong walks on the surface.',
			year: 1969,
			month: 7,
			day: 20,
			type: 'event',
			starred: true,
			tags: ['space', 'technology', 'america']
		},
		{
			title: 'Chernobyl Disaster',
			description: 'Catastrophic nuclear accident in Ukraine.',
			year: 1986,
			month: 4,
			day: 26,
			type: 'event',
			tags: ['history', 'disaster']
		},
		{
			title: 'Fall of the Berlin Wall',
			description: 'The Berlin Wall falls, symbolizing the end of the Cold War.',
			year: 1989,
			month: 11,
			day: 9,
			type: 'event',
			tags: ['history', 'politics', 'europe']
		},
		{
			title: 'World Wide Web Invented',
			description: 'Tim Berners-Lee proposes the World Wide Web at CERN.',
			year: 1989,
			month: 3,
			day: 12,
			type: 'event',
			starred: true,
			tags: ['technology', 'internet']
		},
		{
			title: 'Human Genome Project',
			description: 'Completion of the full sequencing of the human genome.',
			year: 2003,
			month: 4,
			day: 14,
			type: 'event',
			tags: ['science', 'biology']
		},
		{
			title: 'iPhone Unveiled',
			description: 'Steve Jobs introduces the first iPhone.',
			year: 2007,
			month: 1,
			day: 9,
			type: 'event',
			starred: true,
			tags: ['technology', 'apple']
		},
		{
			title: 'Bitcoin Whitepaper',
			description: 'Satoshi Nakamoto publishes "Bitcoin: A Peer-to-Peer Electronic Cash System."',
			year: 2008,
			month: 10,
			day: 31,
			type: 'event',
			tags: ['technology', 'finance', 'crypto']
		},
		{
			title: '"Attention Is All You Need"',
			description: 'Transformer architecture paper that sparked the AI revolution.',
			year: 2017,
			month: 6,
			day: 12,
			type: 'event',
			tags: ['technology', 'ai', 'research']
		},
		{
			title: 'COVID-19 Pandemic',
			description: 'WHO declares COVID-19 a global pandemic.',
			year: 2020,
			month: 3,
			day: 11,
			type: 'event',
			tags: ['history', 'health']
		},
		{
			title: 'ChatGPT Released',
			description: 'OpenAI releases ChatGPT.',
			year: 2022,
			month: 11,
			day: 30,
			type: 'event',
			starred: true,
			tags: ['technology', 'ai']
		},
		{
			title: 'SpaceX Starship Catch',
			description: 'SpaceX successfully catches Starship booster with tower arms.',
			year: 2024,
			month: 10,
			day: 13,
			type: 'event',
			starred: true,
			tags: ['technology', 'space', 'spacex']
		},
		
		// --- Science & Technology Expansion ---
		{
			title: 'Control of Fire',
			description: 'Early humans learn to control fire for warmth, cooking, and protection.',
			year: -1_000_000,
			type: 'event',
			tags: ['technology', 'humanity']
		},
		{
			title: 'Invention of Pottery',
			description: 'Ceramic vessels used for storage and cooking.',
			year: -29_000,
			type: 'event',
			tags: ['technology', 'art']
		},
		{
			title: 'Bronze Age',
			description: 'Widespread use of bronze for tools and weapons.',
			year: -3300,
			endYear: -1200,
			type: 'period',
			tags: ['technology', 'history']
		},
		{
			title: 'Iron Age',
			description: 'Widespread use of iron and steel.',
			year: -1200,
			endYear: -600,
			type: 'period',
			tags: ['technology', 'history']
		},
		{
			title: 'Invention of Paper',
			description: 'Cai Lun improves the papermaking process in China.',
			year: 105,
			type: 'event',
			tags: ['technology', 'china']
		},
		{
			title: 'Invention of Gunpowder',
			description: 'Discovered by Chinese alchemists seeking an elixir of immortality.',
			year: 850,
			type: 'event',
			tags: ['technology', 'chemistry', 'china']
		},
		{
			title: 'Magnetic Compass',
			description: 'First used for navigation in China.',
			year: 1044,
			type: 'event',
			tags: ['technology', 'navigation']
		},
		{
			title: 'Mechanical Clock',
			description: 'Invention of the escapement mechanism allowed for accurate timekeeping.',
			year: 1275,
			type: 'event',
			tags: ['technology', 'time']
		},
		{
			title: 'Copernican Revolution',
			description: 'Nicolaus Copernicus proposes a heliocentric model of the universe.',
			year: 1543,
			type: 'event',
			tags: ['science', 'astronomy']
		},
		{
			title: 'Human Anatomy Mapped',
			description: 'Andreas Vesalius publishes "De humani corporis fabrica".',
			year: 1543,
			type: 'event',
			tags: ['science', 'medicine']
		},
		{
			title: 'Kepler\'s Laws',
			description: 'Johannes Kepler publishes his laws of planetary motion.',
			year: 1609,
			type: 'event',
			tags: ['science', 'astronomy']
		},
		{
			title: 'Circulation of Blood',
			description: 'William Harvey describes the systemic circulation of blood.',
			year: 1628,
			type: 'event',
			tags: ['science', 'medicine']
		},
		{
			title: 'Pascaline',
			description: 'Blaise Pascal invents the mechanical calculator.',
			year: 1642,
			type: 'event',
			tags: ['technology', 'computing']
		},
		{
			title: 'Microscopic Life Discovered',
			description: 'Antonie van Leeuwenhoek observes bacteria ("animalcules").',
			year: 1676,
			type: 'event',
			tags: ['science', 'biology']
		},
		{
			title: 'Franklin\'s Kite Experiment',
			description: 'Benjamin Franklin demonstrates the electrical nature of lightning.',
			year: 1752,
			month: 6,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'Smallpox Vaccine',
			description: 'Edward Jenner creates the first vaccine.',
			year: 1796,
			month: 5,
			day: 14,
			type: 'event',
			tags: ['science', 'medicine']
		},
		{
			title: 'Voltaic Pile',
			description: 'Alessandro Volta invents the first electrical battery.',
			year: 1800,
			type: 'event',
			tags: ['technology', 'physics']
		},
		{
			title: 'Atomic Theory',
			description: 'John Dalton proposes that all matter is composed of atoms.',
			year: 1803,
			type: 'event',
			tags: ['science', 'chemistry']
		},
		{
			title: 'Electromagnetism',
			description: 'Hans Christian Ørsted discovers connection between electricity and magnetism.',
			year: 1820,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'First Photograph',
			description: 'Nicéphore Niépce takes the earliest surviving photograph.',
			year: 1826,
			type: 'event',
			tags: ['technology', 'art']
		},
		{
			title: 'Electric Telegraph',
			description: 'Samuel Morse sends the first telegram: "What hath God wrought?"',
			year: 1844,
			month: 5,
			day: 24,
			type: 'event',
			tags: ['technology', 'communication']
		},
		{
			title: 'Surgical Anesthesia',
			description: 'First public demonstration of ether anesthesia.',
			year: 1846,
			month: 10,
			day: 16,
			type: 'event',
			tags: ['science', 'medicine']
		},
		{
			title: 'Pasteurization',
			description: 'Louis Pasteur develops process to kill bacteria in food/drink.',
			year: 1864,
			type: 'event',
			tags: ['science', 'biology']
		},
		{
			title: 'Periodic Table',
			description: 'Dmitri Mendeleev publishes the first periodic table of elements.',
			year: 1869,
			month: 3,
			day: 6,
			type: 'event',
			tags: ['science', 'chemistry']
		},
		{
			title: 'Telephone Invented',
			description: 'Alexander Graham Bell receives patent for the telephone.',
			year: 1876,
			month: 3,
			day: 7,
			type: 'event',
			tags: ['technology', 'communication']
		},
		{
			title: 'Light Bulb',
			description: 'Thomas Edison demonstrates the first practical incandescent light bulb.',
			year: 1879,
			month: 12,
			day: 31,
			type: 'event',
			tags: ['technology', 'invention']
		},
		{
			title: 'Germ Theory of Disease',
			description: 'Robert Koch identifies the bacteria causing tuberculosis.',
			year: 1882,
			month: 3,
			day: 24,
			type: 'event',
			tags: ['science', 'medicine']
		},
		{
			title: 'First Automobile',
			description: 'Karl Benz patents the first gasoline-powered car.',
			year: 1886,
			month: 1,
			day: 29,
			type: 'event',
			tags: ['technology', 'transport']
		},
		{
			title: 'Radio Transmission',
			description: 'Guglielmo Marconi transmits radio signals across the Atlantic.',
			year: 1901,
			month: 12,
			day: 12,
			type: 'event',
			tags: ['technology', 'communication']
		},
		{
			title: 'Discovery of X-Rays',
			description: 'Wilhelm Röntgen discovers X-rays.',
			year: 1895,
			month: 11,
			day: 8,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'Discovery of the Electron',
			description: 'J.J. Thomson discovers the first subatomic particle.',
			year: 1897,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'Special Relativity',
			description: 'Albert Einstein publishes "On the Electrodynamics of Moving Bodies".',
			year: 1905,
			month: 9,
			day: 26,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'Haber-Bosch Process',
			description: 'Process to synthesize ammonia, revolutionizing agriculture.',
			year: 1909,
			type: 'event',
			tags: ['science', 'chemistry']
		},
		{
			title: 'Continental Drift',
			description: 'Alfred Wegener proposes the theory of continental drift.',
			year: 1912,
			type: 'event',
			tags: ['science', 'geology']
		},
		{
			title: 'Bohr Model',
			description: 'Niels Bohr introduces his model of the atom.',
			year: 1913,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'General Relativity',
			description: 'Einstein publishes his theory of gravitation.',
			year: 1915,
			month: 11,
			day: 25,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'Insulin Isolated',
			description: 'Banting and Best isolate insulin for diabetes treatment.',
			year: 1921,
			month: 7,
			day: 27,
			type: 'event',
			tags: ['science', 'medicine']
		},
		{
			title: 'Quantum Mechanics',
			description: 'Heisenberg formulation of quantum mechanics.',
			year: 1925,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'Big Bang Theory Proposed',
			description: 'Georges Lemaître proposes the "primeval atom" theory.',
			year: 1927,
			type: 'event',
			tags: ['science', 'cosmology']
		},
		{
			title: 'Nuclear Fission',
			description: 'Hahn and Strassmann discover nuclear fission.',
			year: 1938,
			month: 12,
			day: 19,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'Transistor Invented',
			description: 'Shockley, Bardeen, and Brattain invent the transistor at Bell Labs.',
			year: 1947,
			month: 12,
			day: 16,
			type: 'event',
			tags: ['technology', 'electronics']
		},
		{
			title: 'Polio Vaccine',
			description: 'Jonas Salk announces successful polio vaccine.',
			year: 1955,
			month: 4,
			day: 12,
			type: 'event',
			tags: ['science', 'medicine']
		},
		{
			title: 'Laser Invented',
			description: 'Theodore Maiman builds the first working laser.',
			year: 1960,
			month: 5,
			day: 16,
			type: 'event',
			tags: ['technology', 'physics']
		},
		{
			title: 'Plate Tectonics Accepted',
			description: 'Widespread acceptance of plate tectonics theory.',
			year: 1967,
			type: 'event',
			tags: ['science', 'geology']
		},
		{
			title: 'Standard Model',
			description: 'Formulation of the Standard Model of particle physics.',
			year: 1970,
			endYear: 1973,
			type: 'period',
			tags: ['science', 'physics']
		},
		{
			title: 'PCR Invented',
			description: 'Kary Mullis invents Polymerase Chain Reaction for DNA replication.',
			year: 1983,
			type: 'event',
			tags: ['science', 'biology']
		},
		{
			title: 'Hubble Space Telescope',
			description: 'Launch of the HST revolutionizes astronomy.',
			year: 1990,
			month: 4,
			day: 24,
			type: 'event',
			tags: ['science', 'space']
		},
		{
			title: 'Dolly the Sheep',
			description: 'First mammal cloned from an adult somatic cell.',
			year: 1996,
			month: 7,
			day: 5,
			type: 'event',
			tags: ['science', 'biology']
		},
		{
			title: 'Higgs Boson Discovery',
			description: 'CERN announces discovery of the Higgs boson particle.',
			year: 2012,
			month: 7,
			day: 4,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'CRISPR Gene Editing',
			description: 'Doudna and Charpentier publish on CRISPR-Cas9.',
			year: 2012,
			month: 6,
			day: 28,
			type: 'event',
			tags: ['science', 'biology']
		},
		{
			title: 'Gravitational Waves Detected',
			description: 'LIGO detects gravitational waves from merging black holes.',
			year: 2015,
			month: 9,
			day: 14,
			type: 'event',
			tags: ['science', 'physics']
		},
		{
			title: 'Fusion Ignition',
			description: 'LLNL achieves fusion ignition (net energy gain).',
			year: 2022,
			month: 12,
			day: 5,
			type: 'event',
			tags: ['science', 'energy']
		},

		// --- Wars, Conflict & Migration Expansion ---
		{
			title: 'Trojan War',
			description: 'Legendary conflict between the early Greeks and the people of Troy.',
			year: -1184,
			type: 'event',
			tags: ['war', 'mythology', 'greece']
		},
		{
			title: 'Bantu Expansion',
			description: 'Millennia-long series of migrations of speakers of the original proto-Bantu language group.',
			year: -1000,
			endYear: 500,
			type: 'period',
			tags: ['migration', 'africa', 'history']
		},
		{
			title: 'Peloponnesian War',
			description: 'War between Athens and Sparta that reshaped the ancient Greek world.',
			year: -431,
			endYear: -404,
			type: 'period',
			tags: ['war', 'greece']
		},
		{
			title: 'Punic Wars',
			description: 'Series of three wars fought between Rome and Carthage.',
			year: -264,
			endYear: -146,
			type: 'period',
			tags: ['war', 'rome']
		},
		{
			title: 'Jewish Diaspora',
			description: 'Dispersion of Israelites/Jews out of their ancestral homeland.',
			year: -587,
			type: 'period',
			tags: ['migration', 'history', 'religion']
		},
		{
			title: 'Migration Period',
			description: 'Widespread migration of peoples (Goths, Vandals, Huns) into Europe.',
			year: 300,
			endYear: 700,
			type: 'period',
			tags: ['migration', 'europe']
		},
		{
			title: 'Muslim Conquests',
			description: 'Rapid military expansion of the Rashidun and Umayyad Caliphates.',
			year: 632,
			endYear: 732,
			type: 'period',
			tags: ['war', 'expansion', 'islam']
		},
		{
			title: 'Viking Age',
			description: 'Norse seafarers raid and trade across Europe, reaching North America.',
			year: 793,
			endYear: 1066,
			type: 'period',
			tags: ['war', 'exploration', 'europe']
		},
		{
			title: 'First Crusade',
			description: 'Military expedition by Western Christianity to regain the Holy Lands.',
			year: 1096,
			endYear: 1099,
			type: 'period',
			tags: ['war', 'religion']
		},
		{
			title: 'Mongol Conquests',
			description: 'Genghis Khan and his successors create the largest contiguous land empire.',
			year: 1206,
			endYear: 1368,
			type: 'period',
			tags: ['war', 'expansion', 'asia']
		},
		{
			title: 'Hundred Years\' War',
			description: 'Conflict between the House of Plantagenet and the House of Valois.',
			year: 1337,
			endYear: 1453,
			type: 'period',
			tags: ['war', 'europe']
		},
		{
			title: 'Polynesian Expansion',
			description: 'Colonization of the Pacific islands by Austronesian peoples.',
			year: 1000,
			endYear: 1300,
			type: 'period',
			tags: ['migration', 'exploration', 'oceania']
		},
		{
			title: 'Spanish Conquest of Aztec Empire',
			description: 'Hernán Cortés conquers the Aztec Empire.',
			year: 1519,
			endYear: 1521,
			type: 'period',
			tags: ['war', 'americas', 'colonialism']
		},
		{
			title: 'Imjin War',
			description: 'Japanese invasions of Korea.',
			year: 1592,
			endYear: 1598,
			type: 'period',
			tags: ['war', 'asia']
		},
		{
			title: 'Thirty Years\' War',
			description: 'Devastating war in Central Europe between Protestant and Catholic states.',
			year: 1618,
			endYear: 1648,
			type: 'period',
			tags: ['war', 'europe', 'religion']
		},
		{
			title: 'Seven Years\' War',
			description: 'Global conflict involving most great powers of the time.',
			year: 1756,
			endYear: 1763,
			type: 'period',
			tags: ['war', 'global']
		},
		{
			title: 'Napoleonic Wars',
			description: 'Series of major global conflicts pitting the French Empire against European coalitions.',
			year: 1803,
			endYear: 1815,
			type: 'period',
			tags: ['war', 'europe']
		},
		{
			title: 'Battle of Waterloo',
			description: 'Defeat of Napoleon Bonaparte.',
			year: 1815,
			month: 6,
			day: 18,
			type: 'event',
			tags: ['war', 'europe']
		},
		{
			title: 'Trail of Tears',
			description: 'Forced displacement of Native Americans in the United States.',
			year: 1830,
			endYear: 1850,
			type: 'period',
			tags: ['migration', 'america', 'tragedy']
		},
		{
			title: 'First Opium War',
			description: 'War between the United Kingdom and the Qing Dynasty.',
			year: 1839,
			endYear: 1842,
			type: 'period',
			tags: ['war', 'china', 'colonialism']
		},
		{
			title: 'Great Famine (Ireland)',
			description: 'Mass starvation and disease leading to mass emigration from Ireland.',
			year: 1845,
			endYear: 1849,
			type: 'period',
			tags: ['migration', 'disaster', 'europe']
		},
		{
			title: 'Taiping Rebellion',
			description: 'Massive civil war in China.',
			year: 1850,
			endYear: 1864,
			type: 'period',
			tags: ['war', 'china']
		},
		{
			title: 'Crimean War',
			description: 'Conflict in which Russia lost to an alliance of France, Britain, the Ottoman Empire, and Sardinia.',
			year: 1853,
			endYear: 1856,
			type: 'period',
			tags: ['war', 'europe']
		},
		{
			title: 'Franco-Prussian War',
			description: 'War between the Second French Empire and the North German Confederation.',
			year: 1870,
			endYear: 1871,
			type: 'period',
			tags: ['war', 'europe']
		},
		{
			title: 'Russo-Japanese War',
			description: 'First major military victory in the modern era of an Asian power over a European one.',
			year: 1904,
			endYear: 1905,
			type: 'period',
			tags: ['war', 'asia', 'russia']
		},
		{
			title: 'Mexican Revolution',
			description: 'Major armed struggle that transformed Mexican culture and government.',
			year: 1910,
			endYear: 1920,
			type: 'period',
			tags: ['war', 'mexico']
		},
		{
			title: 'Spanish Civil War',
			description: 'War between the Republicans and Nationalists led by Francisco Franco.',
			year: 1936,
			endYear: 1939,
			type: 'period',
			tags: ['war', 'europe']
		},
		{
			title: 'Partition of India',
			description: 'Division of British India leading to massive cross-border migration and violence.',
			year: 1947,
			month: 8,
			day: 15,
			type: 'event',
			tags: ['migration', 'history', 'asia']
		},
		{
			title: 'Chinese Civil War (End)',
			description: 'Communist Party of China establishes the People\'s Republic of China.',
			year: 1949,
			month: 10,
			day: 1,
			type: 'event',
			tags: ['war', 'china', 'politics']
		},
		{
			title: 'Korean War',
			description: 'War between North and South Korea.',
			year: 1950,
			endYear: 1953,
			type: 'period',
			tags: ['war', 'asia', 'cold-war']
		},
		{
			title: 'Cuban Missile Crisis',
			description: 'Confrontation between the US and USSR closer to nuclear war than ever before.',
			year: 1962,
			month: 10,
			endMonth: 11,
			type: 'period',
			tags: ['war', 'cold-war', 'politics']
		},
		{
			title: 'Vietnam War',
			description: 'Conflict in Vietnam, Laos, and Cambodia.',
			year: 1955,
			endYear: 1975,
			type: 'period',
			tags: ['war', 'asia', 'cold-war']
		},
		{
			title: 'Six-Day War',
			description: 'Brief but significant conflict between Israel and Arab states.',
			year: 1967,
			month: 6,
			day: 5,
			endDay: 10,
			type: 'period',
			tags: ['war', 'middle-east']
		},
		{
			title: 'Soviet-Afghan War',
			description: 'Insurgent groups fight against the Soviet Army.',
			year: 1979,
			endYear: 1989,
			type: 'period',
			tags: ['war', 'middle-east', 'cold-war']
		},
		{
			title: 'Iran-Iraq War',
			description: 'Protracted armed conflict between Iran and Iraq.',
			year: 1980,
			endYear: 1988,
			type: 'period',
			tags: ['war', 'middle-east']
		},
		{
			title: 'Falklands War',
			description: 'Ten-week undeclared war between Argentina and the United Kingdom.',
			year: 1982,
			month: 4,
			endMonth: 6,
			type: 'period',
			tags: ['war', 'south-america']
		},
		{
			title: 'Gulf War',
			description: 'War waged by coalition forces against Iraq in response to invasion of Kuwait.',
			year: 1990,
			endYear: 1991,
			type: 'period',
			tags: ['war', 'middle-east']
		},
		{
			title: 'Rwandan Genocide',
			description: 'Mass slaughter of Tutsi in Rwanda.',
			year: 1994,
			month: 4,
			endMonth: 7,
			type: 'period',
			tags: ['war', 'genocide', 'africa']
		},
		{
			title: 'Yugoslav Wars',
			description: 'Series of ethnic conflicts during the breakup of Yugoslavia.',
			year: 1991,
			endYear: 2001,
			type: 'period',
			tags: ['war', 'europe']
		},
		{
			title: 'September 11 Attacks',
			description: 'Terrorist attacks on the United States.',
			year: 2001,
			month: 9,
			day: 11,
			type: 'event',
			tags: ['war', 'terrorism', 'america']
		},
		{
			title: 'War in Afghanistan',
			description: 'US-led invasion following 9/11 attacks.',
			year: 2001,
			endYear: 2021,
			type: 'period',
			tags: ['war', 'middle-east']
		},
		{
			title: 'Iraq War',
			description: 'Protracted armed conflict in Iraq.',
			year: 2003,
			endYear: 2011,
			type: 'period',
			tags: ['war', 'middle-east']
		},
		{
			title: 'Arab Spring',
			description: 'Series of anti-government protests, uprisings, and armed rebellions.',
			year: 2010,
			endYear: 2012,
			type: 'period',
			tags: ['war', 'politics', 'middle-east']
		},
		{
			title: 'Syrian Civil War',
			description: 'Ongoing multi-sided civil war in Syria.',
			year: 2011,
			type: 'event',
			tags: ['war', 'middle-east']
		},
		{
			title: 'European Migrant Crisis',
			description: 'Period of significantly increased movement of refugees and migrants into Europe.',
			year: 2015,
			type: 'period',
			tags: ['migration', 'europe']
		},
		{
			title: 'Russo-Ukrainian War',
			description: 'Ongoing war between Russia and Ukraine.',
			year: 2014,
			type: 'event',
			tags: ['war', 'europe']
		},
		{
			title: 'Full-scale Invasion of Ukraine',
			description: 'Russia launches a full-scale invasion of Ukraine.',
			year: 2022,
			month: 2,
			day: 24,
			type: 'event',
			tags: ['war', 'europe']
		},
		{
			title: 'Israel-Hamas War',
			description: 'Armed conflict between Israel and Hamas.',
			year: 2023,
			month: 10,
			day: 7,
			type: 'event',
			tags: ['war', 'middle-east']
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
