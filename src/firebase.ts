// Firebase initialization for NirmaanAI
// Config values are loaded from .env.local (gitignored).
// Only the web SDK is used — never the Admin SDK.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;

const firebaseConfig = {
  apiKey: apiKey || "AIzaSyDummyKeyForDevEnvironment1234567890",
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || "nirmaan-ai.firebaseapp.com",
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "nirmaan-ai",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || "nirmaan-ai.appspot.com",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "123456789",
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || "1:123456789:web:abcdef123456",
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || "",
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

// Firebase Auth instance — safely initialized so missing env vars don't crash the bundle.
let authInstance: Auth | null = null;
try {
  if (apiKey) {
    authInstance = getAuth(app);
  }
} catch (e) {
  console.warn("[NirmaanAI] Firebase Auth initialization warning:", e);
}

export const auth = authInstance;
export const isFirebaseAuthConfigured = Boolean(apiKey && authInstance);

export default app;
