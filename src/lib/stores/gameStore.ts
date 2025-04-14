import { derived, get, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { createFirebaseStore } from '$lib/firebase';

export type Item = {
  id: string;
  name: string;
  description?: string;
  pickedBy?: string;
  imageUrl?: string;
};

export type Participant = {
  name: string;
  itemsPicked: string[];
  isOrganizer?: boolean;
  autoSkip?: boolean;
};

export type GameState = {
  id: string;
  items: Item[];
  participants: Participant[];
  currentTurnIndex: number;
  started: boolean;
  createdAt: number;
  expiryDate: number;  // Unix timestamp for when the game expires
};

// Generate a random ID
function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// For storing the current player's name in local storage
const PLAYER_KEY = 'divi_player_name';
const CURRENT_GAME_KEY = 'divi_current_game';

function createGameStore() {
  // Local writable store for the game ID
  const gameIdStore = writable<string>('');
  
  // Local store for the current player
  const playerNameStore = writable<string>(browser ? localStorage.getItem(PLAYER_KEY) || '' : '');
  playerNameStore.subscribe(value => {
    if (browser && value) {
      localStorage.setItem(PLAYER_KEY, value);
    }
  });
  
  // Track which game is currently active
  const activeGameId = writable<string>(browser ? localStorage.getItem(CURRENT_GAME_KEY) || '' : '');
  activeGameId.subscribe(value => {
    if (browser && value) {
      localStorage.setItem(CURRENT_GAME_KEY, value);
    }
  });
  
  // Loading state
  const isLoading = writable<boolean>(false);
  
  // The actual game state store - will be created when a game is joined or created
  let gameStateStore: any = null;
  
  // Default state for a new game - ensuring no undefined values
  const createDefaultState = (id: string): GameState => {
    const timestamp = Date.now();
    // Set expiry date to 30 days from creation by default
    const expiryDate = timestamp + (30 * 24 * 60 * 60 * 1000);
    return {
      id: id || generateId(), // Generate ID if none provided
      items: [],
      participants: [],
      currentTurnIndex: 0,
      started: false,
      createdAt: timestamp,
      expiryDate: expiryDate
    };
  };
  
  // Set up the game when an ID is provided
  let unsubscribe: any = null;
  
  gameIdStore.subscribe(gameId => {
    if (browser && gameId) {
      // Clean up previous subscription if any
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      
      // Create a new store for this game
      const defaultState = createDefaultState(gameId);
      gameStateStore = createFirebaseStore<GameState>('games', gameId, defaultState);
      
      // Set the active game in local storage
      activeGameId.set(gameId);
      
      // Subscribe to track loading state
      unsubscribe = gameStateStore.isLoading.subscribe((value: boolean) => {
        isLoading.set(value);
      });
    }
  });
  
  // The combined store with all the game methods
  const store = {
    subscribe: (cb: any) => {
      // If no game is active, return an empty game state
      if (!gameStateStore) {
        const combined = derived(
          [gameIdStore, playerNameStore, isLoading],
          ([$gameId, $playerName, $isLoading]) => {
            return {
              ...createDefaultState(''),
              gameId: $gameId,
              playerName: $playerName,
              isLoading: $isLoading
            };
          }
        );
        return combined.subscribe(cb);
      }
      
      // Otherwise return the current game state combined with player info
      const combined = derived(
        [gameStateStore, playerNameStore, isLoading],
        ([$gameState, $playerName, $isLoading]) => {
          return {
            ...$gameState,
            playerName: $playerName,
            isLoading: $isLoading
          };
        }
      );
      return combined.subscribe(cb);
    },
    
    // Set the game ID
    setGameId: (id: string) => {
      gameIdStore.set(id);
    },
    
    // Set the player name
    setPlayerName: (name: string) => {
      playerNameStore.set(name);
    },
    
    // Item Management
    addItem: (item: Omit<Item, 'id'>) => {
      if (!gameStateStore) return;
      
      // Create a new item with only defined values
      const newItem: Item = {
        id: generateId(),
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        ...(item.imageUrl ? { imageUrl: item.imageUrl } : {})
      };
      
      gameStateStore.update((state: GameState) => {
        return {
          ...state,
          items: [...state.items, newItem]
        };
      });
    },

    updateItem: (id: string, updates: Partial<Item>) => {
      if (!gameStateStore) return;
      
      // Create updates object with only defined values
      const cleanUpdates: Partial<Item> = {};
      if (updates.name !== undefined) cleanUpdates.name = updates.name;
      if (updates.description !== undefined) cleanUpdates.description = updates.description;
      if (updates.imageUrl !== undefined) cleanUpdates.imageUrl = updates.imageUrl;
      if (updates.pickedBy !== undefined) cleanUpdates.pickedBy = updates.pickedBy;
      
      gameStateStore.update((state: GameState) => {
        return {
          ...state,
          items: state.items.map(item => 
            item.id === id ? { ...item, ...cleanUpdates } : item
          )
        };
      });
    },

    deleteItem: (id: string) => {
      if (!gameStateStore) return;
      
      gameStateStore.update((state: GameState) => {
        return {
          ...state,
          items: state.items.filter(item => item.id !== id)
        };
      });
    },

    // Participant Management
    addParticipant: (name: string, isOrganizer: boolean = false) => {
      if (!gameStateStore || !name) return;
      
      gameStateStore.update((state: GameState) => {
        // Check if participant already exists
        if (state.participants && state.participants.some(p => p.name === name)) {
          return state;
        }
        
        // Create participant with required fields
        const newParticipant: Participant = {
          name: name,
          itemsPicked: [],
          isOrganizer: isOrganizer,
          autoSkip: false // Explicitly initialize autoSkip to false
        };
        
        // If this is the organizer, insert at a random position
        if (isOrganizer) {
          const participants = [...(state.participants || [])];
          const randomIndex = Math.floor(Math.random() * (participants.length + 1));
          participants.splice(randomIndex, 0, newParticipant);
          
          return {
            ...state,
            participants
          };
        }
        
        // Otherwise, add to the end as before
        return {
          ...state,
          participants: [...(state.participants || []), newParticipant]
        };
      });
    },

    randomizeParticipants: () => {
      if (!gameStateStore) return;
      
      gameStateStore.update((state: GameState) => {
        if (!state.participants || state.participants.length <= 1) return state;
        
        // Create a copy of participants array
        const shuffledParticipants = [...state.participants];
        
        // Fisher-Yates shuffle algorithm
        for (let i = shuffledParticipants.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
        }
        
        return {
          ...state,
          participants: shuffledParticipants,
          currentTurnIndex: 0 // Reset turn index to first participant
        };
      });
    },

    reorderParticipants: (newOrder: Participant[]) => {
      if (!gameStateStore) return;
      
      gameStateStore.update((state: GameState) => {
        // Ensure we have all the same participants, just in a new order
        const currentParticipants = new Set(state.participants.map(p => p.name));
        const newParticipants = new Set(newOrder.map(p => p.name));
        
        if (currentParticipants.size !== newParticipants.size ||
            ![...currentParticipants].every(name => newParticipants.has(name))) {
          return state; // Don't update if the participants don't match exactly
        }
        
        return {
          ...state,
          participants: newOrder,
          currentTurnIndex: 0 // Reset turn index to first participant
        };
      });
    },

    removeParticipant: (name: string) => {
      if (!gameStateStore) return;
      
      gameStateStore.update((state: GameState) => {
        return {
          ...state,
          participants: state.participants.filter(p => p.name !== name)
        };
      });
    },

    // Game Flow
    startGame: () => {
      if (!gameStateStore) return;
      
      gameStateStore.update((state: GameState) => {
        return {
          ...state,
          started: true,
          currentTurnIndex: 0
        };
      });
    },

    pickItem: (participantName: string, itemId: string) => {
      if (!gameStateStore) return;
      
      gameStateStore.update((state: GameState) => {
        const currentTurn = state.currentTurnIndex;
        const currentParticipant = state.participants[currentTurn];
        
        // Check if it's this participant's turn
        if (currentParticipant?.name !== participantName) {
          return state;
        }
        
        // Update the item and participant
        const updatedItems = state.items.map(item => 
          item.id === itemId ? { ...item, pickedBy: participantName } : item
        );
        
        const updatedParticipants = state.participants.map(p => 
          p.name === participantName 
            ? { ...p, itemsPicked: [...p.itemsPicked, itemId] }
            : p
        );
        
        // Move to next turn
        const nextTurnIndex = (currentTurn + 1) % state.participants.length;
        
        return {
          ...state,
          items: updatedItems,
          participants: updatedParticipants,
          currentTurnIndex: nextTurnIndex
        };
      });
    },
    
    createNewGame: () => {
      const newGameId = generateId();
      gameIdStore.set(newGameId);
      return newGameId;
    },
    
    joinExistingGame: (gameId: string) => {
      gameIdStore.set(gameId);
    },
    
    // Get a shareable link for the current game
    getShareableLink: () => {
      const gameId = get(gameIdStore);
      if (browser && gameId) {
        return `${window.location.origin}/game/${gameId}`;
      }
      return '';
    },
    
    // Check if the current user is a participant in the game
    isUserParticipating: () => {
      if (!gameStateStore) return false;
      const state = get(gameStateStore);
      return state.participants.some(p => p.name === get(playerNameStore));
    },
    
    // Get the ID of the current game
    getCurrentGameId: () => {
      return get(gameIdStore);
    },
    
    // Update the current turn index
    setCurrentTurnIndex: (index: number) => {
      if (!gameStateStore) return;
      
      gameStateStore.update((state: GameState) => {
        return {
          ...state,
          currentTurnIndex: index
        };
      });
    },
    
    // Skip the current turn
    skipTurn: () => {
      if (!gameStateStore) return;
      
      gameStateStore.update((state: GameState) => {
        // Move to next turn
        const nextTurnIndex = (state.currentTurnIndex + 1) % state.participants.length;
        
        return {
          ...state,
          currentTurnIndex: nextTurnIndex
        };
      });
    },
    
    // Toggle auto-skip for a participant
    toggleAutoSkip: (participantName: string) => {
      if (!gameStateStore) return;
      
      gameStateStore.update((state: GameState) => {
        const updatedParticipants = state.participants.map(p => 
          p.name === participantName 
            ? { ...p, autoSkip: !p.autoSkip }
            : p
        );
        
        return {
          ...state,
          participants: updatedParticipants
        };
      });
    }
  };
  
  // If there's an active game stored in local storage, load it
  if (browser) {
    const storedGameId = localStorage.getItem(CURRENT_GAME_KEY);
    if (storedGameId) {
      gameIdStore.set(storedGameId);
    }
  }
  
  return store;
}

export const gameStore = createGameStore();

// Derived stores for frequently needed values
export const availableItems = derived(
  gameStore,
  $gameStore => ($gameStore.items || []).filter(item => !item.pickedBy)
);

export const pickedItems = derived(
  gameStore,
  $gameStore => ($gameStore.items || []).filter(item => item.pickedBy)
);

export const currentTurn = derived(
  gameStore,
  $gameStore => ({
    participant: $gameStore.participants?.[$gameStore.currentTurnIndex] || null,
    index: $gameStore.currentTurnIndex
  })
);

export const isGameActive = derived(
  gameStore,
  $gameStore => $gameStore.started && 
    $gameStore.participants?.length > 0 && 
    ($gameStore.items || []).some(item => !item.pickedBy)
);

// Calculate time remaining until game expiry
export const timeUntilExpiry = derived(
  gameStore,
  $gameStore => {
    if (!$gameStore.expiryDate) return null;
    
    const now = Date.now();
    const expiryDate = $gameStore.expiryDate;
    const timeRemaining = expiryDate - now;
    
    if (timeRemaining <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  }
);

export const isCurrentPlayersTurn = derived(
  [gameStore, currentTurn],
  ([$gameStore, $currentTurn]) => 
    $currentTurn.participant?.name === $gameStore.playerName
);