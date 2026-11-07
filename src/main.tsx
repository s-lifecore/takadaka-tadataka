import { BrowserRouter } from 'react-router-dom'
import { StrictMode, type ReactNode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import './styles/index.css'
import { App } from './App'
import { setAuthTokenGetter } from './lib/api'

function AuthBridge() {
  const { getToken } = useAuth()
  useEffect(() => {
    setAuthTokenGetter(getToken)
    return () => setAuthTokenGetter(null)
  }, [getToken])
  return null
}

function Providers({ children }: { children: ReactNode }) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  if (!publishableKey) return children
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <AuthBridge />
      {children}
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Providers>
  </StrictMode>,
)
