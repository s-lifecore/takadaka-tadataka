export type ValidatedTrailPoint = {
  lat: number
  lng: number
  t: number
  accuracy: number
}

const MAX_POINTS = 1800
const MAX_DURATION_MS = 900_000
const CLOCK_TOLERANCE_MS = 5000
const MAX_SPEED_KMH = 15
const MIN_DISTANCE_METERS = 3
const MAX_ACCURACY_METERS = 30
const REQUIRED_POINT_FIELDS = ['lat', 'lng', 't', 'accuracy'] as const
const ALLOWED_POINT_FIELDS = new Set<string>(REQUIRED_POINT_FIELDS)

export class TrailValidationError extends Error {}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function distanceMeters(a: ValidatedTrailPoint, b: ValidatedTrailPoint): number {
  const radians = Math.PI / 180
  const value =
    Math.sin(((b.lat - a.lat) * radians) / 2) ** 2 +
    Math.cos(a.lat * radians) *
      Math.cos(b.lat * radians) *
      Math.sin(((b.lng - a.lng) * radians) / 2) ** 2
  const bounded = Math.max(0, Math.min(1, value))
  return 6371000 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded))
}

// クライアントの型や申告値を信用せず、保存する全点を再検証する。
export function validateTrail(
  input: unknown,
  sessionCreatedAt: number,
  now: number,
): ValidatedTrailPoint[] {
  if (!Array.isArray(input) || input.length > MAX_POINTS)
    throw new TrailValidationError('軌跡データの形式または点数が不正です。')

  const result: ValidatedTrailPoint[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new TrailValidationError('軌跡点には緯度・経度・時刻・GPS精度が必要です。')

    // 項目数ではなく、必須項目の存在と許可リストでスキーマを検証する。
    // 任意項目を追加する場合は許可リストを拡張し、値の検証も追加する。
    if (
      !REQUIRED_POINT_FIELDS.every((field) => Object.hasOwn(raw, field)) ||
      !Object.keys(raw).every((field) => ALLOWED_POINT_FIELDS.has(field))
    )
      throw new TrailValidationError('軌跡点には緯度・経度・時刻・GPS精度が必要です。')

    const { lat, lng, t, accuracy } = raw as Record<string, unknown>
    if (
      !finiteNumber(lat) ||
      lat < -90 ||
      lat > 90 ||
      !finiteNumber(lng) ||
      lng < -180 ||
      lng > 180 ||
      !finiteNumber(t) ||
      !Number.isSafeInteger(t) ||
      t < 0 ||
      !finiteNumber(accuracy) ||
      accuracy < 0 ||
      accuracy > MAX_ACCURACY_METERS
    )
      throw new TrailValidationError('軌跡点の座標・時刻・GPS精度が不正です。')

    if (t < sessionCreatedAt - CLOCK_TOLERANCE_MS || t > now + CLOCK_TOLERANCE_MS)
      throw new TrailValidationError('軌跡の時刻がゲーム開始前または未来になっています。')

    const point = { lat, lng, t, accuracy }
    const previous = result[result.length - 1]
    if (previous) {
      const elapsedMs = t - previous.t
      if (elapsedMs <= 0)
        throw new TrailValidationError('軌跡の時刻は順番に増加している必要があります。')
      const distance = distanceMeters(previous, point)
      if (distance + 1e-6 < MIN_DISTANCE_METERS)
        throw new TrailValidationError('軌跡点の間隔は3m以上である必要があります。')
      if ((distance / elapsedMs) * 3600 > MAX_SPEED_KMH + 1e-6)
        throw new TrailValidationError('時速15kmを超える移動が含まれるため保存できません。')
      if (t - result[0].t > MAX_DURATION_MS)
        throw new TrailValidationError('軌跡の最初から最後までの時間は900秒以内にしてください。')
    }
    result.push(point)
  }
  return result
}
