import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db, signInAnon } from './firebase'
import type { TrailPoint } from '../types'

let authentication: ReturnType<typeof signInAnon> | null = null

function ensureUser() {
  authentication ??= auth
    .authStateReady()
    .then(() => auth.currentUser ?? signInAnon())
    .catch((error: unknown) => {
      authentication = null
      throw error
    })
  return authentication
}

export async function createDrawing() {
  const user = await ensureUser()
  const drawing = doc(collection(db, 'drawings'))
  await setDoc(drawing, {
    uuid: user.uid,
    theme: 'りんご',
    trail: [],
    createdAt: serverTimestamp(),
  })
  return drawing.id
}

export async function loadTrail(id: string): Promise<TrailPoint[]> {
  await ensureUser()
  const drawing = await getDoc(doc(db, 'drawings', id))
  if (!drawing.exists())
    throw new Error('作品が見つかりません。ホームからゲームを開始してください。')
  return (drawing.data().trail ?? []) as TrailPoint[]
}

export async function saveTrail(id: string, trail: TrailPoint[]) {
  await ensureUser()
  await updateDoc(doc(db, 'drawings', id), { trail })
}
