import { HDKey } from "@scure/bip32";
import { p2wpkh } from "@scure/btc-signer";
import { NETWORK, TEST_NETWORK } from "@scure/btc-signer/utils.js";

const REGTEST_NETWORK = { ...TEST_NETWORK, bech32: "bcrt" };

// BIP32 version bytes — needed so HDKey accepts both xpub (mainnet) and tpub (testnet/regtest)
const MAINNET_VERSIONS = { private: 0x0488ADE4, public: 0x0488B21E };
const TESTNET_VERSIONS = { private: 0x04358394, public: 0x043587CF };

function getVersions(key) {
  return key.startsWith("tpub") ? TESTNET_VERSIONS : MAINNET_VERSIONS;
}

function toHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Detect network from xpub prefix.
 * xpub = mainnet, tpub = testnet/regtest
 */
function getNetwork(key) {
  return key.startsWith("tpub") ? REGTEST_NETWORK : NETWORK;
}

/**
 * Derive the escrow public key for a sell offer.
 *
 * Path: m/84'/{coin}'/3/{offerId}  (version 2 — non-hardened last two levels)
 * The multisigXpub is at depth m/84'/{coin}', so we derive /3/{offerId} from it.
 *
 * @param {string} multisigXpub  Base58-encoded extended public key (multisigXpub or tpub)
 * @param {number} offerId  Numeric offer ID from the server
 * @returns {string} Compressed public key as hex (33 bytes)
 */
export function deriveEscrowPubKey(multisigXpub, offerId) {
  console.log("[Escrow] deriveEscrowPubKey inputs:", {
    multisigXpub: multisigXpub.slice(0, 20) + "…",
    offerId,
    path: `/3/${offerId}`,
  });
  const node = HDKey.fromExtendedKey(multisigXpub, getVersions(multisigXpub));
  const child = node.deriveChild(3).deriveChild(offerId);
  const pubKeyHex = toHex(child.publicKey);
  console.log("[Escrow] deriveEscrowPubKey result:", {
    pubKeyHex,
    fullPath: `m/84'/{coin}'/3/${offerId}`,
  });
  return pubKeyHex;
}

/**
 * Derive a return (refund) address for a sell offer.
 *
 * Path: m/84'/{coin}'/1/{index}  (non-hardened — derivable from xpub)
 * Returns a native segwit (P2WPKH) address: bc1q... (mainnet) or bcrt1q... (regtest)
 *
 * Uses the original xpub (auth.xpub), NOT the multisigXpub.
 *
 * @param {string} xpub  Base58-encoded extended public key (the original xpub, not multisigXpub)
 * @param {number} index  Address index (from server — incremented per offer to avoid reuse)
 * @returns {string} P2WPKH bech32 address
 */
/**
 * Derive a release (payout) address for a buy trade.
 *
 * Path: m/84'/{coin}'/0/{index}  (non-hardened — derivable from xpub)
 * Returns a native segwit (P2WPKH) address: bc1q... (mainnet) or bcrt1q... (regtest)
 *
 * Uses the original xpub (auth.xpub), NOT the multisigXpub.
 * This is the external/receive chain (/0/) — where purchased sats are sent.
 *
 * @param {string} xpub  Base58-encoded extended public key (the original xpub, not multisigXpub)
 * @param {number} index  Address index (incremented per use to avoid reuse)
 * @returns {string} P2WPKH bech32 address
 */
export function deriveReleaseAddress(xpub, index) {
  const network = getNetwork(xpub);
  const node = HDKey.fromExtendedKey(xpub, getVersions(xpub));
  const child = node.deriveChild(0).deriveChild(index);
  const address = p2wpkh(child.publicKey, network).address;
  console.log("[Escrow] deriveReleaseAddress result:", {
    address,
    fullPath: `m/84'/{coin}'/0/${index}`,
  });
  return address;
}

export function deriveReturnAddress(xpub, index) {
  console.log("[Escrow] deriveReturnAddress inputs:", {
    xpub: xpub.slice(0, 20) + "…",
    index,
    path: `/1/${index}`,
  });
  const network = getNetwork(xpub);
  const node = HDKey.fromExtendedKey(xpub, getVersions(xpub));
  const child = node.deriveChild(1).deriveChild(index);
  const address = p2wpkh(child.publicKey, network).address;
  console.log("[Escrow] deriveReturnAddress result:", {
    address,
    fullPath: `m/84'/{coin}'/1/${index}`,
  });
  return address;
}
