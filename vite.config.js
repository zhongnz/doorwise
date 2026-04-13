import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Check if backend is available (for local development with backend)
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const ENABLE_PROXY = process.env.VITE_ENABLE_PROXY === 'true';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Only enable proxy when backend is explicitly enabled
    ...(ENABLE_PROXY ? {
      proxy: {
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true,
        },
        '/ws': {
          target: BACKEND_URL.replace('http', 'ws'),
          ws: true,
        },
      },
    } : {}),
  },
})
