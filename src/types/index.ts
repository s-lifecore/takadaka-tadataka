export type Position = {
  lat: number
  lng: number
}

export type TrailPoint = Position & {
  t: number // Unix timestamp (ms)
  accuracy?: number // GPSの測位誤差(m)。新規保存時はサーバーで必須として検証する。
}

// AIの採点結果
export type AIResult = {
  score: number // 0～100の一致度（%）。小数点以下5桁まで
  reason: string // AIの採点理由
}
