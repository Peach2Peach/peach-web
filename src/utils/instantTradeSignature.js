/**
 * Instant trade declaration for sell offers
 * (POST /v069/sellOffer/:id/instantTradeSignature).
 *
 * The seller signs a fixed sentence stating whether the offer is instant
 * trade. The server builds the same sentence and verifies the signature.
 * Mobile signs with the Peach ID key; the web doesn't have that key, so it
 * sends the other accepted format: an armored detached PGP signature made with
 * the user's PGP key (window.__PEACH_AUTH__.pgpPrivKey).
 *
 * Mirrors mobile's submitInstantTradeSignature / isInstantTradeSellOffer /
 * getInstantTradeDeclarationMessage.
 */
import { signPGPMessage } from "./pgp.js";
import { getSigningPeachId } from "./format.js";
import { fetchWithSessionCheck } from "./sessionGuard.js";
import { isSignedByAnyKey, isValidPeachUserSignature } from "./pgpKeyProof.js";

/**
 * Reads whether a sell offer was instant trade from the seller's own signed
 * declaration. Both sentences are tried and exactly one must verify.
 * Throws INVALID_INSTANT_TRADE_DECLARATION otherwise: the declaration is
 * missing, belongs to another offer or user, or is corrupt.
 *
 * Mirrors mobile's getInstantTradeFromDeclaration, which only reads Peach ID
 * signatures. The web also accepts the armored PGP format it signs with
 * itself, verified against the seller's PGP public keys.
 *
 * @param {object} p
 * @param {string} p.offerId - raw numeric sell offer id
 * @param {string} p.sellerId - the seller's Peach ID public key (user id)
 * @param {string[]} [p.sellerPgpPublicKeys] - the seller's PROVEN armored PGP public keys
 *   (see getProvenPgpPublicKeys)
 * @param {string|null} [p.instantTradeSignature]
 * @returns {Promise<boolean>}
 */
export async function getInstantTradeFromDeclaration({
  offerId,
  sellerId,
  sellerPgpPublicKeys = [],
  instantTradeSignature,
}) {
  if (!instantTradeSignature) throw new Error("INVALID_INSTANT_TRADE_DECLARATION");

  const isArmored = instantTradeSignature.includes("-----BEGIN PGP SIGNATURE-----");
  const [isInstantValid, isNotInstantValid] = await Promise.all(
    [true, false].map((isInstant) => {
      const message = getInstantTradeDeclarationMessage(sellerId, String(offerId), isInstant);
      return isArmored
        ? isSignedByAnyKey(message, instantTradeSignature, sellerPgpPublicKeys.filter(Boolean))
        : isValidPeachUserSignature(message, sellerId, instantTradeSignature);
    }),
  );

  if (isInstantValid === isNotInstantValid) throw new Error("INVALID_INSTANT_TRADE_DECLARATION");
  return isInstantValid;
}

const MAX_RETRIES = 4;
const RETRY_INTERVAL = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Same rule as the server: an offer is instant trade when at least one
 * paymentData entry has a truthy `encrypted` field. NOT `instantTradeCriteria`,
 * which the server returns even when instant trade is off.
 */
export function isInstantTradeSellOffer({ paymentData } = {}) {
  return Object.values(paymentData ?? {}).some((data) => !!data?.encrypted);
}

/** Must match the sentence the server builds. `offerId` is the raw numeric id. */
export function getInstantTradeDeclarationMessage(userId, offerId, isInstantTrade) {
  return `I, user ${getSigningPeachId(userId)}, declare that the offer with id ${offerId} ${isInstantTrade ? "is" : "is NOT"} instant trade`;
}

function v069Url(auth, path) {
  return `${auth.baseUrl.replace(/\/v1$/, "/v069")}${path}`;
}

async function fetchSellOffer(auth, sellOfferId) {
  const res = await fetchWithSessionCheck(v069Url(auth, `/sellOffer/${sellOfferId}`), {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  return res.ok ? res.json().catch(() => null) : null;
}

// Submissions still running, by offer id. A screen that polls right after
// offer creation joins the creation-time submission instead of starting a
// second retry chain.
const inFlight = new Map();

/**
 * Declares whether a sell offer is instant trade. `paymentData` decides it;
 * when omitted, the offer is fetched and its own paymentData is used.
 * Tries once plus MAX_RETRIES retries, RETRY_INTERVAL apart.
 * Never throws: resolves to whether the signature was stored.
 */
export function submitInstantTradeSignature({ id, paymentData }) {
  const sellOfferId = String(id);
  const running = inFlight.get(sellOfferId);
  if (running) return running;
  const promise = doSubmit(sellOfferId, paymentData).finally(() => inFlight.delete(sellOfferId));
  inFlight.set(sellOfferId, promise);
  return promise;
}

/**
 * Fetches the offer and declares it if the server has no declaration yet
 * (`instantTradeSignature === null`). Used after republishing, where the new
 * offer id needs its own declaration based on its own paymentData.
 * Never throws.
 */
export async function declareInstantTradeIfMissing(sellOfferId) {
  try {
    const auth = window.__PEACH_AUTH__;
    if (!auth?.token) return false;
    const offer = await fetchSellOffer(auth, sellOfferId);
    if (!offer) {
      console.error(`[InstantTradeSignature] offer ${sellOfferId}: could not load offer`);
      return false;
    }
    // absent field = server without declarations; non-null = already declared
    if (offer.instantTradeSignature !== null) return false;
    return submitInstantTradeSignature({ id: sellOfferId, paymentData: offer.paymentData ?? {} });
  } catch (e) {
    console.error(`[InstantTradeSignature] offer ${sellOfferId}: unexpected error`, e);
    return false;
  }
}

async function doSubmit(sellOfferId, paymentData) {
  try {
    const auth = window.__PEACH_AUTH__;
    if (!auth?.token || !auth?.pgpPrivKey || !auth?.peachId) {
      console.error(`[InstantTradeSignature] offer ${sellOfferId}: not logged in`);
      return false;
    }

    let data = paymentData;
    if (data === undefined) {
      const offer = await fetchSellOffer(auth, sellOfferId);
      if (!offer) {
        console.error(`[InstantTradeSignature] offer ${sellOfferId}: could not load offer`);
        return false;
      }
      data = offer.paymentData;
    }

    const message = getInstantTradeDeclarationMessage(
      auth.peachId,
      sellOfferId,
      isInstantTradeSellOffer({ paymentData: data }),
    );

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) await sleep(RETRY_INTERVAL);
      const label = `(attempt ${attempt + 1}/${MAX_RETRIES + 1}) offer ${sellOfferId}`;
      try {
        const instantTradeSignature = await signPGPMessage(message, auth.pgpPrivKey);
        if (!instantTradeSignature) throw new Error("PGP signing failed");
        const res = await fetchWithSessionCheck(
          v069Url(auth, `/sellOffer/${sellOfferId}/instantTradeSignature`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth.token}`,
            },
            body: JSON.stringify({ instantTradeSignature }),
          },
        );
        const body = await res.json().catch(() => null);
        if (res.ok && body?.success) return true;
        console.error(
          `[InstantTradeSignature] rejected ${label}`,
          `server: ${res.status} ${JSON.stringify(body)}`,
          `signed: "${message}"`,
        );
      } catch (e) {
        console.error(`[InstantTradeSignature] failed ${label}`, `signed: "${message}"`, e);
      }
    }
  } catch (e) {
    console.error(`[InstantTradeSignature] offer ${sellOfferId}: unexpected error`, e);
  }
  return false;
}
