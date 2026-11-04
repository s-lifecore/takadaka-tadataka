import { useCallback, useRef, useState } from 'react'
import type { TrailPoint } from '../types'

const MIN_ACCURACY = 30 // 精度が30m以下の点だけ使う（ノイズ除去）
const MIN_DISTANCE = 3 // 前の点から3m以上動いたら追加

function distanceMeters(a: TrailPoint, b: TrailPoint): number {
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
        if (watchIdRef.current === null || isPausedRef.current) return
        if (pos.coords.accuracy > MIN_ACCURACY) return
        const point: TrailPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          t: Date.now(),
        }
        if (lastRef.current && distanceMeters(lastRef.current, point) < MIN_DISTANCE) return
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

  return { trail, error, start, stop, pause, resume }
}
