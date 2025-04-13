<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { gameStore } from '$lib/stores/gameStore';
  
  let timeLeft: number;
  let timerInterval: ReturnType<typeof setInterval>;
  
  // Initialize timer when component mounts or when game state changes
  $: if ($gameStore.timerEnabled && $gameStore.started) {
    // If there's no current turn start time, set it now
    if (!$gameStore.currentTurnStartTime) {
      gameStore.updateCurrentTurnStartTime(Date.now());
    }
    
    // Calculate time left
    if ($gameStore.currentTurnStartTime) {
      const elapsed = Math.floor((Date.now() - $gameStore.currentTurnStartTime) / 1000);
      timeLeft = Math.max(0, $gameStore.timerDuration - elapsed);
      
      if (timeLeft === 0 && timerInterval) {
        clearInterval(timerInterval);
        // Auto-advance to next turn when time runs out
        gameStore.advanceTurn();
      }
    }
  }
  
  onMount(() => {
    if ($gameStore.timerEnabled && $gameStore.started) {
      // Start the timer interval
      startTimerInterval();
    }
  });
  
  function startTimerInterval() {
    // Clear any existing interval
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    // Start a new interval
    timerInterval = setInterval(() => {
      if ($gameStore.currentTurnStartTime) {
        const elapsed = Math.floor((Date.now() - $gameStore.currentTurnStartTime) / 1000);
        timeLeft = Math.max(0, $gameStore.timerDuration - elapsed);
        
        // If time runs out, advance to next turn
        if (timeLeft === 0) {
          clearInterval(timerInterval);
          gameStore.advanceTurn();
        }
      }
    }, 1000);
  }
  
  // Watch for turn changes to reset the timer
  $: if ($gameStore.currentTurnStartTime) {
    startTimerInterval();
  }
  
  onDestroy(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });
  
  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    // For longer custom times (10+ minutes), show minutes only with trailing zeros
    if (minutes >= 10) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
</script>

{#if $gameStore.timerEnabled && $gameStore.started && $gameStore.currentTurnStartTime}
  <div class="flex items-center justify-center space-x-2">
    <div class="text-lg font-semibold {timeLeft <= 10 ? 'text-red-500' : timeLeft <= $gameStore.timerDuration * 0.25 ? 'text-amber-500' : 'text-dark'}">
      {formatTime(timeLeft)}
    </div>
    <div class="text-sm text-dark/70">remaining</div>
  </div>
  {#if $gameStore.timerDuration > 300}
    <div class="mt-1 text-xs text-center text-dark/60">
      ({Math.floor(timeLeft / 60)} min {timeLeft % 60} sec of {Math.floor($gameStore.timerDuration / 60)} min)
    </div>
  {/if}
{/if} 