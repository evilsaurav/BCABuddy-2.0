import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
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
          animation: ['framer-motion', 'react-countup', 'swiper', 'react-tsparticles', 'tsparticles'],
          diagrams: ['mermaid'],
          pdf: ['jspdf', 'html2pdf.js']
        }
      }
    }
  }
})
