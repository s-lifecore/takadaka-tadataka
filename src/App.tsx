import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Game } from './pages/Game'
import { Home } from './pages/Home'
import { Collection } from './pages/Collection'
import { Result } from './pages/Result'
import { Theme } from './pages/Theme'
import { Rules } from './pages/Rules'

type ErrorBoundaryProps = {
  children: ReactNode
  onHome: () => void
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('画面の表示中にエラーが発生しました。', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-page">
          <div className="error-content">
            <h1 role="alert">エラーが発生しました。</h1>
            <p>ホームに戻って、もう一度お試しください。</p>
            <button
              type="button"
              onClick={() => {
                this.props.onHome()
                this.setState({ hasError: false })
              }}
            >
              ホームに戻る
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}

export function App() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return (
    <ErrorBoundary key={pathname} onHome={() => navigate('/', { replace: true })}>
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
    </ErrorBoundary>
  )
}
