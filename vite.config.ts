import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createScoringMiddleware } from './server/scoring.mjs'

export default defineConfig(({ mode }) => {
<<<<<<< HEAD
  const { NGROK_HOST } = loadEnv(mode, '.', 'NGROK_')

  return {
    resolve: {
      extensions: ['.tsx', '.ts', '.mjs', '.js', '.mts', '.jsx', '.json'],
    },
    server: {
      port: 5173,
      strictPort: true,
      allowedHosts: [
        'chef-unicycle-nanometer.ngrok-free.dev',
        ...(NGROK_HOST?.trim() ? [NGROK_HOST.trim()] : []),
      ],
    },
    build: {
      rollupOptions: {
        input: { main: 'index.html', aiTest: 'ai-test.html' },
      },
    },
    plugins: [
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
=======
  const env = loadEnv(mode, process.cwd(), '')
  const scoringOptions = {
    apiKey: process.env.XAI_API_KEY || env.XAI_API_KEY,
    model: process.env.XAI_MODEL || env.XAI_MODEL,
  }
  return {
  build: {
    rollupOptions: {
      input: { main: 'index.html', aiTest: 'ai-test.html' },
    },
  },
  plugins: [
    {
      name: 'grok-scoring-api',
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
>>>>>>> 1c7f5d5 (PRのコメントに対応)
  }
})
