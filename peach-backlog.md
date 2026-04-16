# Peach Web — Backlog

Everything that needs to be built, wired, or fixed. Organized by priority phase.

Completed items archived in `peach-completed.md`.

**Constraint:** No Bitcoin private key operations in the browser (those stay on mobile). The browser has the user's PGP private key, so all PGP encryption/decryption/signing works.

---

## Phase 4: Settings & Secondary Features

### 4.5 Language Sub-screen
- **File**: `src/screens/settings/index.jsx` → `LanguageSubScreen`
- **Scope**: UI-only for now (language selector). Full i18n framework is a larger effort — defer string extraction, just build the selector UI and store preference in localStorage.

### 4.6 Notifications Sub-screen
- **File**: `src/screens/settings/index.jsx` → `NotificationsSubScreen`
- **UI**: Toggle switches per notification type (trade updates, chat messages, offers matched, etc.)
- **Storage**: localStorage (no push notifications on web — in-app only)

### 4.7 Account & Sessions
- **File**: `src/screens/settings/index.jsx` → `AccountSubScreen`
- **UI**: Show current session info (PeachID, connected since, session expiry). Logout button (already exists in nav). Desktop session list if API supports it.


### 4.11 Referral System
- **File**: `src/screens/settings/index.jsx` → `ReferralsSubScreen`
- **Endpoints**: `POST /v1/user/redeem/referralCode`, `GET /v1/user/checkReferralCode`
- **UI**: Wire to real data from `auth.profile`


---

## Phase 7: Blocked / Deferred

| Feature | Blocker | Status |
|---------|---------|--------|
| Wallet visualization | Needs UI design | xpub available in `window.__PEACH_AUTH__.xpub` via QR auth. Uses `@scure/bip32` (already in deps). |
| Network Fees preference sync | Backend team (nice-to-have) | Would benefit from loading saved preference on mount via `GET /user/me`. |
| `sellOffer?ownOffers=true` fix | Backend team — endpoint ignores `ownOffers` param for sell offers | Simplifies fetch in 4 screens. See `trades-dashboard-dual-fetch-report.md`. |
| `contracts/summary` status fix | Backend team | Summary always returns `tradeCanceled` for cancelled contracts, even when seller still has escrow. Web derives status client-side as workaround. |
| `GET /v1/user/returnAddressIndex` | Backend team | Sell offer return address derivation. Current workaround counts total sell offers. |
| Standalone rating endpoint (without release) | Backend team | Would let rating submission skip the mobile signing modal round-trip. Not blocking — rating works today via `MobileSigningModal`. |

---

## UI Fixes & Polish

Items that don't add new API wiring but improve existing screens. Organized by priority tier.

### Functional gaps (wire missing data or add missing UI)
- **Home: wire remaining stats cards** — Active Offers now wired from `GET /market/offers/stats`. Still placeholder: 24h Volume, Trades Today, Top PMs, Top Currencies — all waiting for new backend endpoints (coordinating with backend dev week of 2026-04-07). Profile card rating, badges, volume, and last trade are now wired from real data. (`peach-home.jsx`)
- **Market View: filter parity with mobile app** — implement same filter set as mobile. Exact filter list TBD. (`market-view/index.jsx`)
- **Trade Execution: escrow funding link (not QR)** — the funded escrow "QR code" is not actually useful as a QR. Replace with a clickable link to mempool.space (or other block explorer) for the escrow address. (`trade-execution/index.jsx`)
- **Trade Execution: grouphug toggle (buyer POV)** — add a toggle in the trade execution screen from the buyer's perspective to enable/disable transaction batching (grouphug). (`trade-execution/index.jsx`)
- **Market View / Trades Dashboard: visual cue for limit-paused offers** — own offers that are off the market because of trading limits should have a clear visual indicator (badge, dimmed state, or label) so the user knows why they're inactive. (`market-view/index.jsx`, `trades-dashboard/index.jsx`)
- **Pre-contract chat for trade request sender** — the sender of a trade request currently has no UI to chat with the offer owner before contract creation. v069 endpoint exists (`GET /v069/buyOffer/{id}/tradeRequestPerformed/chat`). Wire send + display. (`trades-dashboard/index.jsx` or new pre-contract chat surface)
- **Payment reference in PM creation — verify + wire PeachID option** — PM creation modal offers two reference modes: `tradeID` (wired) and `peachID` (not wired). Originally planned for mobile but never shipped there. Confirm behavior and wire PeachID. (`payment-methods/index.jsx`, `offer-creation/index.jsx`)
- **"Trade requested" offer highlight should persist** — when a user sends a trade request, the highlight on the offer disappears on screen change. Should persist (localStorage or derived from request state). (`market-view/index.jsx`)
- **Notifications wording audit — seller POV during payment wait** — e.g. seller side during payment wait currently reads "send payment to seller" (buyer wording). Audit all 31 trade statuses × both roles for correct wording. (`hooks/useNotifications.js`, `data/statusConfig.js`)
- **PM details summary not rendering in request popup (esp. TWINT)** — trade request popup fails to render PM field summary for some PM types, TWINT confirmed broken. (`trades-dashboard/MatchesPopup.jsx` or request popup component)
- **Overall notifications check** — broader pass: verify trigger conditions, polling cadence, unread tracking end-to-end.
- **Overall payment methods check** — broader pass: creation, editing, deletion, rendering across offer-creation / market-view / trades-dashboard / payment-methods / trade-execution.

### Polish (visual/consistency)
- **Global: colour uniformisation** — reduce gradient usage on orange bars, make them flatter/more subdued. ⚠️ Needs confirmation before any changes.
- **Global: lingo consistency with mobile app** — audit all labels and copy to match mobile terminology
- **Global: mobile responsive review** — all page layouts, especially topbar and home news card on small viewports
- **Home: rethink page design and structure** — broader redesign of the home page layout: rearrange card positions, rethink what's shown and how. Includes existing sub-items: (1) profile card improvements — distinguish public info (trade count, rating, badges) from private info (referral, daily limits), use Peach standard Bitcoin format; (2) Peach Bitcoin price card — average and highest Bitcoin price on Peach over 24h, 7d, 30d, and all time. (`peach-home.jsx`)

### To verify (needs regtest)
- **Trade Execution: refundOrReviveRequired status** — 3.3 Republish/Refund UI is implemented but untested. Yellow banner + two sliders (Re-publish Offer / Refund Escrow) should appear when a contract reaches `refundOrReviveRequired` status. Republish calls `POST /v1/offer/:offerId/revive`. Refund goes through MobileSigningModal. Needs a regtest trade that gets cancelled to reach this status.

---

## Engineering Dependencies (flag before building)

- **`useApi()` v069 support** — consider adding a version parameter to avoid manual URL string manipulation in every screen. → Tracked as execution order #24.

---

## Key Files to Modify

| File | Remaining changes |
|------|-------------------|
| `src/screens/trade-execution/index.jsx` | Escrow timers, escrow link, grouphug toggle |
| `src/screens/trades-dashboard/index.jsx` | Republish, instant trade, pre-contract chat, PM details render in request popup |
| `src/screens/market-view/index.jsx` | Filter parity, persistent "trade requested" highlight |
| `src/screens/offer-creation/index.jsx` | PeachID payment reference wiring |
| `src/screens/payment-methods/index.jsx` | PeachID payment reference wiring |
| `src/screens/settings/index.jsx` + `screens.jsx` | Language, Notifications, Account sub-screens + referrals (4.11) |
| `src/screens/peach-home.jsx` | Wire remaining stats (24h volume, trades today, top PMs, top currencies — needs backend endpoints) |
| `src/hooks/useApi.js` | v069 param support (#24) |
| `src/hooks/useNotifications.js` + `src/data/statusConfig.js` | Role-aware wording audit across all 31 trade statuses |
