// Gate for showing "Create offer" entry points in the web app.
//
// Users see the create-offer buttons if they are KYC-verified, whitelisted, or
// have at least MIN_TRADES_FOR_OFFER_CREATION trades. `kyc`, `whitelisted` and
// `trades` come from GET /v1/user/me, stored on auth.profile. Logged-out users
// and profiles without these fields are treated as not KYC'd, not whitelisted
// and with 0 trades.
//
// On regtest the gate is always open, so offer creation can be tested freely.
import { IS_REGTEST } from "./network.js";

export const MIN_TRADES_FOR_OFFER_CREATION = 20;

export function canCreateOffers(profile, { isRegtest = IS_REGTEST } = {}) {
  if (isRegtest) return true;
  if (profile?.kyc === true || profile?.whitelisted === true) return true;
  const trades = Number(profile?.trades);
  return Number.isFinite(trades) && trades >= MIN_TRADES_FOR_OFFER_CREATION;
}
