import { useCallback, useEffect, useRef, useState } from 'react'
import type { Position, TrailPoint } from '../types'

const MIN_ACCURACY = 30 // 測位誤差が30m以内の点だけ使い、精度の低い点を除去する
const MIN_DISTANCE = 3 // 前回採用した点から3m以上の移動を記録し、細かな揺れを除去する
const MAX_SPEED_KMH = 15 // 通常の歩行（3〜5km/h）や小走りを許容する速度上限
const STATIONARY_RADIUS = 1 // 静止中のGPSの揺れを1mまで許容する
const STATIONARY_DURATION_MS = 3000
const STATIONARY_SPEED = 0.3 // m/s。微小な速度は位置の安定も確認してから静止とする
const MOVING_SPEED = 0.5 // m/s。微小な速度の揺れを歩行と決めつけない
const MOVING_DURATION_MS = 3000
const MOVING_GRACE_MS = 3000 // 歩行中の短い揺れで移動判定を解除しない
const MAX_SAMPLE_GAP_MS = 30000
const MOVEMENT_WINDOW_MS = 20000

function distanceMeters(a: Position, b: Position): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const c =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c))
}

export function useGeolocation(
  initialTrail: TrailPoint[] = [],
  angleBlocked = false,
  motionDetected = false,
) {
  const [trail, setTrail] = useState<TrailPoint[]>(initialTrail)
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null)
  const [isStationary, setIsStationary] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const motionDetectedRef = useRef(motionDetected)
  const angleBlockedRef = useRef(angleBlocked)
  useEffect(() => {
    angleBlockedRef.current = angleBlocked
    motionDetectedRef.current = motionDetected
    if (motionDetected) {
      stationaryAnchorRef.current = null
      stationarySampleCountRef.current = 0
      setIsStationary(false)
    }
  }, [angleBlocked, motionDetected])
  const [error, setError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const watchGenerationRef = useRef(0)
  const lastRef = useRef<TrailPoint | null>(initialTrail[initialTrail.length - 1] ?? null)
  const isPausedRef = useRef(false)
  const stationaryAnchorRef = useRef<TrailPoint | null>(null)
  const stationarySampleCountRef = useRef(0)
  const movementSamplesRef = useRef<TrailPoint[]>([])
  const movingSinceRef = useRef<number | null>(null)
  const movingUntilRef = useRef(0)
  const lastSampleTimeRef = useRef<number | null>(null)

  const pause = useCallback(() => {
    isPausedRef.current = true
  }, [])

  const resume = useCallback(() => {
    isPausedRef.current = false
  }, [])

  const start = useCallback(() => {
    if (watchIdRef.current !== null) return
    setError(null)
    if (!navigator.geolocation) {
      setIsLocating(false)
      setError('このブラウザは位置情報に対応していません')
      return
    }
    setIsLocating(true)
    const generation = ++watchGenerationRef.current
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (generation !== watchGenerationRef.current || watchIdRef.current === null) return
        setError(null)
        setIsLocating(false)
        const point: TrailPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          t: Number.isFinite(pos.timestamp) ? pos.timestamp : Date.now(),
          accuracy: pos.coords.accuracy,
        }
        // 同じ測位結果の再通知を、静止を裏付ける新しい測位として数えない。
        if (lastSampleTimeRef.current !== null && point.t <= lastSampleTimeRef.current) return
        const { speed, accuracy } = pos.coords
        const accurate = Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= MIN_ACCURACY
        if (
          lastSampleTimeRef.current !== null &&
          point.t - lastSampleTimeRef.current > MAX_SAMPLE_GAP_MS
        ) {
          stationaryAnchorRef.current = null
          stationarySampleCountRef.current = 0
          movementSamplesRef.current = []
          movingSinceRef.current = null
          movingUntilRef.current = 0
        }
        lastSampleTimeRef.current = point.t
        // 古い開始地点との平均速度では、長時間の静止後に歩き出しても検知が遅れる。
        // 直近の複数地点で継続的に同じ方向へ移動しているかを確認する。
        const samples = accurate
          ? [...movementSamplesRef.current, point]
              .filter((sample) => point.t - sample.t <= MOVEMENT_WINDOW_MS)
              .slice(-6)
          : []
        movementSamplesRef.current = samples
        let positionMoving = false
        if (samples.length >= 3) {
          const first = samples[0]
          const elapsed = (point.t - first.t) / 1000
          const displacement = distanceMeters(first, point)
          const steps = samples
            .slice(1)
            .map((sample, index) => distanceMeters(samples[index], sample))
          const traveled = steps.reduce((sum, step) => sum + step, 0)
          positionMoving =
            elapsed >= MOVING_DURATION_MS / 1000 &&
            displacement >= MIN_DISTANCE &&
            displacement / elapsed >= MOVING_SPEED &&
            // 手持ちの揺れや歩行時の蛇行を許容し、全体として進んでいればよい。
            displacement / traveled >= 0.5 &&
            Math.max(...steps) / traveled < 0.8
        }
        const slowOrUnknown =
          speed === null || (Number.isFinite(speed) && speed >= 0 && speed <= STATIONARY_SPEED)
        let stationary = false
        if (!accurate || !slowOrUnknown || positionMoving || motionDetectedRef.current) {
          stationaryAnchorRef.current = null
          stationarySampleCountRef.current = 0
        } else {
          let anchor = stationaryAnchorRef.current
          if (!anchor || distanceMeters(anchor, point) > STATIONARY_RADIUS) {
            anchor = point
            stationaryAnchorRef.current = anchor
            stationarySampleCountRef.current = 0
          }
          stationarySampleCountRef.current += 1
          // 速度0だけでは確定しない。異なる測位が3回以上あり、1m以内で3秒間
          // 安定した場合だけ静止とする。歩行中に速度0が返る端末にも対応する。
          stationary =
            stationarySampleCountRef.current >= 3 && point.t - anchor.t >= STATIONARY_DURATION_MS
        }
        setIsStationary(stationary)
        // 静止を確認できないことと、移動を確認できることは区別する。
        // 位置の移動が確認できれば、速度が未提供・0でも移動として扱う。
        const movingSample =
          accurate &&
          !stationary &&
          speed !== null &&
          Number.isFinite(speed) &&
          speed >= MOVING_SPEED
        if (movingSample) movingSinceRef.current ??= point.t
        else movingSinceRef.current = null
        const confirmedMoving =
          positionMoving ||
          (movingSinceRef.current !== null &&
            point.t - movingSinceRef.current >= MOVING_DURATION_MS)
        if (confirmedMoving) movingUntilRef.current = point.t + MOVING_GRACE_MS
        setIsMoving(
          accurate && !stationary && (confirmedMoving || point.t < movingUntilRef.current),
        )
        if (angleBlockedRef.current && !stationary) return
        setCurrentPosition(point)
        if (isPausedRef.current) return
        if (pos.coords.accuracy > MIN_ACCURACY) return
        if (lastRef.current) {
          const distance = distanceMeters(lastRef.current, point)
          if (distance < MIN_DISTANCE) return

          const elapsedSeconds = (point.t - lastRef.current.t) / 1000
          if (elapsedSeconds <= 0) return
          const speedKmh = (distance / elapsedSeconds) * 3.6
          if (speedKmh > MAX_SPEED_KMH) return
        }
        lastRef.current = point
        setTrail((prev) => [...prev, point])
      },
      (err) => {
        if (generation !== watchGenerationRef.current || watchIdRef.current === null) return
        setIsLocating(false)
        stationaryAnchorRef.current = null
        stationarySampleCountRef.current = 0
        movementSamplesRef.current = []
        movingSinceRef.current = null
        movingUntilRef.current = 0
        lastSampleTimeRef.current = null
        setIsStationary(false)
        setIsMoving(false)
        switch (err.code) {
          case 1:
            setError(
              '位置情報の許可が必要です。設定 → Safari/Chrome → 位置情報を「許可」に変更してください。設定を変更したら、再試行してください。',
            )
            break
          case 2:
            setError('GPS信号を取得できません。屋外に出て再試行してください。')
            break
          case 3:
            setError('位置情報の取得がタイムアウトしました。再試行してください。')
            break
          default:
            setError('位置情報を取得できません。端末の位置情報設定を確認して再試行してください。')
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )
  }, [])

  const stop = useCallback(() => {
    stationaryAnchorRef.current = null
    stationarySampleCountRef.current = 0
    movementSamplesRef.current = []
    movingSinceRef.current = null
    movingUntilRef.current = 0
    lastSampleTimeRef.current = null
    setIsStationary(false)
    setIsMoving(false)
    watchGenerationRef.current += 1
    setIsLocating(false)
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const retry = useCallback(() => {
    stop()
    start()
  }, [stop, start])

  return {
    trail,
    currentPosition,
    isStationary: isStationary && !motionDetected,
    isMoving: isMoving || motionDetected,
    error,
    isLocating,
    start,
    stop,
    retry,
    pause,
    resume,
  }
}
