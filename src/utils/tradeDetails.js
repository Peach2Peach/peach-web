/**
 * Encrypted trade details for a regular trade request to a SELL offer
 * (POST /v069/sellOffer/:id/tradeRequestPerformed).
 *
 * The buyer serializes the trade terms, encrypts them to the seller's PGP keys
 * only (the buyer can't decrypt them afterwards, by design) and signs the same
 * plaintext with a detached signature from their own PGP key. Mirrors mobile's
 * src/views/peach069/helpers/createEncryptedTradeDetails.ts.
 *
 * Not used for instant trades or for trade requests to buy offers.
 */
import * as openpgp from "openpgp";
import { GOPENPGP_COMPAT } from "./pgp.js";

/**
 * Price the buyer sees, in `currency`, rounded to 2 decimals. Same formula as
 * mobile's getOfferPrice. Returns 0 when there's no market price for the
 * currency — callers must not send the trade request in that case.
 */
export function getOfferPrice({ amount, premium, prices, currency }) {
  const price = prices?.[currency];
  if (!price) return 0;
  return Math.round(((price * amount * (1 + premium / 100)) / 100_000_000) * 100) / 100;
}

/**
 * JSON plaintext the server expects. The key order is part of the contract,
 * so the object is built explicitly in that order. `offerId` is a number and
 * `amount` a string.
 */
export function buildTradeDetailsPlaintext({
  buyer,
  seller,
  offerId,
  paymentMethod,
  amount,
  price,
  premium,
  currency,
}) {
  return JSON.stringify({
    buyer,
    seller,
    offerId: Number(offerId),
    paymentMethod,
    amount: String(amount),
    price,
    premium,
    currency,
  });
}

async function readUnlockedPrivateKey(armoredPrivKey) {
  let privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivKey });
  if (!privateKey.isDecrypted()) {
    privateKey = await openpgp.decryptKey({ privateKey, passphrase: "" });
  }
  return privateKey;
}

/**
 * @param {object} details - see buildTradeDetailsPlaintext
 * @param {string[]} sellerPubKeys - armored PGP public keys of the seller (all of them)
 * @param {string} buyerPrivKey - armored PGP private key of the logged-in buyer
 * @returns {Promise<{ encryptedTradeDetails: string, encryptedTradeDetailsBuyerSignature: string }>}
 * Throws on failure: without these fields the server rejects the request.
 */
export async function createEncryptedTradeDetails(details, sellerPubKeys, buyerPrivKey) {
  const armoredKeys = (sellerPubKeys ?? []).filter(Boolean);
  if (armoredKeys.length === 0) throw new Error("Seller has no PGP public keys");

  const plaintext = buildTradeDetailsPlaintext(details);
  const [encryptionKeys, signingKey] = await Promise.all([
    Promise.all(armoredKeys.map((armoredKey) => openpgp.readKey({ armoredKey }))),
    readUnlockedPrivateKey(buyerPrivKey),
  ]);

  const [encryptedTradeDetails, encryptedTradeDetailsBuyerSignature] = await Promise.all([
    openpgp.encrypt({
      message: await openpgp.createMessage({ text: plaintext }),
      encryptionKeys,
      config: GOPENPGP_COMPAT,
    }),
    openpgp.sign({
      message: await openpgp.createMessage({ text: plaintext }),
      signingKeys: signingKey,
      detached: true,
      config: GOPENPGP_COMPAT,
    }),
  ]);

  return { encryptedTradeDetails, encryptedTradeDetailsBuyerSignature };
}
