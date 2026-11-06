import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { latLng } from 'leaflet'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { loadDrawing, saveResult } from '../lib/drawings'
import { Judgement } from './Judgement'
import { uploadDrawingImage } from '../lib/cloudinary'
import { TrailCanvas } from '../components/TrailCanvas'
import { judgeDrawing } from '../lib/groq'
import { MapView } from '../components/MapView'
import type { AIResult, TrailPoint } from '../types'

const MIN_JUDGEMENT_MS = 3000

export function Result() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Navigate to="/" replace />
  return <LoadResult key={id} id={id} />
}

function LoadResult({ id }: { id: string }) {
  const [drawing, setDrawing] = useState<{
    theme: string
    trail: TrailPoint[]
    result?: AIResult
    imagePublicId?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    loadDrawing(id)
      .then((value) => {
        if (active) setDrawing(value)
      })
      .catch(() => {
        if (active) setError('作品を読み込めませんでした。URLと通信環境を確認してください。')
      })
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
  if (!drawing)
    return (
      <main className="p-6" role="status">
        作品を読み込み中…
      </main>
    )
  return (
    <DrawingResult
      id={id}
      trail={drawing.trail}
      theme={drawing.theme}
      savedResult={drawing.result}
      savedImagePublicId={drawing.imagePublicId}
    />
  )
}

function DrawingResult({
  id,
  trail,
  theme,
  savedResult,
  savedImagePublicId,
}: {
  id: string
  trail: TrailPoint[]
  theme: string
  savedResult?: AIResult
  savedImagePublicId?: string
}) {
  const navigate = useNavigate()
  const [result, setResult] = useState<AIResult | null>(savedResult ?? null)
  const [judging, setJudging] = useState(!savedResult && trail.length >= 2)
  const [error, setError] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [imagePublicId, setImagePublicId] = useState(savedImagePublicId)
  const [saved, setSaved] = useState(Boolean(savedResult))
  const [shareMessage, setShareMessage] = useState('')
  const [sharing, setSharing] = useState(false)
  const requested = useRef(false)
  const distanceKm = useMemo(
    () =>
      trail.reduce((meters, point, index) => {
        if (index === 0) return meters
        const previous = trail[index - 1]
        return meters + latLng(previous.lat, previous.lng).distanceTo([point.lat, point.lng])
      }, 0) / 1000,
    [trail],
  )

  const handleCanvasReady = useCallback(
    async (base64: string) => {
      if (requested.current) return
      requested.current = true
      setImage(base64)
      if (savedResult && savedImagePublicId) return
      setError(null)
      setJudging(true)
      const minimumDisplay = new Promise<void>((resolve) => {
        window.setTimeout(resolve, MIN_JUDGEMENT_MS)
      })
      try {
        const res = result ?? (await judgeDrawing(base64, theme))
        setResult(res)
        // 画像のアップロードが失敗しても、リロード時は保存済みの採点結果を使う。
        await saveResult(id, res)
        setSaved(true)
        const publicId = imagePublicId ?? (await uploadDrawingImage(base64)).publicId
        setImagePublicId(publicId)
        await saveResult(id, res, publicId)
        setSaved(true)
      } catch {
        setError('判定または保存に失敗しました。通信環境を確認して、もう一度お試しください。')
      } finally {
        await minimumDisplay
        setJudging(false)
      }
    },
    [id, theme, result, savedResult, savedImagePublicId, imagePublicId],
  )

  const saveArtwork = () => {
    if (!image) return
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${image}`
    link.download = `drawing-${id}.png`
    link.click()
  }

  const resultUrl = new URL(`/result/${encodeURIComponent(id)}`, window.location.origin).href
  const shareTitle = `お題「${theme}」に挑戦！`
  const shareText = `${shareTitle} AIスコア: ${result?.score ?? 0}点\n歩いて絵を描くゲーム「高々忠敬」 #高々忠敬`
  const xShareUrl = `https://x.com/intent/tweet?${new URLSearchParams({ text: shareText, url: resultUrl })}`

  const shareArtwork = async () => {
    setShareMessage('')
    setSharing(true)
    try {
      await navigator.share({ title: shareTitle, text: shareText, url: resultUrl })
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setShareMessage('共有できませんでした。XでシェアまたはURLコピーをお試しください。')
      }
    } finally {
      setSharing(false)
    }
  }

  const copyResultUrl = async () => {
    setShareMessage('')
    try {
      await navigator.clipboard.writeText(resultUrl)
      setShareMessage('URLをコピーしました。')
    } catch {
      setShareMessage('URLをコピーできませんでした。ブラウザのアドレス欄からコピーしてください。')
    }
  }

  if (judging) {
    return (
      <Judgement>
        <TrailCanvas trail={trail} onReady={handleCanvasReady} />
      </Judgement>
    )
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
          <div className="result-route-heading">
            <span>歩いた経路</span>
            <p>
              歩行距離 <strong>{distanceKm.toFixed(2)}</strong> km
            </p>
          </div>
          {trail.length > 0 ? (
            <div className="result-route-map" role="region" aria-label="歩行経路の地図">
              <MapView trail={trail} fitTrail />
            </div>
          ) : (
            <p className="result-message">記録された歩行経路がありません。</p>
          )}
          <p className="result-route-note">距離は記録されたGPSの軌跡から計算した目安です。</p>
          <div hidden aria-hidden="true">
            <TrailCanvas trail={trail} onReady={handleCanvasReady} />
          </div>
        </section>

        <section className="result-score" aria-label="AIの採点結果" aria-busy={judging}>
          <h2>AIの採点結果</h2>
          {result && saved ? (
            <>
              <p className="result-points">
                {result.score}
                <span>点</span>
              </p>
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
                {result ? '保存を再試行する' : 'もう一度判定する'}
              </button>
            </div>
          )}
        </section>

        <footer className="result-actions">
          {result && saved && (
            <>
              <a
                className="result-share"
                href={xShareUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Xでシェアする
              </a>
              {typeof navigator.share === 'function' && (
                <button
                  type="button"
                  className="result-home"
                  disabled={sharing}
                  onClick={() => void shareArtwork()}
                >
                  {sharing ? '共有中…' : '共有する'}
                </button>
              )}
              <button type="button" className="result-home" onClick={() => void copyResultUrl()}>
                URLをコピーする
              </button>
              <p role="status" aria-live="polite">
                {shareMessage}
              </p>
            </>
          )}
          <button type="button" className="result-save" disabled={!image} onClick={saveArtwork}>
            作品を保存する
          </button>
          <button type="button" className="result-home" onClick={() => navigate('/')}>
            ホームに戻る
          </button>
        </footer>
      </div>
    </main>
  )
}
