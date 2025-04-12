<script lang="ts">
  import { gameStore, currentTurn, type Participant } from '$lib/stores/gameStore';
  
  export let participants: Participant[] = [];
  export let canEdit = true;
  export let showTurnIndicator = false;
  
  let newParticipantName = '';
  let draggedParticipant: Participant | null = null;
  let dragOverParticipant: Participant | null = null;
  
  function addParticipant() {
    if (newParticipantName.trim()) {
      gameStore.addParticipant(newParticipantName.trim());
      newParticipantName = '';
    }
  }
  
  function removeParticipant(name: string) {
    gameStore.removeParticipant(name);
  }

  function handleDragStart(event: DragEvent, participant: Participant) {
    if (!event.dataTransfer) return;
    draggedParticipant = participant;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', participant.name);
    
    // Add dragging class to the element
    const target = event.target as HTMLElement;
    target.classList.add('opacity-50');
  }

  function handleDragEnd(event: DragEvent) {
    draggedParticipant = null;
    dragOverParticipant = null;
    
    // Remove dragging class from all elements
    document.querySelectorAll('.participant-item').forEach(el => {
      el.classList.remove('opacity-50', 'border-primary');
    });
  }

  function handleDragOver(event: DragEvent, participant: Participant) {
    event.preventDefault();
    if (!draggedParticipant || draggedParticipant.name === participant.name) return;
    
    dragOverParticipant = participant;
    event.dataTransfer!.dropEffect = 'move';
  }

  function handleDrop(event: DragEvent, targetParticipant: Participant) {
    event.preventDefault();
    if (!draggedParticipant || !event.dataTransfer) return;
    
    const draggedName = event.dataTransfer.getData('text/plain');
    if (draggedName === targetParticipant.name) return;
    
    // Reorder participants
    const newParticipants = [...participants];
    const draggedIndex = newParticipants.findIndex(p => p.name === draggedName);
    const targetIndex = newParticipants.findIndex(p => p.name === targetParticipant.name);
    
    // Remove dragged participant and insert at new position
    const [dragged] = newParticipants.splice(draggedIndex, 1);
    newParticipants.splice(targetIndex, 0, dragged);
    
    // Update the store with new order
    gameStore.reorderParticipants(newParticipants);
    
    draggedParticipant = null;
    dragOverParticipant = null;
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
        <li 
          class="p-4 flex justify-between items-center participant-item"
          class:bg-light={showTurnIndicator && $currentTurn.participant?.name === participant.name}
          class:border-primary={dragOverParticipant?.name === participant.name}
          class:cursor-move={canEdit}
          draggable={canEdit}
          on:dragstart={(e) => handleDragStart(e, participant)}
          on:dragend={handleDragEnd}
          on:dragover={(e) => handleDragOver(e, participant)}
          on:drop={(e) => handleDrop(e, participant)}
        >
          <div class="flex items-center gap-2">
            {#if canEdit}
              <svg 
                class="w-4 h-4 text-dark opacity-50" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="2" 
                  d="M4 8h16M4 16h16"
                />
              </svg>
            {/if}
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

<style>
  .participant-item {
    transition: all 0.2s ease;
  }
  
  .participant-item:hover {
    background-color: var(--color-light);
  }
  
  .participant-item.border-primary {
    border: 2px solid var(--color-primary);
  }
</style>