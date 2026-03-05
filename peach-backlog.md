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
- Accept one → moves to `matched` state (trade execution begins)
- Others are automatically declined → their offers return to market

---

## Refund flow (PSBT signing)

Triggered when a trade is cancelled and the seller needs to recover escrowed funds.

- Retrieve refund PSBT: `GET /offer/:offerId/refundPsbt`
- User must sign the PSBT client-side (requires a Bitcoin library — bitcoinjs-lib or similar)
- Broadcast signed transaction: `POST /offer/:offerId/refund`

⚠️ **This is the most technically complex screen.** Client-side Bitcoin transaction signing in the browser is a significant engineering dependency. Requires an engineering spike before starting.

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

### Global — Topbar
- **Three topbar states for user ID** — applies to all 8 screens:
  - Logged out → "Log in" button (already works)
  - Mock logged in (no `window.__PEACH_AUTH__` but localStorage says logged in) → displays `MOCK: PEACHxxxxxxxx` (existing mock peachID)
  - Regtest logged in (`window.__PEACH_AUTH__` exists with valid token) → displays `Regtest: PEACH` + first 8 chars of the public key from the auth object
  - Key rule: if `window.__PEACH_AUTH__` is set → regtest format, else if localStorage logged in → mock format.

### Global — Validator gaps
- **Trade execution dispute email** — no email validation on the dispute form email input (line 742 of `peach-trade-execution.jsx`). Add basic email format check.
- **PM add flow — name/surname validation** — the "Holder" / name field in PM add flows (Payment Methods + Offer Creation) must require at least two words (first + last name). Show warning: "Must match the bank account's owner name." Applies to both `peach-payment-methods.jsx` and `peach-offer-creation.jsx`.

### Home (`peach-home.jsx`)
- **My Profile card improvements** — improve info displayed, distinguish public info (trade count, rating, badges) from private info (referral, daily limits). Use Peach standard Bitcoin format for all amounts. Details TBD.
- **Peach Bitcoin price card** — add a card showing average and highest Bitcoin price seen on Peach over 24h, 7 days, 30 days, and all time.

### Market View (`peach-market-view.jsx`)
- **Filter parity with mobile app** — implement the same filter set that exists in the Peach mobile app. Exact filter list TBD.

### Offer Creation (`peach-offer-creation.jsx`)
- **"No new users" filter** — The offer creation form has a "No new users" checkbox (visible in the form). Wire it up end-to-end: the flag must be included in the offer payload on submission, and the UI must accurately reflect that traders with fewer than 3 completed trades will be excluded from matching.
- **Remove buy/sell offer pills** — remove the green and red "Creating buy offer" / "Creating sell offer" pills from the offer creation form. Not useful and visually noisy.
- **Wire validators into PM add flow** — the mini PM-add modal (lines 1002-1009) accepts PM detail fields (IBAN, phone, holder) with zero validation. Inline the same IBAN/phone validators from `peach-validators.js` and add `onBlur` validation like Payment Methods does.

### Trade Execution (`peach-trade-execution.jsx`)
- Add a modal for when the seller funds the escrow with the wrong amount — options to continue (if close enough) or request a refund
- **Copy buttons mobile layout** — "Copy Address" and "Copy BTC" buttons in the escrow funding card don't render well on mobile. Fix layout for small viewports.
- **Escrow funding timer (buyer POV)** — at the "Waiting for escrow" stage, show a countdown timer for how long the seller has to fund. Use `instantTrade` (from `Match`) to determine duration: 1H for instant trades, 12H for normal. Escrow expiry timestamp: `SellOffer.funding.expiry`.
- **Escrow funding timer (seller POV)** — add a big, prominent countdown timer for how long the seller has left to fund the escrow. Same data source: `SellOffer.funding.expiry`.
- **Chat input covered by progress bar** — the `.chat-input-row` sits inside the scrollable content but the `.h-stepper-wrap` is `position:fixed;bottom:0` with `z-index:190`, overlapping the chat input. Fix: add bottom padding/margin to the chat panel equal to `var(--stepper-h)` so the input is never obscured.

### Payment Methods (`peach-payment-methods.jsx`)
- **Wire `GET /user/me/paymentMethods`** — replace `MOCK_SAVED` with a real API fetch on mount (auth-gated via `window.__PEACH_AUTH__`). Falls back to mock data when not authenticated.
- ⚠️ **PM save/delete endpoints unknown** — the API reference lists `GET /user/me/paymentMethods` but no explicit POST/PUT/DELETE for individual PM CRUD. **Confirm with backend engineer** how PM save and delete work before wiring those calls.

### Trades Dashboard (`peach-trades-dashboard.jsx`)
- **Status cards grid/list toggle** — add a toggle (grid icon / list icon) above the status cards section. Grid = current `cards-grid` layout. List = single-column full-width cards.
- **List view row layout needs UI rework** — current list rows are functional but visually rough. Columns feel cramped, amount/fiat/status alignment needs polish, and the overall row design doesn't scan well. Revisit the row layout with a design pass — consider a purpose-built compact row component rather than squeezing the grid card data into columns.

---

## Engineering dependencies (flag before building)

These are not UI screens but are blockers for specific features:

- **Client-side PSBT signing** — needed for trade execution (seller release) and refund flow. Evaluate bitcoinjs-lib bundle size before committing.
- **Chat encryption key compatibility** — the mobile app keypair must be importable or derivable in the browser. Resolve during engineering spike before building chat encryption.
- **BIP322 signature verification** — required for Custom Payout Wallet (and Refund Address) to verify the user controls the submitted address. Implement server-side using a BIP322-compatible library before wiring the address save endpoints.
- **Dispute symmetric key encryption** — opening a dispute requires encrypting the chat's symmetric key with the platform's PGP public key (from `GET /info`), using openpgp.js.
