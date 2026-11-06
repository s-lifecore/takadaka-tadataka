import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missingConfig.length > 0) {
  throw new Error(
    `Firebase configuration is missing: ${missingConfig.join(', ')}. ` +
      'Copy .env.example to .env.prev.local and fill in the Firebase web app settings, and start Vite with --mode prev.',
  )
}

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

let signInPromise: Promise<User> | null = null

export async function signInAnon() {
  if (auth.currentUser) return auth.currentUser

  signInPromise ??= signInAnonymously(auth)
    .then(({ user }) => user)
    .finally(() => {
      signInPromise = null
    })

  return signInPromise
}
