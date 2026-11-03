import { useState } from 'react'
import { Game } from './pages/Game'
import { Home } from './pages/Home'
import { Result } from './pages/Result'
import { Ready } from './pages/Ready'
import type { TrailPoint } from './types'

type Page = 'home' | 'ready' | 'game' | 'result'

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

  if (page === 'home') return <Home onStart={() => setPage('ready')} />
  if (page === 'ready')
    return <Ready onCancel={() => setPage('home')} onStart={handleStart} />
  if (page === 'game') return <Game onFinish={handleFinish} />
  return <Result trail={trail} onRetry={() => setPage('ready')} />
}
