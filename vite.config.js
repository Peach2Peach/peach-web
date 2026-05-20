import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at root by default (Docker image). For subpath hosting like
// GitHub Pages, build with `BASE_PATH=/peach-web/ npm run build`.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
})
