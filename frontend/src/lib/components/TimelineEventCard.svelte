<script lang="ts">
	import type { TimelineEvent } from '$lib/db';
	import { formatDate } from '$lib/timeline';
	import { timelineState } from '$lib/stores.svelte';
	import { Star } from 'lucide-svelte';

	interface Props {
		event: TimelineEvent;
		style?: string;
		isPeriod?: boolean;
	}

	let { event, style = '', isPeriod = false }: Props = $props();

	const isSelected = $derived(timelineState.selectedEventId === event.id);

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		timelineState.selectedEventId = timelineState.selectedEventId === event.id ? null : event.id ?? null;
	}
</script>

<button
	class="event-card period glass"
	class:selected={isSelected}
	{style}
	onclick={handleClick}
>
	<div class="period-bar"></div>
	<div class="event-content period-content">
		{#if event.starred}
			<span class="star-indicator"><Star size={10} /></span>
		{/if}
		<h3 class="event-title">{event.title}</h3>
		<span class="event-year">
			{formatDate(event.year, event.month, event.day)}
			{#if event.endYear}
				– {formatDate(event.endYear, event.endMonth, event.endDay)}
			{/if}
		</span>
	</div>
</button>

<style>
	.event-card {
		position: absolute;
		cursor: pointer;
		border: none;
		text-align: left;
	}

	.event-card:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.event-card.selected {
		background: rgba(99, 102, 241, 0.3);
		border-color: rgba(99, 102, 241, 0.5);
	}

	.event-card.period {
		min-width: 160px;
		max-width: 280px;
		border-radius: 8px;
		background: rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.25);
		display: flex;
		flex-direction: row;
		align-items: stretch;
		padding: 0;
		overflow: hidden;
	}

	.period-bar {
		width: 4px;
		background: var(--accent);
		flex-shrink: 0;
		border-radius: 2px 0 0 2px;
	}

	.period-content {
		padding: 10px 14px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		position: relative;
	}

	.star-indicator {
		position: absolute;
		top: 4px;
		right: 4px;
		color: #fbbf24;
		display: flex;
		align-items: center;
	}

	.event-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.event-title {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: white;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.event-year {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.6);
	}
</style>
