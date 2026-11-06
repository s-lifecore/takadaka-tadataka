import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

let environment
before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-trail-rules',
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  })
})
beforeEach(async () => environment.clearFirestore())
after(async () => environment?.cleanup())
const owner = () => environment.authenticatedContext('owner').firestore()
const drawing = (extra = {}) => ({
  uid: 'owner',
  theme: 'りんご',
  trail: [],
  createdAt: '2026-11-05T12:00:00+09:00',
  serverCreatedAt: serverTimestamp(),
  ...extra,
})
const create = (data = drawing(), db = owner()) => setDoc(doc(db, 'drawings/test'), data)

test('owner can create only an empty session with a server-generated timestamp', async () => {
  await assertSucceeds(create())
  await assertSucceeds(getDoc(doc(owner(), 'drawings/test')))
})

test('rejects prefilled trails and forged validation metadata at creation', async () => {
  for (const extra of [
    { trail: [{ lat: 0, lng: 0, t: 1, accuracy: 1 }] },
    { trail: 'fake' },
    { trailValidatedAt: serverTimestamp() },
    { trailValidationVersion: 1 },
    { trailHash: 'forged' },
    { result: { score: 100 } },
    { serverCreatedAt: Timestamp.fromMillis(1) },
    { uid: 'other' },
    { theme: 'fake' },
  ])
    await assertFails(create(drawing(extra)))
  const withoutTimestamp = drawing()
  delete withoutTimestamp.serverCreatedAt
  await assertFails(create(withoutTimestamp))
})

test('rejects all client changes to trail, timestamps, owner, theme and verification fields', async () => {
  await create()
  const reference = doc(owner(), 'drawings/test')
  for (const update of [
    { trail: [{ lat: 0, lng: 0, t: 1, accuracy: 1 }] },
    { uid: 'other' },
    { theme: 'fake' },
    { createdAt: 'fake' },
    { serverCreatedAt: serverTimestamp() },
    { trailValidatedAt: serverTimestamp() },
    { trailValidationVersion: 1 },
    { trailHash: 'forged' },
    { trail: [1], result: { score: 100 } },
  ])
    await assertFails(updateDoc(reference, update))
})

test('preserves owner result/image updates including legacy documents', async () => {
  await create()
  await assertSucceeds(
    updateDoc(doc(owner(), 'drawings/test'), {
      result: { score: 80, guess: 'りんご', reason: 'test' },
      imagePublicId: 'image',
    }),
  )
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'drawings/legacy'), {
      uid: 'owner',
      theme: 'りんご',
      trail: [{ lat: 0, lng: 0, t: 1 }],
      createdAt: 'old',
    })
  })
  await assertSucceeds(getDoc(doc(owner(), 'drawings/legacy')))
  await assertSucceeds(
    updateDoc(doc(owner(), 'drawings/legacy'), { imagePublicId: 'legacy-image' }),
  )
  await assertFails(updateDoc(doc(owner(), 'drawings/legacy'), { trail: [] }))
})

test('unauthed callers and other owners cannot access or replace another drawing', async () => {
  await create()
  for (const db of [
    environment.unauthenticatedContext().firestore(),
    environment.authenticatedContext('other').firestore(),
  ]) {
    const reference = doc(db, 'drawings/test')
    await assertFails(getDoc(reference))
    await assertFails(updateDoc(reference, { result: { score: 100 } }))
    await assertFails(deleteDoc(reference))
    await assertFails(create(drawing(), db))
  }
  await assertSucceeds(deleteDoc(doc(owner(), 'drawings/test')))
})
