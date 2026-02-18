import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getApiConfig, addEvent } from './db';
import { timelineState, chatState } from './stores.svelte';
import { ZOOM_LEVELS } from './timeline';

const createEventTool = tool(
	async ({ title, description, year, endYear, type, tags }) => {
		await addEvent({
			title,
			description,
			year,
			endYear,
			type: type as 'event' | 'period',
			tags
		});
		
		const { getAllEvents } = await import('./db');
		timelineState.events = await getAllEvents();
		
		return `Created ${type} "${title}" at year ${year}${endYear ? ` to ${endYear}` : ''}`;
	},
	{
		name: 'create_timeline_event',
		description: 'Create a new event or period on the timeline',
		schema: z.object({
			title: z.string().describe('Title of the event'),
			description: z.string().describe('Description of the event'),
			year: z.number().describe('Year of the event (negative for BCE)'),
			endYear: z.number().optional().describe('End year for periods'),
			type: z.enum(['event', 'period']).describe('Type: event for single point, period for range'),
			tags: z.array(z.string()).optional().describe('Tags for categorization')
		})
	}
);

const zoomToYearTool = tool(
	async ({ year, zoomLevel }) => {
		timelineState.centerYear = year;
		if (zoomLevel !== undefined) {
			timelineState.zoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zoomLevel));
		}
		return `Zoomed to year ${year}`;
	},
	{
		name: 'zoom_to_year',
		description: 'Zoom and pan the timeline to focus on a specific year',
		schema: z.object({
			year: z.number().describe('Year to zoom to (negative for BCE)'),
			zoomLevel: z.number().optional().describe('Zoom level index (0=1month, 1=1year, 2=10years, 3=100years, etc.)')
		})
	}
);

const highlightEventTool = tool(
	async ({ eventTitle }) => {
		const event = timelineState.events.find(e => 
			e.title.toLowerCase().includes(eventTitle.toLowerCase())
		);
		if (event && event.id) {
			timelineState.selectedEventId = event.id;
			timelineState.centerYear = event.year;
			return `Highlighted event: ${event.title}`;
		}
		return `Event not found: ${eventTitle}`;
	},
	{
		name: 'highlight_event',
		description: 'Highlight and focus on a specific event on the timeline',
		schema: z.object({
			eventTitle: z.string().describe('Title or partial title of the event to highlight')
		})
	}
);

const tools = [createEventTool, zoomToYearTool, highlightEventTool];

let chatModel: ChatOpenAI | null = null;

async function getChatModel(): Promise<ChatOpenAI> {
	if (chatModel) return chatModel;
	
	const config = await getApiConfig();
	if (!config) {
		throw new Error('API not configured. Please set up your API credentials.');
	}
	
	chatModel = new ChatOpenAI({
		openAIApiKey: config.apiKey,
		modelName: config.model,
		configuration: {
			baseURL: config.baseUrl
		}
	}).bindTools(tools);
	
	return chatModel;
}

const SYSTEM_PROMPT = `You are a knowledgeable history tutor helping students explore deep history through an interactive timeline.

You have access to tools to:
- Create new events or periods on the timeline
- Zoom to specific years
- Highlight existing events

When discussing historical topics:
1. Be educational and engaging
2. When mentioning historical events, suggest adding them to the timeline by including event data in this format within your response:
   [EVENT:{"title":"Event Title","year":1969,"description":"Brief description","type":"event"}]
   or for periods:
   [EVENT:{"title":"Period Title","year":-500,"endYear":-300,"description":"Brief description","type":"period"}]
3. Use the zoom and highlight tools to guide the student's attention
4. Provide context and connections between events

The timeline spans from the Big Bang (13.8 billion years ago) to the present day.
Use negative years for BCE dates (e.g., -480 for 480 BCE).

IMPORTANT: When suggesting events to add, use the [EVENT:...] format so the user can click to add them. Only use the create_timeline_event tool when the user explicitly asks you to add an event.`;

export async function sendMessageStreaming(
	userMessage: string,
	onToken: (token: string) => void
): Promise<string> {
	const model = await getChatModel();
	
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...chatState.messages.map(m => 
			m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
		),
		new HumanMessage(userMessage)
	];
	
	let fullResponse = '';
	
	const stream = await model.stream(messages);
	
	for await (const chunk of stream) {
		if (chunk.tool_calls && chunk.tool_calls.length > 0) {
			const toolResults: string[] = [];
			
			for (const toolCall of chunk.tool_calls) {
				const selectedTool = tools.find(t => t.name === toolCall.name);
				if (selectedTool) {
					const result = await (selectedTool as any).invoke(toolCall.args);
					toolResults.push(result);
				}
			}
			
			const followUpStream = await model.stream([
				...messages,
				chunk,
				new HumanMessage(`Tool results: ${toolResults.join(', ')}. Please provide a natural response to the user.`)
			]);
			
			for await (const followUpChunk of followUpStream) {
				const content = typeof followUpChunk.content === 'string' ? followUpChunk.content : '';
				if (content) {
					fullResponse += content;
					onToken(content);
				}
			}
			
			return fullResponse;
		}
		
		const content = typeof chunk.content === 'string' ? chunk.content : '';
		if (content) {
			fullResponse += content;
			onToken(content);
		}
	}
	
	return fullResponse;
}

export async function sendMessage(userMessage: string): Promise<string> {
	const model = await getChatModel();
	
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...chatState.messages.map(m => 
			m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
		),
		new HumanMessage(userMessage)
	];
	
	const response = await model.invoke(messages);
	
	if (response.tool_calls && response.tool_calls.length > 0) {
		const toolResults: string[] = [];
		
		for (const toolCall of response.tool_calls) {
			const selectedTool = tools.find(t => t.name === toolCall.name);
			if (selectedTool) {
				const result = await (selectedTool as any).invoke(toolCall.args);
				toolResults.push(result);
			}
		}
		
		const followUp = await model.invoke([
			...messages,
			response,
			new HumanMessage(`Tool results: ${toolResults.join(', ')}. Please provide a natural response to the user.`)
		]);
		
		return typeof followUp.content === 'string' ? followUp.content : JSON.stringify(followUp.content);
	}
	
	return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
}

export function resetChatModel(): void {
	chatModel = null;
}
