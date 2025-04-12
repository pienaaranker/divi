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
    if (confirm('Are you sure you want to reset the divi? All progress will be lost.')) {
      gameStore.createNewGame();
      window.location.href = '/setup';
    }
  }
</script>

<div class="bg-white border rounded-lg p-4 shadow-sm space-y-4">
  <h2 class="text-xl font-semibold">Divi Status</h2>
  
  {#if $gameStore.started}
    <div>
      {#if $isGameActive}
        {#if $currentTurn.participant}
          <p class="font-medium">
            {#if $isCurrentPlayersTurn}
              <span class="text-green-600">It's your turn to pick an item!</span>
            {:else}
              <span>Waiting for <b>{$currentTurn.participant.name}</b> to pick...</span>
            {/if}
          </p>
        {:else}
          <p>No active participants.</p>
        {/if}
      {:else}
        <p class="text-purple-600 font-medium">All items have been picked!</p>
      {/if}
    </div>
  {:else}
    <p>
      Divi not started yet. 
      {#if $gameStore.participants?.length > 0}
        <button 
          on:click={() => gameStore.startGame()}
          class="text-blue-600 underline"
        >
          Start now
        </button>
      {/if}
    </p>
  {/if}
  
  <div class="mt-4">
    <h3 class="font-medium mb-1">Share this divi:</h3>
    <div class="flex">
      <input 
        type="text" 
        value={gameLink}
        readonly
        class="flex-1 px-3 py-2 border rounded-l-md bg-gray-50 text-sm"
      />
      <button 
        on:click={copyGameLink}
        class="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
      >
        Copy
      </button>
    </div>
  </div>
  
  {#if $gameStore.participants && $gameStore.participants.some((p: { name: string; isOrganizer?: boolean }) => p.name === currentPlayerName && p.isOrganizer)}
    <div class="mt-4">
      <button 
        on:click={resetGame}
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        New Divi
      </button>
    </div>
  {/if}
</div>