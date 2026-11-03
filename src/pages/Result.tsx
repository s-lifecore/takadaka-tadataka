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

  function saveArtwork() {
    if (!image.current) return
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${image.current}`
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

  if (judging)
    return (
      <div className="judgement-page">
        <div className="judgement-content">
          <header className="judgement-header">おさんぽの結果</header>
          <div className="judgement-heading">
            <h1>AIが判定中です</h1>
            <p>歩いた軌跡から作品を採点しています…</p>
          </div>
          <div className="judgement-artwork">
            <div className="judgement-preview">
              <TrailCanvas trail={trail} onReady={handleCanvasReady} />
            </div>
            <p>作品を読み込んでいます</p>
          </div>
          <div className="judgement-progress">
            <span />
          </div>
          <p className="judgement-caption">少しだけ待ってね</p>
        </div>
      </div>
    )

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
        {saving && <p className="result-message">結果を保存中...</p>}
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
            <p className="result-message">
              {error ? '判定結果を取得できませんでした' : '採点できる軌跡がありません'}
            </p>
          )}
          {error && (
            <div className="result-error" role="alert">
              <p>{error}</p>
              <button
                type="button"
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
        </section>
        <footer className="result-actions">
          <button
            type="button"
            className="result-save"
            disabled={!image.current}
            onClick={saveArtwork}
          >
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
