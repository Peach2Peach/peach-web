import { describe, it, expect, beforeAll } from "vitest";
import * as openpgp from "openpgp";
import {
  generateSymmetricKey,
  isApiError,
  encryptPGPMessage,
  decryptPGPMessage,
  encryptSymmetric,
  decryptSymmetric,
  signPGPMessage,
  encryptForPublicKey,
  hashPaymentFields,
  verifyPaymentDataHashes,
} from "./pgp.js";

// ── Pure / sync functions ────────────────────────────────────────────────────

describe("generateSymmetricKey", () => {
  it("returns a 64-char hex string (32 bytes)", () => {
    const key = generateSymmetricKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique keys", () => {
    const a = generateSymmetricKey();
    const b = generateSymmetricKey();
    expect(a).not.toBe(b);
  });
});

describe("isApiError", () => {
  it("detects error responses", () => {
    expect(isApiError({ error: "forbidden" })).toBe(true);
    expect(isApiError({ message: "not found" })).toBe(true);
  });

  it("passes through valid data", () => {
    expect(isApiError({ id: "123", currencies: ["EUR"] })).toBe(false);
    expect(isApiError({ methodId: "sepa", userName: "test" })).toBe(false);
  });

  it("handles edge cases", () => {
    expect(isApiError(null)).toBeFalsy();
    expect(isApiError([])).toBeFalsy();
    expect(isApiError("string")).toBeFalsy();
  });
});

// ── Async PGP round-trip tests ───────────────────────────────────────────────

describe("PGP encrypt/decrypt round-trips", () => {
  let privateKeyArmored;
  let publicKeyArmored;

  beforeAll(async () => {
    const { privateKey, publicKey } = await openpgp.generateKey({
      type: "ecc",
      curve: "ed25519Legacy",
      userIDs: [{ name: "test" }],
    });
    privateKeyArmored = privateKey;
    publicKeyArmored = publicKey;
  }, 10_000); // key gen can take a moment

  it("encryptPGPMessage → decryptPGPMessage round-trip", async () => {
    const plaintext = "Hello, Peach Bitcoin!";
    const encrypted = await encryptPGPMessage(plaintext, privateKeyArmored);
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain("-----BEGIN PGP MESSAGE-----");

    const decrypted = await decryptPGPMessage(encrypted, privateKeyArmored);
    expect(decrypted).toBe(plaintext);
  });

  it("encryptSymmetric → decryptSymmetric round-trip", async () => {
    const plaintext = JSON.stringify({ sepa: { iban: "DE89370400440532013000" } });
    const passphrase = generateSymmetricKey();

    const encrypted = await encryptSymmetric(plaintext, passphrase);
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain("-----BEGIN PGP MESSAGE-----");

    const decrypted = await decryptSymmetric(encrypted, passphrase);
    expect(decrypted).toBe(plaintext);
  });

  it("signPGPMessage returns armored detached signature", async () => {
    const plaintext = "sign this message";
    const signature = await signPGPMessage(plaintext, privateKeyArmored);
    expect(signature).toBeTruthy();
    expect(signature).toContain("-----BEGIN PGP SIGNATURE-----");
  });

  it("encryptForPublicKey → decryptPGPMessage round-trip", async () => {
    const plaintext = "encrypted for recipient";
    const encrypted = await encryptForPublicKey(plaintext, publicKeyArmored);
    expect(encrypted).toBeTruthy();

    const decrypted = await decryptPGPMessage(encrypted, privateKeyArmored);
    expect(decrypted).toBe(plaintext);
  });

  it("decryptPGPMessage returns null for wrong key", async () => {
    const { privateKey: otherKey } = await openpgp.generateKey({
      type: "ecc",
      curve: "ed25519Legacy",
      userIDs: [{ name: "other" }],
    });

    const encrypted = await encryptPGPMessage("secret", privateKeyArmored);
    const decrypted = await decryptPGPMessage(encrypted, otherKey);
    expect(decrypted).toBeNull();
  });

  it("decryptSymmetric returns null for wrong passphrase", async () => {
    const encrypted = await encryptSymmetric("secret", generateSymmetricKey());
    const decrypted = await decryptSymmetric(encrypted, generateSymmetricKey());
    expect(decrypted).toBeNull();
  });
});

describe("verifyPaymentDataHashes", () => {
  const wiseData = {
    type: "wise",
    email: "alice@example.com",
    reference: "PEACH-123", // in DO_NOT_HASH — must not affect the result
  };

  it("returns true when revealed details match the committed hashes (nested format)", async () => {
    const committed = await hashPaymentFields("wise", wiseData);
    // committed === { wise: { hashes: [...] } } — the buyer format
    expect(await verifyPaymentDataHashes(wiseData, committed)).toBe(true);
  });

  it("matches when committed hashes arrive as a JSON string", async () => {
    const committed = JSON.stringify(await hashPaymentFields("wise", wiseData));
    expect(await verifyPaymentDataHashes(wiseData, committed)).toBe(true);
  });

  it("matches the real buyer shape: an array of one JSON string", async () => {
    // Observed live: contract.buyerHashedPaymentData === ['{"wise":{"hashes":[...]}}']
    const committed = [JSON.stringify(await hashPaymentFields("wise", wiseData))];
    expect(await verifyPaymentDataHashes(wiseData, committed)).toBe(true);
  });

  it("reassembles committed hashes that were comma-split into fragments", async () => {
    // Observed live for SEPA: the JSON string
    //   {"sepa":{"hashes":["<iban hash>"],"country":"DE","isMpesa":false}}
    // arrives split on every comma into a string array.
    const sepaData = { type: "sepa", iban: "DE13200100204335378318" };
    const real = await hashPaymentFields("sepa", sepaData, "DE");
    real.sepa.isMpesa = false; // match the live shape that carries isMpesa:false
    const fragmented = JSON.stringify(real).split(",");
    expect(fragmented.length).toBeGreaterThan(1); // sanity: it really did split
    expect(await verifyPaymentDataHashes(sepaData, fragmented)).toBe(true);
  });

  it("still flags a comma-split commitment whose iban was tampered", async () => {
    const sepaData = { type: "sepa", iban: "DE13200100204335378318" };
    const real = await hashPaymentFields("sepa", sepaData, "DE");
    real.sepa.hashes = ["zz" + real.sepa.hashes[0]]; // wrong hash
    const fragmented = JSON.stringify(real).split(",");
    expect(await verifyPaymentDataHashes(sepaData, fragmented)).toBe(false);
  });

  it("scopes to the contract's payment method when several are committed", async () => {
    const wiseHashes = await hashPaymentFields("wise", wiseData);
    const sepaHashes = await hashPaymentFields("sepa", {
      type: "sepa",
      iban: "DE00 0000",
    });
    const committed = [
      JSON.stringify(wiseHashes),
      JSON.stringify(sepaHashes),
    ];
    expect(await verifyPaymentDataHashes(wiseData, committed)).toBe(true);
  });

  it("ignores changes to DO_NOT_HASH fields like reference", async () => {
    const committed = await hashPaymentFields("wise", wiseData);
    const revealed = { ...wiseData, reference: "PEACH-DIFFERENT" };
    expect(await verifyPaymentDataHashes(revealed, committed)).toBe(true);
  });

  it("returns false when a hashed field was tampered with", async () => {
    const committed = await hashPaymentFields("wise", wiseData);
    const revealed = { ...wiseData, email: "mallory@evil.com" };
    expect(await verifyPaymentDataHashes(revealed, committed)).toBe(false);
  });

  it("flags a bare, non-hex (tampered) committed hash in an array", async () => {
    // Observed live: seller committed a wrong hash, ["zz" + the real hash].
    const real = await hashPaymentFields("wise", wiseData);
    const tampered = ["zz" + real.wise.hashes[0]];
    expect(await verifyPaymentDataHashes(wiseData, tampered)).toBe(false);
  });

  it("matches a bare, correct committed hash in an array", async () => {
    const real = await hashPaymentFields("wise", wiseData);
    expect(await verifyPaymentDataHashes(wiseData, [real.wise.hashes[0]])).toBe(
      true,
    );
  });

  it("returns null (no false alarm) when no committed hashes are available", async () => {
    expect(await verifyPaymentDataHashes(wiseData, null)).toBeNull();
    expect(await verifyPaymentDataHashes(wiseData, {})).toBeNull();
  });

  it("returns null when the revealed details are missing", async () => {
    const committed = await hashPaymentFields("wise", wiseData);
    expect(await verifyPaymentDataHashes(null, committed)).toBeNull();
  });
});
