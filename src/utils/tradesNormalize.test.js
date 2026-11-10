import { describe, it, expect } from "vitest";
import { normalizeOffer } from "./tradesNormalize.js";

const buy = (extra) => ({ id: 1, _direction: "buy", amountSats: 1000, ...extra });

describe("normalizeOffer — Buy Offer mobile confirmation", () => {
  it("marks an own buy offer without a public key as awaiting confirmation", () => {
    expect(normalizeOffer(buy({ publicKey: null, tradeStatus: "searchingForPeer" })).tradeStatus)
      .toBe("awaitingMobileConfirmation");
  });

  it("marks it even when the server sends no status", () => {
    expect(normalizeOffer(buy({ publicKey: null })).tradeStatus).toBe("awaitingMobileConfirmation");
  });

  it("keeps the server status once the key is set", () => {
    expect(normalizeOffer(buy({ publicKey: "02ab", tradeStatus: "searchingForPeer" })).tradeStatus)
      .toBe("searchingForPeer");
  });

  it("does not resurrect a finished offer", () => {
    expect(normalizeOffer(buy({ publicKey: null, tradeStatus: "offerCanceled" })).tradeStatus)
      .toBe("offerCanceled");
  });

  it("ignores sell offers, which have no publicKey field semantics", () => {
    expect(normalizeOffer({ id: 2, type: "ask", publicKey: null, tradeStatus: "fundEscrow" }).tradeStatus)
      .toBe("fundEscrow");
  });
});
