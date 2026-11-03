import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapView } from '../components/MapView'
import { Timer } from '../components/Timer'
import { useGeolocation } from '../hooks/useGeolocation'
import { useDeviceOrientation } from '../hooks/useDeviceOrientation'
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
      (id) => {
        if (active && countdownFinished) navigate(`/map/${id}`, { replace: true })
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
      (error: unknown) => {
        if (active) setError(String(error))
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

function PlayingGame({ id, initialTrail }: { id: string; initialTrail: TrailPoint[] }) {
  const navigate = useNavigate()
  const {
    trail,
    error,
    start: startGPS,
    stop: stopGPS,
    pause: pauseGPS,
    resume: resumeGPS,
  } = useGeolocation(initialTrail)
  const { isLooking, status, isRequesting, requestPermission } = useDeviceOrientation()
  useEffect(() => {
    if (isLooking) pauseGPS()
    else resumeGPS()
  }, [isLooking, pauseGPS, resumeGPS])
  const { remaining, expired, start: startTimer, stop: stopTimer } = useTimer(GAME_SECONDS)
  const finishing = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    startGPS()
    startTimer()
    return () => stopGPS()
  }, [startGPS, startTimer, stopGPS])

  const handleFinish = useCallback(async () => {
    if (finishing.current) return
    finishing.current = true
    setSaving(true)
    setSaveError(null)
    stopGPS()
    stopTimer()
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
  }, [id, navigate, stopGPS, stopTimer, trail])

  useEffect(() => {
    if (expired) handleFinish()
  }, [expired, handleFinish])

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow z-10">
        <span className="text-lg font-bold">🍎 りんご</span>
        <Timer remaining={remaining} />
        <button
          onClick={handleFinish}
          disabled={saving}
          className="text-sm text-gray-400 underline"
        >
          {saving ? '保存中…' : '完了'}
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 text-sm px-4 py-2">{error}</div>}
      {saveError && (
        <div role="alert" className="bg-red-100 text-red-700 text-sm px-4 py-2">
          {saveError}
        </div>
      )}

      {(status === 'permission-required' || status === 'denied' || status === 'error') && (
        <div className="bg-amber-100 text-amber-900 text-sm px-4 py-2" role="status">
          <p>
            {status === 'denied'
              ? '傾きセンサーの利用が拒否されています。ブラウザの設定で許可してください。'
              : status === 'error'
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
      {status === 'unsupported' && (
        <div className="bg-amber-100 text-amber-900 text-sm px-4 py-2" role="status">
          この環境では歩きスマホ検知を利用できません。HTTPS対応のスマートフォンでご利用ください。
        </div>
      )}

      <div className="flex-1 relative">
        <MapView trail={trail} />
        {isLooking && (
          <div
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-[1000] p-6"
            role="alert"
          >
            <div className="text-white text-center">
              <p className="text-xl font-bold">前を向いて歩いてください</p>
              <p className="mt-2 text-sm">軌跡の記録を一時停止しています</p>
              <p className="mt-1 text-sm">端末を傾けると記録が再開します</p>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
          軌跡: {trail.length} 点
        </div>
      </div>
    </div>
  )
}
