import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Ready } from './Ready'
import { MapView } from '../components/MapView'
import { Timer } from '../components/Timer'
import { useDeviceOrientation } from '../hooks/useDeviceOrientation'
import { useGeolocation } from '../hooks/useGeolocation'
import { useTimer, type TimerSnapshot } from '../hooks/useTimer'
import { useWakeLock } from '../hooks/useWakeLock'
import {
  clearLocalTrail,
  createDrawing,
  loadLocalTrail,
  loadTrail,
  saveLocalTrail,
  saveTrail,
} from '../lib/drawings'
import { UnsupportedDevice } from './UnsupportedDevice'
import type { TrailPoint } from '../types'

const GAME_SECONDS = 15 * 60
const LOCAL_SAVE_ERROR =
  'この端末に軌跡を一時保存できません。画面を閉じると未送信の軌跡が失われる可能性があります。'
const GPS_LOADING_MIN_MS = 5000

export function Game() {
  const { id } = useParams<{ id: string }>()
  return id ? <LoadGame key={id} id={id} /> : <StartCountdown />
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

  if (error) {
    return (
      <main className="ready-page flex flex-col items-center justify-center gap-6">
        <p role="alert">{error}</p>
        <Link to="/">ホームへ戻る</Link>
      </main>
    )
  }

  return <Ready count={remaining} onCancel={() => navigate('/')} />
}

function LoadGame({ id }: { id: string }) {
  const [trail, setTrail] = useState<TrailPoint[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [timer, setTimer] = useState<TimerSnapshot | undefined>(undefined)
  useEffect(() => {
    let active = true
    // Firestoreで所有者を確認してから、同じ作品の一時保存を復元する。
    loadTrail(id)
      .then(async (remoteTrail) => {
        try {
          const localTrail = await loadLocalTrail(id)
          if (active) setTimer(localTrail?.timer)
          return localTrail && localTrail.trail.length >= remoteTrail.length
            ? localTrail.trail
            : remoteTrail
        } catch {
          if (active) setLocalError(LOCAL_SAVE_ERROR)
          return remoteTrail
        }
      })
      .then(
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
  return (
    <PlayingGame id={id} initialTrail={trail} initialLocalError={localError} initialTimer={timer} />
  )
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

function PlayingGame({
  id,
  initialTrail,
  initialLocalError,
  initialTimer,
}: {
  id: string
  initialTrail: TrailPoint[]
  initialLocalError: string | null
  initialTimer?: TimerSnapshot
}) {
  const navigate = useNavigate()
  const [paused, setPaused] = useState(initialTimer?.paused ?? initialTimer?.endAt === null)
  const initiallyPaused = useRef(paused)
  const {
    isShaking,
    isStationary: isMotionStationary,
    status: motionStatus,
    isRequesting,
    requestPermission,
  } = useDeviceOrientation()
  const {
    trail,
    currentPosition,
    isLocating,
    error: gpsError,
    isPositionUnavailable,
    start: startGPS,
    stop: stopGPS,
    pause: pauseGPS,
    resume: resumeGPS,
  } = useGeolocation(initialTrail)
  const showWalkingWarning = isShaking
  const {
    remaining,
    running,
    expired,
    start: startTimer,
    stop: stopTimer,
    getSnapshot,
  } = useTimer(GAME_SECONDS, initialTimer)
  const { acquire, release, status: wakeLockStatus, error: wakeLockError } = useWakeLock()
  const finishing = useRef(false)
  const saved = useRef(false)
  const expiryHandled = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [localError, setLocalError] = useState(initialLocalError)
  // 逐次保存と完了時の削除を同じキューに入れ、古い書き込みによる復活を防ぐ。
  const localWrites = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saved.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [])

  const [minimumGPSLoading, setMinimumGPSLoading] = useState(true)
  const [gpsLoadingDismissed, setGPSLoadingDismissed] = useState(false)
  const showGPSLoading =
    !gpsLoadingDismissed &&
    (isLocating || minimumGPSLoading) &&
    !gpsError &&
    !paused &&
    !saving &&
    !expired

  useEffect(() => {
    const timeout = setTimeout(() => setMinimumGPSLoading(false), GPS_LOADING_MIN_MS)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!initiallyPaused.current) startGPS()
    acquire()
    return () => {
      stopGPS()
      stopTimer()
      release()
    }
  }, [startGPS, stopGPS, stopTimer, acquire, release])
  useEffect(() => {
    if (showGPSLoading || isLocating || !currentPosition || gpsError || paused || saving || expired)
      stopTimer()
    else startTimer()
  }, [
    showGPSLoading,
    isLocating,
    currentPosition,
    gpsError,
    paused,
    saving,
    expired,
    startTimer,
    stopTimer,
  ])
  useEffect(() => {
    if (paused || saving || expired) {
      pauseGPS()
      stopGPS()
    } else {
      resumeGPS()
      startGPS()
    }
  }, [paused, saving, expired, pauseGPS, stopGPS, resumeGPS, startGPS])
  useEffect(() => {
    if (finishing.current || saved.current) return
    const timer = { ...getSnapshot(), paused }
    localWrites.current = localWrites.current
      .then(() => saveLocalTrail(id, trail, timer))
      .then(() => setLocalError(null))
      .catch(() => setLocalError(LOCAL_SAVE_ERROR))
  }, [id, trail, running, paused, getSnapshot])

  const handleFinish = useCallback(async () => {
    if (finishing.current) return
    finishing.current = true
    setSaving(true)
    setSaveError(null)
    pauseGPS()
    stopGPS()
    stopTimer()
    setPaused(true)
    release()
    try {
      const timer = { ...getSnapshot(), paused: true }
      localWrites.current = localWrites.current
        .then(() => saveLocalTrail(id, trail, timer))
        .catch(() => setLocalError(LOCAL_SAVE_ERROR))
      await localWrites.current
      await saveTrail(id, trail)
      saved.current = true
      // Firestore保存後の削除失敗は、保存済みの結果への遷移を妨げない。
      await clearLocalTrail(id).catch(() => undefined)
      navigate(`/result/${id}`)
    } catch {
      setSaveError(
        '軌跡を保存できませんでした。通信環境を確認して、完了ボタンで再試行してください。',
      )
      finishing.current = false
      setSaving(false)
    }
  }, [id, navigate, pauseGPS, stopGPS, stopTimer, trail, release, getSnapshot])
  useEffect(() => {
    if (expired && !expiryHandled.current) {
      expiryHandled.current = true
      void handleFinish()
    }
  }, [expired, handleFinish])

  const togglePause = useCallback(() => {
    if (paused) {
      resumeGPS()
      setGPSLoadingDismissed(true)
      startGPS()
      acquire()
    } else {
      pauseGPS()
      stopTimer()
    }
    setPaused((value) => !value)
  }, [paused, resumeGPS, startGPS, pauseGPS, stopTimer, acquire])

  if (isPositionUnavailable) return <UnsupportedDevice />

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
        {!saving && !saveError && !expired && (
          <div className="bg-amber-50 text-amber-950 text-sm px-4 py-2" role="status">
            {wakeLockStatus === 'active' ? (
              <p>自動消灯の防止：有効</p>
            ) : wakeLockStatus === 'requesting' || wakeLockStatus === 'idle' ? (
              <p>自動消灯の防止：確認中…</p>
            ) : (
              <>
                <p>{wakeLockError ?? '自動消灯の防止が解除されました。'}</p>
                <p>省電力モードやブラウザの設定を確認してください。</p>
                {wakeLockStatus !== 'unavailable' && (
                  <button onClick={acquire} className="mt-1 underline">
                    自動消灯の防止を再試行
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {(motionStatus === 'permission-required' ||
          motionStatus === 'denied' ||
          motionStatus === 'error') && (
          <div className="mb-3 rounded bg-amber-100 p-3 text-sm text-amber-900" role="status">
            <p>
              {motionStatus === 'denied'
                ? '加速度センサーの利用が拒否されています。ブラウザの設定で許可してください。'
                : motionStatus === 'error'
                  ? '加速度センサーを有効にできませんでした。もう一度お試しください。'
                  : '歩きスマホ警告のため、端末の加速度センサーの利用を許可してください。'}
            </p>
            <button
              onClick={requestPermission}
              disabled={isRequesting}
              className="mt-2 rounded bg-amber-900 px-3 py-2 text-white disabled:opacity-50"
            >
              {isRequesting ? '確認中…' : '加速度センサーを有効にする'}
            </button>
          </div>
        )}
        {motionStatus === 'unsupported' && (
          <div className="mb-3 rounded bg-amber-100 p-3 text-sm text-amber-900" role="status">
            この環境では加速度センサーを利用できないため、地図の表示を制限しています。HTTPS対応のスマートフォンでご利用ください。
          </div>
        )}
        <section className="walking-map" aria-label="現在地と歩いた軌跡の地図">
          <MapView trail={trail} currentPosition={currentPosition} />
          {showGPSLoading && (
            <div
              className="walking-gps-loading"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="walking-gps-loading-card">
                <span className="walking-gps-spinner" aria-hidden="true" />
                <h2>位置情報を取得しています</h2>
                <p>立ち止まって、そのままお待ちください。</p>
                <p>取得に20〜40秒ほどかかる場合があります。</p>
                <p className="walking-gps-loading-hint">
                  位置情報の利用を求められたら、許可してください。
                </p>
              </div>
            </div>
          )}
          {!isMotionStationary &&
            !showWalkingWarning &&
            !showGPSLoading &&
            !paused &&
            !saving &&
            !expired && (
              <div className="walking-warning" role="status">
                <div>
                  <p>
                    {motionStatus === 'listening'
                      ? '端末の動きを確認しています。'
                      : '端末の動きを確認できません。'}
                  </p>
                  <p>
                    {motionStatus === 'listening'
                      ? '3秒間、端末を動かさずにお待ちください。'
                      : '加速度センサーが利用できる環境で、利用を許可してください。'}
                  </p>
                </div>
              </div>
            )}
          {paused && isMotionStationary && !showWalkingWarning && (
            <div
              className={saving ? 'walking-paused' : 'walking-warning'}
              role={saving ? undefined : 'status'}
            >
              <div>
                <p>一時停止中</p>
                {!saving && (
                  <>
                    <p>軌跡の記録とタイマーを停止しています。</p>
                    <p>「再開する」を押すと再開します。</p>
                  </>
                )}
              </div>
            </div>
          )}
          {showWalkingWarning && !showGPSLoading && (
            <div className="walking-warning" role="alert">
              <div>
                <p>前を向いて歩いてください。</p>
                <p>
                  {paused
                    ? '一時停止中のため、軌跡の記録は停止しています。'
                    : '地図を暗くしていますが、軌跡の記録は続けています。'}
                </p>
                <p>
                  {paused
                    ? '立ち止まってから「再開する」を押してください。'
                    : '3秒間、端末の動きが収まると地図が見えるようになります。'}
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
        {localError && (
          <p className="walking-error" role="alert">
            {localError}
          </p>
        )}
        <footer className="walking-footer">
          <div className="walking-actions">
            <button
              type="button"
              onClick={togglePause}
              aria-pressed={paused}
              disabled={saving || expired || !!saveError}
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
