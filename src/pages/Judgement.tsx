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

        <div className="judgement-progress" role="progressbar" aria-label="AIが作品を判定中">
          <span />
        </div>
        <p className="judgement-caption">AIが線画から形を読み取っています。</p>

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
