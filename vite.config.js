import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at root by default (Docker image). For subpath hosting like
// GitHub Pages, build with `BASE_PATH=/peach-web/ npm run build`.
//
// Dev-only proxy: mirrors the Cloudflare Worker routing for Esplora
// requests so the client uses the same /esplora/<net>/... URL shape in
// dev and prod. Production goes through the worker (cloudflare/worker.js),
// which is the authoritative resolver.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
  server: {
    proxy: {
      '/esplora/mainnet': {
        target: 'https://electrum.peachbitcoin.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/esplora\/mainnet/, ''),
      },
      '/esplora/testnet': {
        target: 'https://electrum-testnet.peachbitcoin.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/esplora\/testnet/, ''),
      },
      '/esplora/regtest': {
        target: 'https://electrum-regtest.peachbitcoin.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/esplora\/regtest/, ''),
      },
    },
  },
})
