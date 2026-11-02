import { useState } from 'react'
import { Game } from './pages/Game'
import { Home } from './pages/Home'
import { Theme } from './pages/Theme'
import { Result } from './pages/Result'
import type { TrailPoint } from './types'

type Page = 'home' | 'theme' | 'game' | 'result'

export function App() {
  const [page, setPage] = useState<Page>('home')
  const [trail, setTrail] = useState<TrailPoint[]>([])

  function handleStart() {
    setTrail([])
    setPage('game')
  }

  function handleFinish(t: TrailPoint[]) {
    setTrail(t)
    setPage('result')
  }

  if (page === 'home') return <Home onStart={() => setPage('theme')} />
  if (page === 'theme')
    return <Theme onBack={() => setPage('home')} onStart={handleStart} />
  if (page === 'game') return <Game onFinish={handleFinish} />
  return <Result trail={trail} onRetry={handleStart} />
}
