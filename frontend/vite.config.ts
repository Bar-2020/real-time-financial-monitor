import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const BACKEND_API_URL = 'http://localhost:5080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': BACKEND_API_URL,
      '/hubs': { target: BACKEND_API_URL, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
