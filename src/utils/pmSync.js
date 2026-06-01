// ─── PM SYNC ─────────────────────────────────────────────────────────────────
// Encrypt and push the user's payment methods to the server via
// POST /v069/selfUser/encryptedPaymentData. Shared by the Payment Methods
// screen and the Offer Creation screen so that a PM added from either place
// persists identically.
// ─────────────────────────────────────────────────────────────────────────────

import { encryptPGPMessage, signPGPMessage } from "./pgp.js";
import { fetchWithSessionCheck } from "./sessionGuard.js";

// Convert internal PM array → API object-map format.
// Internal shape: { id, methodId, name, label, currencies, details:{..., reference} }
// API shape:      { [id]: { id, type, label, currencies, ...flatDetails } }
// The `type` field is REQUIRED — the mobile app keys off it to recognise the
// payment method (e.g. "sepa", "wise"). Without it, mobile silently drops the PM.
// `label` is the user's nickname for this PM; empty when the user left it blank.
// Strips keys starting with `_` — those are UI-only state and must not be
// serialised into the encrypted blob.
export function serializePMs(pms) {
  const map = {};
  for (const pm of pms) {
    const details = pm.details || {};
    const apiDetails = {};
    for (const [k, v] of Object.entries(details)) {
      if (!k.startsWith("_")) apiDetails[k] = v;
    }
    // The wire-format `type` field must be the bare method id. Strip only the
    // long `-<Date.now()>` uniqueness suffix (13 digits) — NOT short trailing
    // numbers that are part of a cash event id (e.g. cash.es.malaga.malaga-2140,
    // cash.fr.saintetienne.bitcoin-42), which would otherwise be corrupted.
    const type = String(pm.methodId || "").replace(/-\d{10,}$/, "");
    // Preserve the user-editable label as-typed (empty if the user left it blank).
    const label = String(pm.label || "").trim();
    map[pm.id] = {
      id: pm.id,
      type,
      label,
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
