import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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

