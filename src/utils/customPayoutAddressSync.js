// ─── CUSTOM PAYOUT ADDRESS SYNC ─────────────────────────────────────────────
// Encrypt + sign + POST the user's custom payout address (with its BIP322
// proof-of-control) to /v069/selfUser/encryptedCustomPayoutAddress, and
// decrypt + signature-verify it back from GET /v069/selfUser. Mirrors
// pmSync.js. The encrypted blob carries the full bundle so
// the BIP322 proof travels with the address it confirms.
// ─────────────────────────────────────────────────────────────────────────────

import {
  encryptPGPMessage,
  signPGPMessage,
  decryptPGPMessage,
  verifyDetachedSignature,
  derivePublicKeyArmored,
} from "./pgp.js";
import { fetchWithSessionCheck } from "./sessionGuard.js";
import { dispatchTamperDetected } from "./tamperGuard.js";

function isPGPMessage(v) {
  return typeof v === "string" && v.includes("-----BEGIN PGP MESSAGE-----");
}

// Encrypt + sign + POST the payout address bundle.
// data: { address, label, confirmationPhrase, bip322Signature } — any field may be null.
// Returns true on success, false on any failure (logs a warning — never throws).
export async function syncCustomPayoutAddressToServer(
  { address, label, confirmationPhrase, bip322Signature },
  auth,
) {
  if (!auth?.pgpPrivKey) {
    console.warn("[PayoutAddress Sync] No PGP key — cannot sync");
    return false;
  }
  try {
    const json = JSON.stringify({
      address: address ?? null,
      label: label ?? null,
      confirmationPhrase: confirmationPhrase ?? null,
      bip322Signature: bip322Signature ?? null,
    });

    const [encrypted, signature] = await Promise.all([
      encryptPGPMessage(json, auth.pgpPrivKey),
      signPGPMessage(json, auth.pgpPrivKey),
    ]);
    if (!encrypted) throw new Error("Encryption returned null");

    const payload = { encryptedCustomPayoutAddress: encrypted };
    if (signature) payload.encryptedCustomPayoutAddressSignature = signature;

    const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
    const res = await fetchWithSessionCheck(`${v069Base}/selfUser/encryptedCustomPayoutAddress`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status} ${body}`);
    }
    console.log("[PayoutAddress Sync] ✓ Synced to server");
    return true;
  } catch (err) {
    console.warn("[PayoutAddress Sync] Failed:", err.message);
    return false;
  }
}

// Decrypt + verify-signature the encryptedCustomPayoutAddress field on a
// GET /v069/selfUser profile. Returns
//   { address, label, confirmationPhrase, bip322Signature }
// (each value either a string or null), or null when the field is absent /
// decryption / signature verification fails. On signature failure also fires
// the tamper modal and overwrites the server blob with an empty payload so
// the bad ciphertext can't be replayed.
export async function extractCustomPayoutAddressFromProfile(profile, armoredPrivKey) {
  if (!profile || !armoredPrivKey) return null;
  const enc = profile.encryptedCustomPayoutAddress;
  const sig = profile.encryptedCustomPayoutAddressSignature;
  if (!isPGPMessage(enc)) return null;

  try {
    const plaintext = await decryptPGPMessage(enc, armoredPrivKey);
    if (!plaintext) {
      console.warn("[PayoutAddress Sync] Decryption failed");
      return null;
    }
    if (sig) {
      const pubKey = await derivePublicKeyArmored(armoredPrivKey);
      const valid = await verifyDetachedSignature(plaintext, sig, pubKey);
      if (!valid) {
        console.warn("[PayoutAddress Sync] Signature invalid — discarding");
        dispatchTamperDetected("custom payout address");
        // Self-heal: overwrite the tampered blob with a freshly-signed empty
        // payload so a malicious server can't replay the bad ciphertext.
        const auth = window.__PEACH_AUTH__;
        if (auth?.pgpPrivKey && auth?.baseUrl && auth?.token) {
          syncCustomPayoutAddressToServer(
            { address: null, label: null, confirmationPhrase: null, bip322Signature: null },
            auth,
          ).catch(err => console.warn("[PayoutAddress Sync] Wipe failed:", err?.message));
        }
        return null;
      }
    }
    const data = JSON.parse(plaintext);
    return {
      address:            typeof data?.address            === "string" ? data.address            : null,
      label:              typeof data?.label              === "string" ? data.label              : null,
      confirmationPhrase: typeof data?.confirmationPhrase === "string" ? data.confirmationPhrase : null,
      bip322Signature:    typeof data?.bip322Signature    === "string" ? data.bip322Signature    : null,
    };
  } catch (err) {
    console.warn("[PayoutAddress Sync] Extraction failed:", err.message);
    return null;
  }
}

// Fetch /v069/selfUser and decrypt the encryptedCustomPayoutAddress field.
// Returns { address, label, confirmationPhrase, bip322Signature } or null
// (not saved / no auth / fetch or decrypt failure). One canonical path,
// shared by Settings (initial load) and trade-execution (toggle + submission).
export async function fetchSavedCustomPayoutAddress(auth) {
  if (!auth?.token || !auth?.pgpPrivKey || !auth?.baseUrl) return null;
  try {
    const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
    const res = await fetchWithSessionCheck(`${v069Base}/selfUser`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const profile = data.user ?? data;
    return await extractCustomPayoutAddressFromProfile(profile, auth.pgpPrivKey);
  } catch (err) {
    console.warn("[PayoutAddress Sync] fetchSavedCustomPayoutAddress failed:", err.message);
    return null;
  }
}
