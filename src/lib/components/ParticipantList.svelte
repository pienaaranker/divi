<script lang="ts">
  import { gameStore, currentTurn, type Participant } from '$lib/stores/gameStore';
  
  export let participants: Participant[] = [];
  export let canEdit = true;
  export let showTurnIndicator = false;
  
  let newParticipantName = '';
  
  function addParticipant() {
    if (newParticipantName.trim()) {
      gameStore.addParticipant(newParticipantName.trim());
      newParticipantName = '';
    }
  }
  
  function removeParticipant(name: string) {
    gameStore.removeParticipant(name);
  }
</script>

<div class="space-y-4">
  <h2 class="text-xl font-semibold text-dark">Participants</h2>
  
  {#if canEdit}
    <form on:submit|preventDefault={addParticipant} class="flex gap-2">
      <input
        type="text"
        bind:value={newParticipantName}
        placeholder="Enter participant name"
        class="flex-1 px-3 py-2 border rounded-md bg-light text-dark"
      />
      <button 
        type="submit" 
        class="px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary"
      >
        Add
      </button>
    </form>
  {/if}
  
  {#if participants.length === 0}
    <div class="p-4 text-center text-dark border rounded-md">
      No participants added yet.
    </div>
  {:else}
    <ul class="divide-y border rounded-md overflow-hidden">
      {#each participants as participant (participant.name)}
        <li class="p-4 flex justify-between items-center" class:bg-light={showTurnIndicator && $currentTurn.participant?.name === participant.name}>
          <div>
            <span class="font-medium text-dark">{participant.name}</span>
            {#if participant.isOrganizer}
              <span class="ml-2 text-sm text-primary font-medium">
                (Organizer)
              </span>
            {/if}
            {#if participant.itemsPicked.length > 0}
              <span class="ml-2 text-sm text-dark">
                ({participant.itemsPicked.length} item{participant.itemsPicked.length !== 1 ? 's' : ''} picked)
              </span>
            {/if}
            
            {#if showTurnIndicator && $currentTurn.participant?.name === participant.name}
              <span class="ml-2 text-sm text-primary font-medium">
                Current Turn
              </span>
            {/if}
          </div>
          
          {#if canEdit}
            <button 
              on:click={() => removeParticipant(participant.name)}
              class="text-deep-indigo hover:text-secondary"
              aria-label="Remove participant"
            >
              &times;
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>