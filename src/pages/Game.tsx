import { useCallback, useEffect, useState } from 'react'
import { MapView } from '../components/MapView'
import { Timer } from '../components/Timer'
import { useGeolocation } from '../hooks/useGeolocation'
import { useTimer } from '../hooks/useTimer'
import type { TrailPoint } from '../types'

const GAME_SECONDS = 15 * 60

type Props = {
  onFinish: (trail: TrailPoint[]) => void
}

function WalkingIcon({
  name,
}: {
  name: 'compass' | 'clock' | 'location' | 'pause' | 'play' | 'flag'
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'compass' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m15 7-2 7-4 3 2-7Z" />
        </>
      )}
      {name === 'clock' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v6l4 2" />
        </>
      )}
      {name === 'location' && (
        <>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      )}
      {name === 'pause' && (
        <>
          <rect x="5" y="4" width="4" height="16" rx="1" />
          <rect x="15" y="4" width="4" height="16" rx="1" />
        </>
      )}
      {name === 'play' && <path d="m7 4 13 8-13 8Z" />}
      {name === 'flag' && (
        <>
          <path d="M5 21V4c5-4 9 4 15 0v11c-6 4-10-4-15 0" />
        </>
      )}
    </svg>
  )
}

export function Game({ onFinish }: Props) {
  const [paused, setPaused] = useState(false)
  const { trail, error, start: startGPS, stop: stopGPS } = useGeolocation()
  const { remaining, expired, start: startTimer, stop: stopTimer } = useTimer(GAME_SECONDS)

  useEffect(() => {
    startGPS()
    startTimer()
    return () => stopGPS()
  }, [startGPS, startTimer, stopGPS])

  const handleFinish = useCallback(() => {
    stopGPS()
    stopTimer()
    onFinish(trail)
  }, [onFinish, stopGPS, stopTimer, trail])

  useEffect(() => {
    if (expired) handleFinish()
  }, [expired, handleFinish])

  function togglePause() {
    if (paused) {
      startGPS()
      startTimer()
    } else {
      stopGPS()
      stopTimer()
    }
    setPaused(!paused)
  }

  const recording = !paused && !error && trail.length > 0
  const status = paused
    ? '記録を一時停止中'
    : error
      ? '位置情報を取得できません'
      : recording
        ? '位置情報を記録中'
        : '位置情報を取得中'

  return (
    <main className="walking-page">
      <div className="walking-content">
        <header className="walking-header">
          <h1>{paused ? 'ひとやすみ中' : 'おさんぽ中'}</h1>
          <WalkingIcon name="compass" />
        </header>

        <div className="walking-summary">
          <div className="walking-theme">りんご</div>
          <div className="walking-time" aria-label="残り時間">
            <WalkingIcon name="clock" />
            <Timer remaining={remaining} />
          </div>
        </div>

        <section className="walking-map" aria-label="現在地と歩いた軌跡の地図">
          <MapView trail={trail} />
          {paused && <div className="walking-paused">一時停止中</div>}
        </section>

        <div className={`walking-status${error ? ' walking-status-error' : ''}`} role="status">
          <WalkingIcon name="location" />
          <span>{status}</span>
          <strong>
            <i className={recording ? 'is-recording' : ''} />
            {recording ? 'ON' : paused || error ? 'OFF' : '取得中'}
          </strong>
        </div>
        {error && (
          <p className="walking-error" role="alert">
            {error}。端末の位置情報の設定を確認し、一時停止後に再開してください。
          </p>
        )}

        <footer className="walking-footer">
          <div className="walking-actions">
            <button type="button" onClick={togglePause} aria-pressed={paused}>
              <WalkingIcon name={paused ? 'play' : 'pause'} />
              {paused ? '再開する' : '一時停止'}
            </button>
            <button type="button" className="walking-finish" onClick={handleFinish}>
              <WalkingIcon name="flag" />
              終了する
            </button>
          </div>
          <p>操作するときは必ず立ち止まってね</p>
        </footer>
      </div>
    </main>
  )
}
