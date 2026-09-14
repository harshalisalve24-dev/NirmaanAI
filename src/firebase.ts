// Firebase initialization for NirmaanAI
// Config values are loaded from .env.local (gitignored).
// Only the web SDK is used — never the Admin SDK.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;

const firebaseConfig = {
  apiKey: apiKey || "AIzaSyDVPWZxZnsEvOW2NtPgTQy6w4avlVNzujc",
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || "nirmaanai-40ae5.firebaseapp.com",
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "nirmaanai-40ae5",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || "nirmaanai-40ae5.firebasestorage.app",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "895542994776",
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || "1:895542994776:web:e4cb366088a1049306672d",
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || "G-W2W6SJCPK9",
};

let app: FirebaseApp;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn("[NirmaanAI] Firebase initializeApp fallback:", e);
  app = getApps().length > 0 ? getApp() : initializeApp({ apiKey: "AIzaSyDummyKeyForDevEnvironment1234567890", projectId: "nirmaan-ai" });
}

// Firestore instance — used by all project service functions.
export const db: Firestore = getFirestore(app);

// Firebase Auth instance — safely initialized from app.
let authInstance: Auth | null = null;
try {
  authInstance = getAuth(app);
} catch (e) {
  console.warn("[NirmaanAI] Firebase Auth initialization warning:", e);
}

export const auth = authInstance;
export const isFirebaseAuthConfigured = Boolean(authInstance);

export default app;
