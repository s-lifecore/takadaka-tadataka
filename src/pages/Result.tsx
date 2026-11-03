import { useCallback, useRef, useState } from 'react'
import { TrailCanvas } from '../components/TrailCanvas'
import { judgeDrawing } from '../lib/gemini'
import type { AIResult, TrailPoint } from '../types'

type Props = {
  trail: TrailPoint[]
  onHome: () => void
}

export function Result({ trail, onHome }: Props) {
  const [result, setResult] = useState<AIResult | null>(null)
  const [judging, setJudging] = useState(trail.length >= 2)
  const [error, setError] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const requested = useRef(false)

  const handleCanvasReady = useCallback(async (base64: string) => {
    if (requested.current) return
    requested.current = true
    setImage(base64)
    setError(null)
    setJudging(true)
    try {
      const res = await judgeDrawing(base64, 'りんご')
      setResult(res)
    } catch {
      setError('判定できませんでした。通信環境を確認して、もう一度お試しください。')
    } finally {
      setJudging(false)
    }
  }, [])

  function saveArtwork() {
    if (!image) return
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${image}`
    link.download = `takadaka-tadataka-${new Date().toISOString().slice(0, 10)}.png`
    link.click()
  }

  return (
    <main className="result-page">
      <div className="result-content">
        <header className="result-header">おさんぽの結果</header>
        <div className="result-heading">
          <h1>作品が完成したよ！</h1>
          <p>AIは何の絵だと思ったかな？</p>
        </div>

        <section className="result-artwork" aria-label="あなたの作品">
          <h2>あなたの作品</h2>
          <div className="result-canvas">
            <TrailCanvas trail={trail} onReady={handleCanvasReady} />
            {trail.length < 2 && <p>記録された軌跡がありません</p>}
          </div>
          <p className="result-artwork-caption">地図を含まないGPSの線画</p>
        </section>

        <section className="result-score" aria-label="AIの採点結果" aria-busy={judging}>
          <h2>AIの採点結果</h2>
          {result ? (
            <>
              <p className="result-points">
                {result.score}
                <span>点</span>
              </p>
              <p className="result-guess">AIの予想：{result.guess || '判定なし'}</p>
              <p className="result-reason">{result.reason}</p>
            </>
          ) : (
            <p className="result-message" role="status">
              {judging
                ? 'AIが作品を判定しています…'
                : error
                  ? '判定結果を取得できませんでした'
                  : '採点できる軌跡がありません'}
            </p>
          )}
          {error && (
            <div className="result-error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  if (!image) return
                  requested.current = false
                  void handleCanvasReady(image)
                }}
              >
                もう一度判定する
              </button>
            </div>
          )}
        </section>

        <footer className="result-actions">
          <button type="button" className="result-save" disabled={!image} onClick={saveArtwork}>
            作品を保存する
          </button>
          <button type="button" className="result-home" onClick={onHome}>
            ホームに戻る
          </button>
        </footer>
      </div>
    </main>
  )
}
