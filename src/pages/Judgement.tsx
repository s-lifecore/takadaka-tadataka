import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function Judgement({ children }: Props) {
  return (
    <main className="judgement-page" aria-busy="true">
      <div className="judgement-content">
        <header className="judgement-header">判定中</header>
        <div className="judgement-heading">
          <h1>AIが作品を見ています</h1>
          <p>どんな絵に見えるかな？</p>
        </div>

        <section className="judgement-artwork" aria-label="歩いて描いた作品">
          <div className="judgement-preview">{children}</div>
          <p role="status">作品を分析中...</p>
        </section>

        <div className="judgement-walk" aria-hidden="true">
          <svg viewBox="0 0 320 80" fill="none">
            <path className="judgement-walk-guide" d="M20 58 Q90 18 160 58 T300 58" />
            <path
              className="judgement-walk-trail"
              d="M20 58 Q90 18 160 58 T300 58"
              pathLength="1"
            />
            <g className="judgement-walker">
              <g transform="translate(-16 -43)">
                <circle cx="16" cy="7" r="5" fill="currentColor" stroke="none" />
                <path d="M16 16V29" />
                <path className="judgement-arm judgement-arm-back" d="M16 18L9 27" />
                <path className="judgement-arm" d="M16 18L23 27" />
                <path className="judgement-leg judgement-leg-back" d="M16 29L9 43" />
                <path className="judgement-leg" d="M16 29L23 43" />
              </g>
            </g>
          </svg>
        </div>
        <p className="judgement-caption">歩いた軌跡が、ひとつの作品に。</p>

        <aside className="judgement-notice">
          <p>
            判定に少し時間がかかることがあります。
            <br />
            そのまま画面を閉じずにお待ちください。
          </p>
        </aside>
        <p className="judgement-footer">点数とコメントは次の画面に表示されます</p>
      </div>
    </main>
  )
}
