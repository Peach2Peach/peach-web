/**
 * PGP utilities for decrypting Peach API responses.
 *
 * The Peach API returns payment method data encrypted with the user's
 * PGP public key. These helpers decrypt it client-side using the private
 * key stored at window.__PEACH_AUTH__.pgpPrivKey.
 */
import * as openpgp from "openpgp";

const PGP_HEADER = "-----BEGIN PGP MESSAGE-----";

function isPGPString(val) {
  return typeof val === "string" && val.trimStart().startsWith(PGP_HEADER);
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
    const encryptedEntries = [];
    for (const [key, val] of Object.entries(profile)) {
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
