
import { initializeApp } from "firebase/app";
import { 
  enableIndexedDbPersistence, 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED 
} from "firebase/firestore";

const env = (window as any).process.env;

const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID
};

/**
 * Validasi: Pengecekan apakah placeholder sudah diganti.
 * Menggunakan string unik dari siakadpdb untuk memastikan sudah terisi.
 */
export const isFirebaseConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "MASUKKAN_API_KEY_DISINI" && 
  firebaseConfig.projectId === "siakadpdb";

let dbInstance: any = null;

if (isFirebaseConfigValid) {
  try {
    const app = initializeApp(firebaseConfig);
    dbInstance = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    });

    // Mengaktifkan penyimpanan lokal (Offline Support)
    if (typeof window !== "undefined") {
      enableIndexedDbPersistence(dbInstance).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firestore Persistence: Gagal karena banyak tab terbuka.");
        } else if (err.code === 'unimplemented') {
          console.warn("Firestore Persistence: Browser tidak mendukung.");
        }
      });
    }
  } catch (e) {
    console.error("Firebase Initialization Error:", e);
  }
}

export const db = dbInstance;
