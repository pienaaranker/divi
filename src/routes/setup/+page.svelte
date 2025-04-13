<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { gameStore } from '$lib/stores/gameStore';
  import ItemForm from '$lib/components/ItemForm.svelte';
  import ItemList from '$lib/components/ItemList.svelte';
  import ParticipantList from '$lib/components/ParticipantList.svelte';
  import GameStatus from '$lib/components/GameStatus.svelte';
  import ExpiryTimer from '$lib/components/ExpiryTimer.svelte';
  import { browser } from '$app/environment';
  
  let isLoading = true;
  let error = '';
  
  onMount(() => {
    if (browser) {
      console.log("Setup page mounted, initializing Divi...");
      
      try {
        // If there's no active game or no game ID, create a new one
        if (!$gameStore.id) {
          console.log("No game ID found, creating new Divi");
          const newGameId = gameStore.createNewGame();
          console.log("New Divi created with ID:", newGameId);
        } else {
          console.log("Divi already exists with ID:", $gameStore.id);
        }
        
        // Add a timeout to ensure the divi is initialized
        setTimeout(() => {
          // Always mark as not loading after initialization
          console.log("Divi initialization complete");
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
          } else if (!gameStore.isUserParticipating()) {
            // If the player has a stored name but is not a participant yet, add them
            console.log("Player already has name but is not participating, adding:", $gameStore.playerName);
            // Add the participant with organizer status
            gameStore.addParticipant($gameStore.playerName, true);
          }
        }, 500);
      } catch (err) {
        console.error("Error initializing Divi:", err);
        error = "There was an error setting up your Divi. Please try again.";
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
    
    // Start the game
    gameStore.startGame();
    
    // Initialize timer if enabled
    if ($gameStore.timerEnabled) {
      gameStore.updateCurrentTurnStartTime(Date.now());
    }
    
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
  <div class="text-center mb-8">
    <img src="/Banner_final.png" alt="Divi" style="width: 250px; height: auto; margin: 0 auto; display: block;" />
  </div>
  {#if isLoading}
    <div class="p-8 text-center">
      <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p class="text-dark">Setting up your Divi...</p>
    </div>
  {:else if error}
    <div class="bg-light border border-primary text-primary px-4 py-3 rounded">
      <p>{error}</p>
      <div class="mt-4">
        <a href="/" class="text-primary hover:text-secondary underline">Return to home</a>
      </div>
    </div>
  {:else}
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-dark">Setup Divi</h1>
      
      <div class="flex items-center gap-4">
        <div class="text-dark">
          Organizer: <span class="font-semibold">{$gameStore.playerName}</span>
        </div>
        
        <button 
          on:click={startGame}
          class="px-6 py-2 text-white bg-primary rounded-md hover:bg-secondary"
        >
          Start Divi
        </button>
      </div>
    </div>
    
    <div class="mb-4 p-4 bg-light border border-primary rounded-md">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <p class="font-medium text-dark">Share this link to invite participants:</p>
          <p class="text-sm text-primary break-all">{gameStore.getShareableLink()}</p>
        </div>
        <button 
          on:click={copyGameLink}
          class="px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary whitespace-nowrap"
        >
          Copy Link
        </button>
      </div>
    </div>
    
    <div class="mb-4 p-4 bg-light border border-primary rounded-md">
      <div class="flex items-start gap-2">
        <div class="text-primary mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
        </div>
        <div>
          <p class="font-medium text-dark">Expiry Information</p>
          <p class="text-sm text-dark mt-1">This session and all associated images will automatically be deleted after 30 days. Please make sure to complete your Divi before the expiry date.</p>
          <div class="mt-2">
            <ExpiryTimer />
          </div>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column -->
      <div class="lg:col-span-2 space-y-8">
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4 text-dark">Add Items</h2>
          <ItemForm />
        </div>
        
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4 text-dark">Items</h2>
          <ItemList items={$gameStore.items || []} showActions={true} />
        </div>
      </div>
      
      <!-- Right Column -->
      <div class="space-y-8">
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-dark">Participants</h2>
            {#if $gameStore.participants && $gameStore.participants.length > 1}
              <button 
                on:click={() => gameStore.randomizeParticipants()}
                class="px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary"
              >
                Randomize Order
              </button>
            {/if}
          </div>
          <ParticipantList participants={$gameStore.participants || []} canEdit={true} />
        </div>
        
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4 text-dark">Timer Settings</h2>
          <div class="space-y-4">
            <div class="flex items-center">
              <input
                type="checkbox"
                id="timerEnabled"
                checked={$gameStore.timerEnabled}
                on:change={(e) => gameStore.setTimerEnabled(e.target instanceof HTMLInputElement ? e.target.checked : false)}
                class="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label for="timerEnabled" class="ml-2 text-dark">Enable turn timer</label>
            </div>
            
            {#if $gameStore.timerEnabled}
              <div class="flex items-center space-x-2">
                <label for="timerDuration" class="text-dark">Time per turn:</label>
                <select
                  id="timerDuration"
                  value={$gameStore.timerDuration}
                  on:change={(e) => {
                    const value = e.target instanceof HTMLSelectElement ? e.target.value : '60';
                    if (value === 'custom') {
                      const customTime = prompt('Enter custom time in seconds (10-600):', '90');
                      if (customTime) {
                        const seconds = Math.min(600, Math.max(10, Number(customTime)));
                        gameStore.setTimerDuration(seconds);
                      }
                    } else {
                      gameStore.setTimerDuration(Number(value));
                    }
                  }}
                  class="border rounded-md px-2 py-1 text-dark"
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={180}>3 minutes</option>
                  <option value={300}>5 minutes</option>
                  <option value="custom">Custom time...</option>
                </select>
              </div>
            {/if}
          </div>
        </div>
        
        <GameStatus currentPlayerName={$gameStore.playerName} />
      </div>
    </div>
  {/if}
</div>