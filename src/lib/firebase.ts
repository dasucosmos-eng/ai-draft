import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
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
let _persistenceEnabled = false;

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

  // Enable Firestore offline persistence (IndexedDB) for instant refresh + offline.
  // If multiple tabs open, persistence may fail; that's okay.
  if (typeof window !== 'undefined' && !_persistenceEnabled) {
    _persistenceEnabled = true;
    enableIndexedDbPersistence(_db).catch((err) => {
      // Failed preconditions are expected in some cases (e.g. multiple tabs).
      console.warn('[firebase] Firestore persistence not enabled:', err?.code || err);
    });
  }

  return _db;
}
