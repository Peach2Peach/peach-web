import { describe, it, expect, beforeAll } from "vitest";
import * as openpgp from "openpgp";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { verifyContractTradeDetails } from "./tradeDetails.js";
import {
  getInstantTradeDeclarationMessage,
  getInstantTradeFromDeclaration,
} from "./instantTradeSignature.js";

const genKey = (name) =>
  openpgp.generateKey({ type: "ecc", curve: "ed25519Legacy", userIDs: [{ name }] });

const detachedSign = async (text, armoredKey) =>
  openpgp.sign({
    message: await openpgp.createMessage({ text }),
    signingKeys: await openpgp.readPrivateKey({ armoredKey }),
    detached: true,
  });

const peachIdOf = (secret) => bytesToHex(secp256k1.getPublicKey(secret, true));
const peachSign = (message, secret) =>
  bytesToHex(secp256k1.sign(sha256(utf8ToBytes(message)), secret, { prehash: false }));

const sellerSecret = secp256k1.utils.randomSecretKey();
const sellerId = peachIdOf(sellerSecret);
const buyerSecret = secp256k1.utils.randomSecretKey();
const buyerId = peachIdOf(buyerSecret);

/** a PGP key as the server lists it, with the owner's ownership proof */
const proven = (publicKey, secret) => ({ publicKey, proof: peachSign(publicKey, secret) });
const offerId = "52";

/** Peach ID declaration, as mobile signs it */
const declaration = (isInstantTrade, id = offerId) =>
  peachSign(getInstantTradeDeclarationMessage(sellerId, id, isInstantTrade), sellerSecret);

const plaintextOf = (overrides = {}) =>
  JSON.stringify({
    buyer: buyerId,
    seller: sellerId,
    offerId: 52,
    paymentMethod: "wise",
    amount: "30000",
    price: 16.6,
    premium: 1.5,
    currency: "EUR",
    ...overrides,
  });

let seller, buyer, other, contract;
const notInstantOffer = () => ({ id: offerId, instantTradeSignature: declaration(false) });

async function contractFor(plaintext, { buyerKey = buyer, sellerKey = seller } = {}) {
  const [encryptedTradeDetails, buyerSig, sellerSig] = await Promise.all([
    openpgp.encrypt({
      message: await openpgp.createMessage({ text: plaintext }),
      encryptionKeys: await openpgp.readKey({ armoredKey: seller.publicKey }),
    }),
    detachedSign(plaintext, buyerKey.privateKey),
    detachedSign(plaintext, sellerKey.privateKey),
  ]);
  return {
    id: "52-7",
    amount: 30000,
    validateEncryptedTradeDetails: true,
    buyer: { id: buyerId, pgpPublicKeys: [proven(buyer.publicKey, buyerSecret)] },
    seller: { id: sellerId, pgpPublicKeys: [proven(seller.publicKey, sellerSecret)] },
    encryptedTradeDetails,
    encryptedTradeDetailsBuyerSignature: buyerSig,
    encryptedTradeDetailsSellerSignature: sellerSig,
  };
}

const verify = (c, sellOffer = notInstantOffer()) =>
  verifyContractTradeDetails({ contract: c, sellOffer, sellerPrivKey: seller.privateKey });

describe("verifyContractTradeDetails", () => {
  beforeAll(async () => {
    [seller, buyer, other] = await Promise.all([genKey("seller"), genKey("buyer"), genKey("other")]);
    contract = await contractFor(plaintextOf());
  }, 30_000);

  it.each([false, undefined])(
    "does nothing when the server sets validateEncryptedTradeDetails to %s",
    async (validateEncryptedTradeDetails) => {
      await expect(
        verify(
          { ...contract, validateEncryptedTradeDetails, encryptedTradeDetails: undefined },
          { id: offerId, instantTradeSignature: null },
        ),
      ).resolves.toBeUndefined();
    },
  );

  it("skips instant trades, which carry no trade details", async () => {
    await expect(
      verify(
        { ...contract, encryptedTradeDetails: undefined },
        { id: offerId, instantTradeSignature: declaration(true) },
      ),
    ).resolves.toBeUndefined();
  });

  it("passes for valid trade details naming this buyer", async () => {
    await expect(verify(contract)).resolves.toBeUndefined();
  });

  it("fails when the instant trade declaration is invalid", async () => {
    for (const instantTradeSignature of [null, declaration(false, "53"), "deadbeef"]) {
      await expect(verify(contract, { id: offerId, instantTradeSignature })).rejects.toThrow(
        "INVALID_INSTANT_TRADE_DECLARATION",
      );
    }
  });

  it("fails when the trade details name another buyer", async () => {
    const c = await contractFor(plaintextOf({ buyer: "02other" }));
    await expect(verify(c)).rejects.toThrow("INVALID_CONTRACT_TRADE_DETAILS");
  });

  it("fails when the trade details name another seller", async () => {
    const c = await contractFor(plaintextOf({ seller: "03other" }));
    await expect(verify(c)).rejects.toThrow("INVALID_CONTRACT_TRADE_DETAILS");
  });

  it("fails when the trade details are for another offer", async () => {
    const c = await contractFor(plaintextOf({ offerId: 53 }));
    await expect(verify(c)).rejects.toThrow("INVALID_CONTRACT_TRADE_DETAILS");
  });

  it("fails when the amount differs from the contract", async () => {
    await expect(verify({ ...contract, amount: 40000 })).rejects.toThrow(
      "INVALID_CONTRACT_TRADE_DETAILS",
    );
  });

  it("fails when the contract is for another sell offer", async () => {
    await expect(
      verify({ ...contract, id: "53-7" }, { id: "53", instantTradeSignature: declaration(false, "53") }),
    ).rejects.toThrow("INVALID_CONTRACT_TRADE_DETAILS");
  });

  it("fails on an invalid buyer signature", async () => {
    const c = await contractFor(plaintextOf(), { buyerKey: other });
    await expect(verify(c)).rejects.toThrow("INVALID_CONTRACT_TRADE_DETAILS");
  });

  it("fails on an invalid seller signature", async () => {
    const c = await contractFor(plaintextOf(), { sellerKey: other });
    await expect(verify(c)).rejects.toThrow("INVALID_CONTRACT_TRADE_DETAILS");
  });

  it("ignores PGP keys without a valid ownership proof", async () => {
    // the details really are signed by `other`, but nobody proved owning it
    const c = await contractFor(plaintextOf(), { buyerKey: other, sellerKey: other });
    for (const proof of [undefined, "", peachSign(other.publicKey, sellerSecret)]) {
      await expect(
        verify({
          ...c,
          buyer: { ...c.buyer, pgpPublicKeys: [...c.buyer.pgpPublicKeys, { publicKey: other.publicKey, proof }] },
        }),
      ).rejects.toThrow("INVALID_CONTRACT_TRADE_DETAILS");
    }
    // bare strings carry no proof either
    await expect(
      verify({ ...c, seller: { ...c.seller, pgpPublicKeys: [other.publicKey] } }),
    ).rejects.toThrow("INVALID_CONTRACT_TRADE_DETAILS");
  });

  it("accepts a signature from any proven key of the user", async () => {
    const c = await contractFor(plaintextOf(), { buyerKey: other });
    await expect(
      verify({
        ...c,
        buyer: {
          ...c.buyer,
          pgpPublicKeys: [...c.buyer.pgpPublicKeys, proven(other.publicKey, buyerSecret)],
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("fails when the trade details are missing", async () => {
    for (const field of [
      "encryptedTradeDetails",
      "encryptedTradeDetailsBuyerSignature",
      "encryptedTradeDetailsSellerSignature",
    ]) {
      await expect(verify({ ...contract, [field]: undefined })).rejects.toThrow(
        "INVALID_CONTRACT_TRADE_DETAILS",
      );
    }
  });

  it("fails when the trade details can't be decrypted", async () => {
    await expect(verify({ ...contract, encryptedTradeDetails: "garbage" })).rejects.toThrow(
      "INVALID_CONTRACT_TRADE_DETAILS",
    );
  });
});

describe("getInstantTradeFromDeclaration with a web (PGP) declaration", () => {
  const pgpDeclaration = (isInstant, id = offerId) =>
    detachedSign(getInstantTradeDeclarationMessage(sellerId, id, isInstant), seller.privateKey);

  it("reads both answers from the seller's PGP key", async () => {
    for (const isInstant of [true, false]) {
      await expect(
        getInstantTradeFromDeclaration({
          offerId,
          sellerId,
          sellerPgpPublicKeys: [seller.publicKey],
          instantTradeSignature: await pgpDeclaration(isInstant),
        }),
      ).resolves.toBe(isInstant);
    }
  });

  it("rejects a PGP declaration for another offer or by another key", async () => {
    await expect(
      getInstantTradeFromDeclaration({
        offerId,
        sellerId,
        sellerPgpPublicKeys: [seller.publicKey],
        instantTradeSignature: await pgpDeclaration(false, "53"),
      }),
    ).rejects.toThrow("INVALID_INSTANT_TRADE_DECLARATION");
    await expect(
      getInstantTradeFromDeclaration({
        offerId,
        sellerId,
        sellerPgpPublicKeys: [other.publicKey],
        instantTradeSignature: await pgpDeclaration(false),
      }),
    ).rejects.toThrow("INVALID_INSTANT_TRADE_DECLARATION");
  });
});
