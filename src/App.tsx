import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Game } from './pages/Game'
import { Home } from './pages/Home'
import { Collection } from './pages/Collection'
import { Result } from './pages/Result'
import { Theme } from './pages/Theme'
import { Rules } from './pages/Rules'
import { UnsupportedDevice } from './pages/UnsupportedDevice'

export function App() {
  const { pathname } = useLocation()

  if (!('geolocation' in navigator)) {
    return <UnsupportedDevice />
  }

  return (
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
  )
}
