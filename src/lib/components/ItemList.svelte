<script lang="ts">
  import { gameStore, type Item } from '$lib/stores/gameStore';
  
  export let items: Item[] = [];
  export let showActions = true;
  export let allowPicking = false;
  export let currentPlayerName = '';
  
  let editingItem: Item | null = null;
  
  function handleEdit(item: Item) {
    editingItem = item;
  }
  
  function handleDelete(itemId: string) {
    if (confirm('Are you sure you want to delete this item?')) {
      gameStore.deleteItem(itemId);
    }
  }
  
  function handlePick(itemId: string) {
    gameStore.pickItem(currentPlayerName, itemId);
  }
  
  import ItemForm from './ItemForm.svelte';
</script>

{#if editingItem}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-lg">
      <h2 class="text-xl font-bold mb-4 text-dark">Edit Item</h2>
      <ItemForm 
        editItem={editingItem} 
        on:close={() => editingItem = null} 
      />
    </div>
  </div>
{/if}

{#if items.length === 0}
  <div class="p-4 text-center text-dark">
    No items available.
  </div>
{:else}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each items as item (item.id)}
      <div class="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow" class:opacity-75={item.pickedBy}>
        {#if item.imageUrl}
          <img src={item.imageUrl} alt={item.name} class="w-full h-48 object-cover" />
        {:else}
          <div class="w-full h-48 bg-light flex items-center justify-center">
            <span class="text-dark text-xl">No Image</span>
          </div>
        {/if}
        
        <div class="p-4">
          <h3 class="font-bold text-lg text-dark">{item.name}</h3>
          
          {#if item.description}
            <p class="text-dark mt-1">{item.description}</p>
          {/if}
          
          {#if item.pickedBy}
            <div class="mt-2 inline-block px-2 py-1 bg-light text-primary text-sm rounded-full">
              Picked by: {item.pickedBy}
            </div>
          {/if}
          
          <div class="mt-4 flex justify-between">
            {#if showActions && !item.pickedBy}
              <div class="space-x-2">
                <button 
                  on:click={() => handleEdit(item)}
                  class="px-3 py-1 text-xs text-primary border border-primary rounded-md hover:bg-light"
                >
                  Edit
                </button>
                <button 
                  on:click={() => handleDelete(item.id)}
                  class="px-3 py-1 text-xs text-deep-indigo border border-deep-indigo rounded-md hover:bg-light"
                >
                  Delete
                </button>
              </div>
            {/if}
            
            {#if allowPicking && !item.pickedBy}
              <button 
                on:click={() => handlePick(item.id)}
                class="px-3 py-1 text-xs text-white bg-primary rounded-md hover:bg-secondary"
              >
                Pick Item
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}