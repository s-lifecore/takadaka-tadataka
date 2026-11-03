import { useCallback, useRef, useState } from 'react'
import { TrailCanvas } from '../components/TrailCanvas'
import { judgeDrawing } from '../lib/gemini'
import type { AIResult, TrailPoint } from '../types'
import { Judgement } from './Judgement'

type Props = {
  trail: TrailPoint[]
  onRetry: () => void
}

export function Result({ trail, onRetry }: Props) {
  const [result, setResult] = useState<AIResult | null>(null)
  const [judging, setJudging] = useState(trail.length >= 2)
  const [error, setError] = useState<string | null>(null)
  const requested = useRef(false)
  const image = useRef<string | null>(null)

  const handleCanvasReady = useCallback(async (base64: string) => {
    if (requested.current) return
    requested.current = true
    image.current = base64
    setError(null)
    setJudging(true)
    try {
      const res = await judgeDrawing(base64, 'りんご')
      setResult(res)
    } catch {
      setError('作品を判定できませんでした。通信環境を確認して、もう一度お試しください。')
    } finally {
      setJudging(false)
    }
  }, [])

  if (judging) {
    return (
      <Judgement>
        <TrailCanvas trail={trail} onReady={handleCanvasReady} />
      </Judgement>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-white p-6 gap-6">
      <h2 className="text-2xl font-bold">結果</h2>

      <div className="w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden">
        <TrailCanvas trail={trail} onReady={handleCanvasReady} />
      </div>

      {trail.length < 2 && (
        <p className="text-center text-gray-600">
          判定できる軌跡がありません。位置情報を有効にして、もう一度歩いてみてください。
        </p>
      )}

      {error && (
        <div className="text-center space-y-3" role="alert">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            type="button"
            className="underline"
            onClick={() => {
              if (!image.current) return
              requested.current = false
              void handleCanvasReady(image.current)
            }}
          >
            もう一度判定する
          </button>
        </div>
      )}

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
        onClick={onRetry}
        className="w-full max-w-sm py-4 border-2 border-black text-black text-lg font-semibold rounded-2xl"
      >
        もう一度
      </button>
    </div>
  )
}
