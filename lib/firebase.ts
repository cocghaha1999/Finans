"use client"

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore"
import { getAuth, type Auth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth"

function getConfigFromEnv() {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  }
  const missing = Object.entries(cfg).filter(([, v]) => !v)
  if (missing.length) return null
  return cfg as Required<typeof cfg>
}

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let googleProvider: GoogleAuthProvider | null = null
let githubProvider: GithubAuthProvider | null = null

const cfg = getConfigFromEnv()
if (cfg) {
  try {
    app = getApps().length ? getApp() : initializeApp(cfg)
    db = getFirestore(app)
  auth = getAuth(app)
  googleProvider = new GoogleAuthProvider()
  githubProvider = new GithubAuthProvider()
    if (typeof window !== "undefined") {
      // Enable offline persistence when possible; ignore failures (e.g., multiple tabs)
      enableIndexedDbPersistence(db).catch(() => void 0)
    }
  } catch (e) {
    // If Firebase initialization fails, expose null and allow fallback to localStorage
    app = null
    db = null
  auth = null
  }
}

export { app, db, auth, googleProvider, githubProvider }
