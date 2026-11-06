import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import dayjs from 'dayjs'
import Dexie, { type Table } from 'dexie'
import { auth, db, signInAnon } from './firebase'
import type { AIResult, TrailPoint } from '../types'
import type { TimerSnapshot } from '../hooks/useTimer'

const trailDB = new Dexie('tadataka-trails')
trailDB.version(1).stores({ trails: 'id' })
const localTrails: Table<{ id: string; trail: TrailPoint[]; timer?: TimerSnapshot }, string> =
  trailDB.table('trails')

export async function loadLocalTrail(id: string) {
  return localTrails.get(id)
}

export async function saveLocalTrail(id: string, trail: TrailPoint[], timer: TimerSnapshot) {
  await localTrails.put({ id, trail, timer })
}

export async function clearLocalTrail(id: string) {
  await localTrails.delete(id)
}

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
  await updateDoc(doc(db, 'drawings', id), { result, ...(imagePublicId ? { imagePublicId } : {}) })
}

export async function loadTrail(id: string): Promise<TrailPoint[]> {
  return (await loadDrawing(id)).trail ?? []
}
