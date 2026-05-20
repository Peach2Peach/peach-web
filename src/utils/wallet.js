// Watch-only BIP84 wallet derivation helpers.
//
// `auth.xpub` is exported by the mobile app at account level: m/84'/{coin}'/0'.
// From there, two non-hardened chains are derivable from the xpub alone:
//   0/i → receive (external) addresses
//   1/i → change (internal) addresses
//
// Address format is P2WPKH bech32 (bc1q… mainnet, bcrt1q… regtest, tb1q… testnet).
//
// Gap limit is 25 to match the mobile app (peach-app: nodeConfigStore.ts).
// Branch nodes are derived once per chain, then children are derived from the
// branch — this is the same pattern as isReturnAddressFromXpub() in escrow.js
// and avoids re-deriving from the account root on every index.

import { HDKey } from "@scure/bip32";
import { p2wpkh } from "@scure/btc-signer";
import { NETWORK, TEST_NETWORK } from "@scure/btc-signer/utils.js";
import { IS_REGTEST } from "./network.js";

const REGTEST_NETWORK = { ...TEST_NETWORK, bech32: "bcrt" };

const MAINNET_VERSIONS = { private: 0x0488ADE4, public: 0x0488B21E };
const TESTNET_VERSIONS = { private: 0x04358394, public: 0x043587CF };

export const GAP_LIMIT = 25;
export const SCAN_BATCH_SIZE = 25;

function getVersions(xpub) {
  return xpub.startsWith("tpub") ? TESTNET_VERSIONS : MAINNET_VERSIONS;
}

// @scure btc-signer network object — bech32 prefix + version bytes.
// xpub → mainnet (bc1q…). tpub + regtest build → regtest (bcrt1q…). tpub +
// mainnet build → testnet (tb1q…). The build flag is the only signal that
// distinguishes testnet from regtest since they share the tpub prefix.
export function getBtcSignerNetwork(xpub) {
  if (!xpub.startsWith("tpub")) return NETWORK;
  return IS_REGTEST ? REGTEST_NETWORK : TEST_NETWORK;
}

// Network identifier used in the Esplora proxy path: /esplora/<net>/…
export function getEsploraNet(xpub) {
  if (!xpub.startsWith("tpub")) return "mainnet";
  return IS_REGTEST ? "regtest" : "testnet";
}

// HDKey fingerprint as 8-char hex — used as a sessionStorage cache key suffix.
export function getXpubFingerprint(xpub) {
  const node = HDKey.fromExtendedKey(xpub, getVersions(xpub));
  const fp = node.fingerprint;
  return fp.toString(16).padStart(8, "0");
}

// Derive `count` addresses starting at `fromIdx` on the given chain.
// chain = 0 (receive) or 1 (change). Branch is derived once, then children.
function deriveChain(xpub, chain, fromIdx, count) {
  const network = getBtcSignerNetwork(xpub);
  const node = HDKey.fromExtendedKey(xpub, getVersions(xpub));
  const branch = node.deriveChild(chain);
  const out = [];
  for (let i = 0; i < count; i++) {
    const index = fromIdx + i;
    const child = branch.deriveChild(index);
    out.push({
      chain,
      index,
      path: `0/${chain}/${index}`,
      address: p2wpkh(child.publicKey, network).address,
    });
  }
  return out;
}

export function deriveReceiveAddresses(xpub, fromIdx, count) {
  return deriveChain(xpub, 0, fromIdx, count);
}

export function deriveChangeAddresses(xpub, fromIdx, count) {
  return deriveChain(xpub, 1, fromIdx, count);
}
