export type TrailPoint = {
  lat: number
  lng: number
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
  trail: TrailPoint[]
  imageUrl: string
  result: AIResult
  createdAt: number
}
