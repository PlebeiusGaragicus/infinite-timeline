<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Infinite Timeline</title>
	<meta name="description" content="Deep history educational timeline" />
</svelte:head>

<div class="app">
	{@render children()}
</div>

<style>
	.app {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
