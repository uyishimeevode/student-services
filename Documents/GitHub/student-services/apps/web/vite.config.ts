import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development the API runs on port 3000; /api calls are proxied so the browser sees one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:3000', changeOrigin: true },
    },
  },
})
