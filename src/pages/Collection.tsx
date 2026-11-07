import { useNavigate } from 'react-router-dom'
import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react'

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
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return <p role="alert">Clerkの設定が完了していないため、作品帳を開けません。</p>
  }
  return (
    <>
      <SignedOut>
        <main className="collection-page">
          <div className="collection-content">
            <h1>作品帳</h1>
            <p>作品帳を見るにはログインしてください。</p>
            <SignInButton mode="modal">
              <button type="button">ログインする</button>
            </SignInButton>
          </div>
        </main>
      </SignedOut>
      <SignedIn>
        <CollectionContent />
      </SignedIn>
    </>
  )
}

function CollectionContent() {
  const navigate = useNavigate()
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
          <strong>1作品</strong>
        </div>

        <article className="collection-card" aria-label="サンプル作品：りんご">
          <div className="collection-card-header">
            <span>No. 001</span>
            <p>
              サンプル作品 <i aria-hidden="true">✦</i>
            </p>
          </div>
          <div className="collection-artwork">
            <svg
              viewBox="0 0 260 158"
              fill="none"
              role="img"
              aria-label="歩いた軌跡をイメージした、りんごのサンプル線画"
            >
              <defs>
                <pattern id="collection-grid" width="33" height="33" patternUnits="userSpaceOnUse">
                  <path d="M33 0H0v33" stroke="#eee3d6" strokeWidth="1" />
                </pattern>
              </defs>
              <rect x="12" y="8" width="236" height="132" fill="url(#collection-grid)" />
              <path
                d="M121 40C89 20 58 49 62 85c3 34 25 46 47 40 13-4 18-4 28 0 26 9 48-7 52-36 5-34-13-51-46-51"
                stroke="#a75f40"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M121 40c1-13 8-22 17-27m-10 17c11-14 28-15 41-12-6 15-23 22-41 12Z"
                stroke="#a75f40"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="119" cy="40" r="4" fill="#a3b99a" stroke="#fffaf0" strokeWidth="1.5" />
              <circle cx="127" cy="40" r="4" fill="#df9563" stroke="#fffaf0" strokeWidth="1.5" />
              <path d="m14 14 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#f1e0c6" />
              <circle cx="233" cy="125" r="2.3" fill="#d4ad85" />
              <text x="130" y="149" textAnchor="middle" fill="#ae9176" fontSize="7">
                MY WALKING ART
              </text>
            </svg>
          </div>
          <div className="collection-card-info">
            <div>
              <p>お題</p>
              <h3>りんご</h3>
            </div>
            <div className="collection-score">
              <span>AIスコア</span>
              <strong>
                85<span>点</span>
              </strong>
            </div>
          </div>
          <div className="collection-card-footer">
            <p>AIの予想：りんご</p>
            <time dateTime="2026-11-02">2026.11.02</time>
          </div>
        </article>

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
          <p>※ お題・点数・日付はデザイン用のダミーデータです。</p>
        </footer>
      </div>
    </main>
  )
}
