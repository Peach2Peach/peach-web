# Peach Web — Journey Checklist

End-to-end user journeys walked as one continuous path. This file complements [peach-flow-checklist.md](peach-flow-checklist.md) — that file is the **per-screen** smoke test; this file is the **cross-screen** journey test. Use both: screens first, journeys second.

Each journey records the exact UI string, expected state, and API call firing underneath, so regressions can be caught at the right layer (UI / React state / network).

**How to read a step:**
- **Action** — the exact thing the tester does (route, click, input)
- **Expected UI** — what should visibly appear (exact strings, topbar state, modals, toasts)
- **Expected state / API** — what the tester should verify in DevTools Network tab, React state, `window.__PEACH_AUTH__`, `sessionStorage`, badges

> **Counterparty journeys** require a second browser profile signed in as the other party. Mark in the top of the journey whether it has been walked live on regtest or only paper-verified.

---

## Journey index

| # | Name | Counterparty | Walked live? |
|---|------|--------------|--------------|
| 1 | First-time login | no | |
| 2 | Buyer end-to-end | yes | |
| 3 | Seller end-to-end | yes | |
| 4 | Create buy offer end-to-end | yes (match) | |
| 5 | Create sell offer end-to-end + multi-escrow | no | |
| 6 | Add new PM mid-offer | no | |
| 7 | Cancellation — accepted | yes | |
| 8 | Cancellation — rejected | yes | |
| 9 | Dispute flow | yes | |
| 10 | Refund — wrong funding amount ⚠️ pendingAction | no | |
| 11 | Withdraw own offer — buy & sell | no | |
| 12 | Edit own offer premium inline | no (optional second session) | |
| 13 | Session expiry mid-trade | no | |
| 14 | Notifications end-to-end | yes | |
| 15 | Chat end-to-end | yes | |
| 16 | Logout & re-login — no stale data leaks | no | |
| 17 | Referrals screen ⚠️ UI shell only | no | |

---

## Journey 1 — First-time login

**Prerequisites:** logged out, mobile app installed and provisioned.

**Counterparty:** none

**Expected duration:** ~1 min

| # | Action | Expected UI | Expected state / API |
|---|--------|-------------|----------------------|
| 1 | Navigate to `/` | Landing / auth screen renders, QR code visible with 30s countdown | `window.__PEACH_AUTH__ === null`. QR polling begins (see `useQRAuth.js`) |
| 2 | Wait past countdown without scanning | QR auto-refreshes with a new code and fresh countdown | New poll cycle fires |
| 3 | Scan QR with mobile app | Success screen with checkmark animation | Handshake completes, `window.__PEACH_AUTH__` populated with `{ publicKey, xpub, pgp, token, baseUrl }` |
| 4 | Wait for auto-redirect | Lands on `/home` with topbar populated (PeachID, avatar, BTC price) | Initial `/home` data fetches (prices, offers, contract summary) visible in Network tab |

**Failure modes to watch:**
- QR never refreshes → polling interval dead
- Scan succeeds but no redirect → `useAuth` login handler not wired to navigation
- Topbar stays empty after landing → `window.__PEACH_AUTH__` set but React state didn't pick it up

(per-screen detail: [peach-flow-checklist.md §1](peach-flow-checklist.md))

---

## Journey 2 — Buyer end-to-end

**Prerequisites:** two Peach accounts (A = buyer, B = seller). B already has an active sell offer with a PM you can pay. Both log in in separate browser profiles.
**Counterparty:** yes — B must accept and release
**Expected duration:** ~10 min (plus real payment time on the side channel)

| # | Who | Action | Expected UI | Expected state / API |
|---|-----|--------|-------------|----------------------|
| 1 | A | Login via QR | Lands on `/home` | auth set |
| 2 | A | Navigate to `/market` → **Sell** tab | Offer rows render (amount in Peach ₿ format, premium, rating, PMs) | `GET /v069/sellOffer` |
| 3 | A | Click B's offer row | Offer detail popup opens (reputation, PMs, full amount, fiat equivalent) | `GET /v1/offer/:id/details` for sell offer (per memory: sell only) |
| 4 | A | Select a compatible PM → click request button | Loading state → "Trade requested" confirmation animation | `POST /v069/sellOffer/{id}/tradeRequestPerformed` |
| 5 | B | On `/trades` → **Pending** tab → click "View matches" | `MatchesPopup` opens with A's avatar, PeachID, rating, amount, premium, PMs | `GET /v069/sellOffer/{id}/tradeRequestReceived` |
| 6 | B | Click A → detail view → click "Accept trade" → confirmation modal → "Confirm" | Contract created, B navigates to `/trade/:contractId` | `POST /v069/sellOffer/{id}/tradeRequestReceived/{userId}/accept` → contract id returned |
| 7 | A | On next poll / notification, lands on `/trade/:contractId` via dashboard or notification click | Trade execution loads: counterparty info, trade summary, stepper | `GET /contract/:id` |
| 8 | A | View seller's payment details in the left panel | Decrypted PM fields render (IBAN / account / wallet address etc.), copy buttons work | `paymentDataEncrypted` decrypted client-side via `symmetricKeyEncrypted` |
| 9 | A | Make the real-world payment via the PM side channel | — | — |
| 10 | A | Click "I've sent the payment" | Status advances to buyer-paid state, button disables | `POST /contract/:id/paymentMade` (verify) |
| 11 | B | Clicks "Confirm payment received" and then "Release Bitcoin" — see Journey 3 for seller-side detail | — | — |
| 12 | A | Wait for release | Status advances to `tradeCompleted`. "Rate" button appears | contract status field flips to `tradeCompleted` |
| 13 | A | Click rate, leave rating | Rating submitted, trade moves out of Active | `POST /contract/:id/rate` (verify) — note: may go via `MobileSigningModal` pendingAction |
| 14 | A | Navigate to `/trades` → **History** | Completed trade appears with final amount, date, counterparty | `GET /v1/contracts/summary` (per memory: returns historical) |

**Failure modes:**
- Step 4 "Trade requested" flashes but `/trades` Pending never shows it → v069 POST silently failed
- Step 8 PM fields render as ciphertext → PGP decrypt failed (check `src/utils/pgp.js` interop flags)
- Step 12 never advances past `paymentMade` → contract polling dead, or seller's release didn't flip status
- Step 14 trade missing from history → `/v1/contracts/summary` filter wrong or cache not invalidated

---

## Journey 3 — Seller end-to-end

**Prerequisites:** account with mobile app, some BTC in mobile wallet (or external wallet) to fund escrow
**Counterparty:** yes — buyer must request and mark paid
**Expected duration:** ~15 min

| # | Who | Action | Expected UI | Expected state / API |
|---|-----|--------|-------------|----------------------|
| 1 | B | Login, navigate to `/offer/new` → **Sell** toggle | Offer config screen | — |
| 2 | B | Set amount, premium, select PMs, currencies auto-populate | Fiat equivalent updates live as amount changes | — |
| 3 | B | Click "Next" → review → "Confirm" | Advances to escrow step | `POST /v069/sellOffer` → offer id returned, then `POST /offer/:id/escrow` |
| 4 | B | See Bitcoin escrow address + QR with copy button | Address and QR render | `paymentExpectedBy` visible |
| 5 | B | Fund the escrow from external wallet with **correct** amount | Funding status: mempool → confirmed | Polling flips status to funded |
| 6 | B | Offer goes live — verify by opening `/market` → Sell tab | Offer appears in the list | `GET /v069/sellOffer` includes it |
| 7 | A | Requests trade against B's offer (see Journey 2 steps 2–4) | — | — |
| 8 | B | On `/trades` → Pending → "View matches" → accept | Contract created, land on `/trade/:contractId` | `POST /v069/sellOffer/{id}/tradeRequestReceived/{userId}/accept` |
| 9 | B | See escrow address + funding amount in trade execution | Counterparty info, buyer's PM visible (decrypted) | `GET /contract/:id` — `buyerPaymentDataEncrypted` decrypted |
| 10 | A | Marks payment sent (Journey 2 step 10) | — | — |
| 11 | B | "Confirm payment received" button appears | Button enabled | status advanced |
| 12 | B | Click "Confirm payment received" → "Release Bitcoin" | `MobileSigningModal` opens with task info, QR/deep link, status `pending` | `POST /contract/:id/confirmPaymentReceived` then release pendingAction pushed to mobile |
| 13 | B | Sign on mobile app | Modal status advances `pending → signed → complete`, modal dismisses | Release PSBT broadcast, contract flips `tradeCompleted` |
| 14 | B | "Rate" button appears → rate buyer | Rating submitted | `POST /contract/:id/rate` (verify) |
| 15 | B | `/trades` → History shows completed trade | — | `GET /v1/contracts/summary` |

**Failure modes:**
- Step 5 funding never flips to confirmed → polling dead or wrong address watched
- Step 12 MobileSigningModal never opens → pendingAction push never dispatched
- Step 13 mobile signs but web never advances → mobile→web status bridge lagging
- Step 15 trade missing from history

---

## Journey 4 — Create buy offer end-to-end

**Prerequisites:** logged in; at least one PM saved
**Counterparty:** yes — needed for match step (otherwise stop at step 5)

| # | Action | Expected UI | Expected state / API |
|---|--------|-------------|----------------------|
| 1 | Navigate to `/offer/new` → **Buy** toggle | Buy config renders | — |
| 2 | Drag amount slider / type in input | Slider and input stay in sync, fiat equivalent updates live | `GET /market/prices` cached |
| 3 | Toggle **Range** mode | Min/max amount inputs appear | — |
| 4 | Set premium, select PMs, currencies auto-populate | Selected PMs highlighted | `GET /v069/selfUser` for PM list |
| 5 | Click "Next" → review → "Confirm" | Success state → land on `/trades` **Pending** tab | `POST /v069/buyOffer` → id returned, normalize via `String(o.id)` |
| 6 | New offer visible in Pending | Offer card shows amount, premium, PMs | `GET /v069/buyOffer?ownOffers=true` |
| 7 | Counterparty (seller) creates matching sell offer or requests against this buy offer → match arrives | "View matches" button becomes enabled on the offer card | `GET /v069/buyOffer/{id}/tradeRequestReceived` |
| 8 | Click "View matches" → accept → Confirm | Contract created, navigates to `/trade/:contractId` | `POST /v069/buyOffer/{id}/tradeRequestReceived/{userId}/accept` |

**Failure modes:**
- v069 POST fails silently → offer never in Pending
- `id` not coerced to String → downstream comparisons break (known v069 shape quirk)
- Matches never appear → polling dead

(per-screen detail: [peach-flow-checklist.md §5](peach-flow-checklist.md))

---

## Journey 5 — Create sell offer end-to-end + multi-escrow

**Prerequisites:** logged in; ability to fund escrow
**Counterparty:** none (stops at funded offer)

| # | Action | Expected UI | Expected state / API |
|---|--------|-------------|----------------------|
| 1 | `/offer/new` → **Sell** toggle | Sell config renders | — |
| 2 | Configure amount, premium, PMs, currencies, enable **auto-confirm** toggle | Toggle state persists | — |
| 3 | Enable **"Create multiple offers"** toggle → subtext "Publish identical copies of this offer" → set counter to ×3 | Counter between ×2 and ×10 | — |
| 4 | Click Next → review shows 3 identical offers → Confirm | Escrow step renders with 3 addresses (or iterates) | 3× `POST /v069/sellOffer` + `POST /offer/:id/escrow` |
| 5 | Fund each escrow from external wallet | Each flips to confirmed independently | Polling per-offer |
| 6 | Navigate to `/market` Sell tab → My Offers toggle | All 3 offers visible and active | `GET /v069/user/{publicKeyId}/offers` (per CLAUDE.md caveat: `sellOffer?ownOffers=true` does not work) |

**Failure modes:**
- Only 1 of N offers created → loop broke after first success
- Multi-escrow counter above ×10 or below ×2 → validation missing
- My Offers toggle shows only buys → using wrong endpoint (must be `/user/:id/offers` not `sellOffer?ownOffers=true`)

---

## Journey 6 — Add new PM mid-offer creation

**Prerequisites:** logged in; currently no SEPA PM saved

| # | Action | Expected UI | Expected state / API |
|---|--------|-------------|----------------------|
| 1 | `/offer/new` → Buy → get to PM selection step | SEPA not in list | `GET /v069/selfUser` returns current PMs |
| 2 | Click "add PM" inline | PM creation flyout opens, categories grouped (Bank / Online wallet / Gift card / National) | — |
| 3 | Pick SEPA → fill IBAN + BIC + holder name → select EUR → save | Flyout closes, SEPA appears as selected in the offer PM list | `POST /v069/selfUser/encryptedPaymentData` with `{ encryptedPaymentData, encryptedPaymentDataSignature }` |
| 4 | Finish offer creation → land on `/trades` Pending | Offer has SEPA attached | — |
| 5 | Navigate to `/payment-methods` | SEPA persists in the saved list with correct IBAN | `GET /v069/selfUser` returns updated encrypted blob |
| 6 | Refresh page → `/payment-methods` again | SEPA still there | Server-side persistence confirmed |

**Failure modes:**
- SEPA in the offer but missing from `/payment-methods` → wrote to local state only, didn't POST
- SEPA wipes previously saved PMs → encrypt/merge logic replacing instead of appending (high-risk regression)
- `PATCH /v1/user` used instead of `/v069/selfUser/encryptedPaymentData` → silently ignored per memory

---

## Journey 7 — Cancellation — accepted

**Prerequisites:** active trade between A and B, not yet paid
**Counterparty:** yes

| # | Who | Action | Expected UI | Expected state / API |
|---|-----|--------|-------------|----------------------|
| 1 | A | Open trade → click "cancel trade" | Confirmation modal titled "cancel trade" | — |
| 2 | A | Click "cancel trade" confirm button | Request sent, status shows pending cancellation | `POST /contract/:id/cancel` |
| 3 | B | On their side, sees cancellation request in the trade panel | Confirm / reject buttons visible | polling picks up state |
| 4 | B | Click confirm | Trade cancelled on both sides | `POST /contract/:id/confirmCancelation` |
| 5 | A & B | Navigate to `/trades` → History | Cancelled trade appears with cancelled badge | `GET /v1/contracts/summary` |

**Failure modes:**
- A's UI still shows trade as active after B confirms → polling lag / stale cache
- History tab missing the cancelled trade

---

## Journey 8 — Cancellation — rejected

**Prerequisites:** same as Journey 7

| # | Who | Action | Expected UI | Expected state / API |
|---|-----|--------|-------------|----------------------|
| 1 | A | Request cancel as in Journey 7 steps 1–2 | Pending cancellation state | `POST /contract/:id/cancel` |
| 2 | B | Click reject | Cancellation denied, trade resumes normal state on both sides | `POST /contract/:id/rejectCancelation` |
| 3 | A | Verify trade back in normal state (buttons re-enabled) | No "pending cancellation" banner | — |

**Failure modes:**
- A's banner sticks after rejection → state not reset
- Trade buttons remain disabled for A after rejection

---

## Journey 9 — Dispute flow

**Prerequisites:** active trade, ideally past the payment step so dispute is valid
**Counterparty:** yes

| # | Who | Action | Expected UI | Expected state / API |
|---|-----|--------|-------------|----------------------|
| 1 | A | Click "open dispute" button | Confirmation modal titled "open dispute" | — |
| 2 | A | Confirm | `DisputeFlow` renders, "Dispute opened" confirmation shown | `POST /contract/:id/dispute` (verify) |
| 3 | B | Chat panel shows system message about dispute, notification fires (bell badge increments) | System message visible in thread | notification polling picks it up |
| 4 | A & B | Navigate to `/home` | Dispute count on dashboard reflects the new dispute | `GET /v1/user/self` or contracts summary (verify) |
| 5 | Both | Chat continues while dispute is open | PGP messages still flow both ways | — |

**Failure modes:**
- Dispute confirmation modal fires but no system message appears on counterparty chat → backend didn't propagate, or polling gap
- Dispute count on `/home` stays at previous value → stale cache

---

## Journey 10 — Refund — wrong funding amount ⚠️

> **Status:** current implementation is a **pendingAction handoff** to the mobile app. Direct PSBT refund signing in the browser is **not yet built**. This journey verifies the handoff path, not direct signing.

**Prerequisites:** about to create a sell offer; able to send wrong amount from external wallet

| # | Action | Expected UI | Expected state / API |
|---|--------|-------------|----------------------|
| 1 | Create sell offer as in Journey 5 steps 1–4 | Escrow address shown | — |
| 2 | Send the **wrong amount** (e.g. half of expected) to the escrow address | Funding detected, `WrongAmountFundedCard` appears instead of normal funded card | Polling flips into wrong-amount branch |
| 3 | Click "Refund Escrow" button | Refund pendingAction dispatched, status visible in UI | `POST /offer/{offerId}/refundPendingAction` ([trade-execution/index.jsx:1000](src/screens/trade-execution/index.jsx#L1000)) |
| 4 | Open mobile app → complete refund signing on mobile | Web UI advances, escrow marked refunded | — |
| 5 | Verify offer no longer listed on `/market` | Gone | — |

**Note:** this flow does **not** use `MobileSigningModal`. It's a direct pendingAction push, different surface. Do not expect the signing modal to appear.

**Failure modes:**
- `WrongAmountFundedCard` doesn't render when wrong amount sent → backend detection failed or UI branch missing
- "Refund Escrow" click does nothing / no network request → handler disconnected
- Mobile completes refund but web UI never updates → status not polled after pendingAction

---

## Journey 11 — Withdraw own offer — buy & sell

**Prerequisites:** logged in with at least one active buy offer and one active sell offer

| # | Action | Expected UI | Expected state / API |
|---|--------|-------------|----------------------|
| 1 | `/market` → toggle "My Offers" | Only own offers shown | `GET /v069/user/{publicKeyId}/offers` |
| 2 | Click own **buy** offer → withdraw | Completes immediately, offer disappears from the list | `POST /offer/:id/cancel` (v1) |
| 3 | Click own **sell** offer → withdraw | `MobileSigningModal` opens | pendingAction pushed to mobile (sell cancellation requires signature) |
| 4 | Sign on mobile | Modal completes, offer disappears from My Offers | status flipped |

**Failure modes:**
- Buy withdraw hits mobile signing → wrong branch
- Sell withdraw completes without signing → bypassed the required signature

---

## Journey 12 — Edit own offer premium inline

**Prerequisites:** one active offer owned by the user. Optional: second browser profile as a different user to verify cross-visibility.

| # | Action | Expected UI | Expected state / API |
|---|--------|-------------|----------------------|
| 1 | `/market` → My Offers → click own offer | Detail popup with premium field | — |
| 2 | Edit premium inline (e.g. +2% → +3%) → save | New value persists in the card after save | `PATCH /offer/:id` with `{ premium: 3 }` |
| 3 | Refresh page | New premium still displayed | — |
| 4 | *(optional)* From second browser profile as a different user, view the offer in `/market` | Updated premium visible | — |

**Failure modes:**
- Save appears to work but refresh shows old value → local state update without PATCH
- Second profile still sees old premium → caching on the server side, or wrong offer id

---

## Journey 13 — Session expiry mid-trade

**Prerequisites:** logged in, inside an active trade at `/trade/:id`
**How to force expiry:** either wait ~2h, or in DevTools console run `window.dispatchEvent(new Event('peach:session-expired'))`

| # | Action | Expected UI | Expected state / API |
|---|--------|-------------|----------------------|
| 1 | Inside `/trade/:id`, force the expiry event | `SessionExpiredModal` overlays the trade screen | `App.jsx` listener fires, `sessionExpired` state flips |
| 2 | Verify modal copy: title "Session expired", body "Your session token has expired. Please scan the QR code again with your Peach mobile app to continue.", button "Re-authenticate" | Strings match verbatim | [SessionExpiredModal.jsx](src/components/SessionExpiredModal.jsx) |
| 3 | Click "Re-authenticate" | `handleReauth` fires: `window.__PEACH_AUTH__ = null`, `clearCache()`, `localStorage.peach_logged_in = "false"`, `sessionStorage.peach_auth` removed, modal closes, navigates to `#/` | [App.jsx:56-64](src/App.jsx#L56-L64) |
| 4 | QR screen renders fresh | — | — |
| 5 | Scan QR with mobile to re-auth | Lands on `/home` (NOT back in the trade automatically) | fresh auth established |
| 6 | Manually navigate back to the same trade id | Trade state matches where it was before expiry | `GET /contract/:id` |

**Failure modes:**
- Modal copy drift → strings edited away from the verbatim source
- `clearCache()` not called → stale data bleeds into next session
- Re-auth lands on wrong route → `handleReauth` hash not updated
- Returning to the trade shows wrong status → contract data stale

---

## Journey 14 — Notifications end-to-end

**Counterparty:** yes

| # | Who | Action | Expected UI | Expected state / API |
|---|-----|--------|-------------|----------------------|
| 1 | A | Observe initial bell badge count at `/home` | Baseline number shown | — |
| 2 | B | Trigger an event that notifies A: send a chat message, or accept a trade request | — | `POST /contract/:id/chat` or `POST .../accept` |
| 3 | A | Wait for `useNotifications` polling cycle (up to ~30s) | Bell badge increments by 1 | polling returns new notification |
| 4 | A | Click bell icon | `NotificationPanel` opens, new entry shows title + timestamp | — |
| 5 | A | Click the entry | Navigates to the correct screen (trade, dispute, etc.) and marks as read | `POST .../markRead` (verify) |
| 6 | A | Return to bell | Badge decremented; click "Mark all read" | badge → 0 |
| 7 | A | Verify page title updates (favicon/title unread indicator) | Indicator cleared | — |

**Failure modes:**
- Badge never increments → polling dead or notification endpoint misrouted
- Click on entry doesn't navigate → deep link mapping missing
- Mark-all-read doesn't clear badge → state not resynced

---

## Journey 15 — Chat end-to-end

**Counterparty:** yes; same active trade between A and B

| # | Who | Action | Expected UI | Expected state / API |
|---|-----|--------|-------------|----------------------|
| 1 | A | Open chat panel in `/trade/:id` | Empty or previous history renders | `GET /contract/:id/chat` |
| 2 | A | Type and send message | Message appears optimistically, timestamp rendering | `POST /contract/:id/chat` with PGP-encrypted payload |
| 3 | B | Within polling window, sees message (decrypted correctly) | Readable plaintext, not ciphertext | PGP decrypt via shared symmetric key |
| 4 | B | Reply | Message sent | `POST` same endpoint |
| 5 | A | Receives reply, auto-scrolls to latest | New message visible at bottom | — |
| 6 | A | Send 20+ messages total (across both sides), then scroll up | Older messages paginate in | `GET /contract/:id/chat?before=...` (verify) |
| 7 | A | Leave the trade, sidebar shows unread badge if new messages arrive | Badge appears on the Trades sidebar item | — |
| 8 | A | Re-open the trade → badge clears | — | mark-read fires |

**Failure modes:**
- Ciphertext renders → PGP interop broken (see `project_pgp_interop.md`)
- Pagination never loads older messages → cursor not advanced
- Badge persists after re-opening → read state not persisted

---

## Journey 16 — Logout & re-login — no stale data leaks

**Prerequisites:** logged-in session with populated data (trades, PMs, notifications, chat history). A **second** Peach account available for the re-login test.

| # | Action | Expected UI | Expected state / API |
|---|--------|-------------|----------------------|
| 1 | Navigate around populating data: open `/home`, `/trades` (all tabs), a specific trade at `/trade/:id`, `/payment-methods`, bell panel | All data loaded | — |
| 2 | Click avatar menu → "Log out" | Redirects to `/` QR screen | `handleLogout` fires |
| 3 | **Verify teardown in DevTools console:** | | — |
| 3a | `window.__PEACH_AUTH__` | `=== null` | [useAuth.js:20](src/hooks/useAuth.js#L20) |
| 3b | `localStorage.getItem('peach_logged_in')` | `=== "false"` | [useAuth.js:23](src/hooks/useAuth.js#L23) |
| 3c | `sessionStorage.getItem('peach_auth')` | `=== null` | [useAuth.js:24](src/hooks/useAuth.js#L24) |
| 3d | React Query cache | Cleared (`clearCache()` in [App.jsx:58](src/App.jsx#L58)) — note: logout path may rely on natural unmount rather than explicit clear; verify in practice |
| 4 | Watch topbar during the logout transition | **No flash** of previous PeachID, avatar, or BTC balance before redirect | — |
| 5 | On the QR screen, open DevTools React panel | No residual state holding previous user's trades, PMs, or chat messages | — |
| 6 | Inspect `sessionStorage` and `localStorage` for any keys related to the previous user (dashboard→trade-execution bridge, any trade/contract cache keys) | No leftover entries | — |
| 7 | Log in as **a different Peach account** (second QR) | Lands on `/home` for new user | new `window.__PEACH_AUTH__` |
| 8 | Verify none of user A's data is visible anywhere: `/home`, `/trades` all tabs, `/payment-methods`, bell panel, topbar PeachID | All data belongs to user B only | — |

**Failure modes:**
- Step 3d React Query cache still hot → next login sees previous data for a moment
- Step 4 topbar flashes old PeachID → render happens before auth state clears
- Step 6 lingering sessionStorage bridge keys → dashboard→trade-execution navigation bridge doesn't clean up after itself
- Step 8 ANY data from user A visible → hard leak, fix immediately

---

## Journey 17 — Referrals screen ⚠️

> **Status:** UI shell only. No API is wired — this journey only verifies the shell renders and input state behaves locally. Do not expect persistence.

**Prerequisites:** logged in

| # | Action | Expected UI | Expected state / API |
|---|--------|-------------|----------------------|
| 1 | Navigate to `/settings` | Settings landing with icon grid | — |
| 2 | Click "Referrals" icon | `ReferralsSubScreen` renders ([settings/screens.jsx:139](src/screens/settings/screens.jsx#L139)) | — |
| 3 | Verify "Peach referral points" display renders | Points value shown (placeholder/zero) | — |
| 4 | Verify "your referral code" input renders | Input field visible | — |
| 5 | Verify custom code cost UI renders | Cost section visible | — |
| 6 | Type a custom code in the input | Local state updates, but **no API call** fires in Network tab | confirmed UI-only |
| 7 | Navigate away and back | Input empties (expected — no persistence) | — |

**Failure modes (for when the API lands):**
- Points display stays zero after claiming a referral → backend not wired yet (currently expected)
- Input types don't persist → currently expected, remove this line once API is wired

---

## Cross-cutting checks

Run these regardless of which journey you're on:

- **Bitcoin format:** every amount uses the Peach ₿ format (grey zeros + bold sats + space-separated thousands + comma decimal). See CLAUDE.md "Peach standard Bitcoin format".
- **No mock data:** no "Peach08476D23" or similar placeholder IDs anywhere.
- **Dark mode:** toggle on and walk the journey once in dark mode.
- **Mobile responsive:** resize to ~375px wide, verify the journey still walks without layout breakage.
- **CORS / proxy:** in dev, check the Network tab for `/api/...` calls (Vite proxy). In production GitHub Pages, confirm calls hit the Cloudflare Worker URL.

---

## Maintenance notes

- **When the API contract changes:** update the "Expected state / API" column before merging the backend change, so this file stays accurate.
- **When a new screen ships:** add new journeys here, not just to the per-screen checklist. A new screen almost always joins existing flows — capture the chain.
- **When a string changes in the code:** search this file for the old string and update it verbatim. Do not paraphrase.
- **When refund gets direct PSBT signing (currently pendingAction):** rewrite Journey 10 to use `MobileSigningModal` and drop the warning.
- **When referrals gets API wiring:** promote Journey 17 to a real journey and remove the ⚠️.
