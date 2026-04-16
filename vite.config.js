import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Agent } from 'node:https'

// Force IPv4 — IPv6 routes to api.peachbitcoin.com are broken on some networks
const ipv4Agent = new Agent({ family: 4 })

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
        agent: ipv4Agent,
      },
      '/api': {
        target: 'https://api.peachbitcoin.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        agent: ipv4Agent,
      },
    },
  },
})
