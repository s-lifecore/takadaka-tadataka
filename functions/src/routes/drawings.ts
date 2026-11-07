import type { Request, Response } from 'express'

import { authenticate } from '../auth/clerk.js'
import { HttpError, send, sendError } from '../errors.js'
import { uploadArtworkImage } from '../services/cloudinary.js'
import { createDrawing, loadOwnedDrawing, saveResult, saveTrail } from '../services/drawings.js'
import { scoreDrawing } from '../services/groq.js'

function normalizePath(request: Request) {
  const path = request.path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  if (path[0] === 'api') path.shift()
  return path
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
      const { image } = request.body ?? {}
      const drawing = await loadOwnedDrawing(path[1], userId, guestToken)
      const result = await scoreDrawing({ theme: drawing.data.theme, imageBase64: image })
      let imagePublicId = drawing.data.imagePublicId as string | undefined
      if (!imagePublicId) imagePublicId = await uploadArtworkImage(image, path[1])
      await saveResult(path[1], userId, guestToken, result, imagePublicId)
      send(response, 200, { result, imagePublicId })
      return
    }

    throw new HttpError(404, 'Not found')
  } catch (error) {
    sendError(response, error)
  }
}
