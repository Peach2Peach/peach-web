/**
 * After a sell offer is revived (republished), the seller PGP-signs
 * "<oldOfferId>-<newOfferId>" and sends it to
 * POST /v069/sellOffer/:newOfferId/oldOfferIdSignature.
 *
 * oldOfferId is read from the new offer itself: the server sets it to the
 * ORIGINAL offer (when the republished offer was already a revival, its own
 * oldOfferId carries over), not necessarily the offer just republished.
 * Mirrors mobile's src/utils/offer/submitOldOfferIdSignature.ts.
 */
import { signPGPMessage } from "./pgp.js";
import { fetchWithSessionCheck } from "./sessionGuard.js";

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Must match the server: "<oldOfferId>-<sellOfferId>". */
export function getOldOfferIdDeclarationMessage(oldOfferId, sellOfferId) {
  return `${oldOfferId}-${sellOfferId}`;
}

/**
 * Tries once plus MAX_RETRIES retries, RETRY_INTERVAL apart. Each attempt
 * re-reads the offer, so a failed GET is retried too.
 * Never throws: resolves to whether the signature is stored.
 */
export async function submitOldOfferIdSignature(newOfferId) {
  const sellOfferId = String(newOfferId);
  const auth = window.__PEACH_AUTH__;
  if (!auth?.token || !auth?.pgpPrivKey) {
    console.error(`[OldOfferIdSignature] offer ${sellOfferId}: not logged in`);
    return false;
  }
  const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
  const authHeader = { Authorization: `Bearer ${auth.token}` };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_INTERVAL);
    const label = `(attempt ${attempt + 1}/${MAX_RETRIES + 1}) offer ${sellOfferId}`;
    let message;
    try {
      const offerRes = await fetchWithSessionCheck(`${v069Base}/sellOffer/${sellOfferId}`, {
        headers: authHeader,
      });
      const sellOffer = offerRes.ok ? await offerRes.json().catch(() => null) : null;
      if (!sellOffer) throw new Error(`offer not loaded: HTTP ${offerRes.status}`);
      if (sellOffer.oldOfferIdSignature) return true;
      if (!sellOffer.oldOfferId) {
        // nothing to declare: retrying won't change that
        console.error(`[OldOfferIdSignature] ${label}: offer has no oldOfferId`);
        return false;
      }

      message = getOldOfferIdDeclarationMessage(sellOffer.oldOfferId, sellOfferId);
      const oldOfferIdSignature = await signPGPMessage(message, auth.pgpPrivKey);
      if (!oldOfferIdSignature) throw new Error("PGP signing failed");

      const res = await fetchWithSessionCheck(`${v069Base}/sellOffer/${sellOfferId}/oldOfferIdSignature`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ oldOfferIdSignature }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) return true;
      console.error(
        `[OldOfferIdSignature] rejected ${label}`,
        `server: ${res.status} ${JSON.stringify(body)}`,
        `signed: "${message}"`,
      );
    } catch (e) {
      console.error(`[OldOfferIdSignature] failed ${label}`, message ? `signed: "${message}"` : "", e);
    }
  }
  return false;
}
