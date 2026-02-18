<script lang="ts">
	import { Search, Settings, MessageSquare, MapPin, X } from 'lucide-svelte';
	import { chatState, apiConfigState, timelineState, searchState } from '$lib/stores.svelte';
	import { saveApiConfig } from '$lib/db';
	import { resetChatModel } from '$lib/agent';
	import { formatYear } from '$lib/timeline';

	let showSettings = $state(false);
	let showResults = $state(false);
	let inputRef: HTMLInputElement;

	const filteredEvents = $derived(() => {
		const query = searchState.query.toLowerCase().trim();
		if (!query) return [];
		
		return timelineState.events
			.filter(event => {
				const titleMatch = event.title.toLowerCase().includes(query);
				const descMatch = event.description.toLowerCase().includes(query);
				const tagMatch = event.tags?.some(tag => tag.toLowerCase().includes(query));
				return titleMatch || descMatch || tagMatch;
			})
			.sort((a, b) => b.year - a.year)
			.slice(0, 10);
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchState.query = target.value;
		showResults = target.value.trim().length > 0;
	}

	function navigateToEvent(event: { year: number; id?: number }) {
		timelineState.centerYear = event.year;
		if (event.id) {
			timelineState.selectedEventId = event.id;
		}
		const absYear = Math.abs(event.year);
		if (absYear < 100) {
			timelineState.zoomIndex = 3;
		} else if (absYear < 1000) {
			timelineState.zoomIndex = 4;
		} else if (absYear < 10000) {
			timelineState.zoomIndex = 5;
		} else {
			timelineState.zoomIndex = 6;
		}
		showResults = false;
		searchState.query = '';
	}

	function clearSearch() {
		searchState.query = '';
		showResults = false;
		inputRef?.focus();
	}

	function openChat() {
		chatState.isOpen = true;
	}

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

	function handleBlur() {
		setTimeout(() => {
			showResults = false;
		}, 200);
	}

	function handleFocus() {
		if (searchState.query.trim().length > 0) {
			showResults = true;
		}
	}
</script>

<div class="search-bar-container">
	<div class="search-bar glass">
		<Search size={20} class="search-icon" />
		<input
			bind:this={inputRef}
			type="text"
			placeholder="Search events..."
			value={searchState.query}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			class="search-input"
		/>
		{#if searchState.query}
			<button class="icon-btn clear-btn" onclick={clearSearch} title="Clear search">
				<X size={16} />
			</button>
		{/if}
		<div class="divider"></div>
		<button 
			class="icon-btn chat-btn" 
			class:active={chatState.isOpen}
			onclick={openChat} 
			title="Open chat assistant"
		>
			<MessageSquare size={20} />
		</button>
		<button class="icon-btn" onclick={() => showSettings = true} title="Settings">
			<Settings size={20} />
		</button>
	</div>

	{#if showResults && filteredEvents().length > 0}
		<div class="search-results glass">
			{#each filteredEvents() as event}
				<button class="result-item" onclick={() => navigateToEvent(event)}>
					<div class="result-info">
						<span class="result-title">{event.title}</span>
						<span class="result-year">{formatYear(event.year)}</span>
					</div>
					<MapPin size={14} class="result-icon" />
				</button>
			{/each}
		</div>
	{:else if showResults && searchState.query.trim().length > 0}
		<div class="search-results glass">
			<div class="no-results">No events found</div>
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
	.search-bar-container {
		position: relative;
		padding: 12px 16px;
		z-index: 100;
	}

	.search-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
	}

	.search-bar :global(.search-icon) {
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: white;
		font-size: 15px;
		min-width: 0;
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.divider {
		width: 1px;
		height: 24px;
		background: rgba(255, 255, 255, 0.2);
	}

	.icon-btn {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		padding: 8px;
		border-radius: 8px;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.icon-btn.active {
		background: var(--accent);
		color: white;
	}

	.clear-btn {
		padding: 4px;
	}

	.search-results {
		position: absolute;
		top: 100%;
		left: 16px;
		right: 16px;
		max-height: 320px;
		overflow-y: auto;
		margin-top: 4px;
	}

	.result-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 12px 16px;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		color: white;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s;
	}

	.result-item:last-child {
		border-bottom: none;
	}

	.result-item:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.result-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.result-title {
		font-size: 14px;
		font-weight: 500;
	}

	.result-year {
		font-size: 12px;
		color: var(--accent);
	}

	.result-item :global(.result-icon) {
		color: rgba(255, 255, 255, 0.4);
	}

	.no-results {
		padding: 16px;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		font-size: 14px;
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
		transition: all 0.15s;
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
