import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'peach-web' below with your exact GitHub repository name
export default defineConfig({
  plugins: [react()],
  base: '/peach-web/',
  server: {
    proxy: {
      '/api-regtest': {
        target: 'https://api-regtest.peachbitcoin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-regtest/, ''),
      },
      '/api': {
        target: 'https://api.peachbitcoin.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
