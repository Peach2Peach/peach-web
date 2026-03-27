# Peach Web — Completed Items

Archive of all completed features, fixes, and resolved blockers. Moved here from `peach-backlog.md` to keep the backlog focused on remaining work.

---

## General / Infrastructure

- **Buy offer submission** — wired via `POST /v069/buyOffer` (`offer-creation/index.jsx`)
- **Trade request acceptance** — both v069 trade requests and v1 system matches, full PGP crypto (`trades-dashboard/index.jsx`)
- **PM fetch** — `GET /v069/selfUser`, PGP-decrypted client-side. Same pattern in offer-creation, market-view, payment-methods.
- **PM save/sync** — `POST /v069/selfUser/encryptedPaymentData` with encrypted + signed payload. Persists across refresh.
- **Transaction Batching** — toggle calls `PATCH /user/batching` (`settings/index.jsx`)
- **Refund Address** — CONFIRM calls `PATCH /user` (refundAddress) (`settings/index.jsx`)
- **Custom Payout Wallet** — CONFIRM calls `PATCH /user` (payoutAddress) (`settings/index.jsx`)
- **Trades Dashboard fetch optimization** — Two-tier refresh: `fetchCore()` (15s) does 4 parallel calls (`/offers/summary`, `/contracts/summary`, `/v069/buyOffer?ownOffers=true`, `/v069/user/{id}/offers`); `fetchEnrichments()` (60s) handles browse endpoints, sent requests, matches, PMs, tradingLimit. Eliminated redundant `/offers/summary` call, replaced broken `sellOffer?ownOffers=true` with `/user/{id}/offers`, added 5-min profile cache. (`trades-dashboard/index.jsx`)

---

## Phase 1: Wire Core Trade Actions

- **1.1 Extend Payment Deadline** — `PATCH /contract/:id/extendTime`. Also added seller "Give More Time" + "Cancel Trade" sliders for paymentTooLate status, and buyer "not paid on time" view. (`trade-execution/index.jsx`)
- **1.2 Buyer Payment Confirmation** — Desktop auth token lacks write permission for `POST /contract/:id/payment/confirm` (returns 401 UNAUTHORIZED). Wired via `MobileSigningModal` — buyer slides on web, modal prompts to confirm on mobile app, web polls for status change. Resolved by switching to pendingAction path (`POST /contract/:id/payment/createPaymentMadePendingAction`), bypassing the 401 issue. (`trade-execution/index.jsx`)
- **1.3 Chat Send + Decrypt** — `POST /contract/:id/chat` with `encryptSymmetric` + detached `signPGPMessage`. Symmetric key decrypted from contract, used for both send encryption and receive decryption. Optimistic UI. (`trade-execution/index.jsx`)
- **1.4 Chat Pagination + Mark Read + Polling** — `GET /contract/:id/chat?page=N` with auto-load on scroll-to-top, deduplication, chronological sort. `POST /contract/:id/chat/received` marks unread messages. 5s polling for real-time incoming messages. (`trade-execution/index.jsx`)
- **1.5 Dispute Submission** — `POST /contract/:id/dispute` with role-aware reasons (buyer/seller), conditional form (noPayment needs email+message, others submit immediately). Encrypts symmetric key + both payment data fields for platform PGP key via `encryptForPublicKey`. Decrypts PM fields with symmetric-then-asymmetric fallback. (`trade-execution/index.jsx`, `pgp.js`)
- **1.6 Dispute Acknowledgment + Outcome** — `DisputeBanner` component handles 3 states: counterparty dispute with email input (`POST /contract/:id/dispute/acknowledge`), active dispute info banner, and outcome display with acknowledge button (`POST /contract/:id/dispute/acknowledgeOutcome`). Supports all 5 mediator outcomes (buyerWins, sellerWins, none, cancelTrade, payOutBuyer). Payment deadline timer hidden during dispute. (`trade-execution/index.jsx`)

---

## Phase 2: Contract Lifecycle Completion

- **2.1 Contract Cancellation Flow** — request/confirm/reject cancellation via `POST /contract/:id/cancel`, `/confirmCancelation`, `/rejectCancelation`. (`trade-execution/index.jsx`)
- **2.2 Unread Message Counts** — wired from contract summaries `unreadMessages` field. (`trades-dashboard/index.jsx`)
- **2.3 Rating** — wired via mobile signing pending tasks. `createTask("rate", ...)` + `MobileSigningModal`. Maps UI rating (5->1, 1->-1). Pending state persisted in localStorage. (`trade-execution/index.jsx`, `components.jsx`)
- **2.4 Seller Payment Release** — wired via mobile signing pending tasks. `createTask("release", ...)` + `MobileSigningModal`. Pending state shown on release slider. Now wired to real endpoint (`POST /contract/:id/payment/createPaymentConfirmedPendingAction`). (`trade-execution/index.jsx`, `components.jsx`)

---

## Phase 2b: Notifications & Activity Feed

- **2b.1-2b.3 Notification System** — bell icon in topbar with unread badge, dropdown panel with chronological event list (trade requests, messages, status changes, matches, disputes). `useNotifications` hook polls existing API endpoints, persists read/unread in localStorage. Browser tab title shows `(*)` Peach when unread. (`Navbars.jsx`, `NotificationPanel.jsx`, `useNotifications.js`, `global.css`)

---

## Phase 3: Offer Management Completion

- **3.1 Trade Request Rejection** — reject button wired on match cards. (`trades-dashboard/index.jsx`)
- **3.2 Offer Edit / Withdraw** — edit/withdraw buttons on own offers. (`market-view/index.jsx`)
- **3.3 Offer Republish** — republish flow for cancelled offers with escrow.
- **3.5 Pre-Contract Chat (v069)** — full chat UI in MatchesPopup and SentRequestPopup. Send/receive encrypted messages via `POST/GET /v069/{buyOffer|sellOffer}/:id/tradeRequestPerformed/chat`. Chat bubbles, input field, unread message counts on sent trade requests. (`trades-dashboard/MatchesPopup.jsx`, `trades-dashboard/index.jsx`)
- **3.6 Sell Offer Submission** — `POST /v1/offer` + `POST /v1/offer/:id/escrow` with version 2 non-hardened key derivation from xpub. Escrow key at `m/84'/{coin}'/3/{offerId}`, return address at `m/84'/{coin}'/1/{index}` (P2WPKH). Uses `@scure/bip32` + `@scure/btc-signer`. `derivationPathVersion: 2` sent in escrow creation call. Resolved Phase 7 blocker "needs escrowPublicKey from mobile" — browser-side derivation. (`offer-creation/index.jsx`, `utils/escrow.js`)
- **3.7 Escrow Funding Status Polling** — polls `GET /v1/offer/:id/escrow` every 10s. Detects `MEMPOOL` (tx detected) -> `FUNDED` (confirmed, transitions to "Offer is live!") -> `WRONG_FUNDING_AMOUNT` (shows mismatch + "Accept anyway" button via `POST /offer/:id/escrow/confirm`). (`offer-creation/index.jsx`)

---

## Phase 4: Settings & Secondary Features

- **4.1 Contact Peach** — full form with topic dropdown (General/Support/Bug/Feedback/Partnership), subject field, message textarea, optional email. `POST /v1/contact/report`. Success card on submit, mock delay when logged out. (`settings/index.jsx`)
- **4.2 About Peach** — static branding header with PeachIcon + version `v0.1.0`, description card, links section (Website, Twitter/X, Telegram, GitHub) opening in new tabs via `SettingsRow` + `IconExternalLink`. (`settings/index.jsx`)
- **4.3 Block/Unblock Users** — PeachID input + Block button, block via `PUT /user/:userId/block`, unblock via `DELETE /user/:userId/block`. List persisted in localStorage only. Added `put()` method to `useApi.js`. (`settings/index.jsx`, `useApi.js`)
- **4.4 Network Fees Save** — wired "Fee Rate Set" button to `PATCH /user` with `{ feeRate }`. Computes rate from selected tier or custom value. Loading state + error handling. (`settings/index.jsx`)
- **4.13 Backups** — static info screen (mobile-only, no API needed). Already built.

---

## Phase 5: Mobile-Assist Signing

- **5.1 MobileSigningModal + createTask helper** — `MobileSigningModal` component (phone icon, spinner, "Confirm later in mobile" button). Mock `createTask()` in `useApi.js`. localStorage persistence for pending tasks across navigation. (`MobileSigningModal.jsx`, `useApi.js`)
- **5.2 Wire signing into trade execution** — 3 action handlers (release, refund, rating) create pending tasks + show signing modal. Pending state buttons (dashed orange, tappable to re-open modal). Contract polling detects status change and clears pending state. Cancel Trade button hidden for seller. (`trade-execution/index.jsx`, `components.jsx`)
- **5.5 Real endpoints wired (3/4):**
  - `"confirmPayment"` -> `POST /v1/contract/:contractId/payment/createPaymentMadePendingAction` (`trade-execution/index.jsx`)
  - `"release"` -> `POST /v1/contract/:contractId/payment/createPaymentConfirmedPendingAction` (with `{ buyerRating }`) (`trade-execution/index.jsx`)
  - `"refund"` -> `POST /v1/offer/:offerId/refundPendingAction` (`trade-execution/index.jsx` + `trades-dashboard/index.jsx`)
- **5.6 Sell Offer Signing** — solved without mobile signing. Escrow public key derived browser-side from xpub (non-hardened path `m/84'/{coin}'/3/{offerId}`, version 2). Return address derived browser-side from xpub (`m/84'/{coin}'/1/{index}`, P2WPKH).

---

## Phase 6: Remaining Features

- **6.2 QR Auth Handshake** — real QR-based web-to-mobile authentication. Ephemeral PGP keypair -> POST to `/v069/desktop/desktopConnection` -> display QR -> poll for mobile response -> decrypt credentials -> validate -> PGP key verification -> set `window.__PEACH_AUTH__`. Auto-refresh on expiry. Mobile view shows app instructions. "Can't scan?" shows connection ID. Dev auth kept as fallback. (`peach-auth.jsx`, `useQRAuth.js`, `pgp.js`)

---

## Resolved Blockers (formerly Phase 7)

- **Refund flow** — was blocked on PSBT signing. Resolved: wired to real endpoint `POST /offer/:id/refundPendingAction`.
- **Seller release TX** — was blocked on PSBT signing. Resolved: wired to `POST /contract/:id/payment/createPaymentConfirmedPendingAction`.
- **Desktop token: payment confirmation** — was blocked on 401 from direct endpoint. Resolved: buyer confirmation now uses `POST /contract/:id/payment/createPaymentMadePendingAction` (pendingAction path).
- **Sell offer submission** — was blocked on needing escrowPublicKey from mobile. Resolved: browser-side derivation (version 2 path from xpub).
- **PM decryption cross-compatibility** — openpgp.js v6 <-> GopenPGP v0.38.2 interop issue. Fixed.

---

## UI Fixes Completed

- **Offer Creation: "No new users" filter** — `noNewUsers` checkbox sends `minReputation: 0.5` on buy offers + inside `instantTradeCriteria` on sell offers.
- **Offer Creation: "Instant Match" checkbox** — `instantMatch` checkbox sends `instantTradeCriteria: { minReputation, minTrades, badges }` on both buy and sell offers.
- **Market View: own sell offers not showing in Buy BTC tab** — `GET /v069/sellOffer?ownOffers=true` is broken (backend ignores the param for sell offers). Fixed by switching all 4 screens to `GET /v069/user/{peachId}/offers` which returns `{ buyOffers, sellOffers }`. Also converted "My Offers" button to checkbox + added info tooltip.

---

## Engineering Dependencies Resolved

- **Chat encryption key compatibility** — mobile app keypair importable/derivable in the browser. Works with openpgp.js v6.
- **Dispute symmetric key encryption** — encrypt chat symmetric key with platform PGP public key (from `GET /info`). Implemented via `encryptForPublicKey()` in pgp.js. PM fields use symmetric-then-asymmetric decryption fallback.
