import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapView } from '../components/MapView'
import { Timer } from '../components/Timer'
import { useDeviceOrientation } from '../hooks/useDeviceOrientation'
import { useGeolocation } from '../hooks/useGeolocation'
import { useTimer } from '../hooks/useTimer'
import { createDrawing, loadTrail, saveTrail } from '../lib/drawings'
import type { TrailPoint } from '../types'

const GAME_SECONDS = 15 * 60

export function Game() {
  const { id } = useParams<{ id: string }>()
  return id ? <LoadGame id={id} /> : <StartCountdown />
}

function StartCountdown() {
  const navigate = useNavigate()
  const { remaining, expired: countdownFinished, start: startCountdown } = useTimer(3)
  const [error, setError] = useState<string | null>(null)
  const creation = useRef<Promise<string> | null>(null)

  useEffect(() => {
    startCountdown()
  }, [startCountdown])
  useEffect(() => {
    let active = true
    creation.current ??= createDrawing()
    creation.current.then(
      (drawingId) => {
        if (active && countdownFinished) navigate(`/map/${drawingId}`, { replace: true })
      },
      () => {
        if (active)
          setError('ゲームを開始できませんでした。通信環境を確認して、もう一度お試しください。')
      },
    )
    return () => {
      active = false
    }
  }, [navigate, countdownFinished])

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 bg-white">
      <p className="text-lg font-bold">🍎 りんご</p>
      <div role="status" aria-live="assertive" aria-atomic="true" className="text-center">
        <p className="text-gray-600 mb-4">ゲーム開始まで</p>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p className="text-8xl font-mono font-bold tabular-nums">{remaining || '準備中…'}</p>
        )}
      </div>
      <p className="text-sm text-gray-500">画面を見ながら歩かないでください</p>
      <Link to="/" className="underline">
        ホームへ戻る
      </Link>
    </div>
  )
}

function LoadGame({ id }: { id: string }) {
  const [trail, setTrail] = useState<TrailPoint[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    loadTrail(id).then(
      (value) => {
        if (active) setTrail(value)
      },
      (reason: unknown) => {
        if (active) setError(String(reason))
      },
    )
    return () => {
      active = false
    }
  }, [id])
  if (error)
    return (
      <div className="p-6">
        <p role="alert">{error}</p>
        <Link to="/">ホームへ戻る</Link>
      </div>
    )
  if (!trail) return <p className="p-6">ゲームを読み込み中…</p>
  return <PlayingGame id={id} initialTrail={trail} />
}

function WalkingIcon({ name }: { name: 'compass' | 'clock' | 'pause' | 'play' | 'flag' }) {
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
      {name === 'pause' && (
        <>
          <rect x="5" y="4" width="4" height="16" rx="1" />
          <rect x="15" y="4" width="4" height="16" rx="1" />
        </>
      )}
      {name === 'play' && <path d="m7 4 13 8-13 8Z" />}
      {name === 'flag' && <path d="M5 21V4c5-4 9 4 15 0v11c-6 4-10-4-15 0" />}
    </svg>
  )
}

function PlayingGame({ id, initialTrail }: { id: string; initialTrail: TrailPoint[] }) {
  const navigate = useNavigate()
  const [paused, setPaused] = useState(false)
  const {
    trail,
    error: gpsError,
    start: startGPS,
    stop: stopGPS,
    pause: pauseGPS,
    resume: resumeGPS,
  } = useGeolocation(initialTrail)
  const {
    isLooking,
    status: orientationStatus,
    isRequesting,
    requestPermission,
  } = useDeviceOrientation()
  const { remaining, expired, start: startTimer, stop: stopTimer } = useTimer(GAME_SECONDS)
  const finishing = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    startGPS()
    startTimer()
    return () => stopGPS()
  }, [startGPS, startTimer, stopGPS])
  useEffect(() => {
    if (isLooking) pauseGPS()
    else if (!paused && !saving) resumeGPS()
  }, [isLooking, paused, saving, pauseGPS, resumeGPS])

  const handleFinish = useCallback(async () => {
    if (finishing.current) return
    finishing.current = true
    setSaving(true)
    setSaveError(null)
    pauseGPS()
    stopGPS()
    stopTimer()
    setPaused(true)
    try {
      await saveTrail(id, trail)
      navigate(`/result/${id}`)
    } catch {
      setSaveError(
        '軌跡を保存できませんでした。通信環境を確認して、完了ボタンで再試行してください。',
      )
      finishing.current = false
      setSaving(false)
    }
  }, [id, navigate, pauseGPS, stopGPS, stopTimer, trail])
  useEffect(() => {
    if (expired) void handleFinish()
  }, [expired, handleFinish])

  const togglePause = useCallback(() => {
    if (paused) {
      if (!isLooking) resumeGPS()
      startGPS()
      startTimer()
    } else {
      pauseGPS()
      stopGPS()
      stopTimer()
    }
    setPaused((value) => !value)
  }, [paused, isLooking, resumeGPS, startGPS, startTimer, pauseGPS, stopGPS, stopTimer])

  return (
    <main className="walking-page">
      <div className="walking-content">
        <header className="walking-header">
          <h1>{paused || isLooking ? 'ひとやすみ中' : 'おさんぽ中'}</h1>
          <WalkingIcon name="compass" />
        </header>
        <div className="walking-summary">
          <div className="walking-theme">りんご</div>
          <div className="walking-time" aria-label="残り時間">
            <WalkingIcon name="clock" />
            <Timer remaining={remaining} />
          </div>
        </div>
        {(orientationStatus === 'permission-required' ||
          orientationStatus === 'denied' ||
          orientationStatus === 'error') && (
          <div className="mb-3 rounded bg-amber-100 p-3 text-sm text-amber-900" role="status">
            <p>
              {orientationStatus === 'denied'
                ? '傾きセンサーの利用が拒否されています。ブラウザの設定で許可してください。'
                : orientationStatus === 'error'
                  ? '傾きセンサーを有効にできませんでした。もう一度お試しください。'
                  : '歩きスマホ警告のため、端末の傾きセンサーの利用を許可してください。'}
            </p>
            <button
              onClick={requestPermission}
              disabled={isRequesting}
              className="mt-2 rounded bg-amber-900 px-3 py-2 text-white disabled:opacity-50"
            >
              {isRequesting ? '確認中…' : '傾きセンサーを有効にする'}
            </button>
          </div>
        )}
        {orientationStatus === 'unsupported' && (
          <div className="mb-3 rounded bg-amber-100 p-3 text-sm text-amber-900" role="status">
            この環境では歩きスマホ検知を利用できません。HTTPS対応のスマートフォンでご利用ください。
          </div>
        )}
        <section className="walking-map" aria-label="現在地と歩いた軌跡の地図">
          <MapView trail={trail} />
          {paused && !isLooking && <div className="walking-paused">一時停止中</div>}
          {isLooking && (
            <div className="walking-warning" role="alert">
              <div>
                <p>前を向いて歩いてください。</p>
                <p>軌跡の記録を一時停止しています。</p>
                <p>
                  {paused
                    ? '端末を傾けてから「再開する」を押してください。'
                    : '端末を傾けると記録が再開します。'}
                </p>
              </div>
            </div>
          )}
        </section>
        {gpsError && (
          <p className="walking-error" role="alert">
            位置情報を取得できません：{gpsError}
          </p>
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
              onClick={() => void handleFinish()}
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
