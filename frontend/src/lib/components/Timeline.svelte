<script lang="ts">
	import { onMount } from 'svelte';
	import { timelineState } from '$lib/stores.svelte';
	import { formatYear, formatDate, eventSortValue, getVisibleClusters, ZOOM_LEVELS, getZoomLevel, yearToVerticalPosition, verticalPositionToYear, PRESENT_YEAR, BIG_BANG_YEAR } from '$lib/timeline';
	import type { TimelineEvent } from '$lib/db';
	import EventCluster from './EventCluster.svelte';
	import EventCreator from './EventCreator.svelte';
	import { MessageCircleQuestion, Plus, ZoomIn, ZoomOut, ChevronUp, ChevronDown } from 'lucide-svelte';

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let width = $state(0);
	let height = $state(0);

	let isDragging = $state(false);
	let dragStartY = 0;
	let dragStartCenterYear = 0;

	let showEventCreator = $state(false);
	let showContextMenu = $state(false);
	let clickedYear = $state(0);
	let clickX = $state(0);
	let clickY = $state(0);
	let clickIndicatorY = $state(0);

	const TIMELINE_LEFT_OFFSET = 60;

	const currentZoom = $derived(getZoomLevel(timelineState.zoomIndex));
	const viewStart = $derived(timelineState.centerYear - currentZoom.yearsVisible / 2);
	const viewEnd = $derived(timelineState.centerYear + currentZoom.yearsVisible / 2);
	// Separate periods from point events for different rendering
	const periodEvents = $derived(timelineState.events.filter(e => e.type === 'period' && e.endYear));
	const pointEvents = $derived(timelineState.events.filter(e => e.type !== 'period' || !e.endYear));

	const visiblePeriods = $derived(
		periodEvents.filter(e => {
			const eventEnd = e.endYear ?? e.year;
			return e.year <= viewEnd && eventEnd >= viewStart;
		})
	);

	const clusters = $derived(getVisibleClusters(pointEvents, viewStart, viewEnd, height, 50));

	// Nav buttons only appear when the viewport is empty
	const viewIsEmpty = $derived(clusters.length === 0 && visiblePeriods.length === 0);

	// All events sorted by year for navigation
	const allEventsSorted = $derived(
		[...timelineState.events].sort((a, b) => {
			const aVal = eventSortValue(a.year, a.month, a.day);
			const bVal = eventSortValue(b.year, b.month, b.day);
			return aVal - bVal;
		})
	);

	// Next event above viewport (more recent = higher year, appears at top of screen)
	// Find the event with the smallest year that is still above viewEnd
	const nextEventUp = $derived(() => {
		for (let i = 0; i < allEventsSorted.length; i++) {
			const e = allEventsSorted[i];
			if (e.year > viewEnd) return e;
		}
		return null;
	});

	// Next event below viewport (older = lower year, appears at bottom of screen)
	// Find the event with the largest year that is still below viewStart
	const nextEventDown = $derived(() => {
		for (let i = allEventsSorted.length - 1; i >= 0; i--) {
			const e = allEventsSorted[i];
			const eventEnd = e.endYear ?? e.year;
			if (eventEnd < viewStart) return e;
		}
		return null;
	});

	function scrollToEvent(year: number) {
		timelineState.centerYear = Math.max(BIG_BANG_YEAR, Math.min(PRESENT_YEAR, year));
	}

	function getEventScreenY(year: number): number {
		return yearToVerticalPosition(year, timelineState.centerYear, currentZoom.yearsVisible, height);
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const yearsPerPixel = currentZoom.yearsVisible / height;
		const panAmount = e.deltaY;
		let newCenter = timelineState.centerYear - (panAmount * yearsPerPixel * 0.5);
		
		const minCenter = BIG_BANG_YEAR;
		const maxCenter = PRESENT_YEAR;
		timelineState.centerYear = Math.max(minCenter, Math.min(maxCenter, newCenter));
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button !== 0) return;
		isDragging = true;
		dragStartY = e.clientY;
		dragStartCenterYear = timelineState.centerYear;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		const dy = e.clientY - dragStartY;
		const yearsPerPixel = currentZoom.yearsVisible / height;
		let newCenter = dragStartCenterYear + (dy * yearsPerPixel);
		
		const minCenter = BIG_BANG_YEAR;
		const maxCenter = PRESENT_YEAR;
		timelineState.centerYear = Math.max(minCenter, Math.min(maxCenter, newCenter));
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleClick(e: MouseEvent) {
		if (Math.abs(e.clientY - dragStartY) > 5) return;
		
		const rect = container.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const year = verticalPositionToYear(y, timelineState.centerYear, currentZoom.yearsVisible, height);
		
		if (year < BIG_BANG_YEAR || year > PRESENT_YEAR) return;
		
		const timelineX = TIMELINE_LEFT_OFFSET;
		const clickTolerance = 40;
		if (Math.abs(x - timelineX) > clickTolerance) return;
		
		clickedYear = year;
		clickX = x;
		clickY = y;
		clickIndicatorY = y;
		showContextMenu = true;
		showEventCreator = false;
	}

	function zoomIn() {
		timelineState.zoomIndex = Math.max(0, timelineState.zoomIndex - 1);
	}

	function zoomOut() {
		timelineState.zoomIndex = Math.min(ZOOM_LEVELS.length - 1, timelineState.zoomIndex + 1);
	}

	function closeContextMenu() {
		showContextMenu = false;
	}

	function handleWhatHappened() {
		showContextMenu = false;
		// TODO: Trigger chat with question about this year
		alert(`Ask about ${formatYear(clickedYear)} - Chat integration coming soon!`);
	}

	function handleAddEvent() {
		showContextMenu = false;
		showEventCreator = true;
	}

	function closeEventCreator() {
		showEventCreator = false;
	}

	function drawTimeline() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, width, height);

		const bigBangY = getEventScreenY(BIG_BANG_YEAR);
		const presentY = getEventScreenY(PRESENT_YEAR);

		if (bigBangY < height) {
			const gradient = ctx.createLinearGradient(0, bigBangY, 0, height);
			gradient.addColorStop(0, 'rgba(40, 40, 50, 0.3)');
			gradient.addColorStop(1, 'rgba(40, 40, 50, 0.9)');
			ctx.fillStyle = gradient;
			ctx.fillRect(0, bigBangY, width, height - bigBangY);
			
			ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
			ctx.font = 'bold 32px system-ui';
			ctx.textAlign = 'left';
			ctx.fillText('?', TIMELINE_LEFT_OFFSET - 12, Math.max(bigBangY + 40, height - 30));
		}

		if (presentY > 0) {
			const gradient = ctx.createLinearGradient(0, 0, 0, presentY);
			gradient.addColorStop(0, 'rgba(40, 40, 50, 0.9)');
			gradient.addColorStop(1, 'rgba(40, 40, 50, 0.3)');
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, width, presentY);
			
			ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
			ctx.font = '12px system-ui';
			ctx.textAlign = 'left';
			ctx.fillText('Future', TIMELINE_LEFT_OFFSET + 10, Math.min(presentY / 2 + 5, 30));
		}

		const lineStartY = Math.max(0, presentY);
		const lineEndY = Math.min(height, bigBangY);
		
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(TIMELINE_LEFT_OFFSET, lineStartY);
		ctx.lineTo(TIMELINE_LEFT_OFFSET, lineEndY);
		ctx.stroke();

		const tickYears = generateTickYears();
		ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
		ctx.font = '11px system-ui';
		ctx.textAlign = 'right';

		for (const year of tickYears) {
			if (year < BIG_BANG_YEAR || year > PRESENT_YEAR) continue;
			const y = getEventScreenY(year);
			if (y < -50 || y > height + 50) continue;

			ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
			ctx.beginPath();
			ctx.moveTo(TIMELINE_LEFT_OFFSET - 8, y);
			ctx.lineTo(TIMELINE_LEFT_OFFSET + 8, y);
			ctx.stroke();

			ctx.fillText(formatYear(year), TIMELINE_LEFT_OFFSET - 12, y + 4);
		}

		// Period indicators are now rendered as HTML band elements
	}

	function generateTickYears(): number[] {
		const ticks: number[] = [];
		const yearsVisible = currentZoom.yearsVisible;
		
		let tickInterval: number;
		if (yearsVisible <= 1) {
			tickInterval = 1/12;
		} else if (yearsVisible <= 10) {
			tickInterval = 1;
		} else if (yearsVisible <= 100) {
			tickInterval = 10;
		} else if (yearsVisible <= 1000) {
			tickInterval = 100;
		} else if (yearsVisible <= 10000) {
			tickInterval = 1000;
		} else if (yearsVisible <= 100000) {
			tickInterval = 10000;
		} else if (yearsVisible <= 1000000) {
			tickInterval = 100000;
		} else if (yearsVisible <= 10000000) {
			tickInterval = 1000000;
		} else if (yearsVisible <= 100000000) {
			tickInterval = 10000000;
		} else if (yearsVisible <= 1000000000) {
			tickInterval = 100000000;
		} else {
			tickInterval = 1000000000;
		}

		const startTick = Math.floor(viewStart / tickInterval) * tickInterval;
		const endTick = Math.ceil(viewEnd / tickInterval) * tickInterval;

		for (let year = startTick; year <= endTick; year += tickInterval) {
			ticks.push(year);
		}

		return ticks.slice(0, 15);
	}

	$effect(() => {
		drawTimeline();
	});

	onMount(() => {
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				width = entry.contentRect.width;
				height = entry.contentRect.height;
				if (canvas) {
					canvas.width = width;
					canvas.height = height;
				}
				drawTimeline();
			}
		});

		resizeObserver.observe(container);

		return () => resizeObserver.disconnect();
	});
</script>

<div
	bind:this={container}
	class="timeline-container"
	onwheel={handleWheel}
	onmousedown={handleMouseDown}
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
	onmouseleave={handleMouseUp}
	onclick={handleClick}
	role="application"
	aria-label="Timeline"
	tabindex="0"
>
	<canvas bind:this={canvas}></canvas>

	<!-- Period bands layer (behind events) -->
	<div class="periods-layer">
		{#each visiblePeriods as event (event.id)}
			{@const startY = getEventScreenY(event.year)}
			{@const endY = event.endYear ? getEventScreenY(event.endYear) : startY}
			{@const topY = Math.min(startY, endY)}
			{@const bandHeight = Math.max(Math.abs(startY - endY), 20)}
			{@const isSelected = timelineState.selectedEventId === event.id}
			{@const hue = ((event.id ?? 0) * 47 + 200) % 360}
			<div
				class="period-band"
				class:selected={isSelected}
				style="top: {topY}px; height: {bandHeight}px; left: {TIMELINE_LEFT_OFFSET}px; --period-hue: {hue};"
				onclick={(e) => { e.stopPropagation(); timelineState.selectedEventId = isSelected ? null : event.id ?? null; }}
				role="button"
				tabindex="0"
			>
				<div class="period-label">
					<span class="period-title">{event.title}</span>
					<span class="period-dates">
						{formatDate(event.year, event.month, event.day)}
						{#if event.endYear}– {formatDate(event.endYear, event.endMonth, event.endDay)}{/if}
					</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="events-layer">
		<!-- Clustered point events -->
		{#each clusters as cluster (cluster.representative.id)}
			<EventCluster
				{cluster}
				getScreenY={getEventScreenY}
				timelineLeftOffset={TIMELINE_LEFT_OFFSET}
			/>
		{/each}
	</div>

	<div class="zoom-controls glass-subtle">
		<button class="zoom-btn" onclick={zoomIn} title="Zoom In">
			<ZoomIn size={18} />
		</button>
		<div class="zoom-info">
			<div class="zoom-label">{currentZoom.label}</div>
			<div class="center-year">{formatYear(Math.round(timelineState.centerYear))}</div>
		</div>
		<button class="zoom-btn" onclick={zoomOut} title="Zoom Out">
			<ZoomOut size={18} />
		</button>
	</div>

	{#if showContextMenu}
		<div class="click-indicator" style="top: {clickIndicatorY}px;"></div>
		<div 
			class="context-menu glass" 
			style="left: {TIMELINE_LEFT_OFFSET + 30}px; top: {clickY}px;"
		>
			<div class="context-menu-header">{formatYear(clickedYear)}</div>
			<button class="context-menu-item" onclick={handleWhatHappened}>
				<MessageCircleQuestion size={16} />
				What happened here?
			</button>
			<button class="context-menu-item" onclick={handleAddEvent}>
				<Plus size={16} />
				Add Event
			</button>
		</div>
		<div class="context-backdrop" onclick={closeContextMenu} role="presentation"></div>
	{/if}

	{#if showEventCreator}
		<EventCreator
			year={clickedYear}
			x={clickX}
			onClose={closeEventCreator}
		/>
	{/if}

	<!-- Next event navigation buttons (only when view is empty) -->
	{#if viewIsEmpty && nextEventUp()}
		{@const evt = nextEventUp()}
		{#if evt}
			<button
				class="nav-btn nav-btn-up glass-subtle"
				onclick={() => scrollToEvent(evt.year)}
				title="Go to {evt.title}"
			>
				<ChevronUp size={16} />
				<span class="nav-btn-label">{evt.title}</span>
				<span class="nav-btn-date">{formatDate(evt.year, evt.month, evt.day)}</span>
			</button>
		{/if}
	{/if}

	{#if viewIsEmpty && nextEventDown()}
		{@const evt = nextEventDown()}
		{#if evt}
			<button
				class="nav-btn nav-btn-down glass-subtle"
				onclick={() => scrollToEvent(evt.year)}
				title="Go to {evt.title}"
			>
				<span class="nav-btn-label">{evt.title}</span>
				<span class="nav-btn-date">{formatDate(evt.year, evt.month, evt.day)}</span>
				<ChevronDown size={16} />
			</button>
		{/if}
	{/if}
</div>

<style>
	.timeline-container {
		flex: 1;
		position: relative;
		cursor: crosshair;
		overflow: hidden;
	}

	.timeline-container:active {
		cursor: grabbing;
	}

	canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.periods-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 1;
	}

	.periods-layer > :global(*) {
		pointer-events: auto;
	}

	.period-band {
		position: absolute;
		right: 0;
		background: hsla(var(--period-hue, 240), 60%, 55%, 0.07);
		border-left: 3px solid hsla(var(--period-hue, 240), 60%, 60%, 0.5);
		cursor: pointer;
		transition: background 0.15s;
	}

	.period-band:hover {
		background: hsla(var(--period-hue, 240), 60%, 55%, 0.14);
	}

	.period-band.selected {
		background: hsla(var(--period-hue, 240), 60%, 55%, 0.18);
		border-left-width: 4px;
		border-left-color: hsla(var(--period-hue, 240), 70%, 65%, 0.9);
	}

	.period-label {
		position: absolute;
		top: 2px;
		right: 12px;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0px;
		pointer-events: none;
	}

	.period-title {
		font-size: 11px;
		font-weight: 600;
		color: hsla(var(--period-hue, 240), 70%, 80%, 0.85);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
	}

	.period-dates {
		font-size: 9px;
		color: hsla(var(--period-hue, 240), 50%, 70%, 0.55);
		white-space: nowrap;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
	}

	.events-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 2;
	}

	.events-layer > :global(*) {
		pointer-events: auto;
	}

	.zoom-controls {
		position: absolute;
		bottom: 20px;
		right: 20px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.8);
	}

	.zoom-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		color: white;
		cursor: pointer;
		transition: all 0.15s;
	}

	.zoom-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.zoom-info {
		text-align: center;
		min-width: 100px;
	}

	.zoom-label {
		font-weight: 500;
		font-size: 13px;
	}

	.center-year {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.5);
	}

	.click-indicator {
		position: absolute;
		left: 60px;
		transform: translate(-50%, -50%);
		width: 16px;
		height: 16px;
		background: var(--accent);
		border-radius: 50%;
		box-shadow: 0 0 20px var(--accent-glow), 0 0 40px var(--accent-glow);
		z-index: 50;
		pointer-events: none;
	}

	.context-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
	}

	.context-menu {
		position: absolute;
		transform: translateY(-50%);
		min-width: 180px;
		padding: 8px 0;
		z-index: 100;
	}

	.context-menu-header {
		padding: 8px 16px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.5);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		margin-bottom: 4px;
	}

	.context-menu-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px 16px;
		background: transparent;
		border: none;
		color: white;
		font-size: 14px;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s;
	}

	.context-menu-item:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.nav-btn {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.85);
		cursor: pointer;
		z-index: 50;
		font-size: 13px;
		white-space: nowrap;
		max-width: 80%;
		transition: background 0.15s, border-color 0.15s;
		background: rgba(20, 20, 30, 0.7);
		backdrop-filter: blur(12px);
		border-radius: 20px;
	}

	.nav-btn:hover {
		background: rgba(99, 102, 241, 0.25);
		border-color: rgba(99, 102, 241, 0.5);
	}

	.nav-btn-up {
		top: 12px;
	}

	.nav-btn-down {
		bottom: 70px;
	}

	.nav-btn-label {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	}

	.nav-btn-date {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}
</style>
