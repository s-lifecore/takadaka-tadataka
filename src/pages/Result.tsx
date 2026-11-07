import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { loadDrawing, saveResult } from '../lib/drawings'
import { Judgement } from './Judgement'
import { AdvancedImage } from '@cloudinary/react'
import { Cloudinary } from '@cloudinary/url-gen'
import { auto } from '@cloudinary/url-gen/actions/resize'
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity'
import { TrailCanvas } from '../components/TrailCanvas'
import { judgeDrawing } from '../lib/gemini'
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
  const requested = useRef(false)

  const handleCanvasReady = useCallback(
    async (base64: string) => {
      if (requested.current) return
      requested.current = true
      setImage(base64)
      if (savedResult) return
      setError(null)
      setJudging(true)
      const minimumDisplay = new Promise<void>((resolve) => {
        window.setTimeout(resolve, MIN_JUDGEMENT_MS)
      })
      try {
        const res = result ?? (await judgeDrawing(base64, theme))
        setResult(res)
        const saved = await saveResult(id, res, base64)
        const publicId = imagePublicId ?? saved.imagePublicId
        setImagePublicId(publicId)
        setSaved(true)
      } catch {
        setError('判定または保存に失敗しました。通信環境を確認して、もう一度お試しください。')
      } finally {
        await minimumDisplay
        setJudging(false)
      }
    },
    [id, theme, result, savedResult, imagePublicId],
  )

  function saveArtwork() {
    if (!image) return
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${image}`
    link.download = `takadaka-tadataka-${new Date().toISOString().slice(0, 10)}.png`
    link.click()
  }

  const cloudinary = new Cloudinary({
    cloud: { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME },
  })
  const generatedImage = imagePublicId
    ? cloudinary
        .image(imagePublicId)
        .format('auto')
        .quality('auto')
        .resize(auto().gravity(autoGravity()).width(500).height(500))
    : null

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
          <div className="result-canvas">
            <TrailCanvas trail={trail} onReady={handleCanvasReady} />
            {trail.length < 2 && <p>記録された軌跡がありません</p>}
          </div>
          <p className="result-artwork-caption">地図を含まないGPSの線画</p>
        </section>

        {generatedImage && (
          <div className="w-64 h-64 mx-auto mt-4 border-2 border-gray-200 rounded-xl overflow-hidden">
            <AdvancedImage cldImg={generatedImage} />
          </div>
        )}
        {saved && <p className="result-message">保存しました</p>}
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
                {result ? '保存を再試行する' : 'もう一度判定する'}
              </button>
            </div>
          )}
        </section>

        <footer className="result-actions">
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
