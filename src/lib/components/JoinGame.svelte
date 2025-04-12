<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import { browser } from '$app/environment';
  
  export let gameId: string | undefined = undefined;
  export let onJoin: (playerName: string) => void;
  
  let playerName = browser ? localStorage.getItem('divi_player_name') || '' : '';
  let error = '';
  let isLoading = false;
  
  function handleJoin() {
    isLoading = true;
    
    if (!playerName.trim()) {
      error = 'Please enter your name';
      isLoading = false;
      return;
    }
    
    error = '';
    onJoin(playerName);
  }
</script>

<div class="max-w-md mx-auto bg-white border rounded-lg p-6 shadow-sm">
  <h2 class="text-2xl font-bold mb-4 text-dark">Join the Divi</h2>
  
  <form on:submit|preventDefault={handleJoin} class="space-y-4">
    <div>
      <label for="playerName" class="block text-sm font-medium text-dark">Your Name</label>
      <input
        type="text"
        id="playerName"
        bind:value={playerName}
        class="w-full px-3 py-2 border rounded-md mt-1 bg-light text-dark"
        placeholder="Enter your name"
        required
        disabled={isLoading}
      />
      {#if error}
        <p class="text-primary text-sm mt-1">{error}</p>
      {/if}
    </div>
    
    <button 
      type="submit" 
      class="w-full px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary disabled:bg-soft-lilac"
      disabled={isLoading}
    >
      {isLoading ? 'Joining...' : 'Join Divi'}
    </button>
  </form>
  
  <div class="mt-6 text-center text-sm text-dark">
    <p>Enter your name to join the item selection.</p>
    <p>Take turns picking items when it's your turn!</p>
  </div>
</div>