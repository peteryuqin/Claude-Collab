import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8765',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ws/, '')
      }
    }
  }
})