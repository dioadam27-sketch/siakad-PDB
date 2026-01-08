
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Konfigurasi Firebase Anda
// PENTING: Salin config object dari Firebase Console -> Project Settings -> General -> Your apps
export const firebaseConfig = {
  // Ganti nilai-nilai di bawah ini dengan config asli dari Firebase Console Anda
  apiKey: "AIzaSy...", 
  authDomain: "project-pdb.firebaseapp.com",
  projectId: "project-pdb",
  storageBucket: "project-pdb.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor instance database untuk digunakan di seluruh aplikasi
export const db = getFirestore(app);

// --- CHECKPOINT RESTORE (OFFLINE PERSISTENCE) ---
// Ini memungkinkan aplikasi bekerja offline dan memuat data instan saat refresh
enableIndexedDbPersistence(db)
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a a time.
          console.warn('Firestore Persistence: Multiple tabs open, persistence disabled in this tab.');
      } else if (err.code == 'unimplemented') {
          // The current browser does not support all of the features required to enable persistence
          console.warn('Firestore Persistence: Browser not supported.');
      }
  });

export const isFirebaseConfigValid = true;
