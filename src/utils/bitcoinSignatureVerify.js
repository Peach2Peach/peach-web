// ─── Bitcoin signature verification (BIP-322 + BIP-137 in one call) ──────────
// Mirrors the mobile app's isValidBitcoinSignature.ts behaviour.
// bip322-js@3 Verifier.verifySignature() internally routes BIP-137-shaped
// signatures (the format Peach mobile produces) through its BIP-137 path and
// full BIP-322 signatures through the BIP-322 path. One call covers P2PKH,
// P2SH-P2WPKH, P2WPKH, and single-key-spend P2TR. The address itself encodes
// the network, so no separate network arg is needed.
//
// Heavy: pulls in bitcoinjs-lib + bitcoinjs-message via bip322-js. Import this
// module via dynamic `import()` from the wizard so it stays out of the main
// bundle.
// ─────────────────────────────────────────────────────────────────────────────

import { Verifier } from "bip322-js";

export function isValidBitcoinSignature({ message, address, signature }) {
  if (!message || !address || !signature) return false;
  try {
    return Verifier.verifySignature(address, message, signature);
  } catch {
    return false;
  }
}
