import { useEffect, useState } from 'react'
import { listDrawings } from '../lib/drawings'
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

export function Collection() {
  const navigate = useNavigate()
  const [drawings, setDrawings] = useState<Awaited<ReturnType<typeof listDrawings>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    listDrawings()
      .then((value) => {
        if (active) setDrawings(value)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [attempt])
  return (
    <main className="collection-page">
      <div className="collection-content">
        <header className="collection-header">
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
          <strong>{loading || error ? '—' : drawings.length}作品</strong>
        </div>

        {loading && <p role="status">作品を読み込み中…</p>}
        {error && (
          <div role="alert">
            <p>作品を読み込めませんでした。</p>
            <button onClick={() => setAttempt((value) => value + 1)}>再試行する</button>
          </div>
        )}
        {!loading && !error && drawings.length === 0 && <p>保存した作品はまだありません。</p>}
        {!loading &&
          !error &&
          drawings.map((drawing, index) => (
            <article
              className="collection-card"
              key={drawing.id}
              aria-label={`作品：${drawing.theme}`}
            >
              <div className="collection-card-header">
                <span>No. {index + 1}</span>
                <p>{drawing.theme}</p>
              </div>
              <Link to={`/result/${drawing.id}`} aria-label={`${drawing.theme}の結果を見る`}>
                <div className="collection-artwork">
                  <TrailCanvas trail={drawing.trail ?? []} />
                </div>
              </Link>
              <div className="collection-card-info">
                <h3>{drawing.theme}</h3>
                <div className="collection-score">
                  <span>AIスコア</span>
                  <strong>
                    {drawing.result?.score}
                    <span>点</span>
                  </strong>
                </div>
              </div>
              <div className="collection-card-footer">
                <p>{drawing.result?.reason}</p>
                <time dateTime={drawing.createdAt}>{drawing.createdAt.slice(0, 10)}</time>
              </div>
            </article>
          ))}

        <p className="collection-memory">旅の思い出がここに増えていくよ</p>
        <footer className="collection-footer">
          <button type="button" onClick={() => navigate('/')}>
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
            ホームに戻る
          </button>
        </footer>
      </div>
    </main>
  )
}
