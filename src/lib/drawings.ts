import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import dayjs from 'dayjs'
import { auth, db, functions, signInAnon } from './firebase'
import type { AIResult, TrailPoint } from '../types'

let authentication: Promise<unknown> | null = null
async function ensureUser() {
  authentication ??= auth
    .authStateReady()
    .then(() => auth.currentUser ?? signInAnon())
    .catch((error: unknown) => {
      authentication = null
      throw error
    })
  await authentication
  if (!auth.currentUser) throw new Error('認証できませんでした。')
  return auth.currentUser
}
export async function createDrawing() {
  const user = await ensureUser()
  const drawing = doc(collection(db, 'drawings'))
  await setDoc(drawing, {
    uid: user.uid,
    theme: 'りんご',
    trail: [],
    createdAt: dayjs().tz('Asia/Tokyo').format('YYYY-MM-DDTHH:mm:ssZ'),
    serverCreatedAt: serverTimestamp(),
  })
  return drawing.id
}
export async function loadDrawing(id: string) {
  const user = await ensureUser()
  const snapshot = await getDoc(doc(db, 'drawings', id))
  if (!snapshot.exists()) throw new Error('作品が見つかりません。')
  const data = snapshot.data()
  if (data.uid !== user.uid) throw new Error('この作品は開けません。')
  return data as { theme: string; trail: TrailPoint[]; result?: AIResult; imagePublicId?: string }
}
export async function saveTrail(id: string, trail: TrailPoint[]) {
  await ensureUser()
  try {
    await httpsCallable<{ id: string; trail: TrailPoint[] }, { saved: boolean }>(
      functions,
      'submitTrail',
    )({ id, trail })
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      [
        'functions/invalid-argument',
        'functions/failed-precondition',
        'functions/permission-denied',
        'functions/not-found',
      ].includes(error.code)
    )
      throw new Error(error.message)
    throw new Error(
      '軌跡を保存できませんでした。通信環境を確認して、完了ボタンで再試行してください。',
    )
  }
}
export async function saveResult(id: string, result: AIResult, imagePublicId?: string) {
  await ensureUser()
  await updateDoc(doc(db, 'drawings', id), { result, ...(imagePublicId ? { imagePublicId } : {}) })
}

export async function loadTrail(id: string): Promise<TrailPoint[]> {
  return (await loadDrawing(id)).trail ?? []
}
