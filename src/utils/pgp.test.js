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
  normalizeIBAN,
  normalizePaymentData,
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

// ── IBAN normalization (mirrors peach-app normalizeIBAN / hashPaymentData specs) ──

describe("normalizeIBAN", () => {
  const CANONICAL = "IE29AIBK93115212345678";
  it("removes whitespace, including tabs/newlines/non-breaking spaces", () => {
    expect(normalizeIBAN("IE29 AIBK 9311 5212 3456 78")).toBe(CANONICAL);
    expect(normalizeIBAN(" IE29\tAIBK\n9311\u00a05212 3456 78 ")).toBe(CANONICAL);
  });
  it("removes dashes and other separators", () => {
    expect(normalizeIBAN("IE29-AIBK-9311-5212-3456-78")).toBe(CANONICAL);
    expect(normalizeIBAN("IE29.AIBK/9311_5212|3456,78")).toBe(CANONICAL);
  });
  it("uppercases", () => {
    expect(normalizeIBAN("ie29 aibk 9311 5212 3456 78")).toBe(CANONICAL);
  });
  it("leaves a canonical IBAN untouched", () => {
    expect(normalizeIBAN(CANONICAL)).toBe(CANONICAL);
  });
});

describe("normalizePaymentData", () => {
  it("normalizes only the iban field and does not mutate the input", () => {
    const input = { iban: "pt00 10da-2345 9659", email: "A B@x.com" };
    const out = normalizePaymentData(input);
    expect(out).toEqual({ iban: "PT0010DA23459659", email: "A B@x.com" });
    expect(input.iban).toBe("pt00 10da-2345 9659");
  });
});

describe("hashPaymentFields IBAN normalization", () => {
  it("matches the mobile app's test vector", async () => {
    const r = await hashPaymentFields("sepa", { iban: "IE29AIBK93115212345678" });
    expect(r.sepa.hashes).toEqual([
      "0555f1f0ae95f1bfeac56dcab60f65639dc0e2c106eeada324717594d368a4d5",
    ]);
  });
  it("hashes a spaced / dashed / lowercase IBAN like the canonical one", async () => {
    const canonical = await hashPaymentFields("sepa", { iban: "PT0010DA23459659" });
    const messy = await hashPaymentFields("sepa", { iban: "pt00 10da-2345 9659" });
    expect(messy).toEqual(canonical);
    expect(canonical.sepa.hashes).toEqual([
      "7a80fff8646a86a9a820510fd1ef51b3fbcbbc86429486a0bd7edefc217e418d",
    ]);
  });
});

// ── Per-field normalization parity with peach-app formatters/validators ──

describe("normalizePaymentData mobile parity", () => {
  it.each([
    ["phone", "+351 912-345 678", "+351912345678"],
    ["phone", "(351) 912.345.678", "+351912345678"],
    ["mpesa_phone", "+254 712 345 678", "+254712345678"],
    ["userName", "@Foo_Bar ", "@foo_bar"],
    ["ukBankAccount", "1234-5678", "12345678"],
    ["ukSortCode", "12-34-56", "123456"],
    ["wallet", "u 1234 5678 abcd", "U12345678ABCD"],
    ["bic", "aibkie2dxxx", "AIBK IE 2D XXX"],
    ["bic", "AIBK IE 2D", "AIBK IE 2D"],
    ["email", "  me@example.com ", "me@example.com"],
    ["lnurlAddress", "me@wallet.io\n", "me@wallet.io"],
  ])("%s: %j → %j", (field, raw, expected) => {
    expect(normalizePaymentData({ [field]: raw })[field]).toBe(expected);
  });

  it("is the identity on values mobile can store", () => {
    const canonical = {
      iban: "IE29AIBK93115212345678",
      phone: "+341234875987",
      userName: "@foo_bar",
      ukBankAccount: "12345678",
      wallet: "U12345678ABCD",
      email: "me@example.com",
    };
    expect(normalizePaymentData(canonical)).toEqual(canonical);
  });

  it("leaves fields without a mobile formatter untouched", () => {
    const data = { accountNumber: "1234 5678 9", pixAlias: " x ", beneficiary: "A  B" };
    expect(normalizePaymentData(data)).toEqual(data);
  });

  it("matches the mobile phone hash test vector from a formatted input", async () => {
    const r = await hashPaymentFields("twint", { phone: "+34 123 487 5987" });
    expect(r.twint.hashes).toEqual([
      "c56ab971aeea3e5aa3d2e62e4ed7cb5488a63b0659e6db7b467e7f899cb7b418",
    ]);
  });
});

describe("hashPaymentFields doNotHash parity", () => {
  it("does not hash mpesa_name or residentialAddress (mobile doNotHash)", async () => {
    const r = await hashPaymentFields("m-pesa", {
      mpesa_phone: "+254712345678",
      mpesa_name: "John Doe",
      residentialAddress: "1 Main St",
    });
    expect(r["m-pesa"].hashes).toHaveLength(1);
  });
});
