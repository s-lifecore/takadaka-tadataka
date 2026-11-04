import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loadDrawing, saveResult } from '../lib/firebase'
import { TrailCanvas } from '../components/TrailCanvas'
import { judgeDrawing } from '../lib/gemini'
import type { AIResult, TrailPoint } from '../types'

export function Result() {
  const { id } = useParams<{ id: string }>()
  return <DrawingResult key={id} id={id!} />
}

function DrawingResult({ id }: { id: string }) {
  const navigate = useNavigate()
  const [trail, setTrail] = useState<TrailPoint[] | null>(null)
  const [theme, setTheme] = useState('りんご')
  const started = useRef(false)
  const [result, setResult] = useState<AIResult | null>(null)
  const [judging, setJudging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadDrawing(id)
      .then((drawing) => {
        if (!active) return
        setTheme(drawing.theme)
        if (drawing.result) {
          started.current = true
          setResult(drawing.result)
        }
        setTrail(drawing.trail)
      })
      .catch(() => {
        if (active) setError('結果を読み込めませんでした。URLと通信環境を確認してください。')
      })
    return () => {
      active = false
    }
  }, [id])

  const handleCanvasReady = useCallback(
    async (base64: string) => {
      if (started.current) return
      started.current = true
      setJudging(true)
      try {
        const res = await judgeDrawing(base64, theme)
        setResult(res)
        await saveResult(id, res)
      } catch (e) {
        setError(String(e))
      } finally {
        setJudging(false)
      }
    },
    [id, theme],
  )

  return (
    <div className="flex flex-col items-center min-h-screen bg-white p-6 gap-6">
      <h2 className="text-2xl font-bold">結果</h2>

      <div className="w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden">
        {trail && <TrailCanvas trail={trail} onReady={handleCanvasReady} />}
      </div>

      {!trail && !error && <p>結果を読み込み中...</p>}
      {trail && trail.length < 2 && (
        <p>軌跡が足りないため採点できません。もう一度歩いてみましょう。</p>
      )}
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
