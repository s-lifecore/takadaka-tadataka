import { useNavigate } from 'react-router-dom'

const steps = [
  {
    title: 'お題をチェック',
    lines: ['今回のお題は「りんご」。', 'どこを歩くか考えてみよう。'],
  },
  {
    title: '歩いて線を描く',
    lines: ['15分以内に安全な場所を歩いて、', '地図に軌跡を残そう。'],
  },
  {
    title: 'AIに見せてみる',
    lines: ['完成した絵をAIが判定！', '結果は作品帳に残せるよ。'],
  },
]

export function Rules() {
  const navigate = useNavigate()
  return (
    <main className="rules-page">
      <div className="rules-content">
        <header className="rules-header">
          <h1>あそびかた</h1>
        </header>

        <div className="rules-heading">
          <h2>あしあとで絵を描こう</h2>
          <p>たった3ステップで冒険スタート！</p>
        </div>

        <ol className="rules-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="rules-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>
                  {step.lines[0]}
                  <br />
                  {step.lines[1]}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <aside className="rules-safety" aria-labelledby="rules-safety-title">
          <h2 id="rules-safety-title">安全に遊ぼう</h2>
          <p>
            画面を見るときは必ず立ち止まってね。
            <br />
            車・自転車では遊ばないでね。
          </p>
        </aside>

        <footer className="rules-footer">
          <button type="button" onClick={() => navigate('/')}>
            ホームへもどる
          </button>
          <p>歩きスマホにならないように気をつけよう</p>
        </footer>
      </div>
    </main>
  )
}
