import { useCallback, useEffect, useRef, useState } from 'react'
import { AdvancedImage } from '@cloudinary/react'
import { Cloudinary } from '@cloudinary/url-gen'
import { auto } from '@cloudinary/url-gen/actions/resize'
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TrailCanvas } from '../components/TrailCanvas'
import { saveDrawing, signInAnon } from '../lib/firebase'
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [imagePublicId, setImagePublicId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const processedImage = useRef<string | null>(null)

  const handleCanvasReady = useCallback(async (base64: string) => {
    if (processedImage.current === base64) return
    processedImage.current = base64

    if (started.current) return
    started.current = true
    setJudging(true)
    setSaved(false)
    setError(null)
    const theme = 'りんご'
    try {
      const res = await judgeDrawing({ imageBase64: base64, theme: 'りんご' })
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
  const image = imagePublicId
    ? cloudinary
        .image(imagePublicId)
        .format('auto')
        .quality('auto')
        .resize(auto().gravity(autoGravity()).width(500).height(500))
    : null

  return (
    <div className="flex flex-col items-center min-h-screen bg-white p-6 gap-6">
      <h2 className="text-2xl font-bold">結果</h2>

      {trail.length < 2 && <p>採点に必要な軌跡がありません。もう一度お試しください。</p>}

      <div className="w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden">
        <TrailCanvas trail={trail} onReady={handleCanvasReady} />
      </div>

      {judging && <p className="text-gray-500">AI が判定中...</p>}
      {saving && <p className="text-gray-500">結果を保存中...</p>}
      {saved && <p className="text-green-600">保存しました</p>}

      {image && (
        <div className="w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden">
          <AdvancedImage cldImg={image} />
        </div>
      )}

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
        onClick={() => navigate('/')}
        className="w-full max-w-sm py-4 border-2 border-black text-black text-lg font-semibold rounded-2xl"
      >
        もう一度
      </button>
    </div>
  )
}
