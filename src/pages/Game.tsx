import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createDrawing, loadDrawing, saveTrail } from '../lib/firebase'
import { MapView } from '../components/MapView'
import { Timer } from '../components/Timer'
import { useGeolocation } from '../hooks/useGeolocation'
import { useDeviceOrientation } from '../hooks/useDeviceOrientation'
import { useTimer } from '../hooks/useTimer'
import type { TrailPoint } from '../types'

const GAME_SECONDS = 15 * 60

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

export function Game() {
  const { id } = useParams<{ id: string }>()
  return id ? <LoadGame key={id} id={id} /> : <StartCountdown />
}

function StartCountdown() {
  const navigate = useNavigate()
  const { remaining, expired, start } = useTimer(3)
  const [error, setError] = useState<string | null>(null)
  const creation = useRef<Promise<string> | null>(null)

  useEffect(() => {
    start()
  }, [start])
  useEffect(() => {
    let active = true
    creation.current ??= createDrawing()
    creation.current
      .then((id) => {
        if (active && expired) navigate('/map/' + id, { replace: true })
      })
      .catch(() => {
        if (active) setError('ゲームを開始できませんでした。通信環境を確認してください。')
      })
    return () => {
      active = false
    }
  }, [expired, navigate])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">まもなく出発！</h1>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <p role="status" className="text-6xl">
          {remaining || '準備中…'}
        </p>
      )}
      <Link to="/">ホームへ戻る</Link>
    </main>
  )
}

function LoadGame({ id }: { id: string }) {
  const [trail, setTrail] = useState<TrailPoint[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    loadDrawing(id)
      .then((drawing) => {
        if (active) setTrail(drawing.trail)
      })
      .catch(() => {
        if (active) setError('ゲームを読み込めませんでした。URLと通信環境を確認してください。')
      })
    return () => {
      active = false
    }
  }, [id])
  if (error)
    return (
      <main className="p-6">
        <p role="alert">{error}</p>
        <Link to="/">ホームへ戻る</Link>
      </main>
    )
  if (!trail)
    return (
      <p role="status" className="p-6">
        ゲームを読み込み中…
      </p>
    )
  return <PlayingGame id={id} initialTrail={trail} />
}

function PlayingGame({ id, initialTrail }: { id: string; initialTrail: TrailPoint[] }) {
  const navigate = useNavigate()
  const {
    isLooking,
    status: sensorStatus,
    isRequesting,
    requestPermission,
  } = useDeviceOrientation()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const finishing = useRef(false)
  const [paused, setPaused] = useState(false)
  const { trail, error, start: startGPS, stop: stopGPS } = useGeolocation(initialTrail)
  const { remaining, expired, start: startTimer, stop: stopTimer } = useTimer(GAME_SECONDS)

  useEffect(() => {
    startTimer()
  }, [startTimer])

  useEffect(() => {
    if (!paused && !isLooking && !saving) startGPS()
    else stopGPS()
    return () => stopGPS()
  }, [paused, isLooking, saving, startGPS, stopGPS])

  const handleFinish = useCallback(async () => {
    if (finishing.current) return
    finishing.current = true
    stopGPS()
    stopTimer()
    setPaused(true)
    setSaving(true)
    setSaveError(null)
    try {
      await saveTrail(id, trail)
      navigate('/result/' + id)
    } catch {
      setSaveError('軌跡を保存できませんでした。終了するボタンで再試行してください。')
      finishing.current = false
    } finally {
      setSaving(false)
    }
  }, [id, navigate, stopGPS, stopTimer, trail])

  useEffect(() => {
    if (expired) handleFinish()
  }, [expired, handleFinish])

  function togglePause() {
    if (paused) {
      startTimer()
    } else {
      stopGPS()
      stopTimer()
    }
    setPaused(!paused)
  }

  const recording = !paused && !isLooking && !error && trail.length > 0
  const status = isLooking
    ? '安全のため記録を停止中'
    : paused
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
          {isLooking && (
            <div className="walking-warning" role="alert">
              前を向いて歩いてください。端末を傾けると記録が再開します。
            </div>
          )}
        </section>

        <div className={`walking-status${error ? ' walking-status-error' : ''}`} role="status">
          <WalkingIcon name="location" />
          <span>{status}</span>
          <strong>
            <i className={recording ? 'is-recording' : ''} />
            {recording ? 'ON' : paused || isLooking || error ? 'OFF' : '取得中'}
          </strong>
        </div>
        {error && (
          <p className="walking-error" role="alert">
            {error}。端末の位置情報の設定を確認し、一時停止後に再開してください。
          </p>
        )}

        {sensorStatus !== 'listening' && (
          <div className="walking-error" role="status">
            {sensorStatus === 'unsupported' ? (
              'この端末では歩きスマホ検知を利用できません。操作時は立ち止まってください。'
            ) : (
              <>
                <p>歩きスマホ検知には傾きセンサーの許可が必要です。</p>
                <button type="button" disabled={isRequesting} onClick={requestPermission}>
                  センサーを有効にする
                </button>
              </>
            )}
          </div>
        )}
        {saveError && (
          <p className="walking-error" role="alert">
            {saveError}
          </p>
        )}
        <footer className="walking-footer">
          <div className="walking-actions">
            <button
              type="button"
              onClick={togglePause}
              aria-pressed={paused}
              disabled={saving || expired}
            >
              <WalkingIcon name={paused ? 'play' : 'pause'} />
              {paused ? '再開する' : '一時停止'}
            </button>
            <button
              type="button"
              className="walking-finish"
              onClick={handleFinish}
              disabled={saving}
            >
              <WalkingIcon name="flag" />
              {saving ? '保存中…' : '終了する'}
            </button>
          </div>
          <p>操作するときは必ず立ち止まってね</p>
        </footer>
      </div>
    </main>
  )
}
