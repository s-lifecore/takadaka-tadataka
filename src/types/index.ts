export type Position = {
  lat: number
  lng: number
}

export type TrailPoint = Position & {
  t: number // Unix timestamp (ms)
  accuracy?: number // GPSの測位誤差(m)。新規保存時はサーバーで必須として検証する。
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
