import { useEffect, useState } from 'react'
import { OFFLINE_SAVE_EVENT, OFFLINE_SAVE_MESSAGE } from './lib/firebase'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Game } from './pages/Game'
import { Home } from './pages/Home'
import { Collection } from './pages/Collection'
import { Result } from './pages/Result'
import { Theme } from './pages/Theme'
import { Rules } from './pages/Rules'

export function App() {
  const { pathname } = useLocation()
  const [toast, setToast] = useState(0)
  useEffect(() => {
    const notify = () => setToast((value) => value + 1)
    window.addEventListener(OFFLINE_SAVE_EVENT, notify)
    return () => window.removeEventListener(OFFLINE_SAVE_EVENT, notify)
  }, [])
  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(0), 6000)
    return () => window.clearTimeout(timeout)
  }, [toast])
  return (
    <>
      {toast > 0 && (
        <div className="offline-toast" role="alert">
          {OFFLINE_SAVE_MESSAGE}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/playalone" element={<Theme />} />
        <Route path="/map" element={<Game key={pathname} />} />
        <Route path="/map/:id" element={<Game key={pathname} />} />
        <Route path="/result/:id" element={<Result key={pathname} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
