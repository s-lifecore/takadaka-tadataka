import type { Request, Response } from 'express'

import { HttpError, send, sendError } from '../errors.js'
import { scoreDrawing } from '../services/groq.js'

const MAX_BODY_BYTES = 4 * 1024 * 1024 + 4096

export async function handleJudging(request: Request, response: Response): Promise<void> {
  response.setHeader('Cache-Control', 'no-store')
  try {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST')
      throw new HttpError(405, 'POSTで送信してください')
    }
    if (!request.header('content-type')?.toLowerCase().startsWith('application/json')) {
      throw new HttpError(415, 'JSON形式で送信してください')
    }
    if (request.header('sec-fetch-site') === 'cross-site') {
      throw new HttpError(403, '外部サイトからは利用できません')
    }

    const body = request.body ?? {}
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
      throw new HttpError(413, '画像が大きすぎます。3MB以下にしてください')
    }
    send(response, 200, await scoreDrawing(body))
  } catch (error) {
    sendError(response, error)
  }
}
