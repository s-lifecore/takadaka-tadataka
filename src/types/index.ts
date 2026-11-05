export type Position = {
  lat: number
  lng: number
}

export type TrailPoint = Position & {
  t: number // Unix timestamp (ms)
}

export type AIResult = {
  score: number // 0-100
  guess: string
  reason: string
}

export type Drawing = {
  uid: string
  theme: string
  imagePublicId: string
  result: AIResult
  createdAt: string
}
