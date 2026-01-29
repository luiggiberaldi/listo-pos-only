// ✅ SYSTEM IMPLEMENTATION - V. 1.2
// Archivo: vite.config.js
// Autorizado por Auditor en Fase 1 (Búnker Offline)
// Rastro: Configuración PWA y Estrategia de Caché

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'logodark.png', 'robots.txt'],
      manifest: {
        name: 'LISTO POS',
        short_name: 'LISTO POS',
        description: 'Sistema de Punto de Venta Offline-First',
        theme_color: '#059669', // Emerald-600
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB Limit
        // Estrategia de Caché:
        // - Assets (JS/CSS/Img) -> CacheFirst (Carga instantánea)
        // - APIs externas -> NetworkFirst (Intenta red, falla silenciosamente)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/pydolarvenezuela-api\.vercel\.app\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-tasa-bcv',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 horas
              },
              networkTimeoutSeconds: 3
            }
          }
        ]
      }
    })
  ],
  base: './',
})