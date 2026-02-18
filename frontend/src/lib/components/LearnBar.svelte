<script lang="ts">
	import { Search, Send, X, Settings, Plus, MapPin, Check, Calendar } from 'lucide-svelte';
	import { chatState, apiConfigState, timelineState } from '$lib/stores.svelte';
	import { sendMessageStreaming } from '$lib/agent';
	import { addEvent, getAllEvents, saveApiConfig } from '$lib/db';
	import { resetChatModel } from '$lib/agent';
	import { formatYear } from '$lib/timeline';
	import { marked } from 'marked';

	marked.setOptions({
		breaks: true,
		gfm: true
	});

	function renderMarkdown(content: string): string {
		return marked.parse(content) as string;
	}

	let streamingContent = $state('');

	interface SuggestedEvent {
		title: string;
		year: number;
		endYear?: number;
		description: string;
		type: 'event' | 'period';
	}

	function parseMessageContent(content: string): { text: string; events: SuggestedEvent[] } {
		const events: SuggestedEvent[] = [];
		let text = content;
		
		// Find all [EVENT:{...}] patterns, handling nested brackets in JSON
		const eventMarker = '[EVENT:';
		let searchStart = 0;
		
		while (true) {
			const startIdx = text.indexOf(eventMarker, searchStart);
			if (startIdx === -1) break;
			
			const jsonStart = startIdx + eventMarker.length;
			let braceCount = 0;
			let jsonEnd = jsonStart;
			
			// Find matching closing brace
			for (let i = jsonStart; i < text.length; i++) {
				if (text[i] === '{') braceCount++;
				else if (text[i] === '}') {
					braceCount--;
					if (braceCount === 0) {
						jsonEnd = i + 1;
						break;
					}
				}
			}
			
			// Check for closing bracket
			if (jsonEnd < text.length && text[jsonEnd] === ']') {
				const jsonStr = text.slice(jsonStart, jsonEnd);
				try {
					const eventData = JSON.parse(jsonStr);
					if (eventData.title && eventData.year !== undefined) {
						events.push({
							title: eventData.title,
							year: eventData.year,
							endYear: eventData.endYear,
							description: eventData.description || '',
							type: eventData.type || 'event'
						});
					}
					// Remove the EVENT marker from text
					text = text.slice(0, startIdx) + text.slice(jsonEnd + 1);
				} catch (e) {
					console.warn('Failed to parse event JSON:', jsonStr);
					searchStart = jsonEnd + 1;
				}
			} else {
				searchStart = jsonEnd;
			}
		}
		
		return { text: text.trim(), events };
	}

	async function addSuggestedEvent(event: SuggestedEvent) {
		await addEvent({
			title: event.title,
			description: event.description,
			year: event.year,
			endYear: event.endYear,
			type: event.type,
			tags: []
		});
		timelineState.events = await getAllEvents();
		timelineState.centerYear = event.year;
	}

	function navigateToYear(year: number) {
		timelineState.centerYear = year;
		// Find appropriate zoom level
		const absYear = Math.abs(year);
		if (absYear < 100) {
			timelineState.zoomIndex = 3; // 100 years
		} else if (absYear < 1000) {
			timelineState.zoomIndex = 4; // 1000 years
		} else if (absYear < 10000) {
			timelineState.zoomIndex = 5; // 10000 years
		} else {
			timelineState.zoomIndex = 6; // 100000 years
		}
	}

	let addedEvents = $state<Set<string>>(new Set());

	let inputValue = $state('');
	let showSettings = $state(false);

	async function saveSettings() {
		if (apiConfigState.config) {
			await saveApiConfig({
				baseUrl: apiConfigState.config.baseUrl,
				apiKey: apiConfigState.config.apiKey,
				model: apiConfigState.config.model
			});
			apiConfigState.isConfigured = !!(apiConfigState.config.apiKey && apiConfigState.config.baseUrl);
			resetChatModel();
		}
		showSettings = false;
	}

	async function handleSubmit() {
		if (!inputValue.trim() || chatState.isLoading) return;
		if (!apiConfigState.isConfigured) {
			showSettings = true;
			return;
		}

		const message = inputValue.trim();
		inputValue = '';
		chatState.isOpen = true;
		chatState.messages = [...chatState.messages, { role: 'user', content: message }];
		chatState.isLoading = true;
		streamingContent = '';

		try {
			const response = await sendMessageStreaming(message, (token) => {
				streamingContent += token;
			});
			chatState.messages = [...chatState.messages, { role: 'assistant', content: response }];
			streamingContent = '';
		} catch (error) {
			chatState.messages = [...chatState.messages, { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }];
			streamingContent = '';
		} finally {
			chatState.isLoading = false;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function toggleChat() {
		chatState.isOpen = !chatState.isOpen;
	}

	// Handle pending queries from Learn More button
	$effect(() => {
		if (chatState.pendingQuery && chatState.isOpen && !chatState.isLoading) {
			inputValue = chatState.pendingQuery;
			chatState.pendingQuery = '';
			handleSubmit();
		}
	});
</script>

<div class="learn-bar-container">
	<div class="learn-bar glass">
		<Search size={20} class="search-icon" />
		<input
			type="text"
			placeholder="Ask about history... (e.g., 'Tell me about the Roman Empire')"
			bind:value={inputValue}
			onkeydown={handleKeyDown}
			class="learn-input"
		/>
		<button class="icon-btn" onclick={handleSubmit} disabled={chatState.isLoading}>
			<Send size={20} />
		</button>
		<button class="icon-btn" onclick={() => showSettings = true}>
			<Settings size={20} />
		</button>
	</div>

	{#if chatState.isOpen}
		<div class="chat-panel glass">
			<div class="chat-header">
				<h3>Learn Assistant</h3>
				<button class="icon-btn" onclick={toggleChat}>
					<X size={20} />
				</button>
			</div>
			<div class="chat-messages">
				{#each chatState.messages as message}
					{@const parsed = message.role === 'assistant' ? parseMessageContent(message.content) : null}
					<div class="message {message.role}">
						{#if message.role === 'user'}
							<div class="message-content">{message.content}</div>
						{:else if parsed}
							<div class="message-content markdown-content">{@html renderMarkdown(parsed.text)}</div>
							{#if parsed.events.length > 0}
								<div class="suggested-events">
									<div class="events-header">
										<Calendar size={14} />
										<span>Suggested Events</span>
									</div>
									{#each parsed.events as event}
										{@const eventKey = `${event.title}-${event.year}`}
										{@const isAdded = addedEvents.has(eventKey)}
										<div class="suggested-event-card">
											<div class="event-info">
												<span class="event-title">{event.title}</span>
												<span class="event-year">{formatYear(event.year)}{event.endYear ? ` - ${formatYear(event.endYear)}` : ''}</span>
												{#if event.description}
													<span class="event-desc">{event.description}</span>
												{/if}
											</div>
											<div class="event-actions">
												<button 
													class="event-action-btn view-btn" 
													onclick={() => navigateToYear(event.year)}
													title="View on timeline"
												>
													<MapPin size={14} />
													View
												</button>
												{#if isAdded}
													<button class="event-action-btn added-btn" disabled>
														<Check size={14} />
														Added
													</button>
												{:else}
													<button 
														class="event-action-btn add-btn" 
														onclick={async () => {
															await addSuggestedEvent(event);
															addedEvents = new Set([...addedEvents, eventKey]);
														}}
													>
														<Plus size={14} />
														Add
													</button>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						{/if}
					</div>
				{/each}
				{#if chatState.isLoading && streamingContent}
					{@const streamParsed = parseMessageContent(streamingContent)}
					<div class="message assistant">
						<div class="message-content markdown-content">{@html renderMarkdown(streamParsed.text)}</div>
					</div>
				{:else if chatState.isLoading}
					<div class="message assistant">
						<div class="message-content loading">Thinking...</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if showSettings}
		<div class="settings-modal-backdrop" onclick={() => showSettings = false} role="presentation">
			<div class="settings-modal glass" onclick={(e) => e.stopPropagation()} role="dialog">
				<h3>API Configuration</h3>
				<p class="settings-note">Configure your OpenAI-compatible API endpoint</p>
				
				<label>
					Base URL
					<input
						type="text"
						placeholder="https://api.openai.com/v1"
						bind:value={apiConfigState.config!.baseUrl}
					/>
				</label>
				
				<label>
					API Key
					<input
						type="password"
						placeholder="sk-..."
						bind:value={apiConfigState.config!.apiKey}
					/>
				</label>
				
				<label>
					Model
					<input
						type="text"
						placeholder="gpt-4"
						bind:value={apiConfigState.config!.model}
					/>
				</label>

				<div class="settings-actions">
					<button class="btn-secondary" onclick={() => showSettings = false}>Cancel</button>
					<button class="btn-primary" onclick={saveSettings}>Save</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.learn-bar-container {
		position: relative;
		padding: 16px 24px;
		z-index: 100;
	}

	.learn-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 20px;
		max-width: 800px;
		margin: 0 auto;
	}

	.learn-bar :global(.search-icon) {
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}

	.learn-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: white;
		font-size: 16px;
	}

	.learn-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.icon-btn {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		padding: 8px;
		border-radius: 8px;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.icon-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.chat-panel {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: calc(100% - 48px);
		max-width: 800px;
		max-height: 400px;
		display: flex;
		flex-direction: column;
		margin-top: 8px;
	}

	.chat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.chat-header h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.message {
		max-width: 80%;
	}

	.message.user {
		align-self: flex-end;
	}

	.message.assistant {
		align-self: flex-start;
	}

	.message-content {
		padding: 10px 14px;
		border-radius: 12px;
		font-size: 14px;
		line-height: 1.5;
	}

	.message.user .message-content {
		background: var(--accent);
		color: white;
	}

	.message.assistant .message-content {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	.message-content.loading {
		opacity: 0.7;
		font-style: italic;
	}

	.markdown-content :global(p) {
		margin: 0 0 8px 0;
	}

	.markdown-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.markdown-content :global(h1),
	.markdown-content :global(h2),
	.markdown-content :global(h3) {
		margin: 0 0 8px 0;
		font-size: 15px;
		font-weight: 600;
	}

	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		margin: 0 0 8px 0;
		padding-left: 20px;
	}

	.markdown-content :global(li) {
		margin-bottom: 4px;
	}

	.markdown-content :global(code) {
		background: rgba(0, 0, 0, 0.3);
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 13px;
	}

	.markdown-content :global(pre) {
		background: rgba(0, 0, 0, 0.3);
		padding: 10px;
		border-radius: 6px;
		overflow-x: auto;
		margin: 8px 0;
	}

	.markdown-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.markdown-content :global(strong) {
		font-weight: 600;
	}

	.markdown-content :global(a) {
		color: var(--accent);
		text-decoration: underline;
	}

	.suggested-events {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 12px;
		padding: 12px;
		background: rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.2);
		border-radius: 10px;
	}

	.events-header {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
		color: var(--accent);
		margin-bottom: 4px;
	}

	.suggested-event-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		color: white;
	}

	.suggested-event-card .event-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.suggested-event-card .event-title {
		font-size: 14px;
		font-weight: 600;
	}

	.suggested-event-card .event-year {
		font-size: 12px;
		color: var(--accent);
	}

	.suggested-event-card .event-desc {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.event-actions {
		display: flex;
		gap: 8px;
	}

	.event-action-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		border: none;
	}

	.event-action-btn.view-btn {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.event-action-btn.view-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.event-action-btn.add-btn {
		background: var(--accent);
		color: white;
	}

	.event-action-btn.add-btn:hover {
		background: #5558e3;
	}

	.event-action-btn.added-btn {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
		cursor: default;
	}

	.suggested-event {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s;
		text-align: left;
		color: white;
	}

	.suggested-event:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: var(--accent);
	}

	.event-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.event-title {
		font-size: 13px;
		font-weight: 500;
	}

	.event-year {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.5);
	}

	.add-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: var(--accent);
		white-space: nowrap;
	}

	.settings-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.settings-modal {
		width: 90%;
		max-width: 400px;
		padding: 24px;
	}

	.settings-modal h3 {
		margin: 0 0 8px 0;
		font-size: 18px;
	}

	.settings-note {
		margin: 0 0 20px 0;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.6);
	}

	.settings-modal label {
		display: block;
		margin-bottom: 16px;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.8);
	}

	.settings-modal input {
		width: 100%;
		margin-top: 6px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: white;
		font-size: 14px;
		outline: none;
	}

	.settings-modal input:focus {
		border-color: var(--accent);
	}

	.settings-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 24px;
	}

	.btn-secondary, .btn-primary {
		padding: 10px 20px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-secondary {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.btn-primary {
		background: var(--accent);
		border: none;
		color: white;
	}

	.btn-primary:hover {
		background: #5558e3;
	}
</style>
