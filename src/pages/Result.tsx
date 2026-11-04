import { useCallback, useEffect, useRef, useState } from 'react'
import { AdvancedImage } from '@cloudinary/react'
import { Cloudinary } from '@cloudinary/url-gen'
import { auto } from '@cloudinary/url-gen/actions/resize'
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity'
import { uploadDrawingImage } from '../lib/cloudinary'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { loadDrawing, saveResult } from '../lib/drawings'
import { TrailCanvas } from '../components/TrailCanvas'
import { judgeDrawing } from '../lib/gemini'
import type { AIResult, TrailPoint } from '../types'
import { Judgement } from './Judgement'

const MIN_JUDGEMENT_MS = 3000

export function Result() {
  const { id } = useParams<{ id: string }>()
  return <LoadResult key={id} id={id!} />
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
      <main className="p-6">
        <p role="alert">{error}</p>
        <Link to="/">ホームへ戻る</Link>
      </main>
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
  const [imagePublicId, setImagePublicId] = useState(savedImagePublicId ?? null)
  const uploadedImage = useRef(savedImagePublicId ?? null)
  const requested = useRef(!!savedResult)
  const image = useRef<string | null>(null)

  const handleCanvasReady = useCallback(
    async (base64: string) => {
      if (requested.current) return
      requested.current = true
      image.current = base64
      setError(null)
      setJudging(true)
      const minimumDisplay = new Promise<void>((resolve) => {
        window.setTimeout(resolve, MIN_JUDGEMENT_MS)
      })
      try {
        const res = result ?? (await judgeDrawing(base64, theme))
        setResult(res)
        if (!uploadedImage.current) {
          uploadedImage.current = (await uploadDrawingImage(base64)).publicId
        }
        await saveResult(id, res, uploadedImage.current)
        setImagePublicId(uploadedImage.current)
      } catch {
        setError('作品の判定または保存に失敗しました。通信環境を確認して、もう一度お試しください。')
      } finally {
        await minimumDisplay
        setJudging(false)
      }
    },
    [id, theme, result],
      if (processedImage.current === base64) return
      processedImage.current = base64

      if (started.current) return
      started.current = true
      setJudging(true)
      setSaved(false)
      setError(null)
      const theme = 'りんご'
      try {
        const res = await judgeDrawing(base64, theme)
        setResult(res)
        setJudging(false)
        setSaving(true)
        const user = await signInAnon()
        const savedDrawing = await saveDrawing(user.uid, theme, base64, res, id)
        setImagePublicId(savedDrawing.imagePublicId)
        setSaved(true)
      } catch (e: unknown) {
        setError(String(e))
      } finally {
        setJudging(false)
        setSaving(false)
      }
    },
    [id],
  )

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
            {result ? '保存を再試行する' : 'もう一度判定する'}
          </button>
        </div>
      )}

      {generatedImage && (
        <div className="w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden">
          <AdvancedImage cldImg={generatedImage} />
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
        onClick={() => navigate('/')}
        className="w-full max-w-sm py-4 border-2 border-black text-black text-lg font-semibold rounded-2xl"
      >
        もう一度
      </button>
    </div>
  )
}
