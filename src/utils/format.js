// ─── SHARED FORMAT HELPERS ───────────────────────────────────────────────────
// Extracted from screen files to eliminate duplication.
// Used by: trade-execution, trades-dashboard, offer-creation, home, market-view,
//          settings, peach-status-cards, MatchesPopup
// ─────────────────────────────────────────────────────────────────────────────

export const SAT = 100_000_000;
export const BTC_PRICE_FALLBACK = 87432;

/** Compact number: 85000 → "85k", 1240000 → "1.24M", 500 → "500" */
export function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

/** Format a percentage: 1.5 → "+1.50%", -0.3 → "-0.30%" */
export function fmtPct(v, showPlus = true) {
  const n = parseFloat(v);
  const plus = showPlus && n > 0 ? "+" : "";
  return `${plus}${n.toFixed(2)}%`;
}

/** Format fiat amount with 2 decimals: 74.3 → "74,30" (European convention) */
export function fmtFiat(n) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Convert sats to fiat (raw number). Caller decides formatting. */
export function satsToFiatRaw(sats, price) {
  return (sats / SAT) * price;
}

/** Convert sats to formatted fiat string: 85000 → "74,32" */
export function satsToFiat(sats, price = BTC_PRICE_FALLBACK) {
  return fmtFiat(satsToFiatRaw(sats, price));
}

/** Relative time: Date.now() - 3600000 → "1h ago" */
export function relTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Format date: → "13 Mar 2026" */
export function formatDate(date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Convert API rating (-1…+1) to Peach display scale (0…5) */
export function toPeaches(apiRating) {
  return (apiRating + 1) / 2 * 5;
}

/** Format trade/offer ID: decimal → hex with prefix.
 *  kind="contract": "1361-1360" → "PC‑551‑550"
 *  kind="offer":    "325"       → "P‑145"        */
export function formatTradeId(id, kind = "contract") {
  const s = String(id);
  const prefix = kind === "offer" ? "P" : "PC";
  const parts = s.split("-").map(n => parseInt(n, 10).toString(16).toUpperCase());
  return prefix + "\u2011" + parts.join("\u2011");
}
