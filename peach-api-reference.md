# Peach Bitcoin API Reference

**Base URL (v1):** `https://api.peachbitcoin.com/v1`
**Base URL (v069):** `https://api.peachbitcoin.com/v069`
**Source:** github.com/Peach2Peach/peach-api-ts
**Docs:** docs.peachbitcoin.com

**Auth:** Private endpoints require a Bearer token (valid 60 min) in the `Authorization` header.
**Content-Type:** `application/json` for all requests with a body.

**API version split:** The Peach API uses two version prefixes:
- **v1** — contracts (post-acceptance), user settings, market data, system info, offer management
- **v069** — offers (create/browse), trade requests (send/receive/accept/reject), pre-contract chat, encrypted user data

**Trade lifecycle:** offer (v069) → trade request (v069) → accept (v069) → **contract created** → contract ops (v1)

**URL construction:**
```js
// v1 (via useApi hook — automatic)
const { get, post, patch, del } = useApi();
await get('/market/prices');

// v069 (direct fetch — manual auth)
const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
await fetch(`${v069Base}/selfUser`, {
  headers: { Authorization: `Bearer ${auth.token}` },
});
```

---

## V1 — System & Market (Public)

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| GET | `/market/prices` | home, market-view, trade-execution, trades-dashboard, payment-methods, offer-creation, settings, auth | Prices for all pairs. Response: flat object `{ "EUR": 55740.99, "GBP": 48812.94, ... }`. Currency codes are keys — **this is the source of truth for available currencies.** |
| GET | `/info` | trade-execution (dispute flow) | Platform info: PGP key, fees, payment methods list. Used to get the platform PGP public key when filing a dispute. |
| GET | `/info/paymentMethods` | payment-methods | List all supported payment methods with their currencies. Used to build the PM catalogue. |
| GET | `/estimateFees` | settings | Current Bitcoin fee estimates (sat/vB). Used in the network fees sub-screen. |

---

## V1 — Users (Private 🔒)

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| GET | `/user/:userId` | trades-dashboard | Get public user profile by public key. Used to fetch counterparty profile data. |
| GET | `/user/tradingLimit` | settings, trades-dashboard | Own trading limits. |
| PATCH | `/user` | settings | Update own profile. Used for `payoutAddress`, `refundAddress`, `feeRate` (with signature). |
| PATCH | `/user/batching` | settings | Join or leave GroupHug batching program. Body: `{ enable: bool }`. |
| PUT | `/user/:userId/block` | settings | Block a user. |
| POST | `/contact/report` | settings | Submit abuse report. Body: `{ email, topic, reason, message }`. |

---

## V1 — Offers (Private 🔒)

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| GET | `/offers/summary` | home, trades-dashboard, offer-creation | Summaries of own offers. **Returns historical offers** (completed, cancelled) — not pending/active. Each has `type: "ask"` (sell) or `"bid"` (buy) + `tradeStatus`. |
| POST | `/offer` | offer-creation | Create a **sell offer only** (v1). Body: `{ type:"ask", escrowPublicKey, meansOfPayment, amount, premium, ... }`. **Buy offers use v069** (see below). |
| PATCH | `/offer/:offerId` | market-view | Update offer fields (e.g. edit premium). |
| POST | `/offer/:offerId/cancel` | market-view, trades-dashboard | Cancel an offer. |
| POST | `/offer/:offerId/revive` | trade-execution | Republish an expired/cancelled sell offer. |
| POST | `/offer/:offerId/escrow` | offer-creation | Create escrow for a sell offer. Body: `{ publicKey }`. |
| GET | `/offer/:offerId/escrow` | offer-creation | Get escrow funding status. |
| POST | `/offer/:offerId/escrow/confirm` | offer-creation | Confirm escrow has been funded. |

---

## V1 — Matches (Private 🔒)

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| GET | `/offer/:offerId/matches` | trades-dashboard | Get potential system matches for an offer. Query: `?page=0&size=21&sortBy=bestReputation`. |
| POST | `/offer/:offerId/match` | trades-dashboard | Accept a system match (v1 matching). Body varies by role: `matchOfferId, paymentData, hashedPaymentData, signature`, etc. |
| DELETE | `/offer/:offerId/match` | trades-dashboard | Reject/unmatch a system match. Note: offer ID is in the URL path. |

---

## V1 — Contracts (Private 🔒)

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| GET | `/contracts/summary` | home, trades-dashboard, useNotifications, useUnread | Summaries of own contracts. **Returns historical** (completed, cancelled). Direction: `c.type` = `"bid"` (buy) or `"ask"` (sell). Do NOT use `c.buyer.id` — may be absent. |
| GET | `/contract/:contractId` | trade-execution | Get full contract details. `buyer` and `seller` are full `PublicUser` objects. `paymentDataEncrypted` and `buyerPaymentDataEncrypted` are PGP-encrypted. |
| POST | `/contract/:id/cancel` | trade-execution | Request contract cancellation. Body: `{ reason }`. |
| PATCH | `/contract/:id/extendTime` | trade-execution | Extend payment timer by 12 hours (seller action). |
| GET | `/contract/:id/chat` | trade-execution | Get chat history. Query: `{ page }`. Polled every ~2 seconds. |
| POST | `/contract/:id/chat` | trade-execution | Send encrypted chat message. Body: `{ message, signature }`. |
| POST | `/contract/:id/chat/received` | trade-execution | Mark messages as read. Body: `{ start, end }` (message range). |
| POST | `/contract/:id/dispute` | trade-execution | Open a dispute. Body: `{ reason, symmetricKeyEncrypted, email }`. |
| POST | `/contract/:id/dispute/acknowledge` | trade-execution | Acknowledge a dispute opened by counterparty. Body: `{ email }`. |
| POST | `/contract/:id/dispute/acknowledgeOutcome` | trade-execution | Acknowledge dispute resolution outcome. |

---

## V1 — Mobile Signing (pendingAction endpoints)

The web app cannot sign Bitcoin transactions directly (private key stays on mobile). These endpoints delegate signing to the mobile app via server-mediated push notifications.

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| POST | `/offer/:offerId/refundPendingAction` | trade-execution, trades-dashboard | Request escrow refund — triggers mobile signing via push notification. |
| POST | `/contract/:id/payment/createPaymentMadePendingAction` | trade-execution | Buyer confirms payment sent — triggers mobile signing. |
| POST | `/contract/:id/payment/createPaymentConfirmedPendingAction` | trade-execution | Seller confirms payment received + releases BTC — triggers mobile signing (release + rating bundled). |

**Note:** The original direct endpoints (`POST /contract/:id/payment/confirm`, `POST /contract/:id/rating`) exist in the API but are NOT used by the web app — they require a Bitcoin signature that only the mobile app can produce.

---

## V069 — Offer Browsing & CRUD

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| GET | `/v069/buyOffer` | market-view | Browse all public buy offers (market view when authenticated). |
| GET | `/v069/sellOffer` | market-view | Browse all public sell offers. Note: excludes your own offers by design. |
| GET | `/v069/buyOffer?ownOffers=true` | trades-dashboard, useNotifications | Get own active buy offers. Works correctly for buy offers. |
| GET | `/v069/buyOffer?ownOffers=false` | trades-dashboard | Browse non-own buy offers (for finding incoming trade requests). |
| GET | `/v069/sellOffer?ownOffers=false` | trades-dashboard | Browse non-own sell offers (same purpose). |
| GET | `/v069/user/:publicKeyId/offers` | trades-dashboard, market-view, offer-creation, useNotifications | Get `{ buyOffers: [...], sellOffers: [...] }` for any user. **This is the correct way to fetch own sell offers** (replacement for broken `sellOffer?ownOffers=true`). **Caveat:** does not return `tradeStatus` on sell offers. |
| POST | `/v069/buyOffer` | offer-creation | Create a **buy offer** (v069). Sell offers use `POST /offer` (v1). |
| PATCH | `/v069/:offerType/:id` | trades-dashboard | Edit offer premium via v069. `:offerType` = `buyOffer` or `sellOffer`. |
| DELETE | `/v069/buyOffer/:id` | trades-dashboard | Delete/withdraw a buy offer. |

**V069 response field differences from v1:**
- Buy offers: amount field is `amountSats` (number), has `premium` (number), `id` is a number (not string)
- Sell offers: amount field is `amount` (number), has `premium` (number), `id` is a number
- Always coerce `id` to `String(o.id)` when normalizing

---

## V069 — Trade Requests

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| POST | `/v069/:offerType/:id/tradeRequestPerformed` | market-view | Send a trade request on someone else's offer. |
| GET | `/v069/:offerType/:id/tradeRequestPerformed/` | trades-dashboard | Get details of outgoing trade request. |
| GET | `/v069/:offerType/:id/tradeRequestPerformed/chat` | trades-dashboard | Pre-contract chat for outgoing trade request. |
| GET | `/v069/:offerType/:id/tradeRequestReceived/` | trades-dashboard | Get all incoming trade requests for your offer. |
| POST | `/v069/:offerType/:id/tradeRequestReceived/:userId/accept` | trades-dashboard | Accept an incoming trade request → creates a contract. |
| DELETE | `/v069/:offerType/:id/tradeRequestReceived/:userId` | trades-dashboard | Reject an incoming trade request. |
| GET | `/v069/:offerType/:id/tradeRequestReceived/:userId/chat` | MatchesPopup | Chat with a specific trade request sender. |
| POST | `/v069/:offerType/:id/performInstantTrade` | market-view | Execute an instant trade. |

`:offerType` = `buyOffer` or `sellOffer` in all cases.

---

## V069 — User Data

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| GET | `/v069/selfUser` | trades-dashboard, payment-methods, offer-creation, market-view | Full user profile with PGP-encrypted PM data. Response: `{ user: { ...profile, encryptedPaymentData: "PGP..." } }`. Decrypt with user's PGP private key. |
| POST | `/v069/selfUser/encryptedPaymentData` | payment-methods | Save encrypted PMs. Body: `{ encryptedPaymentData: encrypted, encryptedPaymentDataSignature: signature }`. |

---

## Planned — Not Yet Implemented

These endpoints exist in the API but are not wired in the web app yet.

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| DELETE | `/user/:userId/block` | Unblock a user | Need to implement alongside existing block |
| GET | `/market/tradePricePeaks` | All-time high trade prices per currency | Planned for home screen peach stats |
| GET | `/user/:userId/ratings` | Get ratings for a user | Planned for user profile screen (new screen to visualize other users) |
| GET | `/user/referral` | Check validity of a referral code | Planned |
| PATCH | `/user/referral/redeem/referralCode` | Redeem Peach points for a new referral code | Planned |
| PATCH | `/user/referral/redeem/fiveFreeTrades` | Redeem points for five free trades | Planned |
| GET | `/offer/:offerId/refundPsbt` | Get refund PSBT for a cancelled sell offer | Mobile delegation path (`refundPendingAction`) exists; direct client-side PSBT signing not built |
| POST | `/offer/:offerId/refund` | Submit signed refund transaction. Body: `{ tx: hex }` | Same — needs client-side PSBT signing (bitcoinjs-lib) |
| POST | `/contract/:id/cancel/confirm` | Confirm counterparty's cancellation request | Cancellation acceptance flow not built |
| POST | `/contract/:id/cancel/reject` | Reject counterparty's cancellation request | Cancellation rejection flow not built |
| POST | `/contract/:id/payment/confirm` | Direct payment confirm (no mobile delegation) | Requires Bitcoin signature — would need client-side signing |
| POST | `/contract/:id/rating` | Rate counterparty directly | Currently bundled with payment confirmation via mobile signing |
| POST | `/user/register` | Register new account | Web doesn't do registration (mobile only) |
| POST | `/user/auth` | Get access token | Web uses QR auth via mobile |
| GET | `/market/price/:pair` | Price for a specific pair | Web uses `/market/prices` (all pairs) instead |
| GET | `/tx/:txid` | Get transaction data | No blockchain explorer feature |
| POST | `/tx` | Broadcast raw transaction | Signing stays on mobile |
| POST | `/offer/search` | Search public offers | Deprecated in favor of v069 browse endpoints when authenticated. Still works as public fallback. **Quirk:** `size` defaults to ~2; pass `size: 50`. |

---

## Known Broken / Deprecated

| Endpoint | Issue |
|----------|-------|
| `GET /user/me/paymentMethods` | Returns `{"forbidden":{"buy":[],"sell":[]}}` — use `GET /v069/selfUser` instead |
| `GET /v069/sellOffer?ownOffers=true` | `ownOffers` param is silently ignored for sell offers (backend asymmetry). Use `GET /v069/user/:publicKeyId/offers` instead |
| `GET /v069/sellOffer` (market browse) | Excludes your own offers from results — by design, not a bug |
| `GET /user/me` | Works but web app doesn't use it — profile data comes from `window.__PEACH_AUTH__` auth object |

---

## API Quirks & Gotchas

- **`/offers/summary` and `/contracts/summary` return HISTORICAL data only** — completed, cancelled, expired. For active/pending offers, use v069 endpoints.
- **`POST /offer/search` `size` defaults to ~2** — always pass `size: 50` for full results.
- **v069 offer IDs are numbers, v1 IDs are strings** — always coerce with `String(o.id)` when normalizing.
- **v069 buy offers use `amountSats`**, sell offers use `amount`** — different field names for the same concept.
- **`/contract/:id` does not return `refunded` or `newTradeId` fields** — the trades dashboard writes these to sessionStorage as a bridge for the trade execution screen.
- **`buyer` and `seller` on contracts are full `PublicUser` objects** (not string IDs). Access via `c.buyer.id`, `c.seller.id`.
- **`paymentExpectedBy` and `creationDate` are ISO date strings** — parse with `new Date()`.
- **Encrypted PM data** — `paymentDataEncrypted` (seller's PM) and `buyerPaymentDataEncrypted` (buyer's PM) are PGP-encrypted. Decrypt via symmetric key from `symmetricKeyEncrypted`.
- **PM API field names differ from internal names** — API uses `userName`/`beneficiary`/`label`; web app uses `username`/`holder`/`name`. Mapping handled by `mapDetails()` and `sweepFields()`.

---

## Known `tradeStatus` Values

**Finished (6 statuses):**
`tradeCompleted` · `offerCanceled` · `tradeCanceled` · `fundingExpired` · `wrongAmountFundedOnContract` · `wrongAmountFundedOnContractRefundWaiting`

**Pending — offer stage (6 statuses):**
`searchingForPeer` · `waitingForTradeRequest` · `hasMatchesAvailable` · `acceptTradeRequest` · `offerHidden` · `offerHiddenWithMatchesAvailable`

**Active — contract stage:**
`createEscrow` · `fundEscrow` · `waitingForFunding` · `escrowWaitingForConfirmation` · `paymentRequired` · `confirmPaymentRequired` · `releaseEscrow` · `payoutPending` · `rateUser` · `dispute` · `disputeWithoutEscrowFunded` · `confirmCancelation` · `refundAddressRequired` · `refundOrReviveRequired` · `refundTxSignatureRequired`

Status values come from the mobile app's `TradeStatus` type (`peach-api/src/@types/offer.ts`). Never invent status names.

---

## `peach-api-config.js` (legacy)

This file contains a hardcoded regtest token and a standalone `PEACH_API` object. It is **not imported by any screen** — all screens use the `useApi()` hook from `src/hooks/useApi.js`. It can be safely deleted.

---

*Last updated: 2026-03-26 — audited against actual codebase API calls*
