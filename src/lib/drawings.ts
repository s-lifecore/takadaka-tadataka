import { apiRequest, ApiError } from './api'
import Dexie, { type Table } from 'dexie'
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

type DrawingResponse = {
  id: string
  userId: string | null
  theme: string
  trail: TrailPoint[]
  result?: AIResult
  imagePublicId?: string
}

function guestTokenKey(id: string) {
  return `tadataka:guest-token:${id}`
}

function guestHeaders(id: string): Headers {
  const headers = new Headers()
  const token = sessionStorage.getItem(guestTokenKey(id))
  if (token) headers.set('X-Guest-Token', token)
  return headers
}

export async function createDrawing() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const drawing = await apiRequest<{ id: string; guestToken?: string }>('/drawings/create', {
        method: 'POST',
      })
      if (drawing.guestToken) sessionStorage.setItem(guestTokenKey(drawing.id), drawing.guestToken)
      return drawing.id
    } catch (error) {
      const retryable =
        error instanceof TypeError || (error instanceof ApiError && error.status >= 500)
      if (!retryable || attempt === 2) throw error
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }
  throw new Error('Failed to create drawing')
}

export async function loadDrawing(id: string) {
  const drawing = await apiRequest<DrawingResponse>(`/drawings/${id}`, {
    headers: guestHeaders(id),
  })
  return drawing
}

export async function saveTrail(id: string, trail: TrailPoint[]) {
  await apiRequest(`/drawings/${id}/trail`, {
    method: 'PATCH',
    body: JSON.stringify({ trail }),
    headers: guestHeaders(id),
  })
}
export async function saveResult(id: string, image: string) {
  return apiRequest<{ result: AIResult; imagePublicId: string }>(`/drawings/${id}/result`, {
    method: 'POST',
    body: JSON.stringify({ image: `data:image/png;base64,${image}` }),
    headers: guestHeaders(id),
  })
}

export async function loadTrail(id: string): Promise<TrailPoint[]> {
  return (await loadDrawing(id)).trail ?? []
}
