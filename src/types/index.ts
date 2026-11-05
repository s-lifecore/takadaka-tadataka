export type Position = {
  lat: number
  lng: number
}

export type TrailPoint = Position & {
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
