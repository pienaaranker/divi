<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { gameStore, availableItems, currentTurn, isCurrentPlayersTurn } from '$lib/stores/gameStore';
  import { features } from '$lib/stores/featureStore';
  import JoinGame from '$lib/components/JoinGame.svelte';
  import ItemList from '$lib/components/ItemList.svelte';
  import GameStatus from '$lib/components/GameStatus.svelte';
  import ParticipantList from '$lib/components/ParticipantList.svelte';
  import ParticipantItems from '$lib/components/ParticipantItems.svelte';
  import ExpiryTimer from '$lib/components/ExpiryTimer.svelte';
  import { joinGame, isParticipantNameTaken, deleteGame } from '$lib/firebase';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import type { Item, Participant } from '$lib/stores/gameStore';
  
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
    if (!confirm('Are you sure you want to end this divi? This will mark it as completed and no more items can be picked.')) {
      return;
    }
    
    try {
      isDeleting = true;
      // Instead of deleting, complete the game
      gameStore.completeGame();
      isDeleting = false;
    } catch (err) {
      console.error('Error completing divi:', err);
      error = 'Error completing divi. Please try again.';
      isDeleting = false;
    }
  }
  
  function handleSkipTurn() {
    // Only skip if the game is not paused
    if (!isGamePaused) {
      console.log('Skipping turn...');
      console.log('Current turn index:', $gameStore.currentTurnIndex);
      console.log('Number of participants:', $gameStore.participants?.length);
      gameStore.skipTurn();
      console.log('Turn skipped. New turn index:', $gameStore.currentTurnIndex);
    } else {
      console.log('Game is paused, cannot skip turn');
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
  
  // Format text for sharing
  function formatShareText() {
    const gameLink = gameStore.getShareableLink();
    let text = `Divi ${gameId}\nLink: ${gameLink}\n\n`;
    
    // Add unpicked items
    const unpickedItems = $gameStore.items?.filter((item: Item) => !item.pickedBy) || [];
    if (unpickedItems.length > 0) {
      text += 'Unpicked items:\n';
      unpickedItems.forEach((item: Item) => {
        text += `- ${item.name}\n`;
      });
      text += '\n';
    }
    
    // Add items for each participant
    $gameStore.participants?.forEach((participant: Participant) => {
      const participantItems = $gameStore.items?.filter((item: Item) => item.pickedBy === participant.name) || [];
      if (participantItems.length > 0) {
        text += `${participant.name}'s items:\n`;
        participantItems.forEach((item: Item) => {
          text += `- ${item.name}\n`;
        });
        text += '\n';
      }
    });
    
    return text;
  }
  
  async function shareResults() {
    if (browser) {
      const text = formatShareText();
      try {
        // Check if it's a mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile && navigator.share) {
          await navigator.share({
            title: `Divi ${gameId} Results`,
            text: text
          });
        } else {
          await navigator.clipboard.writeText(text);
          alert('Results copied to clipboard!');
        }
      } catch (err) {
        console.error('Error sharing:', err);
        // Fallback to clipboard if share fails
        await navigator.clipboard.writeText(text);
        alert('Results copied to clipboard!');
      }
    }
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
      <a href="/">
        <img src="/Banner_final.png" alt="Divi" style="width: 100px; height: auto;" />
      </a>
      
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
            {#if !$gameStore.completed}
              <button 
                on:click={handleDelete}
                class="px-4 py-2 text-white rounded-md disabled:opacity-50"
                style="background-color: #F59E0B;"
                on:mouseover={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
                on:mouseout={(e) => e.currentTarget.style.backgroundColor = '#F59E0B'}
                disabled={isDeleting}
              >
                {isDeleting ? 'Ending...' : 'End Divi'}
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column - Items -->
      <div class="lg:col-span-2 space-y-8">
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-dark">
              {#if $gameStore.completed}
                Completed Divi - Items
              {:else if isGamePaused}
                Game Paused - Waiting for organizer action
              {:else if $isCurrentPlayersTurn}
                Your Turn - Choose an Item
              {:else}
                Available Items
              {/if}
            </h2>
            
            {#if $gameStore.completed}
              <button 
                on:click={shareResults}
                class="px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary"
              >
                Share Results
              </button>
            {/if}
          </div>
          
          <div class="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {#if $isCurrentPlayersTurn && !isGamePaused && !$gameStore.completed}
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
            
            {#if !$gameStore.completed}
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  bind:checked={autoSkip} 
                  on:change={toggleAutoSkip}
                  class="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span class="text-dark">Auto-skip my turns</span>
              </label>
            {/if}
          </div>
          
          <ItemList 
            items={$availableItems} 
            showActions={false}
            allowPicking={$isCurrentPlayersTurn && !isGamePaused && !$gameStore.completed}
            currentPlayerName={$gameStore.playerName}
          />
        </div>
        
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4 text-dark">Picked Items</h2>
          <ParticipantItems />
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