import { describe, it, expect } from "vitest";
import { HDKey } from "@scure/bip32";
import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { addressFromMnemonic, REGTEST_NETWORK } from "./bip322.js";
import {
  deriveReceiveAddresses,
  deriveChangeAddresses,
  getEsploraNet,
  getXpubFingerprint,
  GAP_LIMIT,
  SCAN_BATCH_SIZE,
} from "./wallet.js";

// Standard BIP-39 test mnemonic. NEVER use on mainnet.
const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

const TESTNET_VERSIONS = { private: 0x04358394, public: 0x043587CF };

// Account-level tpub at m/84'/1'/0' from the abandon mnemonic — what the
// Peach mobile app would export when sharing its xpub with the web companion.
function tpubAtAccount() {
  const seed = bip39.mnemonicToSeedSync(MNEMONIC);
  const root = HDKey.fromMasterSeed(seed, TESTNET_VERSIONS);
  const account = root.derive("m/84'/1'/0'");
  return account.publicExtendedKey;
}

describe("wallet derivation — round-trip vs full path", () => {
  const tpub = tpubAtAccount();

  it("getEsploraNet returns testnet/regtest for tpub (build flag drives the split)", () => {
    // Tests run with no VITE_BITCOIN_NETWORK set → IS_REGTEST is false →
    // tpub should resolve to "testnet". Defensive check that the helper at
    // least returns one of the two tpub-side values rather than mainnet.
    const net = getEsploraNet(tpub);
    expect(["testnet", "regtest"]).toContain(net);
  });

  it("derives the same 0/0 receive address as a full-path mnemonic derivation", () => {
    const fromTpub = deriveReceiveAddresses(tpub, 0, 1)[0];
    const fromMnemonic = addressFromMnemonic({
      mnemonic: MNEMONIC,
      path: "m/84'/1'/0'/0/0",
      network: REGTEST_NETWORK,
    });
    expect(fromTpub.address).toBe(fromMnemonic.address);
    expect(fromTpub.chain).toBe(0);
    expect(fromTpub.index).toBe(0);
  });

  it("derives the same 1/0 change address as a full-path mnemonic derivation", () => {
    const fromTpub = deriveChangeAddresses(tpub, 0, 1)[0];
    const fromMnemonic = addressFromMnemonic({
      mnemonic: MNEMONIC,
      path: "m/84'/1'/0'/1/0",
      network: REGTEST_NETWORK,
    });
    expect(fromTpub.address).toBe(fromMnemonic.address);
    expect(fromTpub.chain).toBe(1);
  });

  it("derives a contiguous batch starting from fromIdx", () => {
    const batch = deriveReceiveAddresses(tpub, 5, 3);
    expect(batch.map((b) => b.index)).toEqual([5, 6, 7]);
    // Each address should match the equivalent full-path derivation.
    for (const item of batch) {
      const expected = addressFromMnemonic({
        mnemonic: MNEMONIC,
        path: `m/84'/1'/0'/0/${item.index}`,
        network: REGTEST_NETWORK,
      });
      expect(item.address).toBe(expected.address);
    }
  });

  it("produces distinct addresses on receive vs change at the same index", () => {
    const recv = deriveReceiveAddresses(tpub, 0, 1)[0].address;
    const chng = deriveChangeAddresses(tpub, 0, 1)[0].address;
    expect(recv).not.toBe(chng);
  });

  it("returns an 8-char hex fingerprint for the xpub", () => {
    const fp = getXpubFingerprint(tpub);
    expect(fp).toMatch(/^[0-9a-f]{8}$/);
  });

  it("gap limit matches the mobile app (25)", () => {
    expect(GAP_LIMIT).toBe(25);
    expect(SCAN_BATCH_SIZE).toBe(25);
  });
});
