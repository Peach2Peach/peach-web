import { describe, it, expect, beforeAll } from "vitest";
import * as openpgp from "openpgp";
import {
  buildTradeDetailsPlaintext,
  createEncryptedTradeDetails,
  getOfferPrice,
} from "./tradeDetails.js";

const genKey = (name) =>
  openpgp.generateKey({ type: "ecc", curve: "ed25519Legacy", userIDs: [{ name }] });

const DETAILS = {
  buyer: "02buyer",
  seller: "03seller",
  offerId: "52",
  paymentMethod: "wise",
  amount: 30000,
  price: 16.6,
  premium: 1.5,
  currency: "EUR",
};

describe("getOfferPrice", () => {
  it("applies the premium and rounds to 2 decimals", () => {
    // 54 520 * 30 000 sats * 1.015 / 1e8 = 16.60134
    expect(getOfferPrice({ amount: 30000, premium: 1.5, prices: { EUR: 54520 }, currency: "EUR" })).toBe(16.6);
  });
  it("returns 0 without a market price for the currency", () => {
    expect(getOfferPrice({ amount: 30000, premium: 0, prices: { EUR: 50000 }, currency: "CHF" })).toBe(0);
    expect(getOfferPrice({ amount: 30000, premium: 0, prices: null, currency: "EUR" })).toBe(0);
  });
});

describe("buildTradeDetailsPlaintext", () => {
  it("uses the exact key order and types the server expects", () => {
    expect(buildTradeDetailsPlaintext(DETAILS)).toBe(
      '{"buyer":"02buyer","seller":"03seller","offerId":52,"paymentMethod":"wise","amount":"30000","price":16.6,"premium":1.5,"currency":"EUR"}',
    );
  });
});

describe("createEncryptedTradeDetails", () => {
  let buyer, sellerA, sellerB;
  beforeAll(async () => {
    [buyer, sellerA, sellerB] = await Promise.all([genKey("buyer"), genKey("sellerA"), genKey("sellerB")]);
  });

  it("encrypts to every seller key and signs the plaintext with the buyer key", async () => {
    const { encryptedTradeDetails, encryptedTradeDetailsBuyerSignature } =
      await createEncryptedTradeDetails(DETAILS, [sellerA.publicKey, sellerB.publicKey], buyer.privateKey);

    expect(encryptedTradeDetails).toContain("-----BEGIN PGP MESSAGE-----");
    expect(encryptedTradeDetailsBuyerSignature).toContain("-----BEGIN PGP SIGNATURE-----");

    const plaintext = buildTradeDetailsPlaintext(DETAILS);
    for (const seller of [sellerA, sellerB]) {
      const { data } = await openpgp.decrypt({
        message: await openpgp.readMessage({ armoredMessage: encryptedTradeDetails }),
        decryptionKeys: await openpgp.readPrivateKey({ armoredKey: seller.privateKey }),
      });
      expect(data).toBe(plaintext);
    }

    const { signatures } = await openpgp.verify({
      message: await openpgp.createMessage({ text: plaintext }),
      signature: await openpgp.readSignature({ armoredSignature: encryptedTradeDetailsBuyerSignature }),
      verificationKeys: await openpgp.readKey({ armoredKey: buyer.publicKey }),
    });
    expect(await signatures[0].verified).toBe(true);
  });

  it("is not decryptable by the buyer", async () => {
    const { encryptedTradeDetails } =
      await createEncryptedTradeDetails(DETAILS, [sellerA.publicKey], buyer.privateKey);
    await expect(
      openpgp.decrypt({
        message: await openpgp.readMessage({ armoredMessage: encryptedTradeDetails }),
        decryptionKeys: await openpgp.readPrivateKey({ armoredKey: buyer.privateKey }),
      }),
    ).rejects.toThrow();
  });

  it("throws when the seller has no PGP keys", async () => {
    await expect(createEncryptedTradeDetails(DETAILS, [], buyer.privateKey)).rejects.toThrow(
      "Seller has no PGP public keys",
    );
  });
});
