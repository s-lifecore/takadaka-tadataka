import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import dayjs from 'dayjs'
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
  await setDoc(drawing, {
    uid: user.uid,
    theme: 'りんご',
    trail: [],
    createdAt: dayjs().tz('Asia/Tokyo').format('YYYY-MM-DDTHH:mm:ssZ'),
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
  await updateDoc(doc(db, 'drawings', id), { trail })
}
export async function saveResult(id: string, result: AIResult, imagePublicId?: string) {
  await ensureUser()
  await runTransaction(db, async (transaction) => {
    const reference = doc(db, 'drawings', id)
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists()) throw new Error('作品が見つかりません。')
    transaction.update(reference, {
      result,
      savedAt: snapshot.data().savedAt ?? dayjs().tz('Asia/Tokyo').format('YYYY-MM-DDTHH:mm:ssZ'),
      ...(imagePublicId ? { imagePublicId } : {}),
    })
  })
}

export async function loadTrail(id: string): Promise<TrailPoint[]> {
  return (await loadDrawing(id)).trail ?? []
}

export type SavedDrawing = {
  id: string
  theme: string
  trail: TrailPoint[]
  result: AIResult
  imagePublicId?: string
  savedAt: string
}

export async function loadSavedDrawings(): Promise<SavedDrawing[]> {
  const user = await ensureUser()
  // UIDだけで絞り込み、複合インデックスなしで本人の作品を取得する。
  const snapshot = await getDocs(query(collection(db, 'drawings'), where('uid', '==', user.uid)))
  return snapshot.docs
    .flatMap((document) => {
      const data = document.data()
      // ゲーム開始時に作られた、まだ採点されていない作品は含めない。
      if (!data.result || typeof data.result.score !== 'number') return []
      return [
        {
          id: document.id,
          theme: data.theme,
          trail: data.trail ?? [],
          result: data.result as AIResult,
          imagePublicId: data.imagePublicId,
          savedAt: data.savedAt ?? data.createdAt,
        },
      ]
    })
    .sort((a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt) || a.id.localeCompare(b.id))
}
