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
| GET | `/market/offers/stats` | peach-home | Live market stats. Response: `{ buy: { open }, sell: { open }, totalAvgPremium }`. Polled every 60s for the home screen "Peach Stats" widget. |
| GET | `/market/tradePricePeaks` | peach-home | ATH trade prices per currency and period. Response: `{ tradePeaks: { [period]: { [currency]: price } } }`. Public endpoint — fetched directly via `VITE_API_BASE` (not through `useApi`). |

---

## V1 — Users (Private 🔒)

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| GET | `/user/:userId` | trades-dashboard | Get public user profile by public key. Used to fetch counterparty profile data. |
| GET | `/user/tradingLimit` | settings, trades-dashboard | Own trading limits. |
| PATCH | `/user` | settings | Update own profile. Used for `payoutAddress`, `refundAddress`, `feeRate` (with signature). |
| POST | `/user/batching` | settings | Join or leave GroupHug batching program. Body: `{ enableBatching: bool, riskAcknowledged?: bool }`. `riskAcknowledged` must be `true` when `enableBatching` is `false`. |
| PUT | `/user/:userId/block` | settings | Block a user. |
| POST | `/contact/report` | settings | Submit abuse report. Body: `{ email, topic, reason, message }`. |
| GET | `/user/me` | useQRAuth | Fetch own user profile after QR authentication. Returns full profile with `pgpPublicKey`, `id`, etc. Used to verify PGP key match and populate `window.__PEACH_AUTH__`. |

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
| POST | `/offer/:offerId/escrow/confirm` | offer-creation, trades-dashboard, trade-execution | Confirm escrow has been funded. |
| GET | `/offer/:offerId/details` | trades-dashboard | Enriched sell offer details. Response: `{ funding: { status, amounts }, matches: [...], prices: {...}, escrow, mobileActionFundEscrowWasTriggered, mobileActionRefundWasTriggered }`. **Sell offers only** — buy offers return 401 by design. Used in the offer detail popup and for canceled-offer detail views. |

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
| POST | `/offer/:offerId/fundEscrowPendingAction` | offer-creation, trades-dashboard | Request escrow funding — triggers mobile signing. **Offer stage only** (pre-contract, e.g. sell offer in `fundEscrow` status). |
| POST | `/offer/:offerId/refundPendingAction` | trades-dashboard | Request escrow refund for a cancelled sell offer — triggers mobile signing. **Offer stage only** (pre-contract). |
| POST | `/contract/:contractId/createFundEscrowContractPendingAction` | trade-execution | Seller funds escrow after match — triggers mobile signing. **Contract stage** (replaces offer-level `fundEscrowPendingAction` once a contract exists). |
| POST | `/contract/:contractId/createRefundEscrowContractPendingAction` | trade-execution | Seller refunds escrow during/after contract (e.g. `wrongAmountFundedOnContract`, cancellation) — triggers mobile signing. **Contract stage** (replaces offer-level `refundPendingAction` once a contract exists). |
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
| GET | `/v069/sellOffer/:offerId` | market-view | Fetch individual sell offer details. Returns full offer object with `user` (including `pgpPublicKeys`), `escrow` address, `meansOfPayment`, etc. Fetched when a sell offer popup is opened; polled every 10s to keep details fresh. |

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
| DELETE | `/v069/:offerType/:offerId/tradeRequestPerformed` | market-view | Cancel/undo a sent trade request. Called from the "Undo request" button on the offer popup. |
| POST | `/v069/:offerType/:offerId/tradeRequestPerformed/chat` | MatchesPopup | Send pre-contract chat message as the trade requester. Body: `{ messageEncrypted, signature }`. |
| POST | `/v069/:offerType/:offerId/tradeRequestReceived/:userId/chat` | MatchesPopup | Send pre-contract chat message as the offer owner. Body: `{ messageEncrypted, signature }`. |
| POST | `/v069/:offerType/:id/performInstantTrade` | market-view | Execute an instant trade. |

`:offerType` = `buyOffer` or `sellOffer` in all cases.

**Pre-contract chat note:** There are 4 chat endpoints (2 GET + 2 POST) covering two perspectives — the trade requester (`tradeRequestPerformed/chat`) and the offer owner (`tradeRequestReceived/:userId/chat`). Messages use symmetric-key encryption (`messageEncrypted`) and PGP signatures (`signature`).

---

## V069 — User Data

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| GET | `/v069/selfUser` | trades-dashboard, payment-methods, offer-creation, market-view | Full user profile with PGP-encrypted PM data. Response: `{ user: { ...profile, encryptedPaymentData: "PGP..." } }`. Decrypt with user's PGP private key. |
| POST | `/v069/selfUser/encryptedPaymentData` | payment-methods | Save encrypted PMs. Body: `{ encryptedPaymentData: encrypted, encryptedPaymentDataSignature: signature }`. |

---

## V069 — Desktop Authentication

Desktop QR authentication flow. The web app generates an ephemeral PGP keypair, creates a connection on the server, displays a QR code for the mobile app to scan, then polls for the mobile's encrypted response. On success, validates with the server and receives an access token. Implemented in `src/hooks/useQRAuth.js`.

| Method | Endpoint | Used in | Description |
|--------|----------|---------|-------------|
| POST | `/v069/desktop/desktopConnection` | useQRAuth | Create a desktop connection. Body: `{ pgpPublicKey }` (ephemeral PGP public key). Response: `{ encryptedDesktopConnectionId, signatureDesktopConnectionId }`. The connection ID is PGP-encrypted for the desktop; the signature is verified against the server's PGP key from `/v1/info`. |
| GET | `/v069/desktop/desktopConnection/:connId/` | useQRAuth | Poll for mobile response. Returns `{ desktopConnectionEncryptedData }` when mobile has responded. Returns 401 while waiting. Polled every ~2s with a 30s auto-refresh cycle. |
| POST | `/v069/desktop/desktopConnection/:connId/validate` | useQRAuth | Validate the connection. Body: `{ password }` (the `validationPassword` decrypted from mobile's encrypted response). Response: `{ accessToken }`. |

**QR auth flow summary:**
1. `POST /desktopConnection` — get encrypted connection ID
2. Display QR with `{ desktopConnectionId, ephemeralPgpPublicKey, peachDesktopConnectionVersion: 1 }`
3. `GET /desktopConnection/:id/` — poll until 200 with `desktopConnectionEncryptedData`
4. Decrypt mobile response to get `{ validationPassword, pgpPrivateKey, xpub, multisigXpub }`
5. `POST /desktopConnection/:id/validate` — exchange password for `accessToken`
6. `GET /v1/user/me` — fetch profile, verify PGP key match, populate `window.__PEACH_AUTH__`

---

## Planned — Not Yet Implemented

These endpoints exist in the API but are not wired in the web app yet.

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| DELETE | `/user/:userId/block` | Unblock a user | Need to implement alongside existing block |
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

*Last updated: 2026-04-16 — audited against actual codebase API calls*
