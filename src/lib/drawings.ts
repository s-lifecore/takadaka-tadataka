import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db, signInAnon } from './firebase'
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
  await setDoc(drawing, { uid: user.uid, theme: 'りんご', trail: [], createdAt: serverTimestamp() })
  return drawing.id
}
export async function loadDrawing(id: string) {
  await ensureUser()
  const snapshot = await getDoc(doc(db, 'drawings', id))
  if (!snapshot.exists()) throw new Error('作品が見つかりません。')
  return snapshot.data() as {
    theme: string
    trail: TrailPoint[]
    result?: AIResult
    imagePublicId?: string
  }
}
export async function saveTrail(id: string, trail: TrailPoint[]) {
  await ensureUser()
  await updateDoc(doc(db, 'drawings', id), { trail })
}
export async function saveResult(id: string, result: AIResult, imagePublicId?: string) {
  await ensureUser()
  await updateDoc(doc(db, 'drawings', id), { result, ...(imagePublicId ? { imagePublicId } : {}) })
}

export async function loadTrail(id: string): Promise<TrailPoint[]> {
  return (await loadDrawing(id)).trail ?? []
}
