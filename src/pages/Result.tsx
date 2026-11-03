import { useCallback, useEffect, useRef, useState } from 'react'
import { AdvancedImage } from '@cloudinary/react'
import { Cloudinary } from '@cloudinary/url-gen'
import { auto } from '@cloudinary/url-gen/actions/resize'
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TrailCanvas } from '../components/TrailCanvas'
import { saveDrawing, signInAnon } from '../lib/firebase'
import { loadTrail } from '../lib/drawings'
import { judgeDrawing } from '../lib/gemini'
import type { AIResult, TrailPoint } from '../types'
import { Judgement } from './Judgement'

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
      (reason: unknown) => {
        if (active) setError(String(reason))
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
  const [result, setResult] = useState<AIResult | null>(null)
  const [judging, setJudging] = useState(trail.length >= 2)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [imagePublicId, setImagePublicId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requested = useRef(false)
  const image = useRef<string | null>(null)

  const handleCanvasReady = useCallback(async (base64: string) => {
    if (requested.current) return
    requested.current = true
    image.current = base64
    setJudging(true)
    setSaving(false)
    setSaved(false)
    setError(null)
    try {
      const theme = 'りんご'
      const judged = await judgeDrawing(base64, theme)
      setResult(judged)
      setSaving(true)
      const user = await signInAnon()
      const savedDrawing = await saveDrawing(user.uid, theme, base64, judged)
      setImagePublicId(savedDrawing.imagePublicId)
      setSaved(true)
    } catch (reason: unknown) {
      setError(
        String(reason) ||
          '作品を判定できませんでした。通信環境を確認して、もう一度お試しください。',
      )
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
    <div className="flex flex-col items-center min-h-screen bg-white p-6 gap-6">
      <h2 className="text-2xl font-bold">結果</h2>
      {trail.length < 2 && (
        <p className="text-center text-gray-600">
          判定できる軌跡がありません。位置情報を有効にして、もう一度歩いてみてください。
        </p>
      )}
      <div className="w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden">
        <TrailCanvas trail={trail} onReady={handleCanvasReady} />
      </div>
      {saving && <p className="text-gray-500">結果を保存中...</p>}
      {saved && <p className="text-green-600">保存しました</p>}
      {generatedImage && (
        <div className="w-64 h-64 border-2 border-gray-200 rounded-xl overflow-hidden">
          <AdvancedImage cldImg={generatedImage} />
        </div>
      )}
      {error && (
        <div className="text-center space-y-3" role="alert">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            type="button"
            className="underline"
            onClick={() => {
              if (image.current) {
                requested.current = false
                void handleCanvasReady(image.current)
              }
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
        onClick={() => navigate('/')}
        className="w-full max-w-sm py-4 border-2 border-black text-black text-lg font-semibold rounded-2xl"
      >
        もう一度
      </button>
    </div>
  )
}
