# Peach Web — Backlog

Everything that needs to be built, wired, or fixed. Organized by priority phase.

**Constraint:** No Bitcoin private key operations in the browser (those stay on mobile). The browser has the user's PGP private key, so all PGP encryption/decryption/signing works.

---

## Already done

These are completed and kept for reference.

- ✅ **Buy offer submission** — wired via `POST /v069/buyOffer` (`offer-creation/index.jsx`)
- ✅ **Trade request acceptance** — both v069 trade requests and v1 system matches, full PGP crypto (`trades-dashboard/index.jsx`)
- ✅ **PM fetch** — `GET /v069/selfUser`, PGP-decrypted client-side. Same pattern in offer-creation, market-view, payment-methods.
- ✅ **PM save/sync** — `POST /v069/selfUser/encryptedPaymentData` with encrypted + signed payload. Persists across refresh.
- ✅ **Transaction Batching** — toggle calls `PATCH /user/batching` (`peach-settings.jsx`)
- ✅ **Refund Address** — CONFIRM calls `PATCH /user` (refundAddress) (`peach-settings.jsx`)
- ✅ **Custom Payout Wallet** — CONFIRM calls `PATCH /user` (payoutAddress) (`peach-settings.jsx`)
- ✅ **1.1 Extend Payment Deadline** — `PATCH /contract/:id/extendTime`. Also added seller "Give More Time" + "Cancel Trade" sliders for paymentTooLate status, and buyer "not paid on time" view. (`trade-execution/index.jsx`)
- ✅ **1.2 Buyer Payment Confirmation** — `POST /contract/:id/payment/confirm` with empty body. Shows fallback error if payout address needed. Seller release shows "requires mobile signing relay" message. (`trade-execution/index.jsx`)
- ✅ **1.3 Chat Send + Decrypt** — `POST /contract/:id/chat` with `encryptSymmetric` + detached `signPGPMessage`. Symmetric key decrypted from contract, used for both send encryption and receive decryption. Optimistic UI. (`trade-execution/index.jsx`)
- ✅ **1.4 Chat Pagination + Mark Read + Polling** — `GET /contract/:id/chat?page=N` with auto-load on scroll-to-top, deduplication, chronological sort. `POST /contract/:id/chat/received` marks unread messages. 5s polling for real-time incoming messages. (`trade-execution/index.jsx`)
- ✅ **1.5 Dispute Submission** — `POST /contract/:id/dispute` with role-aware reasons (buyer/seller), conditional form (noPayment needs email+message, others submit immediately). Encrypts symmetric key + both payment data fields for platform PGP key via `encryptForPublicKey`. Decrypts PM fields with symmetric-then-asymmetric fallback. (`trade-execution/index.jsx`, `pgp.js`)
- ✅ **1.6 Dispute Acknowledgment + Outcome** — `DisputeBanner` component handles 3 states: counterparty dispute with email input (`POST /contract/:id/dispute/acknowledge`), active dispute info banner, and outcome display with acknowledge button (`POST /contract/:id/dispute/acknowledgeOutcome`). Supports all 5 mediator outcomes (buyerWins, sellerWins, none, cancelTrade, payOutBuyer). Payment deadline timer hidden during dispute. (`trade-execution/index.jsx`)
- ✅ **2.1 Contract Cancellation Flow** — request/confirm/reject cancellation via `POST /contract/:id/cancel`, `/confirmCancelation`, `/rejectCancelation`. (`trade-execution/index.jsx`)
- ✅ **2.2 Unread Message Counts** — wired from contract summaries `unreadMessages` field. (`trades-dashboard/index.jsx`)
- ✅ **2.3 Rating** — wired via mobile signing pending tasks. `createTask("rate", ...)` + `MobileSigningModal`. Maps UI rating (5→1, 1→-1). Pending state persisted in localStorage. (`trade-execution/index.jsx`, `components.jsx`)
- ✅ **2.4 Seller Payment Release** — wired via mobile signing pending tasks. `createTask("release", ...)` + `MobileSigningModal`. Pending state shown on release slider. (`trade-execution/index.jsx`, `components.jsx`)
- ✅ **2b.1–2b.3 Notification System** — bell icon in topbar with unread badge, dropdown panel with chronological event list (trade requests, messages, status changes, matches, disputes). `useNotifications` hook polls existing API endpoints, persists read/unread in localStorage. Browser tab title shows `(●) Peach` when unread. (`Navbars.jsx`, `NotificationPanel.jsx`, `useNotifications.js`, `global.css`)
- ✅ **3.5 Pre-Contract Chat (v069)** — full chat UI in MatchesPopup and SentRequestPopup. Send/receive encrypted messages via `POST/GET /v069/{buyOffer|sellOffer}/:id/tradeRequestPerformed/chat`. Chat bubbles, input field, unread message counts on sent trade requests. (`trades-dashboard/MatchesPopup.jsx`, `trades-dashboard/index.jsx`)
- ✅ **5.1 Mobile Signing Modal + createTask helper** — `MobileSigningModal` component (phone icon, spinner, "Confirm later in mobile" button). Mock `createTask()` in `useApi.js`. localStorage persistence for pending tasks across navigation. (`MobileSigningModal.jsx`, `useApi.js`)
- ✅ **5.2 Wire signing into trade execution** — 3 action handlers (release, refund, rating) create pending tasks + show signing modal. Pending state buttons (dashed orange, tappable to re-open modal). Contract polling detects status change and clears pending state. Cancel Trade button hidden for seller. (`trade-execution/index.jsx`, `components.jsx`)
- ✅ **3.1 Trade Request Rejection** — reject button wired on match cards. (`trades-dashboard/index.jsx`)
- ✅ **3.2 Offer Edit / Withdraw** — edit/withdraw buttons on own offers. (`peach-market-view.jsx`)
- ✅ **3.6 Sell Offer Submission** — `POST /v1/offer` + `POST /v1/offer/:id/escrow` with version 2 non-hardened key derivation from xpub. Escrow key at `m/84'/{coin}'/3/{offerId}`, return address at `m/84'/{coin}'/1/{index}` (P2WPKH). Uses `@scure/bip32` + `@scure/btc-signer`. `derivationPathVersion: 2` sent in escrow creation call. Blocked on `GET /v1/user/returnAddressIndex` endpoint. (`offer-creation/index.jsx`, `utils/escrow.js`)
- ✅ **3.7 Escrow Funding Status Polling** — polls `GET /v1/offer/:id/escrow` every 10s. Detects `MEMPOOL` (tx detected) → `FUNDED` (confirmed, transitions to "Offer is live!") → `WRONG_FUNDING_AMOUNT` (shows mismatch + "Accept anyway" button via `POST /offer/:id/escrow/confirm`). (`offer-creation/index.jsx`)
- ✅ **6.2 QR Auth Handshake** — real QR-based web-to-mobile authentication. Ephemeral PGP keypair → POST to `/v069/desktop/desktopConnection` → display QR → poll for mobile response → decrypt credentials → validate → PGP key verification → set `window.__PEACH_AUTH__`. Auto-refresh on expiry. Mobile view shows app instructions. "Can't scan?" shows connection ID. Dev auth kept as fallback. (`peach-auth.jsx`, `useQRAuth.js`, `pgp.js`)
- ✅ **4.1 Contact Peach** — full form with topic dropdown (General/Support/Bug/Feedback/Partnership), subject field, message textarea, optional email. `POST /v1/contact/report`. Success card on submit, mock delay when logged out. (`peach-settings.jsx`)
- ✅ **4.2 About Peach** — static branding header with PeachIcon + version `v0.1.0`, description card, links section (Website, Twitter/X, Telegram, GitHub) opening in new tabs via `SettingsRow` + `IconExternalLink`. (`peach-settings.jsx`)
- ✅ **4.3 Block/Unblock Users** — PeachID input + Block button, block via `PUT /user/:userId/block`, unblock via `DELETE /user/:userId/block`. List persisted in localStorage (no server-side list endpoint). Mock data when logged out. Added `put()` method to `useApi.js`. (`peach-settings.jsx`, `useApi.js`)
- ✅ **4.4 Network Fees Save** — wired "Fee Rate Set" button to `PATCH /user` with `{ feeRate }`. Computes rate from selected tier or custom value. Loading state + error handling. (`peach-settings.jsx`)

---

## Phase 1: Wire Core Trade Actions (P0) ✅ COMPLETE

~~1.1 Extend Payment Deadline~~ ✅
~~1.2 Buyer Payment Confirmation~~ ✅
~~1.3 Chat Send with PGP Encryption~~ ✅
~~1.4 Chat Pagination + Mark Read~~ ✅
~~1.5 Dispute Submission~~ ✅
~~1.6 Dispute Acknowledgment + Outcome~~ ✅

---

## Phase 2: Contract Lifecycle Completion

### ~~2.1 Contract Cancellation Flow~~ ✅

### ~~2.2 Unread Message Counts~~ ✅

### ~~2.3 Rating~~ ✅
### ~~2.4 Seller Payment Release~~ ✅

---

## Phase 2b: Notifications & Activity Feed ✅ COMPLETE

~~2b.1 Notification Bell + Dropdown~~ ✅
~~2b.2 Wire Notification Events~~ ✅
~~2b.3 Browser Tab Indicator~~ ✅

---

## Phase 3: Offer Management Completion

### ~~3.1 Trade Request Rejection~~ ✅

### ~~3.2 Offer Edit / Withdraw~~ ✅

### 3.3 Offer Republish
- **File**: `src/screens/peach-trades-dashboard.jsx`
- **Endpoint**: `POST /v1/offer/:id/republish`
- **UI**: Add "Republish" button on expired/cancelled offers in trade history

### 3.4 Instant Trade Check + Execute
- **File**: `src/screens/peach-trades-dashboard.jsx` or `peach-market-view.jsx`
- **Endpoints**:
  - `GET /v069/{buyOffer|sellOffer}/:id/canInstantTrade`
  - `POST /v069/{buyOffer|sellOffer}/:id/instantTrade`
- **UI**: Show "Instant Trade" badge/button when available

### ~~3.5 Pre-Contract Chat (v069)~~ ✅

### ~~3.6 Sell Offer Submission~~ ✅
- Browser-side derivation complete (version 2 non-hardened path from xpub). See "Already done" section.
- **Remaining blocker**: `GET /v1/user/returnAddressIndex` endpoint (backend team, tracked in Phase 5.3). Current workaround counts total sell offers — works but fragile.

### ~~3.7 Escrow Funding (sell offers)~~ ✅

### 3.8 Create Multiple Offers
- **File**: `src/screens/offer-creation/index.jsx`
- **Scope**: Add a "create multiple offers" option at the offer creation stage for both buy and sell flows.
- **UI**: Allow the user to batch-create several offers at once (e.g. different amounts, currencies, or PM combinations) rather than submitting one at a time.
- **Endpoints**: Same as single offer — `POST /v069/buyOffer` / `POST /v069/sellOffer` — called once per offer in the batch.

---

## Phase 4: Settings & Secondary Features

### ~~4.1 Contact Peach~~ ✅

### ~~4.2 About Peach~~ ✅

### ~~4.3 Block/Unblock Users~~ ✅

### ~~4.4 Network Fees Preference Save~~ ✅

### 4.5 Language Sub-screen
- **File**: `src/screens/peach-settings.jsx` → `LanguageSubScreen`
- **Scope**: UI-only for now (language selector). Full i18n framework is a larger effort — defer string extraction, just build the selector UI and store preference in localStorage.

### 4.6 Notifications Sub-screen
- **File**: `src/screens/peach-settings.jsx` → `NotificationsSubScreen`
- **UI**: Toggle switches per notification type (trade updates, chat messages, offers matched, etc.)
- **Storage**: localStorage (no push notifications on web — in-app only)

### 4.7 Account & Sessions
- **File**: `src/screens/peach-settings.jsx` → `AccountSubScreen`
- **UI**: Show current session info (PeachID, connected since, session expiry). Logout button (already exists in nav). Desktop session list if API supports it.

### 4.8 PIN Code
- **File**: `src/screens/peach-settings.jsx` → `PinCodeSubScreen`
- **UI**: Client-side PIN for sensitive actions (stored hashed in localStorage). Set/change/remove flow.
- **Note**: This is a UX convenience, not real security — browser storage is not secure.

### 4.9 Custom Node
- **File**: `src/screens/peach-settings.jsx` → `NodeSubScreen`
- **UI**: Electrum/Bitcoin Core endpoint input. Store in localStorage. Used for fee estimates and tx broadcasting if wired.

### 4.10 Dark Mode
- **File**: `src/styles/global.css`
- **Implementation**: Add `[data-theme="dark"]` CSS custom property overrides. Toggle button already exists in topbar — wire it to flip `document.documentElement.dataset.theme` and persist to localStorage.
- **Also**: Add a dark mode toggle icon on the left side of the PeachID and avatar in the top bar.

### 4.11 Referral System
- **File**: `src/screens/peach-settings.jsx` → `ReferralsSubScreen`
- **Endpoints**: `POST /v1/user/redeem/referralCode`, `GET /v1/user/checkReferralCode`
- **UI**: Already has mock layout — wire to real data from `auth.profile`

### 4.12 My Profile (settings)
- Reads from `window.__PEACH_AUTH__.profile`. Remaining: referral, daily limits, memberSince.

### ~~4.13 Backups (settings)~~ ✅
- Static info screen (mobile-only, no API needed). Already built.

---

## Phase 5: Mobile-Assist Signing via Pending Tasks — ✅ COMPLETE (browser side)

Architecture confirmed with backend dev. No QR code for signing — server links browser and mobile by userId via JWT `isDesktop` flag.
Remaining items (5.3–5.5) are blocked on backend/mobile teams.

### ~~5.1 MobileSigningModal + createTask helper~~ ✅
### ~~5.2 Wire signing into trade execution (release, refund, rating)~~ ✅

### 5.3 Backend endpoints (backend team)
- `POST /v1/task/create` (browser-exclusive) — create a signing task
- `GET /v1/pendingTasks` (mobile-exclusive) — mobile fetches tasks to sign
- `POST /v1/task/:id/sign` (mobile-exclusive) — mobile submits signature
- `GET /v1/user/returnAddressIndex` — returns next unused index for return address derivation (needed for sell offers)
- Server auto-applies signature (releases escrow, submits rating, etc.)
- Push notification sent to mobile when task is created (no QR for signing — device already paired from auth)
- **Release + Rating bundled**: seller's release and rating are sent as one task to mobile. Mobile signs both (release PSBT + SHA256(userId)) in one interaction.
- **Refund**: separate task type, same protocol
- **Status**: Waiting on backend team to implement. Web side uses mock `createTask()` for now.

### 5.4 Mobile pending tasks UI (mobile team)
- Poll or receive push for `/pendingTasks`
- Confirmation UI per task type
- Sign + submit using existing mobile signing code

### 5.5 Swap mock for real endpoint
- Replace mock `createTask()` in `useApi.js` with real `POST /v1/task/create`
- End-to-end testing on regtest

### ~~5.6 Sell Offer Signing~~ → Solved without mobile signing
- Escrow public key now derived browser-side from xpub (non-hardened path `m/84'/{coin}'/3/{offerId}`, version 2)
- Return address derived browser-side from xpub (`m/84'/{coin}'/1/{index}`, P2WPKH)
- No mobile signing needed for sell offer creation
- **Remaining blocker**: `GET /v1/user/returnAddressIndex` endpoint (backend team)

### Features unlocked by pending tasks
| Feature | Task type | What mobile signs | Server auto-applies |
|---------|-----------|-------------------|---------------------|
| Seller payment release + Rating | `release` (bundled) | Signs release PSBT + signs SHA256(counterpartyUserId) | Broadcasts release tx + submits rating |
| Refund | `refund` | Signs refund PSBT with escrow key | Broadcasts refund tx |
| ~~Sell offer creation~~ | — | ~~No longer needs mobile~~ | ✅ Browser derives escrow key + return address from xpub |

---

## Phase 6: Remaining Features

### ~~6.1 Notifications / Activity Feed~~ → Moved to Phase 2b

### ~~6.2 Auth Handshake Implementation~~ ✅

---

## Phase 7: Blocked / Deferred

| Feature | Blocker | Status |
|---------|---------|--------|
| ~~Refund flow~~ | ~~PSBT signing~~ | ✅ Browser-side wired (mock). Waiting on backend endpoints (Phase 5.3) |
| Wallet visualization | Needs UI design + bitcoinjs-lib for address derivation | xpub now available in `window.__PEACH_AUTH__.xpub` via QR auth |
| ~~Sell offer submission~~ | ~~Needs escrowPublicKey from mobile~~ | ✅ Browser-side derivation (version 2 path). Blocked on `GET /v1/user/returnAddressIndex` endpoint |
| ~~Seller release TX~~ | ~~Needs PSBT signing~~ | ✅ Browser-side wired (mock). Waiting on backend endpoints (Phase 5.3) |
| Blocked users list sync | Backend team — needs `GET /user/blocked` endpoint | Web + mobile would show consistent blocked users list. Currently block/unblock works server-side, but there's no way to fetch the full list of who you've blocked. |
| Network Fees preference sync | Backend team (nice-to-have) | `feeRate` is saved server-side via `PATCH /user` and consumed by the mobile app when signing transactions (escrow funding, wallet sends). Web app sets it as a cross-device convenience. Would benefit from loading saved preference on mount via `GET /user/me`. |

---

## UI Fixes & Polish

Items that don't add new API wiring but improve existing screens. Organized by priority tier.

### Functional gaps (wire missing data or add missing UI)
- **Trade Execution: wrong amount escrow modal** — modal when seller funds with wrong amount. Options: continue (if close enough) or request refund. (`trade-execution/index.jsx`)
- **Trade Execution: escrow funding timer (buyer POV)** — countdown at "Waiting for escrow" stage. `instantTrade` determines duration (1H instant, 12H normal). Source: `SellOffer.funding.expiry`. (`trade-execution/index.jsx`)
- **Trade Execution: escrow funding timer (seller POV)** — big, prominent countdown for how long seller has left to fund. Same data source. (`trade-execution/index.jsx`)
- **Trades Dashboard: MatchesPopup avatars/reputation wiring** — match cards currently show placeholder/missing data for counterparty avatars, reputation scores, and trade counts. Wire from match/user API data. (`trades-dashboard/MatchesPopup.jsx`)
- **Offer Creation: wire validators into PM add flow** — mini PM-add modal accepts IBAN/phone/holder with zero validation. Inline validators from `peach-validators.js` + add `onBlur` validation. (`offer-creation/index.jsx`)
- **Home: wire Top PMs & Top Currencies cards** — currently show mock/static data. Wire to live API so they reflect real platform activity when logged in. (`peach-home.jsx`)
- **Trade Execution: copy buttons mobile layout** — "Copy Address" and "Copy BTC" buttons don't render well on mobile. (`trade-execution/index.jsx`)
- **Market View: filter parity with mobile app** — implement same filter set as mobile. Exact filter list TBD. (`peach-market-view.jsx`)

### Polish (visual/consistency)
- **Global: Peach Web logo file** — replace inline SVG with a proper logo asset used consistently
- **Global: colour uniformisation** — reduce gradient usage on orange bars, make them flatter/more subdued. ⚠️ Needs confirmation before any changes.
- **Global: lingo consistency with mobile app** — audit all labels and copy to match mobile terminology
- **Global: mobile responsive review** — all page layouts, especially topbar and home news card on small viewports
- **Global: PM user labels** — custom labels (e.g. "SEPA - main", "SEPA - 2") to distinguish multiple PMs of same type. Applies to: Offer Creation PM selector, Payment Methods add/edit, anywhere saved PMs are shown.
- **Home: profile card improvements** — distinguish public info (trade count, rating, badges) from private info (referral, daily limits). Use Peach standard Bitcoin format for all amounts. Details TBD. (`peach-home.jsx`)
- **Home: Peach Bitcoin price card** — average and highest Bitcoin price on Peach over 24h, 7d, 30d, and all time. (`peach-home.jsx`)

### Already done
- ~~**Offer Creation: "No new users" filter**~~ ✅ — `noNewUsers` checkbox sends `minReputation: 0.5` on buy offers + inside `instantTradeCriteria` on sell offers.
- ~~**Offer Creation: "Instant Match" checkbox**~~ ✅ — `instantMatch` checkbox sends `instantTradeCriteria: { minReputation, minTrades, badges }` on both buy and sell offers.
- ~~**Market View: own sell offers not showing in Buy BTC tab**~~ ✅ — `GET /v069/sellOffer?ownOffers=true` is broken (backend ignores the param for sell offers). Fixed by switching all 4 screens to `GET /v069/user/{peachId}/offers` which returns `{ buyOffers, sellOffers }`. Also converted "My Offers" button to checkbox + added info tooltip.

### To verify (needs regtest)
- **Trade Execution: rating modal** — `MobileSigningModal` wired to `RatingPanel.onRate`. Mock `createTask("rate", ...)` fires, modal appears. Needs real regtest trade in `rateUser` status to test. Verify: select rating → submit → modal shows → cancel closes it.

---

## Execution Order (Suggested)

| Order | Item | Effort | Impact |
|-------|------|--------|--------|
| ~~1~~ | ~~1.1 Extend deadline~~ | ✅ Done | |
| ~~2~~ | ~~1.3 Chat send + decrypt~~ | ✅ Done | |
| ~~3~~ | ~~1.4 Chat pagination + mark read + polling~~ | ✅ Done | |
| ~~4~~ | ~~1.2 Buyer payment confirm~~ | ✅ Done | |
| ~~5~~ | ~~1.5 Dispute submission~~ | ✅ Done | |
| ~~5b~~ | ~~1.6 Dispute ack + outcome~~ | ✅ Done | |
| ~~6~~ | ~~2.1 Contract cancellation~~ | ✅ Done | |
| ~~7~~ | ~~2.2 Unread counts~~ | ✅ Done | |
| ~~7b~~ | ~~2b.1–2b.3 Notifications & activity feed~~ | ✅ Done | |
| ~~8~~ | ~~2.3 Rating~~ | ✅ Done (via mobile signing) | |
| ~~9~~ | ~~2.4 Seller payment release~~ | ✅ Done (via mobile signing) | |
| ~~10~~ | ~~3.5 Pre-contract chat~~ | ✅ Done | |
| ~~11~~ | ~~5.1–5.2 Mobile signing (browser side)~~ | ✅ Done | |
| ~~12~~ | ~~6.2 QR Auth handshake~~ | ✅ Done | |
| ~~13~~ | ~~3.1–3.2 Reject + edit/withdraw~~ | ✅ Done | |
| ~~14~~ | ~~4.1–4.2 Contact Peach + About Peach~~ | ✅ Done | |
| ~~15~~ | ~~4.3–4.4 Block/Unblock Users + Network Fees Save~~ | ✅ Done | |
| 16 | 4.10 Dark Mode | ~1-2 sessions | High UX impact |
| 17 | 4.5–4.6 Language + Notification settings | ~1 session | Settings sub-screens |
| 18 | 4.7–4.8 Account & Sessions + PIN Code | ~1 session | Settings sub-screens |
| 19 | 4.9 Custom Node | ~0.5 session | Settings sub-screen |
| 20 | 4.11 Referrals | ~1 session | Wire mock to real data |
| 21 | 4.12 My Profile (settings) | ~0.5 session | Wire referral, daily limits, memberSince |
| 22 | 3.3–3.4 Offer Republish + Instant Trade | ~1 session | Advanced offer features |
| 23 | 3.8 Create Multiple Offers | ~1 session | Offer creation enhancement |
| 24 | `useApi()` v069 param support | ~0.5 session | Engineering cleanup |
| — | UI fixes & polish | Ongoing | See prioritized tiers below |

**Blocked on backend/mobile teams:**

| Item | Blocker | What it unlocks |
|------|---------|-----------------|
| 5.3 Backend endpoints (`task/create`, `pendingTasks`, `task/:id/sign`, `returnAddressIndex`) | Backend team | Real mobile signing + sell offer return address |
| 5.4 Mobile pending tasks UI | Mobile team | End-to-end signing flow |
| 5.5 Swap mock `createTask` for real endpoint | Needs 5.3 first | Completes signing integration |
| Wallet visualization | Needs UI design | Future feature |

---

## Engineering Dependencies (flag before building)

- ~~**Chat encryption key compatibility** — mobile app keypair must be importable/derivable in the browser.~~ ✅ Resolved — works with openpgp.js v6.
- ~~**Dispute symmetric key encryption** — encrypt chat symmetric key with platform PGP public key (from `GET /info`).~~ ✅ Resolved — `encryptForPublicKey()` in pgp.js. PM fields use symmetric-then-asymmetric decryption fallback.
- ~~**`useApi()` v069 support** — consider adding a version parameter to avoid manual URL string manipulation in every screen.~~ → Tracked as execution order #24.

---

## Key Files to Modify

| File | Remaining changes |
|------|-------------------|
| `src/screens/trade-execution/index.jsx` | Wrong amount escrow modal, escrow timers |
| `src/screens/trades-dashboard/index.jsx` | Republish, instant trade |
| `src/screens/peach-market-view.jsx` | Filter parity |
| `src/screens/offer-creation/index.jsx` | PM validators, multiple offers |
| `src/screens/peach-settings.jsx` | 9 sub-screens (4.1–4.9) + referrals (4.11) + profile (4.12) |
| `src/screens/peach-home.jsx` | Profile card, price card, wire top PMs & currencies |
| `src/styles/global.css` | Dark mode theme variables |
| `src/hooks/useApi.js` | Swap mock createTask (when 5.3 lands), v069 param support (#24) |
| `src/components/MobileSigningModal.jsx` | Swap mock createTask (when 5.3 lands) |
