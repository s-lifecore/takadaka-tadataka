import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TrailCanvas } from '../components/TrailCanvas'
import { judgeDrawing } from '../lib/gemini'
import { loadTrail } from '../lib/drawings'
import type { AIResult, TrailPoint } from '../types'

export function Result() {
  const { id } = useParams<{ id: string }>()
  const [trail, setTrail] = useState<TrailPoint[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
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
  if (!trail) return <p className="p-6">作品を読み込み中…</p>
  return <DrawingResult trail={trail} />
}

function DrawingResult({ trail }: { trail: TrailPoint[] }) {
  const navigate = useNavigate()
  const started = useRef(false)
  const [result, setResult] = useState<AIResult | null>(null)
  const [judging, setJudging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCanvasReady = useCallback(async (base64: string) => {
    if (started.current) return
    started.current = true
    setJudging(true)
    try {
      const res = await judgeDrawing(base64, 'りんご')
      setResult(res)
    } catch (e) {
      setError(String(e))
    } finally {
      setJudging(false)
    }
  }, [])

  return (
    <div className="flex flex-col items-center min-h-screen bg-white p-6 gap-6">
      <h2 className="text-2xl font-bold">結果</h2>

      {trail.length < 2 && <p>採点に必要な軌跡がありません。もう一度お試しください。</p>}

      <div className="w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden">
        <TrailCanvas trail={trail} onReady={handleCanvasReady} />
      </div>

      {judging && <p className="text-gray-500">AI が判定中...</p>}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {result && (
        <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-6 space-y-3">
          <div className="text-center">
            <span className="text-6xl font-bold">{result.score}</span>
            <span className="text-2xl text-gray-400">/100</span>
          </div>
          <p className="text-center text-gray-700">
            AIの答え：<strong>{result.guess}</strong>
          </p>
          <p className="text-center text-gray-700">
            AIの答え：<strong>{result.guess}</strong>
          </p>
          <p className="text-sm text-gray-500">{result.reason}</p>
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        className="w-full max-w-sm py-4 border-2 border-black text-black text-lg font-semibold rounded-2xl"
      >
        もう一度
      </button>
    </div>
  )
}
