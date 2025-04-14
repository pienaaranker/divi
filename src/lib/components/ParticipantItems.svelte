<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import ItemList from './ItemList.svelte';
  import type { Participant, Item } from '$lib/stores/gameStore';
  
  // Get items grouped by participant
  $: participantItems = $gameStore.participants?.map((participant: Participant) => {
    return {
      participant,
      items: $gameStore.items?.filter((item: Item) => item.pickedBy === participant.name) || []
    };
  }) || [];
  
  // Check if any participant has items
  $: hasPickedItems = participantItems.some(({ items }: { items: Item[] }) => items.length > 0);
</script>

<div class="space-y-6">
  {#if hasPickedItems}
    {#each participantItems as { participant, items }}
      {#if items.length > 0}
        <div class="bg-white border rounded-lg p-6 shadow-sm">
          <h3 class="text-lg font-semibold mb-4 text-dark">
            {participant.name}'s Items
          </h3>
          <ItemList 
            items={items} 
            showActions={false}
            allowPicking={false}
          />
        </div>
      {/if}
    {/each}
  {:else}
    <div class="bg-white border rounded-lg p-6 shadow-sm text-center">
      <p class="text-dark">No items have been picked yet.</p>
    </div>
  {/if}
</div> 