import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase Web App config (safe to be public in frontend)
const firebaseConfig = {
  apiKey: "AIzaSyChvDMZF4PjbZ4tQFHmDu2PGRVHzecXY8w",
  authDomain: "ai-draft-39e32.firebaseapp.com",
  projectId: "ai-draft-39e32",
  storageBucket: "ai-draft-39e32.firebasestorage.app",
  messagingSenderId: "304044927721",
  appId: "1:304044927721:web:00133926da4b752e579e78",
  measurementId: "G-39HS888095",
} as const;

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());

  // Note: We do NOT use enableIndexedDbPersistence here because the app has
  // its own sync-layer (Dexie/IndexedDB) that manages persistence.
  // Enabling Firestore SDK persistence would conflict with the manual sync
  // layer and can cause silent write failures.

  return _db;
}
