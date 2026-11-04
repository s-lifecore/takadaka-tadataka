export type TrailPoint = {
  lat: number
  lng: number
  t: number // Unix timestamp (ms)
}

import type { AIResult } from './ai'
export type { AIResult } from './ai'

export type Drawing = {
  uid: string
  theme: string
  imagePublicId: string
  result: AIResult
  createdAt: string
}
