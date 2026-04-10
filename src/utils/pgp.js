/**
 * PGP utilities for encrypting and decrypting Peach API data.
 *
 * The Peach API stores payment method data encrypted with the user's
 * PGP public key. These helpers decrypt it on read (using the private
 * key at window.__PEACH_AUTH__.pgpPrivKey) and encrypt it on write
 * (deriving the public key from the same private key).
 */
import * as openpgp from "openpgp";

const PGP_HEADER = "-----BEGIN PGP MESSAGE-----";

// GopenPGP (mobile) compatibility — disable openpgp.js v6 features it can't handle
const GOPENPGP_COMPAT = {
  preferredHashAlgorithm: openpgp.enums.hash.sha256,
  preferredSymmetricAlgorithm: openpgp.enums.symmetric.aes256,
  nonDeterministicSignaturesViaNotation: false,
  aeadProtect: false,              // explicit: SKESK v4 + SEIPD v1 (no AEAD)
  s2kIterationCountByte: 96,       // ~65 536 iterations — matches typical GopenPGP default
};

// ── All PM detail fields the server knows about (matches mobile app's PaymentDataInfoFields) ──
const ALL_PAYMENT_FIELDS = [
  "accountNumber", "accountType", "alias", "aliasType", "bankAccountNumber",
  "bankBranch", "bankCode", "bankName", "beneficiary", "beneficiaryAddress",
  "bic", "branchCode", "branchName", "bsbNumber", "cedulaID", "DNI", "email",
  "iban", "lnurlAddress", "mobileMoneyIdentifier", "name", "nameTag", "phone",
  "pixAlias", "postePayNumber", "receiveAddress", "receiveAddressEthereum",
  "receiveAddressSolana", "receiveAddressTron", "reference", "residentialAddress",
  "routingDetails", "RUT", "steamFriendCode", "ukBankAccount", "ukSortCode",
  "userId", "userName", "wallet", "mpesa_name", "mpesa_phone", "mpesa_finalCurrency",
];

// Fields that must NOT be hashed (mobile app's doNotHash list)
const DO_NOT_HASH = new Set(["beneficiary", "bic", "name", "reference", "ukSortCode"]);

function isPGPString(val) {
  return typeof val === "string" && val.trimStart().startsWith(PGP_HEADER);
}

// ── Helpers for hex ↔ bytes conversion ──
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a 32-byte random symmetric key as a hex string.
 * Used as the shared secret for AES-256 encryption of payment data
 * and contract chat messages.
 */
export function generateSymmetricKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

/**
 * Encrypt a plaintext string with multiple recipients' PGP public keys
 * and sign with the sender's private key.
 *
 * Used to encrypt the symmetric key so both parties can decrypt it.
 * Returns { encrypted, signature } or null on failure.
 *
 * @param {string} plaintext - The text to encrypt
 * @param {string[]} armoredPubKeys - Array of armored PGP public key strings
 * @param {string} armoredPrivKey - Sender's armored PGP private key
 */
export async function encryptForRecipients(plaintext, armoredPubKeys, armoredPrivKey) {
  try {
    let privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivKey });
    if (!privateKey.isDecrypted()) {
      try {
        privateKey = await openpgp.decryptKey({ privateKey, passphrase: "" });
      } catch {
        console.warn("[PGP] Private key is passphrase-protected");
        return null;
      }
    }

    // Read all recipient public keys (filter out empty/invalid)
    const encryptionKeys = [];
    for (const armoredKey of armoredPubKeys) {
      if (!armoredKey) continue;
      try {
        const key = await openpgp.readKey({ armoredKey });
        encryptionKeys.push(key);
      } catch (err) {
        console.warn("[PGP] Could not read public key:", err.message);
      }
    }
    // Always include own public key
    encryptionKeys.push(privateKey.toPublic());

    const message = await openpgp.createMessage({ text: plaintext });
    const encrypted = await openpgp.encrypt({
      message,
      encryptionKeys,
      config: GOPENPGP_COMPAT,
    });

    // Create detached signature (-----BEGIN PGP SIGNATURE----- format)
    // GopenPGP's Sign() produces detached signatures and Verify() expects them
    const sigMessage = await openpgp.createMessage({ text: plaintext });
    const signature = await openpgp.sign({
      message: sigMessage,
      signingKeys: privateKey,
      detached: true,
      config: GOPENPGP_COMPAT,
    });

    return { encrypted, signature };
  } catch (err) {
    console.warn("[PGP] encryptForRecipients failed:", err.message);
    return null;
  }
}

/**
 * Encrypt plaintext with OpenPGP symmetric encryption using a passphrase.
 * Matches the mobile app's `OpenPGP.encryptSymmetric(plaintext, passphrase, { cipher: 2 })`
 * which uses AES-256 inside the PGP message format.
 *
 * Returns an armored PGP message string, or null on failure.
 *
 * @param {string} plaintext - The text to encrypt
 * @param {string} passphrase - The symmetric key (hex string from generateSymmetricKey())
 */
export async function encryptSymmetric(plaintext, passphrase) {
  try {
    const message = await openpgp.createMessage({ text: plaintext });
    const encrypted = await openpgp.encrypt({
      message,
      passwords: [passphrase],
      config: GOPENPGP_COMPAT,
    });
    return encrypted;
  } catch (err) {
    console.warn("[PGP] encryptSymmetric failed:", err.message);
    return null;
  }
}

/**
 * Decrypt an OpenPGP symmetrically-encrypted armored message using a passphrase.
 * Counterpart to encryptSymmetric().
 *
 * Returns the decrypted plaintext string, or null on failure.
 *
 * @param {string} armoredMessage - The PGP-armored encrypted message
 * @param {string} passphrase - The symmetric key used to encrypt
 */
export async function decryptSymmetric(armoredMessage, passphrase) {
  try {
    const message = await openpgp.readMessage({ armoredMessage });
    const { data } = await openpgp.decrypt({
      message,
      passwords: [passphrase],
    });
    return data;
  } catch (err) {
    console.warn("[PGP] decryptSymmetric failed:", err.message);
    return null;
  }
}

/**
 * Hash payment method fields with SHA-256.
 * Matches the mobile app's hashPaymentData() — iterates ALL_PAYMENT_FIELDS,
 * skips DO_NOT_HASH fields and empty values, lowercases before hashing.
 *
 * Returns an object like: { "sepa": { hashes: ["abc123...", "def456..."], country: "DE" } }
 *
 * @param {string} methodType - e.g. "sepa", "wise", "revolut"
 * @param {object} pmData - Payment method details (iban, email, userName, etc.)
 * @param {string} [country] - Optional country code
 */
export async function hashPaymentFields(methodType, pmData, country) {
  try {
    const hashes = [];
    for (const field of ALL_PAYMENT_FIELDS) {
      if (DO_NOT_HASH.has(field)) continue;
      const val = pmData[field];
      if (!val || typeof val !== "string") continue;
      const encoded = new TextEncoder().encode(val.toLowerCase());
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      hashes.push(bytesToHex(new Uint8Array(hashBuffer)));
    }
    const result = { hashes };
    if (country) result.country = country;
    return { [methodType]: result };
  } catch (err) {
    console.warn("[PGP] hashPaymentFields failed:", err.message);
    return { [methodType]: { hashes: [] } };
  }
}

/**
 * Detect API error responses that come back as 200 with an error body
 * (e.g. {"error": "forbidden"}). These should not be treated as PM data.
 */
export function isApiError(data) {
  return data && typeof data === "object" && !Array.isArray(data)
    && ("error" in data || "message" in data)
    && !("id" in data || "methodId" in data || "currencies" in data);
}

/**
 * Decrypt a single PGP-armored message.
 * Returns the decrypted plaintext string, or null on failure.
 */
export async function decryptPGPMessage(armoredMessage, armoredPrivKey) {
  try {
    let privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivKey });

    if (!privateKey.isDecrypted()) {
      try {
        privateKey = await openpgp.decryptKey({ privateKey, passphrase: "" });
      } catch {
        console.warn("[PGP] Private key is passphrase-protected and cannot be unlocked");
        return null;
      }
    }

    const message = await openpgp.readMessage({ armoredMessage });
    const { data } = await openpgp.decrypt({ message, decryptionKeys: privateKey });
    return data;
  } catch (err) {
    console.warn("[PGP] Decryption failed:", err.message);
    return null;
  }
}

/**
 * Encrypt a plaintext string with the user's PGP key.
 * Derives the public key from the private key for self-encryption,
 * and signs the message with the private key.
 * Returns the armored PGP message string, or null on failure.
 */
export async function encryptPGPMessage(plaintext, armoredPrivKey) {
  try {
    let privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivKey });

    if (!privateKey.isDecrypted()) {
      try {
        privateKey = await openpgp.decryptKey({ privateKey, passphrase: "" });
      } catch {
        console.warn("[PGP] Private key is passphrase-protected and cannot be unlocked for encryption");
        return null;
      }
    }

    const publicKey = privateKey.toPublic();
    const message = await openpgp.createMessage({ text: plaintext });
    const encrypted = await openpgp.encrypt({
      message,
      encryptionKeys: publicKey,
      config: GOPENPGP_COMPAT,
    });
    return encrypted;
  } catch (err) {
    console.warn("[PGP] Encryption failed:", err.message);
    return null;
  }
}

/**
 * Encrypt plaintext for a specific recipient's PGP public key (no signing).
 * Used for dispute submission — encrypting data for the Peach platform.
 */
export async function encryptForPublicKey(plaintext, armoredPubKey) {
  try {
    const publicKey = await openpgp.readKey({ armoredKey: armoredPubKey });
    const message = await openpgp.createMessage({ text: plaintext });
    const encrypted = await openpgp.encrypt({
      message,
      encryptionKeys: publicKey,
      config: GOPENPGP_COMPAT,
    });
    return encrypted;
  } catch (err) {
    console.warn("[PGP] encryptForPublicKey failed:", err.message);
    return null;
  }
}

/**
 * Sign a plaintext string with the user's PGP private key.
 * Returns an armored detached PGP signature (-----BEGIN PGP SIGNATURE-----).
 *
 * GopenPGP's Sign() produces detached signatures and its Verify() expects them.
 * We must match that format — cleartext signed messages (-----BEGIN PGP SIGNED
 * MESSAGE-----) are routed to verifyBytes() on mobile which can't verify them.
 */
export async function signPGPMessage(plaintext, armoredPrivKey) {
  try {
    let privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivKey });

    if (!privateKey.isDecrypted()) {
      try {
        privateKey = await openpgp.decryptKey({ privateKey, passphrase: "" });
      } catch {
        console.warn("[PGP] Private key is passphrase-protected and cannot be unlocked for signing");
        return null;
      }
    }

    const message = await openpgp.createMessage({ text: plaintext });
    const signature = await openpgp.sign({ message, signingKeys: privateKey, detached: true, config: GOPENPGP_COMPAT });
    return signature;
  } catch (err) {
    console.warn("[PGP] Signing failed:", err.message);
    return null;
  }
}

/**
 * Find the first object key whose value is a PGP-encrypted string.
 */
function findEncryptedKey(obj) {
  for (const [key, val] of Object.entries(obj)) {
    if (isPGPString(val)) return key;
  }
  return null;
}

/**
 * Decrypt a PGP-encrypted API response (e.g. from GET /v069/selfUser).
 *
 * Handles multiple possible API response shapes:
 *   1. Entire response is a PGP string → decrypt, parse as JSON
 *   2. Array of PGP strings → decrypt each, parse each
 *   3. Array of objects with an encrypted field → decrypt that field, merge
 *   4. Object map with PGP string values → decrypt each value
 *   5. Already plain JSON → pass through as-is
 *
 * Returns an array of PM objects, or null on failure.
 */
export async function decryptPaymentMethods(apiResponse, armoredPrivKey) {
  if (!armoredPrivKey) {
    console.warn("[PGP] No private key available — skipping decryption");
    return null;
  }

  try {
    // Shape 1: entire response is a single PGP blob
    if (isPGPString(apiResponse)) {
      const plaintext = await decryptPGPMessage(apiResponse, armoredPrivKey);
      if (!plaintext) return null;
      return JSON.parse(plaintext);
    }

    // Shape 2: array of PGP strings
    if (Array.isArray(apiResponse) && apiResponse.length > 0 && isPGPString(apiResponse[0])) {
      const results = await Promise.all(
        apiResponse.map(msg => decryptPGPMessage(msg, armoredPrivKey))
      );
      return results
        .filter(Boolean)
        .map(txt => JSON.parse(txt));
    }

    // Shape 3: array of objects with an encrypted field
    if (Array.isArray(apiResponse) && apiResponse.length > 0 && typeof apiResponse[0] === "object") {
      const encKey = findEncryptedKey(apiResponse[0]);
      if (encKey) {
        const results = await Promise.all(
          apiResponse.map(async (item) => {
            const plaintext = await decryptPGPMessage(item[encKey], armoredPrivKey);
            if (!plaintext) return null;
            const decrypted = JSON.parse(plaintext);
            const { [encKey]: _removed, ...rest } = item;
            return { ...rest, ...decrypted };
          })
        );
        return results.filter(Boolean);
      }
      // Array of plain objects — pass through (Shape 5)
      return apiResponse;
    }

    // Shape 4: object map with PGP string values
    if (apiResponse && typeof apiResponse === "object" && !Array.isArray(apiResponse)) {
      // Reject API error responses (e.g. {"error": "forbidden"})
      if (isApiError(apiResponse)) {
        console.warn("[PGP] API returned error object:", apiResponse.error || apiResponse.message);
        return null;
      }
      const firstKey = Object.keys(apiResponse)[0];
      if (firstKey && isPGPString(apiResponse[firstKey])) {
        const entries = await Promise.all(
          Object.entries(apiResponse).map(async ([key, val]) => {
            const plaintext = await decryptPGPMessage(val, armoredPrivKey);
            if (!plaintext) return null;
            return [key, JSON.parse(plaintext)];
          })
        );
        return Object.fromEntries(entries.filter(Boolean));
      }
      // Plain object map — pass through (Shape 5)
      return apiResponse;
    }

    // Unrecognised shape
    console.warn("[PGP] Unrecognised response shape — passing through as-is");
    return apiResponse;
  } catch (err) {
    console.warn("[PGP] decryptPaymentMethods failed:", err.message);
    return null;
  }
}

/**
 * Extract payment methods from a GET /v069/selfUser response.
 *
 * The selfUser endpoint returns { user: { ...profile } } where the profile
 * contains `encryptedPaymentData` — a PGP-encrypted string. This function
 * finds all PGP-encrypted values, decrypts them, and returns the PM data.
 *
 * Returns an array/object of PM data, or null if nothing found.
 */
export async function extractPMsFromProfile(profile, armoredPrivKey) {
  if (!profile || !armoredPrivKey) return null;

  try {
    // Log all profile keys so we can see the response shape

    // Collect all PGP-encrypted fields — top-level and one level deep
    // Skip signature fields — they are PGP signed messages, not encrypted data
    const SKIP_FIELDS = new Set(["encryptedPaymentDataSignature"]);
    const encryptedEntries = [];
    for (const [key, val] of Object.entries(profile)) {
      if (SKIP_FIELDS.has(key)) continue;
      if (isPGPString(val)) {
        encryptedEntries.push([key, val]);
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        for (const [subKey, subVal] of Object.entries(val)) {
          if (isPGPString(subVal)) encryptedEntries.push([`${key}.${subKey}`, subVal]);
        }
      }
    }

    if (encryptedEntries.length === 0) {
      // Check if profile has a plain paymentData/paymentMethods field
      if (profile.paymentData) return profile.paymentData;
      if (profile.paymentMethods) return profile.paymentMethods;
      return null;
    }


    // Decrypt each encrypted field
    const decrypted = {};
    for (const [key, val] of encryptedEntries) {
      const plaintext = await decryptPGPMessage(val, armoredPrivKey);
      if (plaintext) {
        try {
          decrypted[key] = JSON.parse(plaintext);
        } catch {
          decrypted[key] = plaintext;
        }
      } else {
        console.warn(`[PGP] Failed to decrypt field "${key}"`);
      }
    }

    // Look for PM-like data in the decrypted fields
    for (const pmKey of ["paymentData", "paymentMethods", "pgpPaymentData"]) {
      if (decrypted[pmKey]) {
        return decrypted[pmKey];
      }
    }

    // If only one encrypted field, assume it's PMs
    if (encryptedEntries.length === 1) {
      const onlyKey = encryptedEntries[0][0];
      return decrypted[onlyKey];
    }

    // Return all decrypted data and let the caller figure it out
    return decrypted;
  } catch (err) {
    console.warn("[PGP] extractPMsFromProfile failed:", err.message);
    return null;
  }
}

// ── QR Auth helpers ─────────────────────────────────────────────────────────

/**
 * Generate an ephemeral PGP keypair for the QR auth handshake.
 * Uses ed25519Legacy curve (same as the mobile app).
 * @returns {Promise<{ publicKeyArmored: string, privateKeyArmored: string }>}
 */
export async function generateEphemeralKeyPair() {
  const { privateKey, publicKey } = await openpgp.generateKey({
    type: "ecc",
    curve: "ed25519Legacy",
    userIDs: [{ name: "ephemeral" }],
  });
  return { publicKeyArmored: publicKey, privateKeyArmored: privateKey };
}

/**
 * Derive the armored public key from an armored private key.
 */
export async function derivePublicKeyArmored(armoredPrivKey) {
  const privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivKey });
  return privateKey.toPublic().armor();
}

/**
 * Verify a detached PGP signature against a known public key.
 * Used to verify the server signed the desktop connection ID.
 * @param {string} data - the plaintext that was signed
 * @param {string} signatureArmored - armored detached signature
 * @param {string} publicKeyArmored - armored public key of the signer
 * @returns {Promise<boolean>}
 */
export async function verifyDetachedSignature(data, signatureArmored, publicKeyArmored) {
  try {
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
    const signature = await openpgp.readSignature({ armoredSignature: signatureArmored });
    const verified = await openpgp.verify({
      message: await openpgp.createMessage({ text: data }),
      signature,
      verificationKeys: publicKey,
    });
    return await verified.signatures[0].verified;
  } catch (err) {
    console.warn("[PGP] verifyDetachedSignature failed:", err.message);
    return false;
  }
}
