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
