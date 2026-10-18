import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { envValidatorPlugin } from './vite-env-check.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), envValidatorPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Khi dev, mọi request /api/... được chuyển tiếp sang backend Spring Boot.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
