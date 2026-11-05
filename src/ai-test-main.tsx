import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { AIResult } from './types/ai'
import './ai-test.css'

type RecordEntry = AIResult & { file: string; theme: string; time: string }

function AITestPage() {
  const [theme, setTheme] = useState('りんご')
  const [image, setImage] = useState('')
  const [filename, setFilename] = useState('')
  const [result, setResult] = useState<AIResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [records, setRecords] = useState<RecordEntry[]>([])
  const readId = useRef(0)
  const busy = useRef(false)
  const current = records.filter((r) => r.file === filename && r.theme === theme.trim())
  const scores = current.slice(-5).map((r) => r.score)
  const spread = scores.length ? Math.max(...scores) - Math.min(...scores) : 0

  async function handleFile(file?: File) {
    const id = ++readId.current
    setImage('')
    setFilename('')
    setResult(null)
    setError('')
    setRecords([])
    setReading(false)
    if (!file) return
    if (file.type !== 'image/png') {
      setError('PNG画像を選択してください')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('3MB以下の画像にしてください')
      return
    }
    setReading(true)
    try {
      const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer())
      if (![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => signature[i] === v)) {
        throw new Error('PNG画像の形式が不正です')
      }
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
        reader.readAsDataURL(file)
      })
      const preview = new Image()
      preview.src = data
      await preview.decode()
      if (id === readId.current) {
        setImage(data)
        setFilename(file.name)
      }
    } catch (err) {
      if (id === readId.current)
        setError(err instanceof Error ? err.message : '画像を読み込めませんでした')
    } finally {
      if (id === readId.current) setReading(false)
    }
  }

  async function handleJudge() {
    if (busy.current || reading || !image || !theme.trim()) return
    busy.current = true
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { judgeDrawing } = await import('./lib/huggingface')
      const value = await judgeDrawing(image, theme.trim())
      setResult(value)
      setRecords((previous) => [
        ...previous,
        { ...value, file: filename, theme: theme.trim(), time: new Date().toISOString() },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI判定に失敗しました')
    } finally {
      busy.current = false
      setLoading(false)
    }
  }

  function downloadRecords() {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ai-test-results.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main>
      <h1>GPSお絵かき AI判定テスト</h1>
      <p>地図やGPSを使わず、PNG画像をHugging Faceで採点します。</p>
      <label>
        お題
        <input
          value={theme}
          disabled={loading}
          onChange={(e) => {
            setTheme(e.target.value)
            setResult(null)
          }}
        />
      </label>
      <label>
        PNG画像（3MB以下）
        <input
          type="file"
          accept="image/png"
          disabled={loading}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </label>
      <p>白背景・黒線・512×512pxを推奨します。画像の再選択で記録はリセットされます。</p>
      {reading && <p role="status">画像を読み込み中…</p>}
      {image && (
        <figure>
          <img src={image} alt="採点する線画" />
          <figcaption>{filename}</figcaption>
        </figure>
      )}
      <button
        onClick={() => void handleJudge()}
        disabled={loading || reading || !image || !theme.trim()}
      >
        {loading ? 'AI判定中…' : 'AIで採点する'}
      </button>
      <p>クリックごとにAPIを1回呼び出します。利用枠を消費する場合があります。</p>
      {error && (
        <p role="alert" className="error">
          エラー：{error}
        </p>
      )}
      <section aria-live="polite" aria-busy={loading}>
        {result && (
          <>
            <h2>採点結果：{result.score.toFixed(5)}%</h2>
            <progress aria-label="得点" value={result.score} max={100} />
            <h3>AIからのコメント</h3>
            <p>{result.reason}</p>
          </>
        )}
      </section>
      <section>
        <h2>採点ブレの検証</h2>
        <p>同じ画像・お題を5回採点してください。直近5回を集計します。</p>
        <p>
          実行回数：{scores.length}/5{'\u3000'}平均：
          {scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(5) : '—'}%
          {'\u3000'}最大差：{scores.length ? spread.toFixed(5) : '—'}%
        </p>
        {scores.length === 5 && (
          <p>
            {spread <= 10
              ? '仮目標の最大差10点以内を達成しています。'
              : '最大差が10点を超えています。プロンプトを見直してください。'}
          </p>
        )}
        <p>この目標は再現性を保証するものではありません。記録はページを閉じると消えます。</p>
        <button disabled={!records.length} onClick={downloadRecords}>
          記録をJSONで保存
        </button>{' '}
        <button disabled={loading || !records.length} onClick={() => setRecords([])}>
          記録をクリア
        </button>
        {records.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>回</th>
                  <th>お題</th>
                  <th>得点</th>
                  <th>理由</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{r.theme}</td>
                    <td>{r.score.toFixed(5)}</td>
                    <td>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<AITestPage />)
