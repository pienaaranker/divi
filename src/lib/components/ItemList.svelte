<script lang="ts">
  import { gameStore, type Item } from '$lib/stores/gameStore';
  
  export let items: Item[] = [];
  export let showActions = true;
  export let allowPicking = false;
  export let currentPlayerName = '';
  
  let editingItem: Item | null = null;
  let viewMode: 'card' | 'list' = 'card';
  
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
  <div class="mb-4 flex justify-end">
    <div class="inline-flex rounded-md shadow-sm" role="group">
      <button
        type="button"
        class="px-3 py-2 text-sm font-medium rounded-l-md border"
        class:bg-primary={viewMode === 'card'}
        class:text-white={viewMode === 'card'}
        class:bg-light={viewMode !== 'card'}
        class:text-dark={viewMode !== 'card'}
        on:click={() => viewMode = 'card'}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
      <button
        type="button"
        class="px-3 py-2 text-sm font-medium rounded-r-md border"
        class:bg-primary={viewMode === 'list'}
        class:text-white={viewMode === 'list'}
        class:bg-light={viewMode !== 'list'}
        class:text-dark={viewMode !== 'list'}
        on:click={() => viewMode = 'list'}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  </div>

  {#if viewMode === 'card'}
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
  {:else}
    <div class="space-y-2">
      {#each items as item (item.id)}
        <div class="border rounded-lg p-4 flex items-center gap-4" class:opacity-75={item.pickedBy}>
          {#if item.imageUrl}
            <img src={item.imageUrl} alt={item.name} class="w-16 h-16 object-cover rounded" />
          {:else}
            <div class="w-16 h-16 bg-light flex items-center justify-center rounded">
              <span class="text-dark text-sm">No Image</span>
            </div>
          {/if}
          
          <div class="flex-1">
            <h3 class="font-bold text-lg text-dark">{item.name}</h3>
            
            {#if item.description}
              <p class="text-dark text-sm mt-1">{item.description}</p>
            {/if}
            
            {#if item.pickedBy}
              <div class="mt-1 inline-block px-2 py-1 bg-light text-primary text-sm rounded-full">
                Picked by: {item.pickedBy}
              </div>
            {/if}
          </div>
          
          <div class="flex items-center gap-2">
            {#if showActions && !item.pickedBy}
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
      {/each}
    </div>
  {/if}
{/if}