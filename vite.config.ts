import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    extensions: ['.tsx', '.ts', '.mjs', '.js', '.mts', '.jsx', '.json'],
  },
  server: {
    allowedHosts: ['.ngrok-free.dev'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/([a-z]\.)?tile\.openstreetmap\.org\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'osm-tiles',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 500 },
            },
          },
        ],
      },
      manifest: {
        start_url: '/',
        scope: '/',
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
})
