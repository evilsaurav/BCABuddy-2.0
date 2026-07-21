import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'BCABuddy',
        short_name: 'BCABuddy',
        description: 'IGNOU BCA AI Study Companion',
        theme_color: '#0a0d17',
        background_color: '#0a0d17',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            // Match any API requests for background syncing
            urlPattern: /\/api\/.*$/,
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'bcabuddy-api-queue',
                options: {
                  maxRetentionTime: 24 * 60 // Retry for max 24 hours
                }
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: 'localhost',
    proxy: {
      '/api': {
        // Yahan par humne local server hata kar Azure ka naya URL daal diya hai 👇
        target: 'https://bcabuddy-web-f5dfgtb2b0dmc8aq.centralindia-01.azurewebsites.net',
        changeOrigin: true, // Ye pehle se true hai, jo ki cloud server ke liye ekdum sahi hai
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          charts: ['recharts'],
          markdown: ['react-markdown', 'remark-gfm', 'react-syntax-highlighter'],
          animation: ['framer-motion'],
          diagrams: ['mermaid']
        }
      }
    }
  }
})