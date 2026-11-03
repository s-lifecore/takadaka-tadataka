import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    // Prefer source files over JavaScript emitted by earlier TypeScript builds.
    extensions: ['.tsx', '.ts', '.mjs', '.js', '.mts', '.jsx', '.json'],
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
})
