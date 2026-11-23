import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Dev only: the deploy proxy lives in functions/api/[[path]].js, so local
  // development needs its own route to the API or /api/* 404s on 5173.
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:8090', changeOrigin: true } },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
          pdflib: ['pdf-lib'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
