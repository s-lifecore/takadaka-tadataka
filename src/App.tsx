import { Navigate, Route, Routes } from 'react-router-dom'
import { Game } from './pages/Game'
import { Home } from './pages/Home'
import { Result } from './pages/Result'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/map" element={<Game />} />
      <Route path="/map/:id" element={<Game />} />
      <Route path="/result/:id" element={<Result />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
