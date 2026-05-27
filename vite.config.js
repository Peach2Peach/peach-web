import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Served at root by default (Docker image). For subpath hosting like
// GitHub Pages, build with `BASE_PATH=/peach-web/ npm run build`.
//
// nodePolyfills() ships Buffer + crypto + stream shims required by
// bip322-js (and its transitive bitcoinjs-lib / bitcoinjs-message). Only the
// polyfills these libs actually pull in end up in the bundle. The verifier
// itself is dynamic-imported from PayoutAddressWizard so the cost is paid
// only when the custom-payout flow opens.
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto'],
      globals: { Buffer: true, process: true },
      protocolImports: true,
    }),
  ],
  base: process.env.BASE_PATH || '/',
})
