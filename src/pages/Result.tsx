import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { loadDrawing, saveResult } from '../lib/drawings'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TrailCanvas } from '../components/TrailCanvas'
import { AdvancedImage } from '@cloudinary/react'
import { Cloudinary } from '@cloudinary/url-gen'
import { auto } from '@cloudinary/url-gen/actions/resize'
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity'
import { uploadDrawingImage } from '../lib/cloudinary'
import { judgeDrawing } from '../lib/gemini'
import type { AIResult, TrailPoint } from '../types'

export function Result() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Navigate to="/" replace />
  return <LoadResult key={id} id={id} />
}

function LoadResult({ id }: { id: string }) {
  const [drawing, setDrawing] = useState<Awaited<ReturnType<typeof loadDrawing>> | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    loadDrawing(id).then(
      (value) => {
        if (active) setDrawing(value)
      },
      () => {
        if (active) setError(true)
      },
    )
    return () => {
      active = false
    }
  }, [id])
  if (error)
    return (
      <main className="p-6">
        <p role="alert">作品を読み込めませんでした。URLと通信環境を確認してください。</p>
        <Link to="/">ホームに戻る</Link>
      </main>
    )
  if (!drawing) return <p role="status">作品を読み込み中…</p>
  return <DrawingResult id={id} {...drawing} />
}

function DrawingResult({
  id,
  trail,
  theme,
  result: savedResult,
  imagePublicId: savedImagePublicId,
}: {
  id: string
  trail: TrailPoint[]
  theme: string
  result?: AIResult
  imagePublicId?: string
}) {
  const navigate = useNavigate()
  const [imagePublicId, setImagePublicId] = useState(savedImagePublicId ?? null)
  const uploadedImage = useRef(savedImagePublicId ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(Boolean(savedResult))
  const requested = useRef(false)
  const image = useRef<string | null>(null)
  const [result, setResult] = useState<AIResult | null>(savedResult ?? null)
  const [judging, setJudging] = useState(!savedResult && trail.length >= 2)
  const [error, setError] = useState<string | null>(null)

  const handleCanvasReady = useCallback(
    async (base64: string) => {
      image.current = base64
      if (requested.current || savedResult) return
      requested.current = true
      setError(null)
      setJudging(true)
      try {
        const res = result ?? (await judgeDrawing(base64, theme))
        setResult(res)
        setSaving(true)
        if (!uploadedImage.current)
          uploadedImage.current = (await uploadDrawingImage(base64)).publicId
        await saveResult(id, res, uploadedImage.current)
        setImagePublicId(uploadedImage.current)
        setSaved(true)
      } catch {
        setError('作品の判定または保存に失敗しました。通信環境を確認して再試行してください。')
      } finally {
        setJudging(false)
        setSaving(false)
      }
    },
    [id, theme, result, savedResult],
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

  return (
    <div className="flex flex-col items-center min-h-screen bg-white p-6 gap-6">
      <h2 className="text-2xl font-bold">結果</h2>

      <div className="w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden">
        <TrailCanvas trail={trail} onReady={handleCanvasReady} />
      </div>

      {judging && <p className="text-gray-500">AI が判定中...</p>}
      {saving && <p className="text-gray-500">結果を保存中...</p>}
      {saved && <p className="text-green-600">保存しました</p>}

      {generatedImage && (
        <div className="w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden">
          <AdvancedImage cldImg={generatedImage} />
        </div>
      )}

      {error && (
        <div role="alert">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            type="button"
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
      {trail.length < 2 && <p>採点できる軌跡がありません。</p>}

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
        ホームに戻る
      </button>
    </div>
  )
}
