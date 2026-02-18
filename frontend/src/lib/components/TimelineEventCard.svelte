<script lang="ts">
	import { onMount } from 'svelte';
	import type { TimelineEvent } from '$lib/db';
	import { updateEvent, getAllEvents } from '$lib/db';
	import { formatYear } from '$lib/timeline';
	import { timelineState } from '$lib/stores.svelte';
	import { X, Pencil, Link, Image, Save, Trash2, ExternalLink, BookOpen } from 'lucide-svelte';
	import { chatState } from '$lib/stores.svelte';

	interface Props {
		event: TimelineEvent;
		style?: string;
		isPeriod?: boolean;
	}

	let { event, style = '', isPeriod = false }: Props = $props();
	
	let isEditing = $state(false);
	let editTitle = $state(event.title);
	let editDescription = $state(event.description);
	let editTags = $state(event.tags?.join(', ') ?? '');
	let editImageUrl = $state(event.imageUrl ?? '');
	let editLinks = $state<{ label: string; url: string }[]>(event.links ?? []);
	let newLinkLabel = $state('');
	let newLinkUrl = $state('');
	let detailRef: HTMLDivElement;

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		timelineState.selectedEventId = timelineState.selectedEventId === event.id ? null : event.id ?? null;
		isEditing = false;
	}

	function handleClose() {
		timelineState.selectedEventId = null;
		isEditing = false;
	}

	function startEdit() {
		editTitle = event.title;
		editDescription = event.description;
		editTags = event.tags?.join(', ') ?? '';
		editImageUrl = event.imageUrl ?? '';
		editLinks = [...(event.links ?? [])];
		isEditing = true;
	}

	async function saveEdit() {
		if (!event.id) return;
		await updateEvent(event.id, {
			title: editTitle,
			description: editDescription,
			tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
			imageUrl: editImageUrl || undefined,
			links: editLinks.length > 0 ? editLinks : undefined
		});
		timelineState.events = await getAllEvents();
		isEditing = false;
	}

	function addLink() {
		if (newLinkLabel && newLinkUrl) {
			editLinks = [...editLinks, { label: newLinkLabel, url: newLinkUrl }];
			newLinkLabel = '';
			newLinkUrl = '';
		}
	}

	function removeLink(index: number) {
		editLinks = editLinks.filter((_, i) => i !== index);
	}

	function handleDetailClick(e: MouseEvent) {
		e.stopPropagation();
	}

	function learnMore() {
		chatState.pendingQuery = `Tell me more about "${event.title}" (${formatYear(event.year)}). What was its historical significance and what events led to it or resulted from it?`;
		chatState.isOpen = true;
		handleClose();
	}

	const isSelected = $derived(timelineState.selectedEventId === event.id);

	onMount(() => {
		function handleGlobalClick(e: MouseEvent) {
			if (isSelected && detailRef && !detailRef.contains(e.target as Node)) {
				const cardEl = (e.target as Element).closest('.event-card');
				if (!cardEl) {
					handleClose();
				}
			}
		}
		
		document.addEventListener('click', handleGlobalClick);
		return () => document.removeEventListener('click', handleGlobalClick);
	});
</script>

<button
	class="event-card glass"
	class:period={isPeriod}
	class:selected={isSelected}
	{style}
	onclick={handleClick}
>
	<div class="event-marker" class:period-marker={isPeriod}></div>
	<div class="event-content">
		<h3 class="event-title">{event.title}</h3>
		<span class="event-year">
			{formatYear(event.year)}
			{#if event.endYear}
				– {formatYear(event.endYear)}
			{/if}
		</span>
	</div>
</button>

{#if isSelected}
	<div 
		bind:this={detailRef}
		class="event-detail glass" 
		style={style}
		onclick={handleDetailClick}
		role="dialog"
	>
		<div class="detail-header">
			<button class="detail-action-btn" onclick={startEdit} title="Edit">
				<Pencil size={14} />
			</button>
			<button class="detail-action-btn close-btn" onclick={handleClose} title="Close">
				<X size={14} />
			</button>
		</div>

		{#if isEditing}
			<div class="edit-form">
				<label>
					Title
					<input type="text" bind:value={editTitle} />
				</label>
				<label>
					Description
					<textarea bind:value={editDescription} rows="3"></textarea>
				</label>
				<label>
					Tags (comma-separated)
					<input type="text" bind:value={editTags} placeholder="history, war, technology" />
				</label>
				<label>
					Image URL
					<input type="text" bind:value={editImageUrl} placeholder="https://..." />
				</label>
				
				<div class="links-section">
					<span class="links-label">Links</span>
					{#each editLinks as link, i}
						<div class="link-item">
							<span>{link.label}</span>
							<button class="remove-link-btn" onclick={() => removeLink(i)}>
								<Trash2 size={12} />
							</button>
						</div>
					{/each}
					<div class="add-link-row">
						<input type="text" bind:value={newLinkLabel} placeholder="Label" />
						<input type="text" bind:value={newLinkUrl} placeholder="URL" />
						<button class="add-link-btn" onclick={addLink}>
							<Link size={12} />
						</button>
					</div>
				</div>

				<div class="edit-actions">
					<button class="btn-secondary" onclick={() => isEditing = false}>Cancel</button>
					<button class="btn-primary" onclick={saveEdit}>
						<Save size={14} />
						Save
					</button>
				</div>
			</div>
		{:else}
			{#if event.imageUrl}
				<img src={event.imageUrl} alt={event.title} class="event-image" />
			{/if}
			<h2>{event.title}</h2>
			<p class="detail-year">
				{formatYear(event.year)}
				{#if event.endYear}
					– {formatYear(event.endYear)}
				{/if}
			</p>
			<p class="detail-description">{event.description}</p>
			{#if event.links && event.links.length > 0}
				<div class="event-links">
					{#each event.links as link}
						<a href={link.url} target="_blank" rel="noopener noreferrer" class="event-link">
							<ExternalLink size={12} />
							{link.label}
						</a>
					{/each}
				</div>
			{/if}
			{#if event.tags && event.tags.length > 0}
				<div class="tags">
					{#each event.tags as tag}
						<span class="tag">{tag}</span>
					{/each}
				</div>
			{/if}
			<button class="learn-more-btn" onclick={learnMore}>
				<BookOpen size={14} />
				Learn More
			</button>
		{/if}
	</div>
{/if}

<style>
	.event-card {
		position: absolute;
		transform: translateY(-50%);
		padding: 8px 12px;
		cursor: pointer;
		border: none;
		text-align: left;
		min-width: 140px;
		max-width: 280px;
	}

	.event-card:hover {
		transform: translateY(-50%) scale(1.02);
		background: rgba(255, 255, 255, 0.15);
	}

	.event-card.selected {
		background: rgba(99, 102, 241, 0.3);
		border-color: rgba(99, 102, 241, 0.5);
	}

	.event-card.period {
		min-width: auto;
		border-radius: 8px;
		background: rgba(99, 102, 241, 0.15);
	}

	.event-marker {
		position: absolute;
		top: 50%;
		left: -20px;
		transform: translateY(-50%);
		width: 12px;
		height: 12px;
		background: var(--accent);
		border-radius: 50%;
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.period-marker {
		width: 4px;
		height: 100%;
		border-radius: 2px;
		top: 0;
		left: -20px;
		transform: none;
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

	.event-detail {
		position: absolute;
		transform: translateY(-50%);
		padding: 16px;
		min-width: 280px;
		max-width: 350px;
		z-index: 100;
		margin-left: 160px;
	}

	.detail-header {
		display: flex;
		justify-content: flex-end;
		gap: 4px;
		margin-bottom: 8px;
	}

	.detail-action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		transition: all 0.15s;
	}

	.detail-action-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}

	.event-image {
		width: 100%;
		height: 120px;
		object-fit: cover;
		border-radius: 8px;
		margin-bottom: 12px;
	}

	.event-detail h2 {
		margin: 0 0 8px 0;
		font-size: 18px;
		color: white;
	}

	.detail-year {
		margin: 0 0 12px 0;
		font-size: 14px;
		color: var(--accent);
	}

	.detail-description {
		margin: 0 0 12px 0;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
	}

	.event-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 12px;
	}

	.event-link {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: rgba(99, 102, 241, 0.2);
		border-radius: 4px;
		font-size: 12px;
		color: var(--accent);
		text-decoration: none;
		transition: background 0.15s;
	}

	.event-link:hover {
		background: rgba(99, 102, 241, 0.3);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.tag {
		padding: 4px 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.7);
	}

	.learn-more-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		margin-top: 12px;
		padding: 10px;
		background: var(--accent);
		border: none;
		border-radius: 8px;
		color: white;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}

	.learn-more-btn:hover {
		background: #5558e3;
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.edit-form label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
	}

	.edit-form input,
	.edit-form textarea {
		padding: 8px 10px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		color: white;
		font-size: 13px;
		outline: none;
	}

	.edit-form input:focus,
	.edit-form textarea:focus {
		border-color: var(--accent);
	}

	.links-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.links-label {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
	}

	.link-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 8px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		font-size: 12px;
	}

	.remove-link-btn {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		padding: 2px;
	}

	.remove-link-btn:hover {
		color: #ef4444;
	}

	.add-link-row {
		display: flex;
		gap: 6px;
	}

	.add-link-row input {
		flex: 1;
		padding: 6px 8px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: white;
		font-size: 12px;
		outline: none;
	}

	.add-link-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		background: var(--accent);
		border: none;
		border-radius: 4px;
		color: white;
		cursor: pointer;
	}

	.edit-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
		margin-top: 8px;
	}

	.btn-secondary,
	.btn-primary {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 13px;
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
