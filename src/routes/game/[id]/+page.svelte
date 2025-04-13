<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { gameStore, availableItems, currentTurn, isCurrentPlayersTurn } from '$lib/stores/gameStore';
  import JoinGame from '$lib/components/JoinGame.svelte';
  import ItemList from '$lib/components/ItemList.svelte';
  import GameStatus from '$lib/components/GameStatus.svelte';
  import ParticipantList from '$lib/components/ParticipantList.svelte';
  import { joinGame, isParticipantNameTaken } from '$lib/firebase';
  import { browser } from '$app/environment';
  
  let showJoinForm = true;
  let isLoading = true;
  let error = '';
  
  $: gameId = $page.params.id;
  
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
      <h1 class="text-3xl font-bold text-dark">Divi</h1>
      
      <div class="flex items-center gap-4">
        <div class="text-dark">
          Playing as: <span class="font-semibold">{$gameStore.playerName}</span>
        </div>
        
        {#if $gameStore.participants && $gameStore.participants.some((p: { name: string; isOrganizer?: boolean }) => p.name === $gameStore.playerName && p.isOrganizer)}
          <a 
            href="/game/{gameId}/edit"
            class="px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary"
          >
            Edit Divi
          </a>
        {/if}
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column - Items -->
      <div class="lg:col-span-2 space-y-8">
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold mb-4 text-dark">
            {$isCurrentPlayersTurn ? 'Your Turn - Choose an Item' : 'Available Items'}
          </h2>
          
          <ItemList 
            items={$availableItems} 
            showActions={false}
            allowPicking={$isCurrentPlayersTurn}
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
      </div>
    </div>
  {/if}

  {#if !isLoading && !error && !showJoinForm}
    <div class="mt-12 text-center max-w-2xl mx-auto">
      <p class="text-dark mb-4">
        This tool keeps things fair, simple, and private—no ads, no tracking. If that's worth a coffee to you, I'd be grateful!
      </p>
      <a 
        href="https://buymeacoffee.com/pienaaranker" 
        target="_blank" 
        rel="noopener noreferrer"
        style="background-color: #51c0b4;"
        class="inline-flex items-center px-6 py-3 text-lg font-medium text-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transform transition-all duration-200 hover:bg-[#45a99e]"
      >
        <span class="mr-2 text-xl">☕</span>
        Buy me a coffee
      </a>
    </div>
  {/if}
</div>