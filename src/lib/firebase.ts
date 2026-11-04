import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getFirestore, updateDoc } from 'firebase/firestore'
import { uploadDrawingImage } from './cloudinary'
import type { AIResult } from '../types'

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

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

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

export async function saveDrawing(
  uid: string,
  theme: string,
  imageBase64: string,
  result: AIResult,
  drawingId: string,
): Promise<{ imagePublicId: string }> {
  const drawingRef = doc(db, 'drawings', drawingId)
  const image = await uploadDrawingImage(imageBase64)

  await updateDoc(drawingRef, {
    uid,
    theme,
    imagePublicId: image.publicId,
    result,
  })

  return { imagePublicId: image.publicId }
}
