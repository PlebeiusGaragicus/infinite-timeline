<script lang="ts">
	import { X } from 'lucide-svelte';
	import { addEvent, getAllEvents } from '$lib/db';
	import { timelineState } from '$lib/stores.svelte';
	import { formatYear } from '$lib/timeline';

	interface Props {
		year: number;
		x: number;
		onClose: () => void;
	}

	let { year, x, onClose }: Props = $props();

	let title = $state('');
	let description = $state('');
	let eventType = $state<'event' | 'period'>('event');
	let endYear = $state<number | null>(null);
	let tags = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit() {
		if (!title.trim()) return;
		
		isSubmitting = true;
		try {
			await addEvent({
				title: title.trim(),
				description: description.trim(),
				year,
				endYear: eventType === 'period' && endYear ? endYear : undefined,
				type: eventType,
				tags: tags.split(',').map(t => t.trim()).filter(Boolean)
			});
			
			timelineState.events = await getAllEvents();
			onClose();
		} catch (error) {
			console.error('Failed to create event:', error);
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="creator-backdrop" onclick={onClose} role="presentation">
	<div 
		class="creator-popup glass" 
		style="left: {Math.min(x, window.innerWidth - 350)}px;"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
	>
		<div class="creator-header">
			<h3>Add Event at {formatYear(year)}</h3>
			<button class="close-btn" onclick={onClose}>
				<X size={18} />
			</button>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<label>
				Title *
				<input
					type="text"
					bind:value={title}
					placeholder="Event title"
					required
				/>
			</label>

			<label>
				Description
				<textarea
					bind:value={description}
					placeholder="What happened?"
					rows="3"
				></textarea>
			</label>

			<div class="type-selector">
				<label class="radio-label">
					<input type="radio" bind:group={eventType} value="event" />
					Single Event
				</label>
				<label class="radio-label">
					<input type="radio" bind:group={eventType} value="period" />
					Time Period
				</label>
			</div>

			{#if eventType === 'period'}
				<label>
					End Year
					<input
						type="number"
						bind:value={endYear}
						placeholder="e.g., 1945"
					/>
				</label>
			{/if}

			<label>
				Tags (comma-separated)
				<input
					type="text"
					bind:value={tags}
					placeholder="history, war, technology"
				/>
			</label>

			<div class="actions">
				<button type="button" class="btn-secondary" onclick={onClose}>
					Cancel
				</button>
				<button type="submit" class="btn-primary" disabled={isSubmitting || !title.trim()}>
					{isSubmitting ? 'Creating...' : 'Create Event'}
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.creator-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
	}

	.creator-popup {
		position: absolute;
		top: 50%;
		left: 100px;
		transform: translateY(-50%);
		width: 320px;
		padding: 20px;
		z-index: 201;
	}

	.creator-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.creator-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.8);
	}

	input[type="text"],
	input[type="number"],
	textarea {
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: white;
		font-size: 14px;
		outline: none;
		resize: none;
	}

	input:focus,
	textarea:focus {
		border-color: var(--accent);
	}

	.type-selector {
		display: flex;
		gap: 16px;
	}

	.radio-label {
		flex-direction: row;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	input[type="radio"] {
		accent-color: var(--accent);
	}

	.actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
		margin-top: 8px;
	}

	.btn-secondary,
	.btn-primary {
		padding: 10px 18px;
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

	.btn-primary:hover:not(:disabled) {
		background: #5558e3;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
