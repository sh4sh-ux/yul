import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/yul/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo-placeholder.svg'],
      manifest: {
        name: 'YULI by NARO',
        short_name: 'YULI',
        description: 'Learn your way. Grow every day.',
        theme_color: '#3156d8',
        background_color: '#f8f7f2',
        display: 'standalone',
        scope: '/yul/',
        start_url: '/yul/',
        icons: [
          { src: 'pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallback: 'index.html'
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true
  }
})
