<script lang="ts">
  import { timeUntilExpiry } from '$lib/stores/gameStore';
  import { onMount, onDestroy } from 'svelte';
  
  let interval: ReturnType<typeof setInterval>;
  
  onMount(() => {
    // Update the timer every hour instead of every second
    interval = setInterval(() => {
      // Force a reactive update
      $timeUntilExpiry;
    }, 3600000); // 1 hour in milliseconds
  });
  
  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
  
  $: timeRemaining = $timeUntilExpiry;
</script>

{#if timeRemaining}
  <div class="flex items-center gap-2">
    <div class="text-primary">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
      </svg>
    </div>
    <div>
      <p class="text-sm font-medium text-dark">Time remaining:</p>
      <p class="text-sm text-primary">
        {timeRemaining.days} {timeRemaining.days === 1 ? 'day' : 'days'}
      </p>
    </div>
  </div>
{:else}
  <div class="flex items-center gap-2">
    <div class="text-primary">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
      </svg>
    </div>
    <div>
      <p class="text-sm font-medium text-dark">Time remaining:</p>
      <p class="text-sm text-primary">Calculating...</p>
    </div>
  </div>
{/if} 