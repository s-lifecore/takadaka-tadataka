export type Position = {
  lat: number
  lng: number
}

export type TrailPoint = Position & {
  t: number // Unix timestamp (ms)
}

// AIの採点結果
export type AIResult = {
  score: number // 0～100の一致度（%）。小数点以下5桁まで
  reason: string // AIの採点理由
}
