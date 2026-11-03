import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { App } from './App'
import { signInAnon } from './lib/firebase'

void signInAnon().catch((error: unknown) => {
  console.error('Firebase Anonymous Auth initialization failed', error)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
