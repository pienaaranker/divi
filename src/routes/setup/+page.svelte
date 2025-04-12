<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { gameStore } from '$lib/stores/gameStore';
  import ItemForm from '$lib/components/ItemForm.svelte';
  import ItemList from '$lib/components/ItemList.svelte';
  import ParticipantList from '$lib/components/ParticipantList.svelte';
  import GameStatus from '$lib/components/GameStatus.svelte';
  import { browser } from '$app/environment';
  
  let isLoading = true;
  let error = '';
  
  onMount(() => {
    if (browser) {
      console.log("Setup page mounted, initializing game...");
      
      try {
        // If there's no active game or no game ID, create a new one
        if (!$gameStore.id) {
          console.log("No game ID found, creating new game");
          const newGameId = gameStore.createNewGame();
          console.log("New game created with ID:", newGameId);
        } else {
          console.log("Game already exists with ID:", $gameStore.id);
        }
        
        // Add a timeout to ensure the game is initialized
        setTimeout(() => {
          // Always mark as not loading after initialization
          console.log("Game initialization complete");
          isLoading = false;
          
          // If there's no player name yet, prompt for it after loading is complete
          if (!$gameStore.playerName) {
            console.log("No player name found, prompting user");
            const name = prompt('Please enter your name as the organizer:', '');
            if (name) {
              console.log("Setting player name:", name);
              gameStore.setPlayerName(name);
              // Add the participant with organizer status
              gameStore.addParticipant(name, true);
            } else {
              // If user cancels, go back to home
              console.log("User canceled name prompt, redirecting to home");
              goto('/');
            }
          } else if (!$gameStore.isUserParticipating()) {
            // If the player has a stored name but is not a participant yet, add them
            console.log("Player already has name but is not participating, adding:", $gameStore.playerName);
            // Add the participant with organizer status
            gameStore.addParticipant($gameStore.playerName, true);
          }
        }, 500);
      } catch (err) {
        console.error("Error initializing game:", err);
        error = "There was an error setting up your game. Please try again.";
        isLoading = false;
      }
    }
  });
  
  function startGame() {
    if (!$gameStore.participants || $gameStore.participants.length === 0) {
      alert('Please add at least one participant before starting.');
      return;
    }
    
    if (!$gameStore.items || $gameStore.items.length === 0) {
      alert('Please add at least one item before starting.');
      return;
    }
    
    // If the organizer hasn't joined yet, add them as a participant
    if ($gameStore.playerName && !gameStore.isUserParticipating()) {
      // Add the participant with organizer status
      gameStore.addParticipant($gameStore.playerName, true);
    }
    
    gameStore.startGame();
    goto(`/game/${$gameStore.id}`);
  }
  
  function copyGameLink() {
    if (browser) {
      const link = gameStore.getShareableLink();
      navigator.clipboard.writeText(link);
      alert('Link copied to clipboard!');
    }
  }
</script>

<div class="container max-w-6xl mx-auto p-4">
  {#if isLoading}
    <div class="p-8 text-center">
      <div class="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p>Setting up your game...</p>
    </div>
  {:else if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <p>{error}</p>
      <div class="mt-4">
        <a href="/" class="text-blue-600 underline">Return to home</a>
      </div>
    </div>
  {:else}
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold">Setup Divi</h1>
      
      <div class="flex items-center gap-4">
        <div class="text-gray-600">
          Organizer: <span class="font-semibold">{$gameStore.playerName}</span>
        </div>
        
        <button 
          on:click={startGame}
          class="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          Start Divi
        </button>
      </div>
    </div>
    
    <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <p class="font-medium">Share this link to invite participants:</p>
          <p class="text-sm text-blue-800 break-all">{gameStore.getShareableLink()}</p>
        </div>
        <button 
          on:click={copyGameLink}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
        >
          Copy Link
        </button>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column -->
      <div class="lg:col-span-2 space-y-8">
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4">Add Items</h2>
          <ItemForm />
        </div>
        
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4">Items</h2>
          <ItemList items={$gameStore.items || []} showActions={true} />
        </div>
      </div>
      
      <!-- Right Column -->
      <div class="space-y-8">
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <ParticipantList participants={$gameStore.participants || []} canEdit={true} />
        </div>
        
        <GameStatus currentPlayerName={$gameStore.playerName} />
      </div>
    </div>
  {/if}
</div>