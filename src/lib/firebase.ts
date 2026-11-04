import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import type { AIResult, TrailPoint } from '../types'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export async function signInAnon() {
  const { user } = await signInAnonymously(auth)
  return user
}

export async function createDrawing() {
  await auth.authStateReady()
  const user = auth.currentUser ?? (await signInAnon())
  const drawing = doc(collection(db, 'drawings'))
  await setDoc(drawing, {
    uuid: user.uid,
    theme: 'りんご',
    trail: [],
    createdAt: serverTimestamp(),
  })
  return drawing.id
}

export async function loadDrawing(id: string) {
  await auth.authStateReady()
  if (!auth.currentUser) await signInAnon()
  const snapshot = await getDoc(doc(db, 'drawings', id))
  if (!snapshot.exists()) throw new Error('作品が見つかりません。')
  const data = snapshot.data()
  if (data.uuid !== auth.currentUser?.uid) throw new Error('この作品は開けません。')
  return data as { theme: string; trail: TrailPoint[]; result?: AIResult }
}

export async function saveTrail(id: string, trail: TrailPoint[]) {
  await updateDoc(doc(db, 'drawings', id), { trail })
}

export async function saveResult(id: string, result: AIResult) {
  await updateDoc(doc(db, 'drawings', id), { result })
}
