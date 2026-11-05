import { FirebaseError, getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { uploadDrawingImage } from './cloudinary'
import type { AIResult } from '../types'

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

export async function saveDrawing(
  uid: string,
  theme: string,
  imageBase64: string,
  result: AIResult,
  drawingId: string,
): Promise<{ imagePublicId: string }> {
  const drawingRef = doc(db, 'drawings', drawingId)
  const snapshot = await getDoc(drawingRef)
  if (!snapshot.exists())
    throw new Error('作品が見つかりません。ホームからゲームを開始し直してください。')
  const drawing = snapshot.data()
  if (drawing.uid !== uid) throw new Error('この作品には保存できません。')
  // 開始時刻を保持し、dayjsでJSTの文字列に統一する。未設定の場合は現在時刻を使う。
  const createdAt = dayjs(drawing.createdAt || undefined)
    .tz('Asia/Tokyo')
    .format('YYYY-MM-DDTHH:mm:ssZ')
  const image = await uploadDrawingImage(imageBase64)

  try {
    await setDoc(
      drawingRef,
      {
        uid,
        theme,
        imagePublicId: image.publicId,
        result,
        createdAt,
      },
      { merge: true },
    )
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'not-found')
      throw new Error('作品が見つかりません。ホームからゲームを開始し直してください。')
    throw error
  }

  return { imagePublicId: image.publicId }
}
