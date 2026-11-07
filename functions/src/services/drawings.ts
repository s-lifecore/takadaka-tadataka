import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { FieldValue } from 'firebase-admin/firestore'

import { db } from '../config.js'
import { HttpError } from '../errors.js'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function drawingRef(id: string) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) throw new HttpError(400, 'Invalid drawing id')
  return db.collection('drawings').doc(id)
}

export async function createDrawing(userId: string | null) {
  const id = randomUUID()
  const guestToken = userId === null ? randomBytes(32).toString('base64url') : undefined
  await drawingRef(id).set({
    userId,
    ...(guestToken ? { guestTokenHash: hashToken(guestToken) } : {}),
    theme: 'りんご',
    trail: [],
    createdAt: FieldValue.serverTimestamp(),
  })
  return { id, guestToken }
}

export async function loadOwnedDrawing(id: string, userId: string | null, guestToken: string | undefined) {
  const ref = drawingRef(id)
  const snapshot = await ref.get()
  if (!snapshot.exists) throw new HttpError(404, 'Artwork not found')
  const data = snapshot.data() ?? {}
  if (data.userId !== userId) throw new HttpError(403, 'Artwork access denied')
  if (userId === null && (!guestToken || data.guestTokenHash !== hashToken(guestToken))) {
    throw new HttpError(403, 'Artwork access denied')
  }
  return { ref, data }
}

export async function saveTrail(id: string, userId: string | null, guestToken: string | undefined, trail: unknown[]) {
  const drawing = await loadOwnedDrawing(id, userId, guestToken)
  if (trail.length > 10000) throw new HttpError(400, 'Invalid trail')
  await drawing.ref.update({ trail })
}

export async function saveResult(
  id: string,
  userId: string | null,
  guestToken: string | undefined,
  result: { score: number; guess: string; reason: string },
  imagePublicId: string,
) {
  const drawing = await loadOwnedDrawing(id, userId, guestToken)
  await drawing.ref.update({ result, imagePublicId, updatedAt: FieldValue.serverTimestamp() })
}
