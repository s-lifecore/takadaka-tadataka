type Props = {
  onCancel: () => void
  count: number
}

export function Ready({ onCancel, count }: Props) {
  return (
    <main className="ready-page">
      <header className="ready-header">
        <button type="button" onClick={onCancel}>
          もどる
        </button>
        <span>出発の準備</span>
      </header>

      <div className="ready-heading">
        <span className="ready-mode">ひとりで遊ぶ</span>
        <h1>まもなく出発！</h1>
        <p>準備ができたら、歩き始めよう</p>
      </div>

      <section
        className="ready-countdown"
        aria-label="記録開始までのカウントダウン"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <strong>{count || '準備中…'}</strong>
        <p>秒後に記録がスタート！</p>
      </section>

      <aside className="ready-safety">
        <p>
          立ち止まった状態で開始しよう。
          <br />
          移動中は画面を操作しないでね。
        </p>
      </aside>

      <footer className="ready-footer">
        <p>この画面は3 → 2 → 1で自動的に切り替わります</p>
      </footer>
    </main>
  )
}
