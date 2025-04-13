import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { createFirebaseStore } from '$lib/firebase';

// Create a store for the donations feature flag
const donationsFeatureStore = createFirebaseStore<{ active: boolean }>(
  'features',
  'donations',
  { active: false }
);

// Create a derived store for easy access to feature flags
export const features = derived(
  donationsFeatureStore,
  $donationsFeatureStore => ({
    donations: $donationsFeatureStore.active
  })
); 