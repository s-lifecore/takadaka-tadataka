import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapView } from '../components/MapView'
import { Timer } from '../components/Timer'
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
  const { trail, error, start: startGPS, stop: stopGPS } = useGeolocation(initialTrail)
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

      <div className="flex-1 relative">
        <MapView trail={trail} />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
          軌跡: {trail.length} 点
        </div>
      </div>
    </div>
  )
}
