<script lang="ts">
	import { onMount } from 'svelte';
	import type { TimelineEvent } from '$lib/db';
	import { updateEvent, deleteEvent, getAllEvents } from '$lib/db';
	import { formatYear, formatDate } from '$lib/timeline';
	import { timelineState, chatState } from '$lib/stores.svelte';
	import { X, Pencil, Save, Trash2, ExternalLink, BookOpen, ChevronRight, Calendar, Tag, Link, Image, Star } from 'lucide-svelte';

	let panelRef: HTMLElement;

	const selectedEvent = $derived(
		timelineState.selectedEventId 
			? timelineState.events.find(e => e.id === timelineState.selectedEventId) 
			: null
	);

	let isEditing = $state(false);
	let editTitle = $state('');
	let editDescription = $state('');
	let editTags = $state('');
	let editImageUrl = $state('');
	let editLinks = $state<{ label: string; url: string }[]>([]);
	let newLinkLabel = $state('');
	let newLinkUrl = $state('');
	let editMonth = $state<number | undefined>(undefined);
	let editDay = $state<number | undefined>(undefined);
	let editStarred = $state(false);

	let lastSelectedId: number | null = null;

	$effect(() => {
		const currentId = timelineState.selectedEventId;
		if (selectedEvent) {
			editTitle = selectedEvent.title;
			editDescription = selectedEvent.description;
			editTags = selectedEvent.tags?.join(', ') ?? '';
			editImageUrl = selectedEvent.imageUrl ?? '';
			editLinks = [...(selectedEvent.links ?? [])];
			editMonth = selectedEvent.month;
			editDay = selectedEvent.day;
			editStarred = selectedEvent.starred ?? false;
			if (currentId !== lastSelectedId) {
				isEditing = false;
			}
		}
		lastSelectedId = currentId;
	});

	function closePanel() {
		timelineState.selectedEventId = null;
		isEditing = false;
	}

	function startEdit() {
		isEditing = true;
	}

	function cancelEdit() {
		if (selectedEvent) {
			editTitle = selectedEvent.title;
			editDescription = selectedEvent.description;
			editTags = selectedEvent.tags?.join(', ') ?? '';
			editImageUrl = selectedEvent.imageUrl ?? '';
			editLinks = [...(selectedEvent.links ?? [])];
			editMonth = selectedEvent.month;
			editDay = selectedEvent.day;
			editStarred = selectedEvent.starred ?? false;
		}
		isEditing = false;
	}

	async function saveEdit() {
		if (!selectedEvent?.id) return;
		await updateEvent(selectedEvent.id, {
			title: editTitle,
			description: editDescription,
			tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
			imageUrl: editImageUrl || undefined,
			links: editLinks.length > 0 ? editLinks : undefined,
			month: editMonth || undefined,
			day: editDay || undefined,
			starred: editStarred
		});
		timelineState.events = await getAllEvents();
		isEditing = false;
	}

	async function toggleStar() {
		if (!selectedEvent?.id) return;
		await updateEvent(selectedEvent.id, { starred: !selectedEvent.starred });
		timelineState.events = await getAllEvents();
	}

	async function handleDelete() {
		if (!selectedEvent?.id) return;
		if (confirm(`Delete "${selectedEvent.title}"?`)) {
			await deleteEvent(selectedEvent.id);
			timelineState.events = await getAllEvents();
			timelineState.selectedEventId = null;
		}
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

	function learnMore() {
		if (!selectedEvent) return;
		chatState.pendingQuery = `Tell me more about "${selectedEvent.title}" (${formatYear(selectedEvent.year)}). What was its historical significance and what events led to it or resulted from it?`;
		chatState.isOpen = true;
	}

	onMount(() => {
		function handleClickOutside(e: MouseEvent) {
			if (panelRef && !panelRef.contains(e.target as Node)) {
				const clickedInteractive = (e.target as Element).closest('.event-card, .cluster-wrapper, .cluster-item, .event-tick, .event-label, .period-band, .nav-btn');
				if (!clickedInteractive) {
					closePanel();
				}
			}
		}
		
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

{#if selectedEvent}
	<aside bind:this={panelRef} class="detail-panel glass">
		<header class="panel-header">
			<div class="header-info">
				<div class="badge-row">
					<span class="event-type-badge" class:period={selectedEvent.type === 'period'}>
						{selectedEvent.type === 'period' ? 'Period' : 'Event'}
					</span>
					{#if selectedEvent.starred}
						<span class="starred-badge"><Star size={12} /> Starred</span>
					{/if}
				</div>
				<h2 class="panel-title">{selectedEvent.title}</h2>
			</div>
			<div class="header-actions">
				<button
					class="icon-btn"
					class:star-active={selectedEvent.starred}
					onclick={toggleStar}
					title={selectedEvent.starred ? 'Unstar' : 'Star'}
				>
					<Star size={16} />
				</button>
				{#if !isEditing}
					<button class="icon-btn" onclick={startEdit} title="Edit">
						<Pencil size={16} />
					</button>
				{/if}
				<button class="icon-btn" onclick={closePanel} title="Close">
					<X size={16} />
				</button>
			</div>
		</header>

		<div class="panel-content">
			{#if isEditing}
				<form class="edit-form" onsubmit={(e) => { e.preventDefault(); saveEdit(); }}>
					<label class="form-field">
						<span class="field-label">Title</span>
						<input type="text" bind:value={editTitle} required />
					</label>

					<label class="form-field">
						<span class="field-label">Description</span>
						<textarea bind:value={editDescription} rows="4"></textarea>
					</label>

					<label class="form-field">
						<span class="field-label">
							<Tag size={14} />
							Tags (comma-separated)
						</span>
						<input type="text" bind:value={editTags} placeholder="history, science, art" />
					</label>

					<div class="form-row">
						<label class="form-field">
							<span class="field-label">
								<Calendar size={14} />
								Month (1-12)
							</span>
							<input type="number" min="1" max="12" bind:value={editMonth} placeholder="—" />
						</label>
						<label class="form-field">
							<span class="field-label">
								<Calendar size={14} />
								Day (1-31)
							</span>
							<input type="number" min="1" max="31" bind:value={editDay} placeholder="—" />
						</label>
					</div>

					<label class="form-field checkbox-field">
						<input type="checkbox" bind:checked={editStarred} />
						<Star size={14} />
						<span>Starred event</span>
					</label>

					<label class="form-field">
						<span class="field-label">
							<Image size={14} />
							Image URL
						</span>
						<input type="text" bind:value={editImageUrl} placeholder="https://..." />
					</label>

					<div class="form-field">
						<span class="field-label">
							<Link size={14} />
							External Links
						</span>
						{#each editLinks as link, i}
							<div class="link-item">
								<span class="link-label">{link.label}</span>
								<button type="button" class="remove-btn" onclick={() => removeLink(i)}>
									<Trash2 size={12} />
								</button>
							</div>
						{/each}
						<div class="add-link-row">
							<input type="text" bind:value={newLinkLabel} placeholder="Label" />
							<input type="text" bind:value={newLinkUrl} placeholder="URL" />
							<button type="button" class="add-btn" onclick={addLink} disabled={!newLinkLabel || !newLinkUrl}>
								<Link size={14} />
							</button>
						</div>
					</div>

					<div class="form-actions">
						<button type="button" class="btn-danger" onclick={handleDelete}>
							<Trash2 size={14} />
							Delete
						</button>
						<div class="action-group">
							<button type="button" class="btn-secondary" onclick={cancelEdit}>Cancel</button>
							<button type="submit" class="btn-primary">
								<Save size={14} />
								Save
							</button>
						</div>
					</div>
				</form>
			{:else}
				<div class="event-meta">
					<div class="meta-item">
						<Calendar size={16} />
						<span class="meta-value accent">
							{formatDate(selectedEvent.year, selectedEvent.month, selectedEvent.day, false)}
							{#if selectedEvent.endYear}
								<ChevronRight size={14} />
								{formatDate(selectedEvent.endYear, selectedEvent.endMonth, selectedEvent.endDay, false)}
							{/if}
						</span>
					</div>
				</div>

				{#if selectedEvent.imageUrl}
					<img src={selectedEvent.imageUrl} alt={selectedEvent.title} class="event-image" />
				{/if}

				<div class="event-description">
					<p>{selectedEvent.description}</p>
				</div>

				{#if selectedEvent.tags && selectedEvent.tags.length > 0}
					<div class="event-tags">
						{#each selectedEvent.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				{/if}

				{#if selectedEvent.links && selectedEvent.links.length > 0}
					<div class="event-links">
						<h4>Learn More</h4>
						{#each selectedEvent.links as link}
							<a href={link.url} target="_blank" rel="noopener noreferrer" class="external-link">
								<ExternalLink size={14} />
								{link.label}
							</a>
						{/each}
					</div>
				{/if}

				<button class="learn-more-btn" onclick={learnMore}>
					<BookOpen size={18} />
					<span>Ask AI about this {selectedEvent.type === 'period' ? 'period' : 'event'}</span>
				</button>
			{/if}
		</div>
	</aside>
{/if}

<style>
	.detail-panel {
		display: flex;
		flex-direction: column;
		width: 360px;
		height: 100%;
		border-left: 1px solid var(--glass-border);
		flex-shrink: 0;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		gap: 12px;
	}

	.header-info {
		flex: 1;
		min-width: 0;
	}

	.badge-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.event-type-badge {
		display: inline-block;
		padding: 3px 8px;
		background: rgba(99, 102, 241, 0.2);
		border-radius: 4px;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--accent);
	}

	.starred-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		background: rgba(251, 191, 36, 0.15);
		border-radius: 4px;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: #fbbf24;
	}

	.icon-btn.star-active {
		color: #fbbf24;
		background: rgba(251, 191, 36, 0.15);
	}

	.icon-btn.star-active:hover {
		background: rgba(251, 191, 36, 0.25);
	}

	.event-type-badge.period {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.panel-title {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: white;
		line-height: 1.3;
	}

	.header-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		transition: all 0.15s;
	}

	.icon-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}

	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
	}

	.event-meta {
		margin-bottom: 16px;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 8px;
		color: rgba(255, 255, 255, 0.6);
	}

	.meta-value {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 15px;
		font-weight: 500;
	}

	.meta-value.accent {
		color: var(--accent);
	}

	.event-image {
		width: 100%;
		height: 180px;
		object-fit: cover;
		border-radius: 12px;
		margin-bottom: 16px;
	}

	.event-description {
		margin-bottom: 16px;
	}

	.event-description p {
		margin: 0;
		font-size: 14px;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.85);
	}

	.event-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 16px;
	}

	.tag {
		padding: 5px 10px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
	}

	.event-links {
		margin-bottom: 20px;
	}

	.event-links h4 {
		margin: 0 0 10px 0;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: rgba(255, 255, 255, 0.5);
	}

	.external-link {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: rgba(99, 102, 241, 0.1);
		border-radius: 8px;
		font-size: 13px;
		color: var(--accent);
		text-decoration: none;
		transition: background 0.15s;
		margin-bottom: 8px;
	}

	.external-link:hover {
		background: rgba(99, 102, 241, 0.2);
	}

	.learn-more-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: 100%;
		padding: 14px;
		background: linear-gradient(135deg, var(--accent), #7c3aed);
		border: none;
		border-radius: 12px;
		color: white;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.15s, box-shadow 0.15s;
	}

	.learn-more-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
	}

	/* Edit Form Styles */
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-row {
		display: flex;
		gap: 12px;
	}

	.form-row .form-field {
		flex: 1;
	}

	.checkbox-field {
		flex-direction: row;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		cursor: pointer;
	}

	.checkbox-field input[type="checkbox"] {
		width: 16px;
		height: 16px;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.checkbox-field span {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.8);
	}

	.field-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
	}

	.edit-form input,
	.edit-form textarea {
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		color: white;
		font-size: 14px;
		outline: none;
		transition: border-color 0.15s;
	}

	.edit-form input:focus,
	.edit-form textarea:focus {
		border-color: var(--accent);
	}

	.edit-form textarea {
		resize: vertical;
		min-height: 80px;
	}

	.link-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 10px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		margin-bottom: 6px;
	}

	.link-label {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.8);
	}

	.remove-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.15s;
	}

	.remove-btn:hover {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.add-link-row {
		display: flex;
		gap: 8px;
	}

	.add-link-row input {
		flex: 1;
		padding: 8px 10px;
		font-size: 13px;
	}

	.add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		background: var(--accent);
		border: none;
		border-radius: 6px;
		color: white;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.form-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 8px;
		padding-top: 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.action-group {
		display: flex;
		gap: 8px;
	}

	.btn-secondary,
	.btn-primary,
	.btn-danger {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 10px 16px;
		border-radius: 8px;
		font-size: 13px;
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

	.btn-danger {
		background: transparent;
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.btn-danger:hover {
		background: rgba(239, 68, 68, 0.1);
	}
</style>
