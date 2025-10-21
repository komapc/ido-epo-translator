import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment
  base: process.env.GITHUB_PAGES === 'true' ? '/vortaro/' : '/',
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

