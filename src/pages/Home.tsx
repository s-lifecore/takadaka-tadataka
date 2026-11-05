import { useNavigate } from 'react-router-dom'

function Icon({ kind }: { kind: 'compass' | 'steps' | 'people' | 'book' | 'guide' }) {
  const names = {
    compass: 'explore',
    steps: 'directions_walk',
    people: 'people',
    book: 'collections_bookmark',
    guide: 'menu_book',
  }
  return (
    <span className="material-icons home-icon" aria-hidden="true">
      {names[kind]}
    </span>
  )
}

function Illustration() {
  return (
    <svg className="home-illustration" viewBox="0 0 328 194" fill="none" aria-hidden="true">
      <path
        d="M8 46c45-26 53 28 99 9s50 60 99 32 55-39 90-6M10 131l29-32"
        stroke="#BD8C5E"
        strokeWidth="3"
        strokeDasharray="2 12"
        strokeLinecap="round"
      />
      <g stroke="#735339" strokeWidth="2">
        <circle cx="68" cy="74" r="32" fill="#F5E9D3" />
        <circle cx="68" cy="74" r="26" stroke="#C8A780" strokeDasharray="1 4" />
        <path d="M68 48v6m0 40v6M42 74h6m40 0h6" />
        <path d="m68 54 8 22-8 17-8-17Z" fill="#D68A59" />
        <circle cx="68" cy="74" r="4" fill="#FFF9ED" />
      </g>
      <path
        d="M164 64c-32-28-61 13-44 54 11 28 24 33 39 26 14-7 18 8 35 1 30-13 38-58 6-81-12-8-24-7-36 0Z"
        fill="#EAA38A"
        stroke="#73503B"
        strokeWidth="3"
      />
      <path d="M137 82c-7 17-3 34 7 47" stroke="#FFE0C5" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M164 64c-4-17 4-27 13-31m-24 26c13 10 24 8 34-2"
        stroke="#73503B"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M167 50c12-17 30-15 42-12-8 18-23 23-42 12Z"
        fill="#B4BE99"
        stroke="#73503B"
        strokeWidth="3"
      />
      <g transform="rotate(10 269 122)" stroke="#79583B" strokeWidth="2.5">
        <rect x="244" y="91" width="51" height="66" rx="4" fill="#FFFAEE" />
        <path d="M249 96v56h40" stroke="#D5BB90" />
        <path d="M256 108h24m-24 11h24m-24 11h18" stroke="#C4A17A" strokeWidth="2" />
        <path d="m239 118 2-14 8-13 6 4-8 14Z" fill="#D79051" />
      </g>
      <path
        d="m240 30 3 8 8 3-8 3-3 9-3-9-8-3 8-3Zm28 22 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"
        fill="#D8AB70"
      />
      <text x="164" y="187" textAnchor="middle" fill="#B7845D" fontSize="8">
        WALK · DRAW · DISCOVER
      </text>
    </svg>
  )
}

export function Home() {
  const navigate = useNavigate()
  return (
    <main className="home-page mx-auto min-h-dvh max-w-[378px] px-5 pb-3 pt-[25px]">
      <header className="home-top flex flex-wrap items-center justify-between gap-3">
        <span className="home-badge">
          <Icon kind="compass" />
          旅のスケッチブック
        </span>
        <nav className="home-auth" aria-label="アカウント">
          <a href="#" className="home-signin">
            サインイン
          </a>
          <a href="#" className="home-login">
            ログイン
          </a>
        </nav>
      </header>
      <div className="home-title">
        <h1>高々忠敬</h1>
        <p>歩いた道が、絵になる。</p>
        <span />
      </div>
      <div className="home-picture">
        <Illustration />
      </div>
      <section className="home-adventure">
        <h2>どの冒険に出かける？</h2>
        <p>あしあとから、絵を生みだそう</p>
        <button className="home-solo" onClick={() => navigate('/playalone')}>
          <Icon kind="steps" />
          <span>
            <strong>ひとりで遊ぶ</strong>
            <small>お題を歩いて描こう！</small>
          </span>
          <span className="home-action-icon">
            <Icon kind="steps" />
          </span>
        </button>
        <button className="home-multi" disabled>
          <Icon kind="people" />
          <span>
            <strong>みんなで遊ぶ</strong>
            <small>友達と冒険しよう！</small>
          </span>
          <b>準備中</b>
        </button>
      </section>
      <div className="home-links mt-[18px] grid grid-cols-2 gap-[11px]">
        <button onClick={() => navigate('/collection')}>
          <Icon kind="book" />
          <strong>作品帳</strong>
          <small>旅の思い出を見る</small>
        </button>
        <button onClick={() => navigate('/rules')}>
          <Icon kind="guide" />
          <strong>あそびかた</strong>
          <small>ルールを確認する</small>
        </button>
      </div>
      <footer className="home-footer">
        <Icon kind="steps" />
        <span>歩いて、描いて、AIに見せよう！</span>
        <Icon kind="steps" />
      </footer>
    </main>
  )
}
