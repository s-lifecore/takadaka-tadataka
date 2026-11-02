import { useCallback, useEffect } from 'react'
import { MapView } from '../components/MapView'
import { Timer } from '../components/Timer'
import { useGeolocation } from '../hooks/useGeolocation'
import { useTimer } from '../hooks/useTimer'
import type { TrailPoint } from '../types'

const GAME_SECONDS = 15 * 60

type Props = {
  onFinish: (trail: TrailPoint[]) => void
}

export function Game({ onFinish }: Props) {
  const { trail, error, start: startGPS, stop: stopGPS } = useGeolocation()
  const { remaining, expired, start: startTimer } = useTimer(GAME_SECONDS)

  useEffect(() => {
    startGPS()
    startTimer()
    return () => stopGPS()
  }, [startGPS, startTimer, stopGPS])

  const handleFinish = useCallback(() => {
    stopGPS()
    onFinish(trail)
  }, [onFinish, stopGPS, trail])

  useEffect(() => {
    if (expired) handleFinish()
  }, [expired, handleFinish])

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow z-10">
        <span className="text-lg font-bold">🍎 りんご</span>
        <Timer remaining={remaining} />
        <button onClick={handleFinish} className="text-sm text-gray-400 underline">
          完了
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 text-sm px-4 py-2">{error}</div>}

      <div className="flex-1 relative">
        <MapView trail={trail} />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
          軌跡: {trail.length} 点
        </div>
      </div>
    </div>
  )
}
