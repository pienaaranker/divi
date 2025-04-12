<script lang="ts">
  import { gameStore, type Item } from '$lib/stores/gameStore';
  import { createEventDispatcher } from 'svelte';
  
  export let editItem: Partial<Item> | null = null;
  
  let name = editItem?.name || '';
  let description = editItem?.description || '';
  let imageUrl = editItem?.imageUrl || '';
  let isSubmitting = false;
  let error = '';
  
  const dispatch = createEventDispatcher();
  
  async function handleSubmit() {
    if (!name.trim()) return;
    
    try {
      isSubmitting = true;
      error = '';
      
      // Prepare item data, filtering out undefined values
      const itemData: Record<string, any> = { name };
      
      if (description) itemData.description = description;
      if (imageUrl) itemData.imageUrl = imageUrl;
      
      if (editItem?.id) {
        gameStore.updateItem(editItem.id, itemData);
      } else {
        gameStore.addItem(itemData);
      }
      
      // Reset form
      name = '';
      description = '';
      imageUrl = '';
      
      if (editItem) {
        editItem = null;
        dispatch('close');
      }
    } catch (err) {
      console.error('Error saving item:', err);
      error = 'Failed to save item. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <p>{error}</p>
    </div>
  {/if}

  <div>
    <label for="name" class="block text-sm font-medium">Item Name</label>
    <input
      type="text"
      id="name"
      bind:value={name}
      required
      class="w-full px-3 py-2 border rounded-md"
      placeholder="Enter item name"
      disabled={isSubmitting}
    />
  </div>
  
  <div>
    <label for="description" class="block text-sm font-medium">Description (Optional)</label>
    <textarea
      id="description"
      bind:value={description}
      class="w-full px-3 py-2 border rounded-md"
      placeholder="Enter item description"
      rows="3"
      disabled={isSubmitting}
    ></textarea>
  </div>
  
  <div>
    <label for="imageUrl" class="block text-sm font-medium">Image URL (Optional)</label>
    <input
      type="url"
      id="imageUrl"
      bind:value={imageUrl}
      class="w-full px-3 py-2 border rounded-md"
      placeholder="https://example.com/image.jpg"
      disabled={isSubmitting}
    />
  </div>
  
  <div class="flex justify-end space-x-2">
    {#if editItem}
      <button 
        type="button" 
        on:click={() => dispatch('close')}
        class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
        disabled={isSubmitting}
      >
        Cancel
      </button>
    {/if}
    <button 
      type="submit" 
      class="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
      disabled={isSubmitting}
    >
      {#if isSubmitting}
        <span>Saving...</span>
      {:else}
        <span>{editItem ? 'Update Item' : 'Add Item'}</span>
      {/if}
    </button>
  </div>
</form>