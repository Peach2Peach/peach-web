import { describe, it, expect, beforeAll } from "vitest";
import * as openpgp from "openpgp";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import {
  getProvenPgpPublicKeys,
  getUserProvenPgpPublicKeys,
  isSignedByUser,
  decryptSymmetricKey,
} from "./pgpKeyProof.js";

const secret = secp256k1.utils.randomSecretKey();
const userId = bytesToHex(secp256k1.getPublicKey(secret, true));
const otherSecret = secp256k1.utils.randomSecretKey();
const sign = (message, s = secret) =>
  bytesToHex(secp256k1.sign(sha256(utf8ToBytes(message)), s, { prehash: false }));

const KEY_A = "-----BEGIN PGP PUBLIC KEY BLOCK-----\nA\n-----END PGP PUBLIC KEY BLOCK-----\n";
const KEY_B = "-----BEGIN PGP PUBLIC KEY BLOCK-----\nB\n-----END PGP PUBLIC KEY BLOCK-----\n";

describe("getProvenPgpPublicKeys", () => {
  it("keeps only keys with a valid proof by the user, as armored strings", () => {
    expect(
      getProvenPgpPublicKeys({
        userId,
        pgpPublicKeys: [
          { publicKey: KEY_A, proof: sign(KEY_A) },
          { publicKey: KEY_B, proof: sign(KEY_B, otherSecret) }, // someone else's proof
          { publicKey: KEY_B, proof: sign(KEY_A) }, // proof for another key
          { publicKey: KEY_B, proof: "" },
          { publicKey: KEY_B },
          KEY_B, // bare string, no proof
          null,
        ],
      }),
    ).toEqual([KEY_A]);
  });

  it("checks the key exactly as received", () => {
    expect(
      getProvenPgpPublicKeys({
        userId,
        pgpPublicKeys: [{ publicKey: KEY_A.trim(), proof: sign(KEY_A) }],
      }),
    ).toEqual([]);
  });

  it("returns nothing without a user id or keys", () => {
    expect(getProvenPgpPublicKeys({ userId: undefined, pgpPublicKeys: [{ publicKey: KEY_A, proof: sign(KEY_A) }] })).toEqual([]);
    expect(getProvenPgpPublicKeys({ userId })).toEqual([]);
    expect(getUserProvenPgpPublicKeys(undefined)).toEqual([]);
  });

  it("reads a user object", () => {
    expect(
      getUserProvenPgpPublicKeys({ id: userId, pgpPublicKeys: [{ publicKey: KEY_A, proof: sign(KEY_A) }] }),
    ).toEqual([KEY_A]);
  });
});

describe("isSignedByUser (payment data signatures)", () => {
  const PM_JSON = '{"type":"sepa","iban":"DE89370400440532013000","beneficiary":"Alice"}';
  let owned, foreign;
  const signWith = async (key) =>
    openpgp.sign({
      message: await openpgp.createMessage({ text: PM_JSON }),
      signingKeys: await openpgp.readPrivateKey({ armoredKey: key.privateKey }),
      detached: true,
    });

  beforeAll(async () => {
    const gen = (name) =>
      openpgp.generateKey({ type: "ecc", curve: "ed25519Legacy", userIDs: [{ name }] });
    [owned, foreign] = await Promise.all([gen("owner"), gen("someone else")]);
  }, 30_000);

  const user = (keys) => ({ id: userId, pgpPublicKeys: keys });
  const provenKey = (k) => ({ publicKey: k.publicKey, proof: sign(k.publicKey) });

  it("accepts a signature by a proven key of the owner", async () => {
    expect(
      await isSignedByUser({ message: PM_JSON, signature: await signWith(owned), user: user([provenKey(owned)]) }),
    ).toBe(true);
  });

  it("rejects a signature by a key the owner never proved", async () => {
    expect(
      await isSignedByUser({
        message: PM_JSON,
        signature: await signWith(foreign),
        user: user([provenKey(owned), { publicKey: foreign.publicKey, proof: sign(foreign.publicKey, otherSecret) }]),
      }),
    ).toBe(false);
  });

  it("rejects tampered data, a missing signature and garbage", async () => {
    const signature = await signWith(owned);
    const u = user([provenKey(owned)]);
    expect(await isSignedByUser({ message: PM_JSON.replace("Alice", "Mallory"), signature, user: u })).toBe(false);
    expect(await isSignedByUser({ message: PM_JSON, signature: undefined, user: u })).toBe(false);
    expect(await isSignedByUser({ message: PM_JSON, signature: "garbage", user: u })).toBe(false);
  });
});

describe("decryptSymmetricKey", () => {
  const SYM_KEY = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
  let me, counterparty, attacker, encrypted;
  const signKey = async (key, text = SYM_KEY) =>
    openpgp.sign({
      message: await openpgp.createMessage({ text }),
      signingKeys: await openpgp.readPrivateKey({ armoredKey: key.privateKey }),
      detached: true,
    });

  beforeAll(async () => {
    const gen = (name) =>
      openpgp.generateKey({ type: "ecc", curve: "ed25519Legacy", userIDs: [{ name }] });
    [me, counterparty, attacker] = await Promise.all([gen("me"), gen("cp"), gen("attacker")]);
    encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: SYM_KEY }),
      encryptionKeys: await openpgp.readKey({ armoredKey: me.publicKey }),
    });
  }, 30_000);

  const run = async (symmetricKeySignature, pgpPublicKeys, symmetricKeyEncrypted = encrypted) =>
    decryptSymmetricKey({
      symmetricKeyEncrypted,
      symmetricKeySignature,
      pgpPublicKeys,
      privKey: me.privateKey,
    });

  it("returns the key when signed by one of the given keys", async () => {
    expect(await run(await signKey(counterparty), [attacker.publicKey, counterparty.publicKey])).toBe(SYM_KEY);
  });

  it("rejects a key signed by anyone else", async () => {
    expect(await run(await signKey(attacker), [counterparty.publicKey])).toBeNull();
  });

  it("rejects a signature over another key", async () => {
    expect(await run(await signKey(counterparty, "other"), [counterparty.publicKey])).toBeNull();
  });

  it("rejects a missing signature, no keys, and undecryptable input", async () => {
    const sig = await signKey(counterparty);
    expect(await run(undefined, [counterparty.publicKey])).toBeNull();
    expect(await run(sig, [])).toBeNull();
    expect(await run(sig, [counterparty.publicKey], "garbage")).toBeNull();
  });

  it("accepts a signature over the key without the trailing whitespace it was decrypted with", async () => {
    const padded = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: SYM_KEY + "\n" }),
      encryptionKeys: await openpgp.readKey({ armoredKey: me.publicKey }),
    });
    expect(await run(await signKey(counterparty), [counterparty.publicKey], padded)).toBe(SYM_KEY);
  });
});
