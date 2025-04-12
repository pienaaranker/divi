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
      
      // Prepare item data
      const itemData = {
        name: name.trim(),
        ...(description && { description: description.trim() }),
        ...(imageUrl && { imageUrl: imageUrl.trim() })
      };
      
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
    <div class="bg-light border border-primary text-primary px-4 py-3 rounded">
      <p>{error}</p>
    </div>
  {/if}

  <div>
    <label for="name" class="block text-sm font-medium text-dark">Item Name</label>
    <input
      type="text"
      id="name"
      bind:value={name}
      required
      class="w-full px-3 py-2 border rounded-md bg-light text-dark"
      placeholder="Enter item name"
      disabled={isSubmitting}
    />
  </div>
  
  <div>
    <label for="description" class="block text-sm font-medium text-dark">Description (Optional)</label>
    <textarea
      id="description"
      bind:value={description}
      class="w-full px-3 py-2 border rounded-md bg-light text-dark"
      placeholder="Enter item description"
      rows="3"
      disabled={isSubmitting}
    ></textarea>
  </div>
  
  <div>
    <label for="imageUrl" class="block text-sm font-medium text-dark">Image URL (Optional)</label>
    <input
      type="url"
      id="imageUrl"
      bind:value={imageUrl}
      class="w-full px-3 py-2 border rounded-md bg-light text-dark"
      placeholder="https://example.com/image.jpg"
      disabled={isSubmitting}
    />
  </div>
  
  <div class="flex justify-end space-x-2">
    {#if editItem}
      <button 
        type="button" 
        on:click={() => dispatch('close')}
        class="px-4 py-2 text-dark bg-light rounded-md hover:bg-cool-gray"
        disabled={isSubmitting}
      >
        Cancel
      </button>
    {/if}
    <button 
      type="submit" 
      class="px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary disabled:bg-soft-lilac"
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