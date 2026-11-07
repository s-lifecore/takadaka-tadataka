import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { prepareMotionPermission } from '../hooks/useDeviceOrientation'
import { prepareWakeLockPermission } from '../hooks/useWakeLock'

export function Theme() {
  const navigate = useNavigate()
  const startingRef = useRef(false)
  const activeRef = useRef(true)
  const [starting, setStarting] = useState(false)
  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])
  const handleStart = async () => {
    if (startingRef.current) return
    startingRef.current = true
    setStarting(true)
    // どちらもクリック直後、awaitより前に呼び出す。
    const wakeLockPermission = prepareWakeLockPermission()
    const motionPermission = prepareMotionPermission()
    await Promise.all([wakeLockPermission, motionPermission])
    if (activeRef.current) navigate('/map')
  }
  return (
    <main className="theme-page">
      <header className="theme-header">
        <button
          onClick={() => {
            activeRef.current = false
            navigate('/')
          }}
        >
          〈 もどる
        </button>
        <span>ひとりで遊ぶ</span>
        <span className="theme-compass" aria-hidden="true">
          ♧
        </span>
      </header>
      <div className="theme-heading">
        <span>SKETCH 01</span>
        <h1>今回のお題</h1>
        <p>どんな線が描けるかな？</p>
      </div>
      <section className="theme-notebook" aria-labelledby="theme-name">
        <div className="theme-binding" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <p className="theme-notebook-label">たかだか旅のスケッチ帳</p>
        <svg className="theme-apple" viewBox="0 0 260 180" fill="none" aria-hidden="true">
          <path
            d="M128 52C85 20 40 60 51 113c10 49 36 56 69 47 15-5 27 8 44 2 51-19 62-91 19-111-18-9-36-6-55 1Z"
            fill="#EBA78E"
            stroke="#594331"
            strokeWidth="3.5"
          />
          <path
            d="M126 51c-2-18 4-31 19-42m-15 42c10 7 18 7 27 1"
            stroke="#594331"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M136 33c17-23 40-25 59-18-12 23-33 31-59 18Z"
            fill="#ABB995"
            stroke="#594331"
            strokeWidth="3"
          />
          <path
            d="M64 89c-7 19-1 37 12 49"
            stroke="#FFE0C7"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="m10 37 9-7m1-12 3 8m210 64 10-4m-5 15 7 4M7 140c23-17 29 22 43 10m160-116c17-13 23-2 36-7m-20 103c13 17 20 9 29 10"
            stroke="#CAA476"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="3 9"
          />
          <circle cx="12" cy="94" r="3" fill="#A4B28B" />
          <circle cx="231" cy="160" r="3" fill="#DC8752" />
        </svg>
        <h2 id="theme-name">りんご</h2>
        <p className="theme-description">歩いた道で、りんごの絵を描こう！</p>
        <div className="theme-time">
          <span>◷ 制限時間</span>
          <strong>15分</strong>
        </div>
      </section>
      <div className="theme-actions">
        <aside className="theme-safety">
          <span aria-hidden="true">♢</span>
          <div>
            <h2>安全に遊ぼう</h2>
            <p>
              地図を見るときは立ち止まってね。
              <br />
              周りに気をつけて、無理せず歩こう。
            </p>
          </div>
        </aside>
        <button className="theme-start" onClick={() => void handleStart()} disabled={starting}>
          {starting ? '出発の準備中…' : '♧ 冒険スタート！'}
        </button>
        <p className="theme-hint">ボタンを押すと 3・2・1 で記録が始まるよ</p>
      </div>
    </main>
  )
}
