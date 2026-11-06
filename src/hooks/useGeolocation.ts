import { useCallback, useRef, useState } from 'react'
import type { Position, TrailPoint } from '../types'

const MIN_ACCURACY = 30 // 測位誤差が30m以内の点だけ使い、精度の低い点を除去する
const MIN_DISTANCE = 3 // 前回採用した点から3m以上の移動を記録し、細かな揺れを除去する
const MAX_SPEED_KMH = 15 // 通常の歩行（3〜5km/h）や小走りを許容する速度上限

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

export function useGeolocation(initialTrail: TrailPoint[] = []) {
  const [trail, setTrail] = useState<TrailPoint[]>(initialTrail)
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastRef = useRef<TrailPoint | null>(initialTrail[initialTrail.length - 1] ?? null)
  const isPausedRef = useRef(false)

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
      setError('このブラウザは位置情報に対応していません')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null)
        if (watchIdRef.current === null) return
        const point: TrailPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          t: Date.now(),
          accuracy: pos.coords.accuracy,
        }
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
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 0 },
    )
  }, [])

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  return { trail, currentPosition, error, start, stop, pause, resume }
}
