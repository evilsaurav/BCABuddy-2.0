import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
          animation: ['framer-motion', 'react-countup', 'swiper', 'react-tsparticles', 'tsparticles'],
          diagrams: ['mermaid'],
          pdf: ['jspdf', 'html2pdf.js']
        }
      }
    }
  }
})