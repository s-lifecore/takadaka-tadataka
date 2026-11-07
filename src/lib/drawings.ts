import { apiRequest } from './api'
import type { AIResult, TrailPoint } from '../types'

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
  const drawing = await apiRequest<{ id: string; guestToken?: string }>('/drawings/create', {
    method: 'POST',
  })
  if (drawing.guestToken) sessionStorage.setItem(guestTokenKey(drawing.id), drawing.guestToken)
  return drawing.id
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

export async function saveResult(id: string, result: AIResult, image: string) {
  return apiRequest<{ imagePublicId: string }>(`/drawings/${id}/result`, {
    method: 'POST',
    body: JSON.stringify({ result, image: `data:image/png;base64,${image}` }),
    headers: guestHeaders(id),
  })
}

export async function loadTrail(id: string): Promise<TrailPoint[]> {
  return (await loadDrawing(id)).trail ?? []
}
