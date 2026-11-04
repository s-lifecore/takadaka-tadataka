import { useCallback, useState } from 'react'
import { TrailCanvas } from '../components/TrailCanvas'
import { judgeDrawing } from '../lib/gemini'
import type { AIResult, TrailPoint } from '../types'

type Props = {
  trail: TrailPoint[]
  onRetry: () => void
}

export function Result({ trail, onRetry }: Props) {
  const [result, setResult] = useState<AIResult | null>(null)
  const [judging, setJudging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCanvasReady = useCallback(async (base64: string) => {
    setJudging(true)
    try {
      const res = await judgeDrawing({ imageBase64: base64, theme: 'りんご' })
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
