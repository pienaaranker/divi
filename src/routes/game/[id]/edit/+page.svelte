<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { gameStore, type GameState, type Participant } from '$lib/stores/gameStore';
  import ItemForm from '$lib/components/ItemForm.svelte';
  import ItemList from '$lib/components/ItemList.svelte';
  import ParticipantList from '$lib/components/ParticipantList.svelte';
  import GameStatus from '$lib/components/GameStatus.svelte';
  import { joinGame } from '$lib/firebase';
  import { browser } from '$app/environment';
  
  let isLoading = true;
  let error = '';
  let isOrganizer = false;
  let selectedParticipant = '';
  let isSaving = false;
  
  $: gameId = $page.params.id;
  
  onMount(async () => {
    if (browser) {
      try {
        // Check if the game exists
        const gameExists = await joinGame(gameId);
        
        if (!gameExists) {
          error = 'Game not found. Please check the URL and try again.';
          return;
        }
        
        // Set the game ID in the store
        gameStore.joinExistingGame(gameId);
        
        // Check if the user is the organizer
        isOrganizer = $gameStore.participants && 
                     $gameStore.participants.some((p: { name: string; isOrganizer?: boolean }) => p.name === $gameStore.playerName && p.isOrganizer);
        
        if (!isOrganizer) {
          error = 'You do not have permission to edit this game.';
          return;
        }
        
        // Set the initial selected participant to the current turn
        if ($gameStore.currentTurnIndex >= 0 && $gameStore.participants) {
          selectedParticipant = $gameStore.participants[$gameStore.currentTurnIndex].name;
        }
        
        isLoading = false;
      } catch (err) {
        console.error('Error loading game:', err);
        error = 'Error loading game. Please try again.';
        isLoading = false;
      }
    }
  });
  
  function setNextTurn(participantName: string) {
    selectedParticipant = participantName;
  }
  
  async function saveNextTurn() {
    if (!selectedParticipant) return;
    
    try {
      isSaving = true;
      
      const participantIndex = $gameStore.participants.findIndex((p: Participant) => p.name === selectedParticipant);
      if (participantIndex !== -1) {
        // Update the current turn index using the new method
        gameStore.setCurrentTurnIndex(participantIndex);
        
        alert('Next turn has been updated successfully!');
      }
    } catch (err) {
      console.error('Error saving next turn:', err);
      error = 'Error saving next turn. Please try again.';
    } finally {
      isSaving = false;
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
  {:else if !isOrganizer}
    <div class="bg-light border border-primary text-primary px-4 py-3 rounded">
      <p>You do not have permission to edit this divi.</p>
      <div class="mt-4">
        <a href="/game/{gameId}" class="text-primary hover:text-secondary underline">Return to divi</a>
      </div>
    </div>
  {:else}
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-dark">Edit Divi</h1>
      
      <div class="flex items-center gap-4">
        <div class="text-dark">
          Organizer: <span class="font-semibold">{$gameStore.playerName}</span>
        </div>
        
        <a 
          href="/game/{gameId}"
          class="px-6 py-2 text-white bg-primary rounded-md hover:bg-secondary"
        >
          Back to Divi
        </a>
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
          <h2 class="text-xl font-semibold mb-4 text-dark">Participants</h2>
          <ParticipantList participants={$gameStore.participants || []} canEdit={true} />
          
          {#if $gameStore.participants && $gameStore.participants.length > 0}
            <div class="mt-6">
              <h3 class="font-medium mb-2 text-dark">Set Next Turn</h3>
              <div class="space-y-3">
                <select 
                  class="w-full px-3 py-2 border rounded-md bg-light text-dark"
                  bind:value={selectedParticipant}
                >
                  {#each $gameStore.participants as participant}
                    <option value={participant.name}>
                      {participant.name}
                    </option>
                  {/each}
                </select>
                
                <button 
                  on:click={saveNextTurn}
                  class="w-full px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary disabled:bg-soft-lilac"
                  disabled={isSaving || !selectedParticipant}
                >
                  {isSaving ? 'Saving...' : 'Save Next Turn'}
                </button>
              </div>
            </div>
          {/if}
        </div>
        
        <GameStatus currentPlayerName={$gameStore.playerName} />
      </div>
    </div>
  {/if}
</div> 