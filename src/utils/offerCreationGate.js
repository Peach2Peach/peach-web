// Gate for showing "Create offer" entry points in the web app.
//
// Users see the create-offer buttons if they are KYC-verified, or if they have
// at least MIN_TRADES_FOR_OFFER_CREATION trades. Both `kyc` and `trades` come
// from GET /v1/user/me, stored on auth.profile. Logged-out users and profiles
// without these fields are treated as not KYC'd with 0 trades.
export const MIN_TRADES_FOR_OFFER_CREATION = 20;

export function canCreateOffers(profile) {
  if (profile?.kyc) return true;
  const trades = Number(profile?.trades);
  return Number.isFinite(trades) && trades >= MIN_TRADES_FOR_OFFER_CREATION;
}
