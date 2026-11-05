import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { loadDrawing, saveResult } from '../lib/drawings'
import { Judgement } from './Judgement'
import { AdvancedImage } from '@cloudinary/react'
import { Cloudinary } from '@cloudinary/url-gen'
import { auto } from '@cloudinary/url-gen/actions/resize'
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity'
import { uploadDrawingImage } from '../lib/cloudinary'
import { TrailCanvas } from '../components/TrailCanvas'
import { saveDrawing, signInAnon } from '../lib/firebase'
import { judgeDrawing } from '../lib/huggingface'
import { loadTrail } from '../lib/drawings'
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
    [id, theme, result, savedResult, imagePublicId],
  )

    if (started.current) return
    started.current = true
    setJudging(true)
    setSaved(false)
    setError(null)
    const theme = 'りんご'
    try {
      const res = await judgeDrawing(base64, 'りんご')
      setResult(res)
      setJudging(false)
      setSaving(true)
      const user = await signInAnon()
      const savedDrawing = await saveDrawing(user.uid, theme, base64, res)
      setImagePublicId(savedDrawing.imagePublicId)
      setSaved(true)
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setJudging(false)
      setSaving(false)
    }
  }, [])

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

      {result && (
        <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-6 space-y-3">
          <div className="text-center">
            <span className="text-4xl font-bold">{result.score.toFixed(5)}</span>
            <span className="text-2xl text-gray-400">%</span>
          </div>
          <p className="text-sm text-gray-500">{result.reason}</p>
        </div>
      )}

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
