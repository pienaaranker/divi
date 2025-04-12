import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { derived, writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

// Helper function to remove undefined values from an object (Firestore doesn't accept undefined)
function removeUndefinedValues(obj: any): any {
  // For arrays, filter and clean each item
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item)).filter(item => item !== undefined);
  }
  
  // For objects, clean each property
  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      // Skip undefined values
      if (value === undefined) return acc;
      
      // Recursively clean nested objects/arrays
      acc[key] = removeUndefinedValues(value);
      return acc;
    }, {} as Record<string, any>);
  }
  
  // Return primitive values as is
  return obj;
}

// Check for Firebase configuration in environment variables
let firebaseConfigured = false;
let app = null;
let db = null;

try {
  // Firebase configuration from environment variables
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  // Check if the API key is set
  if (browser && firebaseConfig.apiKey && firebaseConfig.projectId) {
    console.log("Firebase config found, initializing Firebase");
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firebaseConfigured = true;
  } else {
    console.warn("Firebase configuration is missing or incomplete. Using local storage fallback.");
  }
} catch (err) {
  console.error("Error initializing Firebase:", err);
}

/**
 * Create a store that syncs with Firebase
 */
export function createFirebaseStore<T>(collectionPath: string, docId: string, initialData: T) {
  // Create loading state writable
  const isLoading: Writable<boolean> = writable(true);
  const store = writable<T>(initialData);

  // Skip Firestore operations during SSR or if Firebase isn't configured
  if (!browser || !firebaseConfigured || !db) {
    console.log("Using local storage fallback for store:", collectionPath, docId);
    
    // Use local storage as fallback
    if (browser) {
      const storageKey = `divi_${collectionPath}_${docId}`;
      
      try {
        // Try to load from local storage
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          store.set(JSON.parse(storedData));
        }
        
        // Subscribe to store changes to save to local storage
        const unsubscribe = store.subscribe(value => {
          if (value !== initialData) {
            localStorage.setItem(storageKey, JSON.stringify(value));
          }
        });
      } catch (err) {
        console.error("Error with local storage fallback:", err);
      }
    }
    
    // Set loading to false immediately
    setTimeout(() => isLoading.set(false), 100);
    
    return {
      subscribe: store.subscribe,
      set: (value: T) => {
        store.set(value);
      },
      update: (cb: (value: T) => T) => {
        store.update(cb);
      },
      isLoading
    };
  }

  // If Firebase is configured, proceed with Firestore operations
  console.log("Using Firebase store for:", collectionPath, docId);
  const docRef = doc(db, collectionPath, docId);
  
  // Load initial data
  getDoc(docRef).then((snapshot) => {
    if (snapshot.exists()) {
      console.log("Document exists, loading data");
      store.set(snapshot.data() as T);
    } else {
      console.log("Document doesn't exist, creating with initial data");
      // Document doesn't exist, create it with initial data
      const cleanData = removeUndefinedValues(initialData);
      setDoc(docRef, cleanData).catch(err => {
        console.error("Error creating document:", err);
      });
    }
    isLoading.set(false);
  }).catch(err => {
    console.error("Error loading document:", err);
    isLoading.set(false);
  });
  
  // Listen for changes
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      store.set(snapshot.data() as T);
    }
  }, (error) => {
    console.error("Snapshot listener error:", error);
  });
  
  // Clean up when all subscribers leave
  return {
    subscribe: store.subscribe,
    set: (value: T) => {
      // Clean the object by removing undefined values before saving to Firestore
      const cleanValue = removeUndefinedValues(value);
      setDoc(docRef, cleanValue).catch(err => {
        console.error("Error updating document:", err);
      });
    },
    update: (cb: (value: T) => T) => {
      store.update(currentValue => {
        const newValue = cb(currentValue);
        // Clean the object by removing undefined values before saving to Firestore
        const cleanValue = removeUndefinedValues(newValue);
        setDoc(docRef, cleanValue).catch(err => {
          console.error("Error updating document:", err);
        });
        return newValue;
      });
    },
    isLoading
  };
}

/**
 * Helper function to handle joining a game
 */
export async function joinGame(gameId: string): Promise<boolean> {
  if (!browser) return false;
  
  // If Firebase is not configured, use local storage
  if (!firebaseConfigured || !db) {
    console.log("Using local storage for joining game:", gameId);
    try {
      const storageKey = `divi_games_${gameId}`;
      const storedGame = localStorage.getItem(storageKey);
      return !!storedGame; // Return true if game exists in local storage
    } catch (err) {
      console.error("Error checking local storage for game:", err);
      return true; // Return true as fallback to allow user to proceed
    }
  }
  
  // If Firebase is configured, check Firestore
  try {
    console.log("Checking Firestore for game:", gameId);
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    return gameDoc.exists();
  } catch (err) {
    console.error("Error joining game:", err);
    return true; // Return true as fallback to allow user to proceed
  }
}

/**
 * Helper function to check if a participant name is already taken in a game
 */
export async function isParticipantNameTaken(gameId: string, name: string): Promise<boolean> {
  if (!browser) return false;
  
  // If Firebase is not configured, use local storage
  if (!firebaseConfigured || !db) {
    console.log("Using local storage for checking participant name:", name);
    try {
      const storageKey = `divi_games_${gameId}`;
      const storedGame = localStorage.getItem(storageKey);
      
      if (storedGame) {
        const game = JSON.parse(storedGame);
        return game.participants && game.participants.some((p: any) => p.name === name);
      }
      return false;
    } catch (err) {
      console.error("Error checking local storage for participant:", err);
      return false;
    }
  }
  
  // If Firebase is configured, check Firestore
  try {
    console.log("Checking Firestore for participant name:", name);
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (gameDoc.exists()) {
      const game = gameDoc.data();
      return game.participants && game.participants.some((p: any) => p.name === name);
    }
    return false;
  } catch (err) {
    console.error("Error checking participant name:", err);
    return false;
  }
}