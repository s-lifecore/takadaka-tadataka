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
  const navigate = useNavigate()
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
        <main className="collection-page">
          <div className="collection-content">
            <header className="collection-header">
              <button type="button" aria-label="ホームに戻る" onClick={() => navigate('/')}>
                <span aria-hidden="true">⌂</span>
              </button>
              <h1>作品帳</h1>
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
              <strong>0作品</strong>
            </div>
            <p className="collection-state" role="status">
              保存した作品はここに表示されます。
            </p>
            <p className="collection-memory">旅の思い出がここに増えていくよ</p>
            <footer className="collection-footer">
              <button
                type="button"
                className="collection-empty"
                onClick={() => navigate('/playalone')}
              >
                絵をかいてみよう
              </button>
            </footer>
          </div>
        </main>
      </SignedIn>
    </>
  )
}
