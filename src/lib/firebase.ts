import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { collection, doc, getFirestore, setDoc } from 'firebase/firestore'
import { uploadDrawingImage } from './cloudinary'
import type { AIResult, TrailPoint } from '../types'

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
      'Copy .env.example to .env.local and fill in the Firebase web app settings.',
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
  trail: TrailPoint[],
  imageBase64: string,
  result: AIResult,
): Promise<{ imagePublicId: string }> {
  const drawingRef = doc(collection(db, 'drawings'))
  const image = await uploadDrawingImage(imageBase64)

  await setDoc(drawingRef, {
    uid,
    theme,
    trail,
    imagePublicId: image.publicId,
    result,
    createdAt: Date.now(),
  })

  return { imagePublicId: image.publicId }
}
