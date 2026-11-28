/**
 * PGP public key ownership proofs.
 *
 * Every PGP public key a user registers comes with a `proof`: the user's
 * Peach ID signature over sha256(publicKey). The user id is the Peach ID
 * public key, so anyone can check that the user really added that PGP key.
 * A key the server lists without a valid proof could have been added by
 * someone else (e.g. the server itself), so it must not be trusted to verify
 * the user's signatures or to encrypt anything meant for them.
 *
 * Only applied where it matters: when verifying another user's signature or
 * encrypting to another user. Mirrors mobile's getProvenPgpPublicKeys.
 */
import * as openpgp from "openpgp";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { decryptPGPMessage } from "./pgp.js";

/**
 * Peach ID signature as mobile makes it: ECDSA over sha256(utf8 message),
 * compact hex, by the key behind the user id. Mirrors mobile's
 * isValidPeachUserSignature. Never throws.
 */
export function isValidPeachUserSignature(message, userId, signature) {
  try {
    return secp256k1.verify(
      hexToBytes(signature),
      sha256(utf8ToBytes(message)),
      hexToBytes(userId),
      { prehash: false, lowS: false },
    );
  } catch {
    return false;
  }
}

/**
 * Keeps only the PGP public keys the user proved they own, as armored
 * strings. The public key is checked exactly as received (no trimming or
 * normalizing), since that is the string that was signed. Entries without a
 * proof (including bare strings) are dropped.
 *
 * @param {object} p
 * @param {string} p.userId - the user's Peach ID public key (user id)
 * @param {Array<{ publicKey: string, proof: string } | string>} [p.pgpPublicKeys]
 * @returns {string[]}
 */
export function getProvenPgpPublicKeys({ userId, pgpPublicKeys }) {
  if (!userId) return [];
  return (pgpPublicKeys ?? [])
    .filter(
      (k) =>
        !!k?.publicKey &&
        !!k?.proof &&
        isValidPeachUserSignature(k.publicKey, userId, k.proof),
    )
    .map((k) => k.publicKey);
}

/** same as getProvenPgpPublicKeys, for a user object (`{ id, pgpPublicKeys }`) */
export const getUserProvenPgpPublicKeys = (user) =>
  getProvenPgpPublicKeys({ userId: user?.id, pgpPublicKeys: user?.pgpPublicKeys });

/**
 * Whether `armoredSignature` is a valid detached signature over `plaintext`
 * by any of `armoredKeys`. Never throws.
 */
export async function isSignedByAnyKey(plaintext, armoredSignature, armoredKeys) {
  let signature;
  try {
    signature = await openpgp.readSignature({ armoredSignature });
  } catch {
    return false;
  }
  for (const armoredKey of armoredKeys ?? []) {
    try {
      const { signatures } = await openpgp.verify({
        message: await openpgp.createMessage({ text: plaintext }),
        signature,
        verificationKeys: await openpgp.readKey({ armoredKey }),
        // tolerate a counterparty device clock slightly ahead of ours
        date: new Date(Date.now() + 60_000),
      });
      if (await signatures[0].verified) return true;
    } catch {
      // wrong key or unreadable key, try the next one
    }
  }
  return false;
}

/**
 * Whether `signature` over `message` was made by one of the PGP keys `user`
 * proved they own. Mirrors mobile's hasValidSignature over
 * getUserProvenPgpPublicKeys(user). Never throws.
 *
 * @param {object} p
 * @param {string} p.message
 * @param {string} [p.signature] - armored detached PGP signature
 * @param {{ id: string, pgpPublicKeys?: Array<{ publicKey: string, proof: string }> }} p.user
 */
export async function isSignedByUser({ message, signature, user }) {
  if (!signature) return false;
  return isSignedByAnyKey(message, signature, getUserProvenPgpPublicKeys(user));
}

/**
 * Decrypts a symmetric key (chat + payment data key) and checks it was signed
 * by one of the given PROVEN PGP keys. Anyone can encrypt a key to our public
 * key, so the signature is what proves the key came from the other party:
 * when it is missing or invalid the key is rejected (null), and nothing gets
 * encrypted or decrypted with a key someone else may know.
 * Mirrors mobile's decryptSymmetricKey. Never throws.
 *
 * @param {object} p
 * @param {string} p.symmetricKeyEncrypted - armored PGP message, encrypted to us
 * @param {string} [p.symmetricKeySignature] - armored detached signature over the key
 * @param {string[]} p.pgpPublicKeys - proven armored keys allowed to have signed it
 * @param {string} p.privKey - our armored PGP private key
 * @returns {Promise<string|null>} the (trimmed) key, or null
 */
export async function decryptSymmetricKey({
  symmetricKeyEncrypted,
  symmetricKeySignature,
  pgpPublicKeys,
  privKey,
}) {
  if (!symmetricKeyEncrypted || !symmetricKeySignature || !privKey) return null;
  try {
    const raw = await decryptPGPMessage(symmetricKeyEncrypted, privKey);
    if (!raw) return null;
    // the signer signed the key as generated; the decrypted text may carry
    // trailing whitespace, so the trimmed form is accepted too
    const isSigned =
      (await isSignedByAnyKey(raw, symmetricKeySignature, pgpPublicKeys)) ||
      (raw !== raw.trim() &&
        (await isSignedByAnyKey(raw.trim(), symmetricKeySignature, pgpPublicKeys)));
    if (!isSigned) {
      console.error("[PGP] SYMMETRIC_KEY_SIGNATURE_INVALID");
      return null;
    }
    return raw.trim() || null;
  } catch {
    return null;
  }
}
