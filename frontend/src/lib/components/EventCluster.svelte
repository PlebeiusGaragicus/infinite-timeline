<script lang="ts">
	import type { TimelineEvent } from '$lib/db';
	import type { EventCluster } from '$lib/timeline';
	import { formatDate, eventSortValue, yearToVerticalPosition, getZoomLevel } from '$lib/timeline';
	import { timelineState } from '$lib/stores.svelte';
	import { Star } from 'lucide-svelte';

	interface Props {
		cluster: EventCluster<TimelineEvent>;
		getScreenY: (year: number) => number;
		timelineLeftOffset: number;
	}

	let { cluster, getScreenY, timelineLeftOffset }: Props = $props();

	let hoveredEventId = $state<number | null>(null);

	const rep = $derived(cluster.representative);
	const repY = $derived(getScreenY(rep.year));
	const isSelected = $derived(
		cluster.events.some(e => e.id === timelineState.selectedEventId)
	);

	const sortedEvents = $derived(
		[...cluster.events].sort((a, b) => {
			const aVal = eventSortValue(a.year, a.month, a.day);
			const bVal = eventSortValue(b.year, b.month, b.day);
			return aVal - bVal;
		})
	);

	const hoveredEvent = $derived(
		hoveredEventId ? cluster.events.find(e => e.id === hoveredEventId) : null
	);

	function handleTickClick(e: MouseEvent, event: TimelineEvent) {
		e.stopPropagation();
		timelineState.selectedEventId = timelineState.selectedEventId === event.id ? null : event.id ?? null;
	}

	function handleLabelClick(e: MouseEvent) {
		e.stopPropagation();
		timelineState.selectedEventId = timelineState.selectedEventId === rep.id ? null : rep.id ?? null;
	}
</script>

<!-- Individual tick marks for each event in the cluster -->
{#each sortedEvents as event (event.id)}
	{@const y = getScreenY(event.year)}
	{@const isThisSelected = timelineState.selectedEventId === event.id}
	{@const isThisHovered = hoveredEventId === event.id}
	<div
		class="event-tick"
		class:selected={isThisSelected}
		class:hovered={isThisHovered}
		class:starred={event.starred}
		style="top: {y}px; left: {timelineLeftOffset - 12}px; width: 24px;"
		onmouseenter={() => hoveredEventId = event.id ?? null}
		onmouseleave={() => hoveredEventId = null}
		onclick={(e) => handleTickClick(e, event)}
		role="button"
		tabindex="0"
	>
		<div class="tick-line"></div>
	</div>

	<!-- Tooltip on hover -->
	{#if isThisHovered && !isThisSelected}
		<div
			class="tick-tooltip glass"
			style="top: {y}px; left: {timelineLeftOffset + 20}px;"
		>
			{#if event.starred}
				<span class="tooltip-star"><Star size={10} /></span>
			{/if}
			<span class="tooltip-title">{event.title}</span>
			<span class="tooltip-date">{formatDate(event.year, event.month, event.day)}</span>
		</div>
	{/if}
{/each}

<!-- Representative label card (always visible) -->
<button
	class="event-label glass"
	class:selected={isSelected}
	style="top: {repY}px; left: {timelineLeftOffset + 20}px;"
	onclick={handleLabelClick}
>
	{#if rep.starred}
		<span class="star-indicator"><Star size={10} /></span>
	{/if}
	<div class="label-content">
		<h3 class="label-title">{rep.title}</h3>
		<span class="label-date">{formatDate(rep.year, rep.month, rep.day)}</span>
	</div>
	{#if cluster.events.length > 1}
		<span class="cluster-count">+{cluster.events.length - 1}</span>
	{/if}
</button>

<style>
	.event-tick {
		position: absolute;
		transform: translateY(-50%);
		height: 14px;
		cursor: pointer;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tick-line {
		width: 100%;
		height: 2px;
		background: var(--accent);
		border-radius: 1px;
		transition: height 0.1s, background 0.1s;
	}

	.event-tick.starred .tick-line {
		background: #fbbf24;
	}

	.event-tick.hovered .tick-line,
	.event-tick.selected .tick-line {
		height: 4px;
		background: white;
		box-shadow: 0 0 8px var(--accent-glow);
	}

	.event-tick.selected .tick-line {
		background: var(--accent);
		height: 4px;
		box-shadow: 0 0 12px var(--accent-glow);
	}

	.tick-tooltip {
		position: absolute;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		white-space: nowrap;
		z-index: 150;
		pointer-events: none;
		font-size: 12px;
	}

	.tooltip-star {
		color: #fbbf24;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.tooltip-title {
		font-weight: 600;
		color: white;
	}

	.tooltip-date {
		color: rgba(255, 255, 255, 0.5);
		font-size: 11px;
	}

	.event-label {
		position: absolute;
		transform: translateY(-50%);
		padding: 6px 10px;
		cursor: pointer;
		border: none;
		text-align: left;
		min-width: 120px;
		max-width: 240px;
		display: flex;
		align-items: center;
		gap: 6px;
		z-index: 5;
	}

	.event-label:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.event-label.selected {
		background: rgba(99, 102, 241, 0.3);
		border-color: rgba(99, 102, 241, 0.5);
	}

	.star-indicator {
		color: #fbbf24;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.label-content {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.label-title {
		margin: 0;
		font-size: 12px;
		font-weight: 600;
		color: white;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.label-date {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.5);
	}

	.cluster-count {
		font-size: 10px;
		font-weight: 600;
		color: var(--accent);
		flex-shrink: 0;
		padding: 1px 5px;
		background: rgba(99, 102, 241, 0.2);
		border-radius: 8px;
	}
</style>
