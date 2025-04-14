<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { gameStore, availableItems, currentTurn, isCurrentPlayersTurn } from '$lib/stores/gameStore';
  import { features } from '$lib/stores/featureStore';
  import JoinGame from '$lib/components/JoinGame.svelte';
  import ItemList from '$lib/components/ItemList.svelte';
  import GameStatus from '$lib/components/GameStatus.svelte';
  import ParticipantList from '$lib/components/ParticipantList.svelte';
  import ExpiryTimer from '$lib/components/ExpiryTimer.svelte';
  import { joinGame, isParticipantNameTaken, deleteGame } from '$lib/firebase';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  
  let showJoinForm = true;
  let isLoading = true;
  let error = '';
  let isDeleting = false;
  let autoSkip = false;
  let showAutoSkipMessage = false;
  let isGamePaused = false;
  
  $: gameId = $page.params.id;
  $: currentParticipant = $gameStore.participants?.find((p: { name: string; autoSkip?: boolean }) => p.name === $gameStore.playerName);
  $: isAutoSkipEnabled = currentParticipant?.autoSkip || false;
  
  // Check if all participants have auto-skip enabled
  $: allParticipantsAutoSkip = $gameStore.participants?.length > 0 && 
    $gameStore.participants?.every((p: { autoSkip?: boolean }) => p.autoSkip === true);
  
  // Show auto-skip message to organizer when all participants have auto-skip enabled
  $: if (allParticipantsAutoSkip && $gameStore.participants && 
      $gameStore.participants.some((p: { name: string; isOrganizer?: boolean }) => 
        p.name === $gameStore.playerName && p.isOrganizer)) {
    showAutoSkipMessage = true;
    isGamePaused = true;
  }
  
  // Update local autoSkip state when the game store changes
  $: if (currentParticipant?.autoSkip !== undefined) {
    autoSkip = currentParticipant.autoSkip;
  }
  
  onMount(async () => {
    if (browser) {
      try {
        // Check if the game exists
        const gameExists = await joinGame(gameId);
        
        if (!gameExists) {
          error = 'Divi not found. Please check the URL and try again.';
          return;
        }
        
        // Set the game ID in the store
        gameStore.joinExistingGame(gameId);
        
        // Check if the user is already a participant or is the organizer
        if ($gameStore.playerName && (gameStore.isUserParticipating() || $gameStore.participants?.some((p: { name: string; isOrganizer?: boolean }) => p.name === $gameStore.playerName && p.isOrganizer))) {
          showJoinForm = false;
        }
        
        isLoading = false;
      } catch (err) {
        console.error('Error loading divi:', err);
        error = 'Error loading divi. Please try again.';
        isLoading = false;
      }
    }
  });
  
  async function handleJoin(name: string) {
    if (!name.trim()) {
      return;
    }
    
    try {
      isLoading = true;
      
      // Set the player name in the store
      gameStore.setPlayerName(name);
      
      // Add the participant to the game (not as organizer)
      gameStore.addParticipant(name, false);
      
      showJoinForm = false;
      error = '';
      isLoading = false;
    } catch (err) {
      console.error('Error joining divi:', err);
      error = 'Error joining divi. Please try again.';
      isLoading = false;
    }
  }
  
  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this divi? This action cannot be undone and all data will be permanently deleted.')) {
      return;
    }
    
    try {
      isDeleting = true;
      const success = await deleteGame(gameId);
      
      if (success) {
        // Clear the game from local storage
        localStorage.removeItem(`divi_games_${gameId}`);
        // Redirect to home page
        goto('/');
      } else {
        error = 'Failed to delete the divi. Please try again.';
      }
    } catch (err) {
      console.error('Error deleting divi:', err);
      error = 'Error deleting divi. Please try again.';
    } finally {
      isDeleting = false;
    }
  }
  
  function handleSkipTurn() {
    // Only skip if the game is not paused
    if (!isGamePaused) {
      gameStore.skipTurn();
    }
  }
  
  function toggleAutoSkip() {
    // Update the game store
    gameStore.toggleAutoSkip($gameStore.playerName);
    
    // The local state will be updated by the reactive statement above
    // This ensures consistency between the UI and the game state
  }
  
  function handleContinue() {
    // Reset auto-skip for all participants
    if ($gameStore.participants) {
      $gameStore.participants.forEach((participant: { name: string }) => {
        if (participant.name !== $gameStore.playerName) {
          gameStore.toggleAutoSkip(participant.name);
        }
      });
    }
    
    // Reset the game state
    showAutoSkipMessage = false;
    isGamePaused = false;
    
    // Force a skip to move to the next player
    setTimeout(() => {
      gameStore.skipTurn();
    }, 500);
  }
  
  // Auto-skip logic
  $: if ($isCurrentPlayersTurn && isAutoSkipEnabled && !isGamePaused) {
    // Use setTimeout to avoid immediate execution which might cause issues
    setTimeout(() => {
      if (!isGamePaused) { // Double-check that the game is still not paused
        handleSkipTurn();
      }
    }, 1000); // Wait 1 second before auto-skipping
  }
</script>

<div class="container max-w-6xl mx-auto p-4">
  {#if isLoading}
    <div class="p-8 text-center">
      <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p class="text-dark">Loading divi...</p>
    </div>
  {:else if error}
    <div class="bg-light border border-primary text-primary px-4 py-3 rounded">
      <p>{error}</p>
      <div class="mt-4">
        <a href="/" class="text-primary hover:text-secondary underline">Return to home</a>
      </div>
    </div>
  {:else if showJoinForm}
    <JoinGame gameId={gameId} onJoin={handleJoin} />
  {:else}
    <div class="flex justify-between items-center mb-8">
      <img src="/Banner_final.png" alt="Divi" style="width: 100px; height: auto;" />
      
      <div class="flex items-center gap-4">
        <div class="text-dark">
          Playing as: <span class="font-semibold">{$gameStore.playerName}</span>
        </div>
        
        {#if $gameStore.participants && $gameStore.participants.some((p: { name: string; isOrganizer?: boolean }) => p.name === $gameStore.playerName && p.isOrganizer)}
          <div class="flex gap-2">
            <a 
              href="/game/{gameId}/edit"
              class="px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary"
            >
              Edit Divi
            </a>
            <button 
              on:click={handleDelete}
              class="px-4 py-2 text-white rounded-md disabled:opacity-50"
              style="background-color: #F59E0B;"
              on:mouseover={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
              on:mouseout={(e) => e.currentTarget.style.backgroundColor = '#F59E0B'}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'End Divi'}
            </button>
          </div>
        {/if}
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column - Items -->
      <div class="lg:col-span-2 space-y-8">
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4 text-dark">
            {#if isGamePaused}
              Game Paused - Waiting for organizer action
            {:else if $isCurrentPlayersTurn}
              Your Turn - Choose an Item
            {:else}
              Available Items
            {/if}
          </h2>
          
          <div class="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {#if $isCurrentPlayersTurn && !isGamePaused}
              <button 
                on:click={handleSkipTurn}
                class="px-4 py-2 text-white rounded-md"
                style="background-color: #7D4FFF;"
                on:mouseover={(e) => e.currentTarget.style.backgroundColor = '#B89CFF'}
                on:mouseout={(e) => e.currentTarget.style.backgroundColor = '#7D4FFF'}
              >
                Skip Turn
              </button>
            {/if}
            
            <label class="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                bind:checked={autoSkip} 
                on:change={toggleAutoSkip}
                class="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span class="text-dark">Auto-skip my turns</span>
            </label>
          </div>
          
          <ItemList 
            items={$availableItems} 
            showActions={false}
            allowPicking={$isCurrentPlayersTurn && !isGamePaused}
            currentPlayerName={$gameStore.playerName}
          />
        </div>
        
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4 text-dark">Already Picked</h2>
          <ItemList 
            items={$gameStore.items?.filter((item: { pickedBy: string | undefined }) => item.pickedBy) || []} 
            showActions={false}
          />
        </div>
      </div>
      
      <!-- Right Column - Status -->
      <div class="space-y-8">
        <GameStatus currentPlayerName={$gameStore.playerName} />
        
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <ParticipantList 
            participants={$gameStore.participants || []} 
            canEdit={false}
            showTurnIndicator={true}
          />
        </div>

        <div class="text-sm text-dark/70 flex justify-center">
          <ExpiryTimer />
        </div>
      </div>
    </div>
  {/if}

  {#if !isLoading && !error && !showJoinForm}
    <div class="mt-8 text-center text-sm text-dark/70">
      <p>Divi ID: {gameId}</p>
    </div>
  {/if}
  
  {#if showAutoSkipMessage}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-semibold mb-4 text-dark">All participants have opted to skip</h3>
        <p class="mb-6 text-dark">Please choose an action:</p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            on:click={handleContinue}
            class="px-4 py-2 text-white rounded-md"
            style="background-color: #7D4FFF;"
            on:mouseover={(e) => e.currentTarget.style.backgroundColor = '#B89CFF'}
            on:mouseout={(e) => e.currentTarget.style.backgroundColor = '#7D4FFF'}
          >
            Continue
          </button>
          
          <button 
            on:click={handleDelete}
            class="px-4 py-2 text-white rounded-md"
            style="background-color: #F59E0B;"
            on:mouseover={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
            on:mouseout={(e) => e.currentTarget.style.backgroundColor = '#F59E0B'}
          >
            End Divi
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>