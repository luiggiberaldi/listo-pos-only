// ✅ SYSTEM IMPLEMENTATION - V. 1.3 (PERFORMANCE OPTIMIZED)
// Archivo: vite.config.js
// Autorizado por Auditor en Fase 1 (Búnker Offline)
// Rastro: Configuración PWA y Estrategia de Caché + Performance Optimizations

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
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB (increased for better offline support)
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
          },
          {
            // Cache images for better performance
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  base: './',

  // 🚀 PERFORMANCE OPTIMIZATIONS
  build: {
    target: 'es2020', // Better compatibility with low-end PCs
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    rollupOptions: {
      output: {
        // Manual chunks for better caching and parallel loading
        manualChunks: {
          // Core React libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // UI libraries
          'vendor-ui': ['lucide-react', 'sweetalert2', 'framer-motion'],

          // Database
          'vendor-db': ['dexie', 'dexie-react-hooks'],

          // Firebase (will be optimized further in Sprint 2)
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],

          // State management
          'vendor-state': ['zustand'],

          // 🚀 Recharts removed - now lazy loaded via DashboardCharts.jsx (Sprint 4)

          // Utilities
          'vendor-utils': ['date-fns', 'decimal.js', 'uuid', 'fuse.js']
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit to avoid warnings
    sourcemap: false // Disable sourcemaps in production for smaller bundle
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'dexie']
  }
})