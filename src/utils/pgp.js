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

// ── Sensitive PM fields that get SHA-256 hashed (not sent in plaintext) ──
const HASH_FIELDS = new Set([
  "iban", "accountNumber", "email", "phone", "userName",
  "walletAddress", "ukSortCode", "routingNumber",
]);

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
      signingKeys: privateKey,
    });

    // Also create a detached signature
    const sigMessage = await openpgp.createMessage({ text: plaintext });
    const signature = await openpgp.sign({
      message: sigMessage,
      signingKeys: privateKey,
    });

    return { encrypted, signature };
  } catch (err) {
    console.warn("[PGP] encryptForRecipients failed:", err.message);
    return null;
  }
}

/**
 * Encrypt plaintext with AES-256-GCM using a hex-encoded key.
 * Returns a base64 string containing IV (12 bytes) + ciphertext.
 */
export async function encryptAES256(plaintext, hexKey) {
  try {
    const keyBytes = hexToBytes(hexKey);
    const key = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, encoded
    );
    // Prepend IV to ciphertext and base64-encode
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.warn("[PGP] encryptAES256 failed:", err.message);
    return null;
  }
}

/**
 * Decrypt an AES-256-GCM encrypted base64 string using a hex-encoded key.
 * Expects the first 12 bytes to be the IV.
 */
export async function decryptAES256(base64Ciphertext, hexKey) {
  try {
    const keyBytes = hexToBytes(hexKey);
    const key = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
    );
    const combined = Uint8Array.from(atob(base64Ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn("[PGP] decryptAES256 failed:", err.message);
    return null;
  }
}

/**
 * Hash sensitive payment method fields with SHA-256.
 * Returns an object like: { "sepa": { hashes: ["abc123...", "def456..."], country: "DE" } }
 *
 * @param {string} methodType - e.g. "sepa", "wise", "revolut"
 * @param {object} pmData - Payment method details (iban, email, etc.)
 * @param {string} [country] - Optional country code
 */
export async function hashPaymentFields(methodType, pmData, country) {
  try {
    const hashes = [];
    for (const [key, val] of Object.entries(pmData)) {
      if (!val || typeof val !== "string") continue;
      if (HASH_FIELDS.has(key)) {
        const encoded = new TextEncoder().encode(val.toLowerCase().trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
        const hashHex = bytesToHex(new Uint8Array(hashBuffer));
        hashes.push(hashHex);
      }
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
      signingKeys: privateKey,
    });
    return encrypted;
  } catch (err) {
    console.warn("[PGP] Encryption failed:", err.message);
    return null;
  }
}

/**
 * Sign a plaintext string with the user's PGP private key.
 * Returns the armored PGP signature string, or null on failure.
 * Used alongside encryptPGPMessage() for PM sync — the server
 * expects both encryptedPaymentData and encryptedPaymentDataSignature.
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
    const signature = await openpgp.sign({ message, signingKeys: privateKey });
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
      console.log("[PGP] Detected shape: single PGP blob");
      const plaintext = await decryptPGPMessage(apiResponse, armoredPrivKey);
      if (!plaintext) return null;
      return JSON.parse(plaintext);
    }

    // Shape 2: array of PGP strings
    if (Array.isArray(apiResponse) && apiResponse.length > 0 && isPGPString(apiResponse[0])) {
      console.log("[PGP] Detected shape: array of PGP strings");
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
        console.log(`[PGP] Detected shape: array of objects with encrypted field "${encKey}"`);
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
      console.log("[PGP] Detected shape: plain array (no encryption)");
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
        console.log("[PGP] Detected shape: object map with PGP values");
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
      console.log("[PGP] Detected shape: plain object (no encryption)");
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
    console.log("[PGP] Profile keys:", Object.keys(profile));

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
      console.log("[PGP] No encrypted fields found in profile (top-level or nested)");
      // Check if profile has a plain paymentData/paymentMethods field
      if (profile.paymentData) return profile.paymentData;
      if (profile.paymentMethods) return profile.paymentMethods;
      return null;
    }

    console.log(`[PGP] Found ${encryptedEntries.length} encrypted field(s): ${encryptedEntries.map(e => e[0]).join(", ")}`);

    // Decrypt each encrypted field
    const decrypted = {};
    for (const [key, val] of encryptedEntries) {
      const plaintext = await decryptPGPMessage(val, armoredPrivKey);
      if (plaintext) {
        try {
          decrypted[key] = JSON.parse(plaintext);
          console.log(`[PGP] Decrypted "${key}" →`, typeof decrypted[key], Array.isArray(decrypted[key]) ? `(array, ${decrypted[key].length} items)` : "");
        } catch {
          decrypted[key] = plaintext;
          console.log(`[PGP] Decrypted "${key}" → raw string (${plaintext.length} chars)`);
        }
      } else {
        console.warn(`[PGP] Failed to decrypt field "${key}"`);
      }
    }

    // Look for PM-like data in the decrypted fields
    for (const pmKey of ["paymentData", "paymentMethods", "pgpPaymentData"]) {
      if (decrypted[pmKey]) {
        console.log(`[PGP] Found PM data in decrypted field "${pmKey}":`, decrypted[pmKey]);
        return decrypted[pmKey];
      }
    }

    // If only one encrypted field, assume it's PMs
    if (encryptedEntries.length === 1) {
      const onlyKey = encryptedEntries[0][0];
      console.log(`[PGP] Single encrypted field "${onlyKey}" — treating as PM data:`, decrypted[onlyKey]);
      return decrypted[onlyKey];
    }

    // Return all decrypted data and let the caller figure it out
    console.log("[PGP] Multiple encrypted fields — returning all decrypted data:", Object.keys(decrypted));
    return decrypted;
  } catch (err) {
    console.warn("[PGP] extractPMsFromProfile failed:", err.message);
    return null;
  }
}
