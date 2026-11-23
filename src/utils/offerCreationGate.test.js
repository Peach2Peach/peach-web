import { describe, it, expect } from "vitest";
import { canCreateOffers, MIN_TRADES_FOR_OFFER_CREATION } from "./offerCreationGate.js";

// Pin the network so results don't depend on VITE_BITCOIN_NETWORK in .env.
const onMainnet = (profile) => canCreateOffers(profile, { isRegtest: false });

describe("canCreateOffers", () => {
  it("uses a threshold of 20 trades", () => {
    expect(MIN_TRADES_FOR_OFFER_CREATION).toBe(20);
  });

  it("allows users with at least 20 trades", () => {
    expect(onMainnet({ trades: 20 })).toBe(true);
    expect(onMainnet({ trades: 500 })).toBe(true);
  });

  it("blocks users with fewer than 20 trades", () => {
    expect(onMainnet({ trades: 19 })).toBe(false);
    expect(onMainnet({ trades: 0 })).toBe(false);
  });

  it("allows KYC-verified users regardless of trade count", () => {
    expect(onMainnet({ kyc: true, trades: 0 })).toBe(true);
    expect(onMainnet({ kyc: true })).toBe(true);
  });

  it("does not treat kyc: false as verified", () => {
    expect(onMainnet({ kyc: false, trades: 5 })).toBe(false);
  });

  it("allows whitelisted users regardless of trade count", () => {
    expect(onMainnet({ whitelisted: true, trades: 0 })).toBe(true);
    expect(onMainnet({ whitelisted: true })).toBe(true);
  });

  it("does not treat whitelisted: false as whitelisted", () => {
    expect(onMainnet({ whitelisted: false, trades: 5 })).toBe(false);
  });

  it("always allows on regtest, even without a profile", () => {
    expect(canCreateOffers(null, { isRegtest: true })).toBe(true);
    expect(canCreateOffers({ trades: 0 }, { isRegtest: true })).toBe(true);
  });

  it("applies the normal rules when not on regtest", () => {
    expect(canCreateOffers({ trades: 0 }, { isRegtest: false })).toBe(false);
    expect(canCreateOffers({ whitelisted: true }, { isRegtest: false })).toBe(true);
  });

  it("blocks when there is no profile or no trade count", () => {
    expect(onMainnet(null)).toBe(false);
    expect(onMainnet(undefined)).toBe(false);
    expect(onMainnet({})).toBe(false);
    expect(onMainnet({ trades: null })).toBe(false);
  });
});
