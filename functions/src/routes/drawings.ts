import type { Request, Response } from 'express'

import { authenticate } from '../auth/clerk.js'
import { HttpError, send, sendError } from '../errors.js'
import { uploadArtworkImage } from '../services/cloudinary.js'
import { createDrawing, loadOwnedDrawing, saveResult, saveTrail } from '../services/drawings.js'

function normalizePath(request: Request) {
  const path = request.path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  if (path[0] === 'api') path.shift()
  return path
}

function validateResult(value: unknown): value is { score: number; guess: string; reason: string } {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>
  return (
    typeof result.score === 'number' &&
    result.score >= 0 &&
    result.score <= 100 &&
    typeof result.guess === 'string' &&
    result.guess.length <= 200 &&
    typeof result.reason === 'string' &&
    result.reason.length <= 2000
  )
}

export async function handleDrawings(request: Request, response: Response): Promise<void> {
  try {
    const path = normalizePath(request)
    if (path[0] !== 'drawings') throw new HttpError(404, 'Not found')
    const userId = await authenticate(request)

    if (path.length === 2 && path[1] === 'create' && request.method === 'POST') {
      const drawing = await createDrawing(userId)
      send(response, 201, drawing)
      return
    }

    if (path.length === 2 && request.method === 'GET') {
      const drawing = await loadOwnedDrawing(path[1], userId, request.header('x-guest-token'))
      send(response, 200, { id: path[1], ...drawing.data })
      return
    }

    if (path.length !== 3) throw new HttpError(404, 'Not found')
    const guestToken = request.header('x-guest-token')

    if (path[2] === 'trail' && request.method === 'PATCH') {
      const trail = request.body?.trail
      if (!Array.isArray(trail)) throw new HttpError(400, 'Invalid trail')
      await saveTrail(path[1], userId, guestToken, trail)
      send(response, 204)
      return
    }

    if (path[2] === 'result' && request.method === 'POST') {
      const { result, image } = request.body ?? {}
      if (!validateResult(result)) throw new HttpError(400, 'Invalid result')
      const drawing = await loadOwnedDrawing(path[1], userId, guestToken)
      let imagePublicId = drawing.data.imagePublicId as string | undefined
      if (!imagePublicId) imagePublicId = await uploadArtworkImage(image, path[1])
      await saveResult(path[1], userId, guestToken, result, imagePublicId)
      send(response, 200, { imagePublicId })
      return
    }

    throw new HttpError(404, 'Not found')
  } catch (error) {
    sendError(response, error)
  }
}
