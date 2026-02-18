<script lang="ts">
	import { Send, X, MessageSquare, Calendar, MapPin, Plus, Check } from 'lucide-svelte';
	import { chatState, apiConfigState, timelineState } from '$lib/stores.svelte';
	import { sendMessageStreaming } from '$lib/agent';
	import { addEvent, getAllEvents } from '$lib/db';
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
		
		const eventMarker = '[EVENT:';
		let searchStart = 0;
		
		while (true) {
			const startIdx = text.indexOf(eventMarker, searchStart);
			if (startIdx === -1) break;
			
			const jsonStart = startIdx + eventMarker.length;
			let braceCount = 0;
			let jsonEnd = jsonStart;
			
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
		const absYear = Math.abs(year);
		if (absYear < 100) {
			timelineState.zoomIndex = 3;
		} else if (absYear < 1000) {
			timelineState.zoomIndex = 4;
		} else if (absYear < 10000) {
			timelineState.zoomIndex = 5;
		} else {
			timelineState.zoomIndex = 6;
		}
	}

	let addedEvents = $state<Set<string>>(new Set());
	let inputValue = $state('');
	let messagesContainer: HTMLDivElement;

	async function handleSubmit() {
		if (!inputValue.trim() || chatState.isLoading) return;
		if (!apiConfigState.isConfigured) {
			return;
		}

		const message = inputValue.trim();
		inputValue = '';
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

	function closePanel() {
		chatState.isOpen = false;
	}

	$effect(() => {
		if (chatState.pendingQuery && chatState.isOpen && !chatState.isLoading) {
			inputValue = chatState.pendingQuery;
			chatState.pendingQuery = '';
			handleSubmit();
		}
	});

	$effect(() => {
		if (messagesContainer && (chatState.messages.length || streamingContent)) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	});
</script>

{#if chatState.isOpen}
	<aside class="chat-panel glass">
		<div class="chat-header">
			<div class="header-title">
				<MessageSquare size={18} />
				<h3>Learn Assistant</h3>
			</div>
			<button class="icon-btn" onclick={closePanel} title="Close chat">
				<X size={18} />
			</button>
		</div>

		<div class="chat-messages" bind:this={messagesContainer}>
			{#if chatState.messages.length === 0 && !chatState.isLoading}
				<div class="empty-state">
					<MessageSquare size={32} />
					<p>Ask about any historical event or period</p>
				</div>
			{/if}

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
											</button>
											{#if isAdded}
												<button class="event-action-btn added-btn" disabled>
													<Check size={14} />
												</button>
											{:else}
												<button 
													class="event-action-btn add-btn" 
													onclick={async () => {
														await addSuggestedEvent(event);
														addedEvents = new Set([...addedEvents, eventKey]);
													}}
													title="Add to timeline"
												>
													<Plus size={14} />
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

		<div class="chat-input-area">
			{#if !apiConfigState.isConfigured}
				<div class="api-warning">Configure API in settings to chat</div>
			{/if}
			<div class="input-row">
				<input
					type="text"
					placeholder="Ask about history..."
					bind:value={inputValue}
					onkeydown={handleKeyDown}
					disabled={!apiConfigState.isConfigured || chatState.isLoading}
				/>
				<button 
					class="send-btn" 
					onclick={handleSubmit} 
					disabled={!apiConfigState.isConfigured || chatState.isLoading || !inputValue.trim()}
				>
					<Send size={18} />
				</button>
			</div>
		</div>
	</aside>
{/if}

<style>
	.chat-panel {
		display: flex;
		flex-direction: column;
		width: 320px;
		height: 100%;
		border-radius: 0;
		border-left: 1px solid var(--glass-border);
		border-top: none;
		border-bottom: none;
		border-right: none;
	}

	.chat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		flex-shrink: 0;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-title h3 {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
	}

	.icon-btn {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		padding: 6px;
		border-radius: 6px;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: rgba(255, 255, 255, 0.4);
		text-align: center;
		gap: 12px;
	}

	.empty-state p {
		margin: 0;
		font-size: 14px;
	}

	.message {
		max-width: 95%;
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
		font-size: 13px;
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
		font-size: 14px;
		font-weight: 600;
	}

	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		margin: 0 0 8px 0;
		padding-left: 18px;
	}

	.markdown-content :global(li) {
		margin-bottom: 4px;
	}

	.markdown-content :global(code) {
		background: rgba(0, 0, 0, 0.3);
		padding: 2px 5px;
		border-radius: 4px;
		font-size: 12px;
	}

	.suggested-events {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 10px;
		padding: 10px;
		background: rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.2);
		border-radius: 8px;
	}

	.events-header {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 600;
		color: var(--accent);
		margin-bottom: 4px;
	}

	.suggested-event-card {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 8px;
		padding: 8px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 6px;
	}

	.event-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.event-title {
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.event-year {
		font-size: 11px;
		color: var(--accent);
	}

	.event-desc {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.6);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.event-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.event-action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		transition: all 0.15s;
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

	.chat-input-area {
		padding: 12px 16px 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		flex-shrink: 0;
	}

	.api-warning {
		font-size: 11px;
		color: rgba(255, 200, 100, 0.8);
		margin-bottom: 8px;
		text-align: center;
	}

	.input-row {
		display: flex;
		gap: 8px;
	}

	.input-row input {
		flex: 1;
		padding: 10px 14px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: white;
		font-size: 13px;
		outline: none;
	}

	.input-row input:focus {
		border-color: var(--accent);
	}

	.input-row input:disabled {
		opacity: 0.5;
	}

	.input-row input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.send-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--accent);
		border: none;
		border-radius: 8px;
		color: white;
		cursor: pointer;
		transition: all 0.15s;
	}

	.send-btn:hover:not(:disabled) {
		background: #5558e3;
	}

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
