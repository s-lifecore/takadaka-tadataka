import { useState } from 'react'
import { Game } from './pages/Game'
import { Home } from './pages/Home'
import { Result } from './pages/Result'
import { Collection } from './pages/Collection'
import type { TrailPoint } from './types'

type Page = 'home' | 'game' | 'result' | 'collection'

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

  if (page === 'home')
    return <Home onStart={handleStart} onCollection={() => setPage('collection')} />
  if (page === 'collection') return <Collection onHome={() => setPage('home')} />
  if (page === 'game') return <Game onFinish={handleFinish} />
  return <Result trail={trail} onRetry={handleStart} />
}
