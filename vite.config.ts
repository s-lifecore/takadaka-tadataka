import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createScoringMiddleware, scoringOptionsFromEnv } from './server/scoring.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const projectId = env.FIREBASE_PROJECT_ID || 'tadataka-local'
  const { NGROK_HOST } = env
  const scoringOptions = scoringOptionsFromEnv({ ...env, ...process.env })

  return {
    resolve: { extensions: ['.tsx', '.ts', '.mjs', '.js', '.mts', '.jsx', '.json'] },
    server: {
      port: 5173,
      strictPort: true,
      allowedHosts: ['.ngrok-free.dev', '.ngrok.app', ...(NGROK_HOST?.trim() ? [NGROK_HOST.trim()] : [])],
      proxy: {
        '/api': {
          target: `http://firebase-emulator:5001/${projectId}/asia-northeast1`,
          changeOrigin: true,
        },
      },
    },
    build: { rollupOptions: { input: { main: 'index.html', aiTest: 'ai-test.html' } } },
    plugins: [
      {
        name: 'ai-scoring-api',
        configureServer(server) {
          server.middlewares.use(createScoringMiddleware(scoringOptions))
        },
        configurePreviewServer(server) {
          server.middlewares.use(createScoringMiddleware(scoringOptions))
        },
      },
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: '高々忠敬',
          short_name: '高々忠敬',
          description: '歩いて絵を描く、位置情報お絵かきゲーム',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
  }
})
