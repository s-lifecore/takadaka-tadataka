import assert from 'node:assert/strict'
import { before, beforeEach, test } from 'node:test'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { submitTrail } from '../lib/index.js'

// Rulesテストと別のエミュレータ用プロジェクトで、Callableの認可と永続化を検証する。
let db
before(() => {
  db = getFirestore()
  db.settings({ projectId: 'demo-trail-validation' })
})
beforeEach(async () => {
  await db.doc('drawings/owner-session').delete()
})
const trail = () => {
  const start = Date.now() - 10_000
  return [
    { lat: 0, lng: 0, t: start, accuracy: 5 },
    { lat: 0.00004, lng: 0, t: start + 5000, accuracy: 5 },
  ]
}
const seed = (extra = {}) =>
  db.doc('drawings/owner-session').set({
    uid: 'owner',
    trail: [],
    serverCreatedAt: Timestamp.fromMillis(Date.now() - 20_000),
    ...extra,
  })
const call = (points = trail(), uid = 'owner', id = 'owner-session') =>
  submitTrail.run({
    data: { id, trail: points },
    auth: uid ? { uid, token: {} } : undefined,
  })

test('requires authentication and a valid document id', async () => {
  await assert.rejects(call([], null), { code: 'unauthenticated' })
  await assert.rejects(call([], 'owner', 'a/b'), { code: 'invalid-argument' })
})

test('requires existing sessions and ownership', async () => {
  await assert.rejects(call(), { code: 'not-found' })
  await seed()
  await assert.rejects(call(trail(), 'attacker'), { code: 'permission-denied' })
  assert.deepEqual((await db.doc('drawings/owner-session').get()).data().trail, [])
})

test('does not trust a client-written display timestamp on legacy sessions', async () => {
  await seed({ serverCreatedAt: null, createdAt: new Date().toISOString() })
  await assert.rejects(call(), { code: 'failed-precondition' })
})

test('invalid data does not modify the session', async () => {
  await seed()
  const points = trail()
  points[1].lat = 10
  await assert.rejects(call(points), { code: 'invalid-argument' })
  const snapshot = (await db.doc('drawings/owner-session').get()).data()
  assert.deepEqual(snapshot.trail, [])
  assert.equal(snapshot.trailValidationVersion, undefined)
})

test('stores validated data, is idempotent and prevents replacement after submission', async () => {
  await seed()
  const points = trail()
  await call(points)
  const stored = (await db.doc('drawings/owner-session').get()).data()
  assert.deepEqual(stored.trail, points)
  assert.equal(stored.trailValidationVersion, 1)
  assert(stored.trailValidatedAt instanceof Timestamp)
  assert.equal(stored.trailHash.length, 64)
  await call(points)
  const retried = (await db.doc('drawings/owner-session').get()).data()
  assert.equal(retried.trailValidatedAt.toMillis(), stored.trailValidatedAt.toMillis())
  const different = points.map((point) => ({ ...point, lng: 0.001 }))
  await assert.rejects(call(different), { code: 'failed-precondition' })
})

test('concurrent submissions cannot overwrite the first accepted trail', async () => {
  await seed()
  const first = trail(),
    second = first.map((point) => ({ ...point, lng: 0.001 }))
  const results = await Promise.allSettled([call(first), call(second)])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  const rejected = results.find((result) => result.status === 'rejected')
  assert.equal(rejected.reason.code, 'failed-precondition')
})
