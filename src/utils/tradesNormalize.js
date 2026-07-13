import { deriveDisplayStatus } from "../data/statusConfig.js";
import { formatTradeId } from "./format.js";

export function hasInstantTradeEnabled(paymentData) {
  if (!paymentData || typeof paymentData !== "object") return false;
  return Object.values(paymentData).some((d) => d && d.encrypted);
}

export function normalizeOffer(o, { allPrices = null } = {}) {
  const rawType = (o.type ?? o.offerType ?? "").toLowerCase();
  const isBuy =
    o._direction === "buy" || rawType === "bid" || rawType === "buy";
  let pricesObj = o.prices ?? {};
  if (Object.keys(pricesObj).length === 0) {
    for (const key of Object.keys(o)) {
      if (key.startsWith("priceIn")) {
        const cur = key.slice(7);
        if (cur && o[key] != null) pricesObj[cur] = o[key];
      }
    }
  }
  const mop = o.meansOfPayment ?? {};
  const offerMethods = [...new Set(Object.values(mop).flat())];
  const offerCurrencies =
    Object.keys(mop).length > 0
      ? Object.keys(mop)
      : Object.keys(o.prices ?? {});
  const amtForPrice =
    o.amountSats ?? (Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0));
  if (isBuy && offerCurrencies.length > 0) {
    const factor = 1 + (o.premium ?? 0) / 100;
    const computed = {};
    for (const cur of offerCurrencies) {
      const btc = allPrices?.[cur];
      if (btc != null && amtForPrice) {
        computed[cur] = (amtForPrice / 1e8) * btc * factor;
      } else if (pricesObj[cur] != null) {
        computed[cur] = pricesObj[cur];
      }
    }
    pricesObj = computed;
  }
  const firstCurrency =
    (isBuy ? offerCurrencies[0] : null) ?? Object.keys(pricesObj)[0] ?? null;
  const fiatAmount =
    firstCurrency && pricesObj[firstCurrency] != null
      ? String(pricesObj[firstCurrency])
      : "—";
  const currency = firstCurrency ?? "";
  const amt =
    o.amountSats ?? (Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0));
  const status = o.tradeStatusNew ?? o.tradeStatus ?? o.status ?? "unknown";
  return {
    id: o.id,
    tradeId: formatTradeId(o.id, "offer"),
    kind: "offer",
    direction: isBuy ? "buy" : "sell",
    amount: amt,
    premium: o.premium ?? 0,
    fixedPrice: o.fixedPrice ?? null,
    fixedPriceCurrency: o.fixedPriceCurrency ?? null,
    fiatAmount,
    currency,
    prices: pricesObj,
    tradeStatus: status,
    createdAt: new Date(o.creationDate ?? Date.now()),
    methods:
      offerMethods.length > 0 ? offerMethods : (o.paymentMethods ?? []),
    currencies:
      offerCurrencies.length > 0 ? offerCurrencies : (o.currencies ?? []),
    paymentData: o.paymentData ?? null,
    experienceLevel: o.experienceLevelCriteria ?? null,
    instantTrade: isBuy
      ? hasInstantTradeEnabled(o.paymentData)
      : !!o.instantTradeEnabled,
    instantTradeCriteria: o.instantTradeCriteria ?? null,
  };
}

export function normalizeContract(c, { peachId = null } = {}) {
  const rawType = (c.type ?? "").toLowerCase();
  const isBuyer =
    rawType === "bid" ||
    rawType === "buy" ||
    (c.buyer?.id ?? c.buyerId) === peachId;
  const direction = isBuyer ? "buy" : "sell";
  const tradeStatus = c.tradeStatus ?? c.status ?? "unknown";
  const isDone = !!c.refunded || !!c.newTradeId;
  const displayStatus = isDone
    ? tradeStatus
    : deriveDisplayStatus({
        tradeStatus,
        direction,
        tradeStatusNew: c.tradeStatusNew,
      });
  return {
    id: c.id,
    offerId: c.offerId ?? null,
    tradeId: formatTradeId(c.id),
    kind: "contract",
    direction,
    amount: c.amount ?? 0,
    premium: c.premium ?? 0,
    fiatAmount: c.price != null ? String(c.price) : "—",
    currency: c.currency ?? "",
    tradeStatus,
    displayStatus,
    tradeStatusWithoutDispute: c.tradeStatusWithoutDispute ?? null,
    disputeActive: !!c.disputeActive,
    createdAt: new Date(c.creationDate ?? Date.now()),
    lastModified: c.lastModified ?? null,
    unread: c.unreadMessages ?? 0,
    refunded: !!c.refunded,
    newTradeId: c.newTradeId ?? null,
  };
}
