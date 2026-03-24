# Trades Dashboard — Dual-Fetch Architecture Report

The trades dashboard uses two different API versions (v069 for offers, v1 for contracts) to build a unified view. This creates several discrepancy risks.

---

## Known gaps

### 1. Sell offer status is blind-spotted

The v069 `/user/{id}/offers` endpoint **does not return `tradeStatus` on sell offers** (backend asymmetry). The code patches this by cross-referencing with v1 `/offers/summary`, but that endpoint only has **historical** (completed/cancelled) offers. So an active sell offer that hasn't finished yet may get the wrong status or default to `"searchingForPeer"` even if it's actually matched.

### 2. The "transition gap" between offer and contract

When a trade request is accepted, the offer (v069) becomes a contract (v1). During that transition there's a window where:

- The v069 offer may still show the old status
- The v1 contract hasn't appeared in `/contracts/summary` yet
- The item could briefly disappear from the dashboard or show stale status

### 3. Field name inconsistencies require fragile normalization

- **Amount:** `amountSats` (v069) vs `amount` (v1)
- **Prices:** `priceInEUR`, `priceInGBP` individual fields (v069) vs `prices: {}` object (v1)
- **Direction:** `"bid"`/`"ask"` (v1) vs sometimes needing a manually-set `_direction` tag (v069)
- **IDs:** numeric in v069, string in v1 — the code coerces with `String()` but Map lookups by ID could mismatch if one source returns `123` and another `"123"`

### 4. The synthetic `tradeRequestSent` status

When you send a trade request on someone else's offer, the code invents a status called `"tradeRequestSent"` — this isn't a real API status. If the counterparty accepts and a contract forms, this synthetic item and the new real contract could briefly coexist as duplicates.

### 5. Different polling intervals mask state changes

- Fast tier (offers + contracts): every **15s**
- Slow tier (trade requests, matches, user profiles): every **60s**
- A trade request could be accepted (contract appears at 15s) while the sent-request item lingers for up to 60s

---

## What the code does well

The normalization layer (`normalizeOffer`, `normalizeContract`, `normalizeSentRequest`) and the Map-based deduplication (last-write-wins by ID) handle most of these gracefully. The v1 cross-reference for sell offer status is a smart workaround. But it's fundamentally a best-effort reconciliation of two APIs that weren't designed to be used together this way.

---

## Data source comparison

| Aspect | v1 `/offers/summary` + `/contracts/summary` | v069 `/buyOffer?ownOffers=true` | v069 `/user/{id}/offers` | v069 Trade Requests |
|--------|-----|-----|-----|-----|
| **Data freshness** | Historical (completed) | Active pending | Active pending | Per-request details |
| **Buy/Sell** | Both | Buy only | Both | Incoming only |
| **Has `tradeStatus`** | Yes | Yes | **NO** (sell offers) | No |
| **Amount field** | `amount` | `amountSats` | `amountSats` | `amount` |
| **Prices format** | `prices: {}` object | `priceInXXX` fields | `priceInXXX` fields | `price` (single) |
| **Methods/currencies** | `meansOfPayment` | `meansOfPayment` | `meansOfPayment` | Single `paymentMethod`, `currency` |
| **PM data encrypted** | No | No | No | Yes |
| **Unread messages** | No (in summary) | No | No | No |
| **Counterparty info** | Limited | No | No | Yes (`userId`) |

---

## Pending backend fix: `GET /v069/sellOffer?ownOffers=true`

The backend developer has been asked to fix `GET /v069/sellOffer?ownOffers=true` so it works like the buyOffer counterpart (which already supports `ownOffers=true` correctly).

### What this fixes

1. **Sell offer status blind spot — resolved.** We'd get `tradeStatus` directly on own sell offers, just like buy offers. No more cross-referencing with v1 `/offers/summary` (which only has historical data). Active sell offers would show their real current status instead of defaulting to `"searchingForPeer"`.

2. **Simpler, more reliable fetching.** The current workaround (`GET /v069/user/{peachId}/offers` + status patching from v1) can be replaced with one clean call that returns full data. The `/user/{id}/offers` fallback could be removed or kept as backup only.

3. **Consistent data shape.** Buy and sell offers would return the same fields (`tradeStatus`, `amountSats`, `priceInXXX`, `meansOfPayment`, etc.), making the normalization less fragile.

### What this doesn't fix

- **The offer→contract transition gap** — still two separate systems (v069 offers, v1 contracts), so the brief window during acceptance remains.
- **The synthetic `tradeRequestSent` status** — still needed for sent trade requests on other people's offers.
- **Different polling intervals** — still 15s vs 60s for different data tiers.
- **Field name differences between v069 and v1** — `amountSats` vs `amount`, `priceInXXX` vs `prices: {}`, numeric vs string IDs.

### Code changes needed after the backend fix

Screens that currently use the `/user/{peachId}/offers` workaround for sell offers:

- `src/screens/trades-dashboard/index.jsx` — replace `/user/{id}/offers` call with `sellOffer?ownOffers=true`, remove v1 status cross-reference (lines ~720-726), simplify Map-based merge logic
- `src/screens/peach-market-view.jsx` — same pattern
- `src/screens/offer-creation/index.jsx` — same pattern
- `src/hooks/useNotifications.js` — same pattern

---

## Bottom line

The biggest practical risks are **stale or missing status on sell offers** and **brief ghost items during offer→contract transitions**. For a user watching their dashboard, they might see a trade stuck on an old status for up to 15–60 seconds, or momentarily see a duplicate entry.

Once the backend fix for `sellOffer?ownOffers=true` lands, the sell offer status gap (issue #1) is fully resolved and the fetching logic becomes significantly simpler.
