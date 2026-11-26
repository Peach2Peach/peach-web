/**
 * Encrypted trade details for a regular trade request to a SELL offer
 * (POST /v069/sellOffer/:id/tradeRequestPerformed).
 *
 * The buyer serializes the trade terms, encrypts them to the seller's PGP keys
 * only (the buyer can't decrypt them afterwards, by design) and signs the same
 * plaintext with a detached signature from their own PGP key. Mirrors mobile's
 * src/views/peach069/helpers/createEncryptedTradeDetails.ts.
 *
 * The seller countersigns the same plaintext when accepting the request
 * (countersignEncryptedTradeDetails).
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

/** Thrown when the seller must not countersign the trade details. */
export class InvalidTradeDetailsError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidTradeDetailsError";
  }
}

async function isSignedByAnyKey(plaintext, armoredSignature, armoredKeys) {
  let signature;
  try {
    signature = await openpgp.readSignature({ armoredSignature });
  } catch {
    return false;
  }
  for (const armoredKey of armoredKeys) {
    try {
      const { signatures } = await openpgp.verify({
        message: await openpgp.createMessage({ text: plaintext }),
        signature,
        verificationKeys: await openpgp.readKey({ armoredKey }),
        // tolerate a buyer device clock slightly ahead of ours
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
 * Seller side of a trade request to a sell offer
 * (POST /v069/sellOffer/:id/tradeRequestReceived/:userId/accept).
 *
 * Decrypts the buyer's trade details, checks the buyer's signature and that
 * the details describe this exact trade, then signs the plaintext with the
 * seller's own PGP key. Returns the armored detached signature
 * (`encryptedTradeDetailsSellerSignature`).
 * Throws InvalidTradeDetailsError when anything doesn't check out, so the
 * seller never countersigns details they didn't agree to. `price` and
 * `premium` aren't compared: the buyer's price is only an estimate.
 * Mirrors mobile's countersignEncryptedTradeDetails.
 *
 * @param {object} p
 * @param {string} [p.encryptedTradeDetails]
 * @param {string} [p.encryptedTradeDetailsBuyerSignature]
 * @param {string[]} p.buyerPgpPublicKeys - armored PGP public keys of the buyer
 * @param {{ seller: string, buyer: string, offerId: string|number, amount: number|string, paymentMethod: string, currency: string }} p.expected
 * @param {string} p.sellerPrivKey - armored PGP private key of the logged-in seller
 */
export async function countersignEncryptedTradeDetails({
  encryptedTradeDetails,
  encryptedTradeDetailsBuyerSignature,
  buyerPgpPublicKeys,
  expected,
  sellerPrivKey,
}) {
  if (!encryptedTradeDetails || !encryptedTradeDetailsBuyerSignature)
    throw new InvalidTradeDetailsError("trade details missing");

  const privateKey = await readUnlockedPrivateKey(sellerPrivKey);

  let plaintext;
  try {
    const { data } = await openpgp.decrypt({
      message: await openpgp.readMessage({ armoredMessage: encryptedTradeDetails }),
      decryptionKeys: privateKey,
    });
    plaintext = data;
  } catch {
    throw new InvalidTradeDetailsError("could not decrypt trade details");
  }

  const buyerKeys = (buyerPgpPublicKeys ?? []).filter(Boolean);
  if (!(await isSignedByAnyKey(plaintext, encryptedTradeDetailsBuyerSignature, buyerKeys)))
    throw new InvalidTradeDetailsError("invalid buyer signature");

  let details;
  try {
    details = JSON.parse(plaintext);
  } catch {
    throw new InvalidTradeDetailsError("trade details are not valid JSON");
  }

  const mismatches = [
    details?.seller !== expected.seller && "seller",
    details?.buyer !== expected.buyer && "buyer",
    details?.offerId !== Number(expected.offerId) && "offerId",
    details?.amount !== String(expected.amount) && "amount",
    details?.paymentMethod !== expected.paymentMethod && "paymentMethod",
    details?.currency !== expected.currency && "currency",
  ].filter(Boolean);
  if (mismatches.length)
    throw new InvalidTradeDetailsError(`trade details mismatch: ${mismatches.join(", ")}`);

  // sign the decrypted text byte for byte, not a re-serialization of it
  return openpgp.sign({
    message: await openpgp.createMessage({ text: plaintext }),
    signingKeys: privateKey,
    detached: true,
    config: GOPENPGP_COMPAT,
  });
}
