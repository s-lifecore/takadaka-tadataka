import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import dayjs from 'dayjs'
import { auth } from '../lib/firebase'
import { getDrawingImageUrl } from '../lib/cloudinary'
import { loadSavedDrawings, type SavedDrawing } from '../lib/drawings'
import { TrailCanvas } from '../components/TrailCanvas'
import { Link, useNavigate } from 'react-router-dom'

function BookIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5C8 2 5 3 3 3v15c3 0 6 0 9 3 3-3 6-3 9-3V3c-2 0-5-1-9 2Zm0 0v16M6 6l3 1M6 9l3 1m6-3 3-1" />
    </svg>
  )
}

function Artwork({ drawing }: { drawing: SavedDrawing }) {
  const [failed, setFailed] = useState(false)
  const imageUrl = drawing.imagePublicId ? getDrawingImageUrl(drawing.imagePublicId) : null
  return imageUrl && !failed ? (
    <img
      src={imageUrl}
      alt={`${drawing.theme}の作品`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : drawing.trail.length >= 2 ? (
    <div role="img" aria-label={`${drawing.theme}の線画`}>
      <TrailCanvas trail={drawing.trail} />
    </div>
  ) : (
    <p>作品画像がありません</p>
  )
}

export function Collection() {
  const navigate = useNavigate()
  const [drawings, setDrawings] = useState<SavedDrawing[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    let request = 0
    const unsubscribe = onAuthStateChanged(auth, () => {
      const currentRequest = ++request
      setDrawings([])
      setStatus('loading')
      loadSavedDrawings()
        .then((items) => {
          if (active && currentRequest === request) {
            setDrawings(items)
            setStatus('ready')
          }
        })
        .catch(() => {
          if (active && currentRequest === request) setStatus('error')
        })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [attempt])
  return (
    <main className="collection-page">
      <div className="collection-content">
        <header className="collection-header">
          <button type="button" aria-label="ホームに戻る" onClick={() => navigate('/')}>
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m3 10 9-8 9 8v11h-7v-8h-4v8H3Z" />
            </svg>
          </button>
          <h1>作品帳</h1>
          <svg
            className="collection-compass"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden="true"
          >
            <ellipse cx="12" cy="12" rx="8" ry="10" transform="rotate(35 12 12)" />
            <path d="m15 7-2 7-4 3 2-7Z" />
          </svg>
        </header>

        <div className="collection-heading">
          <span className="collection-eyebrow">MY SKETCHES</span>
          <h2>
            <span aria-hidden="true">✦</span>わたしの旅の記録<span aria-hidden="true">✦</span>
          </h2>
          <p>歩いて描いた絵を、思い出に残そう。</p>
        </div>

        <div className="collection-total">
          <BookIcon />
          <span>保存した作品</span>
          <strong>{status === 'ready' ? `${drawings.length}作品` : '—'}</strong>
        </div>

        {status === 'loading' && (
          <p className="collection-state" role="status">
            作品を読み込み中…
          </p>
        )}
        {status === 'error' && (
          <div className="collection-state" role="alert">
            <p>作品を取得できませんでした。</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}>
              もう一度読み込む
            </button>
          </div>
        )}
        {status === 'ready' && drawings.length === 0 && (
          <p className="collection-state" role="status">
            まだ作品がありません
          </p>
        )}
        {status === 'ready' &&
          drawings.map((drawing, index) => (
            <article
              key={drawing.id}
              className="collection-card"
              aria-label={`作品：${drawing.theme}`}
            >
              <div className="collection-card-header">
                <span>No. {String(index + 1).padStart(3, '0')}</span>
                <p>
                  旅の記録 <i aria-hidden="true">✦</i>
                </p>
              </div>
              <Link to={`/result/${drawing.id}`} aria-label={`${drawing.theme}の結果を見る`}>
                <div className="collection-artwork">
                  <Artwork drawing={drawing} />
                </div>
              </Link>
              <div className="collection-card-info">
                <div>
                  <p>お題</p>
                  <h3>{drawing.theme}</h3>
                </div>
                <div className="collection-score">
                  <span>AIスコア</span>
                  <strong>
                    {drawing.result.score}
                    <span>点</span>
                  </strong>
                </div>
              </div>
              <div className="collection-card-footer">
                <p>{drawing.result.reason}</p>
                {dayjs(drawing.savedAt).isValid() ? (
                  <time dateTime={drawing.savedAt} aria-label="保存日">
                    {dayjs(drawing.savedAt).format('YYYY.MM.DD')}
                  </time>
                ) : (
                  <span>保存日不明</span>
                )}
              </div>
            </article>
          ))}

        <p className="collection-memory">旅の思い出がここに増えていくよ</p>
        <footer className="collection-footer">
          <button type="button" className="collection-empty" onClick={() => navigate('/playalone')}>
            絵をかいてみよう
          </button>
        </footer>
      </div>
    </main>
  )
}
