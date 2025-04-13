<script lang="ts">
  import { gameStore, currentTurn, isGameActive, isCurrentPlayersTurn } from '$lib/stores/gameStore';
  import { browser } from '$app/environment';
  
  export let currentPlayerName = '';
  
  $: gameLink = browser ? gameStore.getShareableLink() : '';
  
  function copyGameLink() {
    if (browser && gameLink) {
      navigator.clipboard.writeText(gameLink);
      alert('Link copied to clipboard!');
    }
  }
  
  function resetGame() {
    if (confirm('Are you sure you want to reset the Divi? All progress will be lost.')) {
      gameStore.createNewGame();
      window.location.href = '/setup';
    }
  }
</script>

<div class="bg-white border rounded-lg p-4 shadow-sm space-y-4">
  <h2 class="text-xl font-semibold text-dark">Status</h2>
  
  {#if $gameStore.started}
    <div>
      {#if $isGameActive}
        {#if $currentTurn.participant}
          <p class="font-medium">
            {#if $isCurrentPlayersTurn}
              <span class="text-primary">It's your turn to pick an item!</span>
            {:else}
              <span class="text-dark">Waiting for <b>{$currentTurn.participant.name}</b> to pick...</span>
            {/if}
          </p>
        {:else}
          <p class="text-dark">No active participants.</p>
        {/if}
      {:else}
        <p class="text-primary font-medium">All items have been picked!</p>
      {/if}
    </div>
  {:else}
    <p class="text-dark">
      Divi not started yet. 
      {#if $gameStore.participants?.length > 0}
        <button 
          on:click={() => gameStore.startGame()}
          class="text-primary hover:text-secondary underline"
        >
          Start now
        </button>
      {/if}
    </p>
  {/if}
  
  <div class="mt-4">
    <h3 class="font-medium mb-1 text-dark">Share this divi:</h3>
    <div class="flex">
      <input 
        type="text" 
        value={gameLink}
        readonly
        class="flex-1 px-3 py-2 border rounded-l-md bg-light text-sm text-dark"
      />
      <button 
        on:click={copyGameLink}
        class="px-4 py-2 bg-primary text-white rounded-r-md hover:bg-secondary"
      >
        Copy
      </button>
    </div>
  </div>
  
  {#if $gameStore.participants && $gameStore.participants.some((p: { name: string; isOrganizer?: boolean }) => p.name === currentPlayerName && p.isOrganizer)}
    <div class="mt-4">
      <button 
        on:click={resetGame}
        class="px-4 py-2 bg-deep-indigo text-white rounded-md hover:bg-secondary"
      >
        New Divi
      </button>
    </div>
  {/if}
</div>