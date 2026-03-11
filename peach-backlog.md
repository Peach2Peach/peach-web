# Peach Web — Backlog

Screens and features not yet built. Reference this before starting any new screen.

---

## Notifications / Activity feed

Granular notification settings + in-app activity log.

- Toggles per notification type: trade matches · escrow funded · payment sent · disputes · price alerts
- Activity feed: timestamped list of recent events across all trades
- Browser tab title changes to `(●) Peach` when there's a new event (no push notifications at MVP)

---

## Offer detail view (unmatched) — 🟡 mostly done

Implemented inline as the Market View offer popup. Remaining gaps:

- Full offer card: amount · premium · methods · currencies · rep
- Shows offer status, expiry
- For own offer: edit amount/premium inline, withdraw/cancel options
- For other user's offer: Buy/Sell action, counterparty profile link

---

## Trade request acceptance flow

When an offer has incoming trade requests, the user sees a list of requesters and accepts one.

- Seller sees list of requesters with: rep · badges · trade count
- Can view each requester's full profile before deciding
- Accept one → creates a Contract (trade execution begins on v1)
- Others are automatically declined → their offers return to market

**API endpoints (all v069):**
- `GET /v069/{buyOffer|sellOffer}/{id}/tradeRequestReceived` — list incoming trade requests
- `GET /v069/{buyOffer|sellOffer}/{id}/tradeRequestReceived/{userId}` — get specific request details
- `POST /v069/{buyOffer|sellOffer}/{id}/tradeRequestReceived/{userId}/accept` — accept (creates Contract)
- `DELETE /v069/{buyOffer|sellOffer}/{id}/tradeRequestReceived/{userId}` — reject

**Note:** Once accepted, the resulting Contract is managed via v1 endpoints (`/v1/contract/:id`).

---

## Refund flow (PSBT signing)

Triggered when a trade is cancelled and the seller needs to recover escrowed funds.

- Retrieve refund PSBT: `GET /offer/:offerId/refundPsbt`
- User must sign the PSBT client-side (requires a Bitcoin library — bitcoinjs-lib or similar)
- Broadcast signed transaction: `POST /offer/:offerId/refund`

⚠️ **This is the most technically complex screen.** Client-side Bitcoin transaction signing in the browser is a significant engineering dependency. Requires an engineering spike before starting.

---

## Wallet Visualization (read-only)

Display wallet balance and UTXOs using the user's xpub — no signing capability, just a read-only view of the user's wallet.

- Derive addresses from xpub using BIP32 (e.g. bitcoinjs-lib)
- Query a public blockchain API (mempool.space or blockstream.info) for address balances and UTXOs
- Display total balance in Peach standard Bitcoin format + list of UTXOs

⚠️ **Blocked:** `xpub` is not currently included in `window.__PEACH_AUTH__`. The login handshake (QR code flow from mobile app) needs a backend/protocol change to pass the xpub to the browser session. Frontend work can begin once the xpub is available in auth.

---

## Settings sub-screens — to-do (empty shells, need content)

These rows exist in the Settings screen but navigate to placeholder/empty views.

| Screen | Key requirement |
|--------|----------------|
| Account & Sessions | Public key (masked) · active web sessions · revoke session · mobile app link status |
| Notifications | Toggles per notification type: trade matches · escrow funded · payment sent · disputes · price alerts |
| Pin Code | Set/change/remove a numeric PIN to protect the web app |
| Language | Language selector (5 languages to support) |
| Use Your Own Node | Connect to a custom Bitcoin or Electrum node |
| Contact Peach | In-app support form or link to support channels |
| About Peach | Version number · licenses · legal info · links |

---

## Settings sub-screens — built (in `peach-settings.jsx`)

| Screen | Notes |
|--------|-------|
| My Profile | Reads from `window.__PEACH_AUTH__.profile` (set at login). Remaining: referral, daily limits, memberSince. |
| Referrals | Mock data — wire to referral API endpoints |
| Backups | Static info screen (mobile-only, no API needed) |
| Network Fees | Live data from `GET /estimateFees` — preference save not yet wired to API |
| Transaction Batching | ✅ Wired — toggle calls `PATCH /user/batching` |
| Refund Address | ✅ Wired — CONFIRM calls `PATCH /user` (refundAddress) |
| Custom Payout Wallet | ✅ Wired — CONFIRM calls `PATCH /user` (payoutAddress) |
| Block/Unblock Users | Mock data — wire to `PUT/DELETE /user/:userId/block` |

---

## Fixes to existing screens

### Global (all screens)
- Add a Peach Web logo file and use it consistently across all screens — replace the current inline SVG approach
- Add dark mode — toggle already present in Settings UI but not yet functional
- **Dark mode icon in topbar** — add a dark mode toggle icon on the left side of the PeachID and avatar in the top bar
- **Colour uniformisation** — reduce gradient usage on orange bars, make them flatter/more subdued. Generally tone down the "colour fest." ⚠️ **Needs confirmation before any changes are made.**
- **Lingo consistency with mobile app** — audit all labels and copy across screens to match the mobile app's terminology (e.g. "Configure" not "Set up" in offer creation, etc.)
- **Mobile responsive review** — review all page layouts for mobile, especially the top bar and news card on the home screen. Ensure nothing breaks or overflows on small viewports.
- **Payment method user labels** — users should be able to add a custom label to each saved payment method (e.g. "SEPA - main", "SEPA - 2") to distinguish between multiple PMs of the same type. Applies to: Offer Creation PM selector, Payment Methods screen (add/edit flow), and anywhere saved PMs are displayed or selected.

### Home (`peach-home.jsx`)
- **My Profile card improvements** — improve info displayed, distinguish public info (trade count, rating, badges) from private info (referral, daily limits). Use Peach standard Bitcoin format for all amounts. Details TBD.
- **Peach Bitcoin price card** — add a card showing average and highest Bitcoin price seen on Peach over 24h, 7 days, 30 days, and all time.

### Market View (`peach-market-view.jsx`)
- **Filter parity with mobile app** — implement the same filter set that exists in the Peach mobile app. Exact filter list TBD.

### Offer Creation (`peach-offer-creation.jsx`)
- **"No new users" filter** — The offer creation form has a "No new users" checkbox (visible in the form). Wire it up end-to-end: the flag must be included in the offer payload on submission, and the UI must accurately reflect that traders with fewer than 3 completed trades will be excluded from matching.
- **Wire validators into PM add flow** — the mini PM-add modal (lines 1002-1009) accepts PM detail fields (IBAN, phone, holder) with zero validation. Inline the same IBAN/phone validators from `peach-validators.js` and add `onBlur` validation like Payment Methods does.

### Trade Execution (`peach-trade-execution.jsx`)
- Add a modal for when the seller funds the escrow with the wrong amount — options to continue (if close enough) or request a refund
- **Copy buttons mobile layout** — "Copy Address" and "Copy BTC" buttons in the escrow funding card don't render well on mobile. Fix layout for small viewports.
- **Escrow funding timer (buyer POV)** — at the "Waiting for escrow" stage, show a countdown timer for how long the seller has to fund. Use `instantTrade` (from `Match`) to determine duration: 1H for instant trades, 12H for normal. Escrow expiry timestamp: `SellOffer.funding.expiry`.
- **Escrow funding timer (seller POV)** — add a big, prominent countdown timer for how long the seller has left to fund the escrow. Same data source: `SellOffer.funding.expiry`.

### Payment Methods (`peach-payment-methods.jsx`)
- ✅ **Wire PM fetch** — PMs fetched from `GET /v069/selfUser` (PGP-encrypted in `encryptedPaymentData` field). Decrypted client-side via `src/utils/pgp.js`. Shows real PMs on regtest, mock data when logged out, "Failed to load payment data" error card on fetch failure. Same pattern in offer-creation and market-view.
- ✅ **PM save/sync** — PMs are serialised, PGP-encrypted + signed, and sent via `POST /v069/selfUser/encryptedPaymentData` with `{ encryptedPaymentData, encryptedPaymentDataSignature }`. Persists across refresh — confirmed working on regtest. Note: the mobile app only pushes PMs to the server (local-first model, never reads them back). The web app reads + writes since it has no persistent local storage.

### Trades Dashboard (`peach-trades-dashboard.jsx`)
- 🟡 **Pending Offers tab — render offers waiting for matches** — The Pending Offers tab fetches from both V1 and V069, but needs to correctly display offers that are waiting for matches (status: `hasMatchesAvailable`, `waitingForTradeRequest`, `searchingForPeer`, `offerPublished`, `fundEscrow`). Verify that these offers render properly with real API data and that the user can navigate to match/accept flows from this tab.
- **Trade History tab — unread chat badge** — The Trade History tab badge should turn orange if any completed trade has unread chat messages. Requires fetching unread message count per contract (not yet wired).

---

## Wiring gaps — making trades work on regtest

These are the remaining API integrations needed to complete a full trade lifecycle from the web app. Ordered by the trade lifecycle: offer → match → contract → completion.

### Offer submission (`peach-offer-creation.jsx`)
- **Wire buy offer submission** — `POST /v069/buyOffer` with amount, payment methods, currencies, premium. The "Publish offer" button currently just calls `setDone(true)` with no API call. Buy offers don't need `escrowPublicKey`, so this can be wired without Bitcoin key management.
- **Wire sell offer submission** — `POST /v069/sellOffer` — same as above but requires `escrowPublicKey` and `releaseAddress` (Bitcoin key management dependency).
- **Escrow funding (sell offers)** — the escrow step currently has a "Simulate funding (demo)" button. Needs real escrow address display + funding status polling.

### Match acceptance (`peach-trades-dashboard.jsx`)
- ✅ **Match popup + accept/skip** — wired. Fetches matches via `GET /v1/offer/:id/matches`, displays in popup, sends `POST /v1/offer/:id/match` with correct payload. Navigates to `/trade/:contractId` on success.
- 🟡 **Payment data encryption in accept payload** — PGP crypto helpers exist in `pgp.js` (`encryptSymmetric`, `encryptForRecipients`, `hashPaymentFields`) but are not yet called from `handleConfirmAccept()`. May be required by the server — test against regtest to confirm.

### Trade execution (`peach-trade-execution.jsx`)
- **Payment confirmation (buyer)** — "I sent the payment" action logs to console. Wire to the appropriate `PATCH /contract/:id` endpoint.
- **Payment confirmation / release (seller)** — "Release Bitcoin" action logs to console. Wire to the release endpoint.
- **Chat send** — optimistic UI update only, no `POST /contract/:id/chat` call. Requires PGP encryption per message.
- **Rating submit** — logs to console. Wire to the rating endpoint.
- **Extend deadline** — logs to console. Wire to the extend endpoint.

### Not blocking basic trades
- Dispute submission — component rendered but no encryption/API call
- Refund flow — requires client-side PSBT signing (separate engineering spike)

---

## Engineering dependencies (flag before building)

These are not UI screens but are blockers for specific features:

- **Client-side PSBT signing** — needed for trade execution (seller release) and refund flow. Evaluate bitcoinjs-lib bundle size before committing.
- **Chat encryption key compatibility** — the mobile app keypair must be importable or derivable in the browser. Resolve during engineering spike before building chat encryption.
- **BIP322 signature verification** — required for Custom Payout Wallet (and Refund Address) to verify the user controls the submitted address. Implement server-side using a BIP322-compatible library before wiring the address save endpoints.
- **Dispute symmetric key encryption** — opening a dispute requires encrypting the chat's symmetric key with the platform's PGP public key (from `GET /info`), using openpgp.js.
- **`useApi()` v069 support** — as more v069 calls are added (trade requests, offer creation), consider adding a version parameter to `useApi()` to avoid manual URL string manipulation (`auth.baseUrl.replace(/\/v1$/, '/v069')`) in every screen.
