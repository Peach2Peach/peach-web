// ─── PM SYNC ─────────────────────────────────────────────────────────────────
// Encrypt and push the user's payment methods to the server via
// POST /v069/selfUser/encryptedPaymentData. Shared by the Payment Methods
// screen and the Offer Creation screen so that a PM added from either place
// persists identically.
// ─────────────────────────────────────────────────────────────────────────────

import { encryptPGPMessage, signPGPMessage } from "./pgp.js";
import { fetchWithSessionCheck } from "./sessionGuard.js";

// Translate a PM's in-memory details (UI-friendly keys like `username`, `holder`)
// into the canonical server-side keys the API and the hash function expect
// (`userName`, `beneficiary`). Also strips UI-only state (keys starting with `_`)
// and drops redundant `email` when it equals `userName`.
// Single source of truth for field normalization — used by both serializePMs
// (outgoing encrypted PM blob) and the offer-creation hash path.
export function canonicalizeDetails(details = {}) {
  const out = {};
  for (const [k, v] of Object.entries(details)) {
    if (k.startsWith("_")) continue;
    out[k] = v;
  }
  if (out.username && !out.userName) {
    out.userName = out.username;
    delete out.username;
  }
  if (out.holder && !out.beneficiary) {
    out.beneficiary = out.holder;
    delete out.holder;
  }
  if (out.email && out.userName && out.email === out.userName) {
    delete out.email;
  }
  return out;
}

// Convert internal PM array → API object-map format.
// Internal shape: { id, methodId, name, currencies, details:{..., _payRefType, _payRefCustom} }
// API shape:      { [id]: { id, label, currencies, ...flatDetails } }
export function serializePMs(pms) {
  const map = {};
  for (const pm of pms) {
    const apiDetails = canonicalizeDetails(pm.details);
    map[pm.id] = {
      id: pm.id,
      label: pm.name,
      currencies: pm.currencies || [],
      ...apiDetails,
    };
  }
  return map;
}

// Encrypt the PM map with the user's own PGP key and POST it to the server.
// Returns true on success, false on any failure (logs a warning — never throws).
export async function syncPMsToServer(pms, auth) {
  if (!auth?.pgpPrivKey) {
    console.warn("[PM Sync] No PGP key — cannot sync");
    return false;
  }
  try {
    const apiMap = serializePMs(pms);
    const json = JSON.stringify(apiMap);
    console.log("[PM Sync] Serialised PM map:", apiMap);

    const [encrypted, signature] = await Promise.all([
      encryptPGPMessage(json, auth.pgpPrivKey),
      signPGPMessage(json, auth.pgpPrivKey),
    ]);
    if (!encrypted) throw new Error("Encryption returned null");

    const payload = { encryptedPaymentData: encrypted };
    if (signature) payload.encryptedPaymentDataSignature = signature;

    const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
    const res = await fetchWithSessionCheck(`${v069Base}/selfUser/encryptedPaymentData`, {
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
    console.log("[PM Sync] ✓ Synced to server");
    return true;
  } catch (err) {
    console.warn("[PM Sync] Failed:", err.message);
    return false;
  }
}
