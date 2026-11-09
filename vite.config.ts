import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // The neural-translation worker dynamically imports transformers.js from a CDN,
  // which needs an ES-module worker (the default iife format can't code-split).
  worker: { format: 'es' },
  // Proxy /api to local APy server for development
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:2737',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})

