import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import * as openpgp from "openpgp";

vi.mock("./sessionGuard.js", () => ({ fetchWithSessionCheck: vi.fn() }));

import { fetchWithSessionCheck } from "./sessionGuard.js";
import {
  isInstantTradeSellOffer,
  getInstantTradeDeclarationMessage,
  submitInstantTradeSignature,
  declareInstantTradeIfMissing,
} from "./instantTradeSignature.js";

const USER_ID = "02abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

// Drives fake setTimeout while letting openpgp's real async work run.
async function settle(promise) {
  let done = false;
  promise.finally(() => { done = true; });
  for (let i = 0; i < 1000 && !done; i++) {
    await new Promise((r) => setImmediate(r));
    await vi.advanceTimersByTimeAsync(100);
  }
  return promise;
}

const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe("isInstantTradeSellOffer", () => {
  it("is instant trade when some payment data is encrypted", () => {
    expect(
      isInstantTradeSellOffer({
        paymentData: { sepa: { hashes: [] }, wise: { encrypted: "-----BEGIN PGP MESSAGE-----" } },
      }),
    ).toBe(true);
  });
  it("is NOT instant trade without encrypted payment data", () => {
    expect(isInstantTradeSellOffer({ paymentData: { wise: { encrypted: "" } } })).toBe(false);
    expect(isInstantTradeSellOffer({ paymentData: {} })).toBe(false);
    expect(isInstantTradeSellOffer({})).toBe(false);
  });
  it("ignores instantTradeCriteria", () => {
    expect(
      isInstantTradeSellOffer({ paymentData: {}, instantTradeCriteria: { minReputation: 0, badges: [], minTrades: 0 } }),
    ).toBe(false);
  });
});

describe("getInstantTradeDeclarationMessage", () => {
  it("matches the server sentence", () => {
    expect(getInstantTradeDeclarationMessage(USER_ID, "47", true)).toBe(
      "I, user peach02abcdef, declare that the offer with id 47 is instant trade",
    );
    expect(getInstantTradeDeclarationMessage(USER_ID, "47", false)).toBe(
      "I, user peach02abcdef, declare that the offer with id 47 is NOT instant trade",
    );
  });
});

describe("submitInstantTradeSignature", () => {
  let key;
  beforeAll(async () => {
    key = await openpgp.generateKey({ type: "ecc", curve: "ed25519Legacy", userIDs: [{ name: "seller" }] });
  });
  beforeEach(() => {
    vi.stubGlobal("window", {
      __PEACH_AUTH__: { token: "t", pgpPrivKey: key.privateKey, peachId: USER_ID, baseUrl: "https://api/v1" },
    });
    fetchWithSessionCheck.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const verify = async (armoredSignature, text) => {
    const { signatures } = await openpgp.verify({
      message: await openpgp.createMessage({ text }),
      signature: await openpgp.readSignature({ armoredSignature }),
      verificationKeys: await openpgp.readKey({ armoredKey: key.publicKey }),
    });
    return signatures[0].verified;
  };

  it("posts a detached PGP signature over the declaration", async () => {
    fetchWithSessionCheck.mockResolvedValue(jsonRes(200, { success: true }));
    const ok = await submitInstantTradeSignature({ id: 52, paymentData: { wise: { encrypted: "x" } } });
    expect(ok).toBe(true);
    expect(fetchWithSessionCheck).toHaveBeenCalledTimes(1);
    const [url, init] = fetchWithSessionCheck.mock.calls[0];
    expect(url).toBe("https://api/v069/sellOffer/52/instantTradeSignature");
    expect(init.method).toBe("POST");
    const { instantTradeSignature } = JSON.parse(init.body);
    expect(instantTradeSignature).toContain("-----BEGIN PGP SIGNATURE-----");
    expect(
      await verify(instantTradeSignature, "I, user peach02abcdef, declare that the offer with id 52 is instant trade"),
    ).toBe(true);
  });

  it("fetches the offer when paymentData is not given", async () => {
    fetchWithSessionCheck
      .mockResolvedValueOnce(jsonRes(200, { id: "53", paymentData: { sepa: { hashes: ["h"] } } }))
      .mockResolvedValueOnce(jsonRes(200, { success: true }));
    expect(await submitInstantTradeSignature({ id: "53" })).toBe(true);
    expect(fetchWithSessionCheck.mock.calls[0][0]).toBe("https://api/v069/sellOffer/53");
    const { instantTradeSignature } = JSON.parse(fetchWithSessionCheck.mock.calls[1][1].body);
    expect(
      await verify(instantTradeSignature, "I, user peach02abcdef, declare that the offer with id 53 is NOT instant trade"),
    ).toBe(true);
  });

  it("retries 4 times, 1 s apart, then resolves false without throwing", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchWithSessionCheck.mockResolvedValue(jsonRes(401, { error: "Invalid instant trade declaration signature" }));
    const promise = submitInstantTradeSignature({ id: 54, paymentData: {} });
    expect(await settle(promise)).toBe(false);
    expect(fetchWithSessionCheck).toHaveBeenCalledTimes(5);
    expect(console.error.mock.calls[0].join(" ")).toContain(
      'signed: "I, user peach02abcdef, declare that the offer with id 54 is NOT instant trade"',
    );
  });

  it("stops retrying once the server accepts it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchWithSessionCheck
      .mockResolvedValueOnce(jsonRes(500, {}))
      .mockResolvedValueOnce(jsonRes(200, { success: true }));
    const promise = submitInstantTradeSignature({ id: 55, paymentData: {} });
    expect(await settle(promise)).toBe(true);
    expect(fetchWithSessionCheck).toHaveBeenCalledTimes(2);
  });

  it("joins a submission already in flight for the same offer", async () => {
    fetchWithSessionCheck.mockResolvedValue(jsonRes(200, { success: true }));
    const a = submitInstantTradeSignature({ id: 56, paymentData: {} });
    const b = submitInstantTradeSignature({ id: 56, paymentData: {} });
    expect(b).toBe(a);
    await a;
    expect(fetchWithSessionCheck).toHaveBeenCalledTimes(1);
  });

  it("declareInstantTradeIfMissing only submits when the signature is null", async () => {
    fetchWithSessionCheck.mockResolvedValueOnce(jsonRes(200, { id: "57", paymentData: {}, instantTradeSignature: "sig" }));
    expect(await declareInstantTradeIfMissing("57")).toBe(false);
    fetchWithSessionCheck.mockResolvedValueOnce(jsonRes(200, { id: "57", paymentData: {} })); // older server
    expect(await declareInstantTradeIfMissing("57")).toBe(false);
    expect(fetchWithSessionCheck).toHaveBeenCalledTimes(2);

    fetchWithSessionCheck
      .mockResolvedValueOnce(jsonRes(200, { id: "57", paymentData: {}, instantTradeSignature: null }))
      .mockResolvedValueOnce(jsonRes(200, { success: true }));
    expect(await declareInstantTradeIfMissing("57")).toBe(true);
    expect(fetchWithSessionCheck.mock.calls[3][0]).toBe("https://api/v069/sellOffer/57/instantTradeSignature");
  });
});
