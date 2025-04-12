import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';
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
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

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
    storage = getStorage(app);
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

/**
 * Compress an image file using Canvas
 */
async function compressImage(file: File, maxSizeMB: number = 5): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with quality adjustment
        let quality = 0.9;
        let blob: Blob;
        
        const tryCompress = () => {
          canvas.toBlob(
            (b) => {
              if (!b) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              blob = b;
              if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.1) {
                quality -= 0.1;
                tryCompress();
              } else {
                resolve(new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                }));
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        tryCompress();
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}

/**
 * Upload a file to Firebase Storage and return the download URL
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  if (!browser || !firebaseConfigured || !storage) {
    throw new Error('Firebase Storage is not configured');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  try {
    let fileToUpload = file;
    
    // If file is over 5MB, try to compress it
    if (file.size > 5 * 1024 * 1024) {
      try {
        fileToUpload = await compressImage(file);
        console.log('Image compressed:', {
          originalSize: file.size,
          compressedSize: fileToUpload.size,
          compressionRatio: ((file.size - fileToUpload.size) / file.size * 100).toFixed(2) + '%'
        });
      } catch (err) {
        console.error('Error compressing image:', err);
        throw new Error('Failed to compress image. Please try a smaller file.');
      }
    }

    // Create a storage reference
    const storageRef = ref(storage, path);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (err: any) {
    console.error('Error uploading file:', err);
    // Provide more specific error messages based on the error code
    if (err.code === 'storage/unauthorized') {
      throw new Error('Upload failed: Unauthorized access');
    } else if (err.code === 'storage/canceled') {
      throw new Error('Upload was canceled');
    } else if (err.code === 'storage/unknown') {
      throw new Error('Upload failed: Unknown error occurred');
    } else if (err.code === 'storage/invalid-checksum') {
      throw new Error('Upload failed: File corruption detected');
    } else if (err.code === 'storage/retry-limit-exceeded') {
      throw new Error('Upload failed: Network error, please try again');
    } else {
      throw new Error(`Upload failed: ${err.message || 'Unknown error'}`);
    }
  }
}