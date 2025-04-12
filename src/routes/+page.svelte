<script lang="ts">
  import { goto } from '$app/navigation';
  import { gameStore } from '$lib/stores/gameStore';
  import { joinGame } from '$lib/firebase';
  
  // Handle creating a new game
  async function createNewGame() {
    try {
      console.log("Creating new game...");
      const newGameId = gameStore.createNewGame();
      console.log("Created game with ID:", newGameId);
      
      // Use direct window location for more reliable navigation
      window.location.href = '/setup';
    } catch (err) {
      console.error("Error creating new game:", err);
      alert("There was an error creating a new divi. Please try again.");
    }
  }
  
  // Handle joining an existing game
  async function joinExistingGame() {
    const gameId = gameIdInput.trim();
    if (!gameId) {
      error = 'Please enter a valid divi ID';
      return;
    }
    
    // Check if the game exists
    isLoading = true;
    const gameExists = await joinGame(gameId);
    isLoading = false;
    
    if (gameExists) {
      // Join the game
      gameStore.joinExistingGame(gameId);
      goto(`/game/${gameId}`);
    } else {
      error = 'Divi not found. Please check the ID and try again.';
    }
  }
  
  let gameIdInput = '';
  let error = '';
  let isLoading = false;
</script>

<div class="container max-w-4xl mx-auto p-4">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold mb-2 text-dark">Divi</h1>
    <p class="text-lg text-dark">A simple app for turn-based item selection</p>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <div class="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <h2 class="text-2xl font-bold mb-4 text-dark">Create New Divi</h2>
      <p class="text-dark mb-6">Start a new game where you can add items and invite participants to pick them.</p>
      
      <button 
        on:click={createNewGame}
        class="w-full px-4 py-3 text-center text-white bg-primary rounded-md hover:bg-secondary"
      >
        Create New Divi
      </button>
    </div>
    
    <div class="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <h2 class="text-2xl font-bold mb-4 text-dark">Join Existing Divi</h2>
      <p class="text-dark mb-6">Enter a divi ID to join an existing divi session.</p>
      
      <form on:submit|preventDefault={joinExistingGame} class="space-y-4">
        <div>
          <label for="gameId" class="block text-sm font-medium text-dark">Divi ID</label>
          <input
            type="text"
            id="gameId"
            bind:value={gameIdInput}
            class="w-full px-3 py-2 border rounded-md mt-1 bg-light text-dark"
            placeholder="Enter divi ID"
            required
            disabled={isLoading}
          />
          {#if error}
            <p class="text-primary text-sm mt-1">{error}</p>
          {/if}
        </div>
        
        <button 
          type="submit" 
          class="w-full px-4 py-3 text-white bg-primary rounded-md hover:bg-secondary disabled:bg-soft-lilac"
          disabled={isLoading}
        >
          {isLoading ? 'Checking...' : 'Join Divi'}
        </button>
      </form>
    </div>
  </div>
  
  <div class="mt-12 text-center text-sm text-dark">
    <h3 class="font-semibold text-base mb-2">How It Works</h3>
    <ul class="space-y-2">
      <li>Create a new divi and add items you want to divide</li>
      <li>Add participants who will take turns picking items</li>
      <li>Share the divi link with all participants</li>
      <li>Take turns selecting items until everything is picked</li>
    </ul>
  </div>
</div>