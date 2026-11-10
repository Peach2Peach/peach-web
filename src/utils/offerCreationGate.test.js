import { describe, it, expect } from "vitest";
import { canCreateOffers, MIN_TRADES_FOR_OFFER_CREATION } from "./offerCreationGate.js";

describe("canCreateOffers", () => {
  it("uses a threshold of 20 trades", () => {
    expect(MIN_TRADES_FOR_OFFER_CREATION).toBe(20);
  });

  it("allows users with at least 20 trades", () => {
    expect(canCreateOffers({ trades: 20 })).toBe(true);
    expect(canCreateOffers({ trades: 500 })).toBe(true);
  });

  it("blocks users with fewer than 20 trades", () => {
    expect(canCreateOffers({ trades: 19 })).toBe(false);
    expect(canCreateOffers({ trades: 0 })).toBe(false);
  });

  it("allows KYC-verified users regardless of trade count", () => {
    expect(canCreateOffers({ kyc: true, trades: 0 })).toBe(true);
    expect(canCreateOffers({ kyc: true })).toBe(true);
  });

  it("does not treat kyc: false as verified", () => {
    expect(canCreateOffers({ kyc: false, trades: 5 })).toBe(false);
  });

  it("blocks when there is no profile or no trade count", () => {
    expect(canCreateOffers(null)).toBe(false);
    expect(canCreateOffers(undefined)).toBe(false);
    expect(canCreateOffers({})).toBe(false);
    expect(canCreateOffers({ trades: null })).toBe(false);
  });
});
