import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild',
  },
  server: {
    port: 5173,
    /**
     * Evita bloqueos CORS en local: el navegador habla solo con Vite
     * y Vite reenvía a NestJS (main.ts enableCors con FRONTEND_URL).
     * Usa VITE_API_URL=/api/v2 en .env.development
     */
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
