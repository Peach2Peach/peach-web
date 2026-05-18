// Shared offer normalizer — used by market-view and any screen that opens
// the OfferDetailPopup (e.g. user profile). Produces the canonical offer
// shape the popup expects, regardless of whether the raw offer came from
// /v069/buyOffer, /v069/sellOffer, /v069/user/:id/offers, or v1 /offer/search.
//
// viewerPeachId: the current logged-in user's peachId, used only to set
// isOwn. Pass null for unauthenticated calls.

import { formatTradeId, toPeaches } from "./format.js";

export function normalizeOffer(o, typeHint, viewerPeachId) {
  const currencies = o.meansOfPayment ? Object.keys(o.meansOfPayment) : [];
  const methods = o.meansOfPayment
    ? [...new Set(Object.values(o.meansOfPayment).flat())]
    : [];
  return {
    id: String(o.id),
    tradeId: formatTradeId(o.id, "offer"),
    type: o.type ?? typeHint,
    amount: o.amountSats ?? (Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0)),
    premium: o.premium ?? 0,
    methods,
    currencies,
    rep: toPeaches(o.user?.rating ?? 0),
    trades: o.user?.trades ?? 0,
    badges: (o.user?.medals ?? o.user?.badges ?? []).map((m) =>
      m === "fastTrader" ? "fast"
        : m === "superTrader" ? "supertrader"
        : m,
    ),
    auto: o.allowedToInstantTrade ?? false,
    experienceLevel: o.experienceLevelCriteria ?? null,
    online: o.user?.online ?? false,
    userId: o.user?.id ?? "",
    peachId: o.user?.id ? ("PEACH" + o.user.id.slice(0, 8).toUpperCase()) : "",
    isOwn: !!viewerPeachId && (
      o.user?.id === viewerPeachId ||
      o.user?.id?.toLowerCase?.() === viewerPeachId?.toLowerCase?.()
    ),
    hasPerformedTradeRequest: !!o.hasPerformedTradeRequest,
    _raw: o,
  };
}
