import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import * as openpgp from "openpgp";

vi.mock("./sessionGuard.js", () => ({ fetchWithSessionCheck: vi.fn() }));

import { fetchWithSessionCheck } from "./sessionGuard.js";
import { getOldOfferIdDeclarationMessage, submitOldOfferIdSignature } from "./oldOfferIdSignature.js";

const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

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

describe("getOldOfferIdDeclarationMessage", () => {
  it("joins old and new offer ids", () => {
    expect(getOldOfferIdDeclarationMessage("40", "52")).toBe("40-52");
  });
});

describe("submitOldOfferIdSignature", () => {
  let key;
  beforeAll(async () => {
    key = await openpgp.generateKey({ type: "ecc", curve: "ed25519Legacy", userIDs: [{ name: "seller" }] });
  });
  beforeEach(() => {
    vi.stubGlobal("window", {
      __PEACH_AUTH__: { token: "t", pgpPrivKey: key.privateKey, baseUrl: "https://api/v1" },
    });
    fetchWithSessionCheck.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("signs <oldOfferId>-<newOfferId> using the oldOfferId the new offer carries", async () => {
    // offer 40 was revived as 47, which is now revived as 52: the server keeps
    // the original (40) as oldOfferId
    fetchWithSessionCheck
      .mockResolvedValueOnce(jsonRes(200, { id: "52", oldOfferId: "40", oldOfferIdSignature: null }))
      .mockResolvedValueOnce(jsonRes(200, { success: true }));
    expect(await submitOldOfferIdSignature(52)).toBe(true);

    expect(fetchWithSessionCheck.mock.calls[0][0]).toBe("https://api/v069/sellOffer/52");
    const [url, init] = fetchWithSessionCheck.mock.calls[1];
    expect(url).toBe("https://api/v069/sellOffer/52/oldOfferIdSignature");
    expect(init.method).toBe("POST");
    const { oldOfferIdSignature } = JSON.parse(init.body);
    const { signatures } = await openpgp.verify({
      message: await openpgp.createMessage({ text: "40-52" }),
      signature: await openpgp.readSignature({ armoredSignature: oldOfferIdSignature }),
      verificationKeys: await openpgp.readKey({ armoredKey: key.publicKey }),
    });
    expect(await signatures[0].verified).toBe(true);
  });

  it("does nothing when the offer is already signed", async () => {
    fetchWithSessionCheck.mockResolvedValueOnce(jsonRes(200, { id: "52", oldOfferId: "40", oldOfferIdSignature: "sig" }));
    expect(await submitOldOfferIdSignature("52")).toBe(true);
    expect(fetchWithSessionCheck).toHaveBeenCalledTimes(1);
  });

  it("gives up without retrying when the offer has no oldOfferId", async () => {
    fetchWithSessionCheck.mockResolvedValueOnce(jsonRes(200, { id: "52" }));
    expect(await submitOldOfferIdSignature("52")).toBe(false);
    expect(fetchWithSessionCheck).toHaveBeenCalledTimes(1);
  });

  it("retries 5 times, 1 s apart, then resolves false without throwing", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    fetchWithSessionCheck.mockImplementation(async (url) =>
      url.endsWith("/oldOfferIdSignature")
        ? jsonRes(401, { error: "Invalid oldOfferIdSignature" })
        : jsonRes(200, { id: "52", oldOfferId: "40", oldOfferIdSignature: null }),
    );
    expect(await settle(submitOldOfferIdSignature("52"))).toBe(false);
    const posts = fetchWithSessionCheck.mock.calls.filter(([url]) => url.endsWith("/oldOfferIdSignature"));
    expect(posts).toHaveLength(6);
    expect(console.error.mock.calls[0].join(" ")).toContain('signed: "40-52"');
  });

  it("retries a failed offer fetch", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    fetchWithSessionCheck
      .mockResolvedValueOnce(jsonRes(500, null))
      .mockResolvedValueOnce(jsonRes(200, { id: "52", oldOfferId: "40", oldOfferIdSignature: null }))
      .mockResolvedValueOnce(jsonRes(200, { success: true }));
    expect(await settle(submitOldOfferIdSignature("52"))).toBe(true);
    expect(fetchWithSessionCheck).toHaveBeenCalledTimes(3);
  });
});
