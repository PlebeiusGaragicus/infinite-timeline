<script lang="ts">
	import { onMount } from 'svelte';
	import { timelineState, apiConfigState } from '$lib/stores.svelte';
	import { getAllEvents, seedInitialEvents, getApiConfig } from '$lib/db';
	import Timeline from '$lib/components/Timeline.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import ChatPanel from '$lib/components/ChatPanel.svelte';

	onMount(async () => {
		await seedInitialEvents();
		timelineState.events = await getAllEvents();
		
		const config = await getApiConfig();
		if (config) {
			apiConfigState.config = config;
			apiConfigState.isConfigured = !!(config.apiKey && config.baseUrl);
		} else {
			apiConfigState.config = { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4' };
			apiConfigState.isConfigured = false;
		}
		
		timelineState.isLoading = false;
	});
</script>

<main>
	<SearchBar />
	<div class="content-area">
		<Timeline />
		<ChatPanel />
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
	}

	.content-area {
		display: flex;
		flex: 1;
		overflow: hidden;
	}
</style>
