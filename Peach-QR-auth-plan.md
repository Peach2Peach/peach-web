# Plan: Integrate Real QR Authentication from Backend POC

## Context

The backend dev has provided a working proof of concept for QR-based web-to-mobile authentication at `/home/steadyprodos/Documents/PROJECTS/PEACH/ONE SHOT/Auth&sign/peach-desktop-auth-poc-main`. Currently, the web app uses a **dev-only flow** where users paste JSON from `/nuxDesktopAuth`. This plan integrates the real QR handshake so any regtest user can authenticate by scanning with the Peach mobile app.

## What the POC proves works

1. Generate ephemeral PGP keypair → POST public key to `/v069/desktop/desktopConnection`
2. Decrypt connection ID + verify server signature
3. Display QR with `{ desktopConnectionId, ephemeralPgpPublicKey (base64), peachDesktopConnectionVersion: 1 }`
4. Poll every 2s → mobile scans → sends encrypted `{ validationPassword, pgpPrivateKey, xpub }`
5. Decrypt → POST password to `.../validate` → get JWT `accessToken`
6. Fetch profile with token → auth complete

**Result**: `window.__PEACH_AUTH__` gets `{ token, pgpPrivKey, xpub, peachId, baseUrl, profile }`

---

## UI Decisions (confirmed)

1. **Layout**: Desktop shows QR code. Mobile shows "Open Peach app → Settings → Desktop Connection" instructions (can't scan your own phone's screen).
2. **Expiry**: Auto-refresh — when QR expires after 3 min, automatically generate a new one and reset timer. No user action needed.
3. **"Can't scan?" fallback**: Show the `desktopConnectionId` as a copyable text code (for manual entry on mobile if supported).
4. **PGP key verification**: Yes — sign a test message with received private key, verify against user's server-side public key. Extra security step.

---

## Implementation Steps

### Step 1: Install `qrcode.react`

Only new dependency needed. We do NOT need `bitcoinjs-lib`/`bip32` — the POC's address derivation is a verification step we can skip. We store the xpub as-is.

### Step 2: Add 2 PGP functions to `src/utils/pgp.js`

- **`generateEphemeralKeyPair()`** — `openpgp.generateKey({ type: "ecc", curve: "ed25519Legacy", userIDs: [{ name: "ephemeral" }] })`. Returns `{ publicKeyArmored, privateKeyArmored }`.
- **`verifyDetachedSignature(data, signatureArmored, publicKeyArmored)`** — reads signature + key, calls `openpgp.verify()`. Returns true/false.

~25 lines total. Both functions are new — nothing in pgp.js currently does this.

### Step 3: Create `src/hooks/useQRAuth.js` (~120–150 lines)

New hook that encapsulates the full auth state machine.

**Interface:**
```js
const { phase, qrPayload, secsLeft, error, profile, restart } = useQRAuth({ baseUrl });
```

**Phases:** `init` → `ready` (QR visible, polling) → `decrypting` → `validating` → `verifying` → `success` | `error` | `expired`

**URL construction** (pre-auth, no `auth.baseUrl` yet):
- Local dev: `baseUrl = "/api-regtest"` → Vite proxy handles forwarding
- v1 calls: `${baseUrl}/v1/info`, `${baseUrl}/v1/user/me`
- v069 calls: `${baseUrl}/v069/desktop/desktopConnection`

**On success**, the hook sets:
```js
window.__PEACH_AUTH__ = {
  token: accessToken,
  pgpPrivKey: pgpPrivateKey,  // armored, from mobile
  xpub: xpub,                 // from mobile
  peachId: profile.id || profile.publicKey,
  baseUrl: baseUrl + "/v1",
  profile
};
```

**PGP key verification** (after getting token + profile):
- Sign test message with received `pgpPrivateKey`
- Read user's `pgpPublicKey` from profile (via `GET /v1/user/me`)
- Verify signature matches → confirms the private key is genuine
- If verification fails → set phase to `"error"` with "Key verification failed"

**Auto-refresh on expiry**: When `secsLeft` hits 0, automatically call `restart()` (new keypair, new connection, new QR). No user action needed.

**Cleanup:** AbortController for fetches, clear intervals on unmount/restart.

### Step 4: Modify `src/screens/peach-auth.jsx`

**Desktop layout (primary):**
- Replace `MockQR` → real `<QRCodeSVG>` from qrcode.react (using `qrPayload` from hook)
- Replace local countdown → `secsLeft` from hook, rewire `CountdownRing`
- Remove demo click handlers (`handleQRClick`, `handleDesktopCodeSubmit`, mock paste flows)
- Phase-to-UI mapping: `init/ready` → QR + countdown; `decrypting/validating/verifying` → "Connecting..." spinner; `success` → checkmark + navigate to `/home`; `error` → message + retry button
- Auto-refresh on expiry (hook handles it — no "expired" UI needed)
- **"Can't scan?" section**: Replace `MOCK_AUTH_CODE` with actual `desktopConnectionId` as copyable text

**Mobile layout:**
- Replace QR tab content with instructions: "Open Peach app → Settings → Desktop Connection" (since you can't scan your own phone)
- Keep the general structure/tabs

**Keep unchanged:**
- Dev auth section (collapsible, below main QR flow — useful for testing)
- `CountdownRing` component (rewired to hook's `secsLeft`)
- All CSS/styling, design tokens
- Price display, ghost rows, overall page layout

### Step 5: Verify proxy works for v069

Current `vite.config.js` proxy: `/api-regtest` → `https://api-regtest.peachbitcoin.com` (strips prefix).
So `/api-regtest/v069/desktop/desktopConnection` → `https://api-regtest.peachbitcoin.com/v069/desktop/desktopConnection`. This should work — no proxy changes needed.

---

## Files changed

| File | Action | What |
|------|--------|------|
| `package.json` | Modify | Add `qrcode.react` |
| `src/utils/pgp.js` | Modify | Add `generateEphemeralKeyPair()` + `verifyDetachedSignature()` |
| `src/hooks/useQRAuth.js` | **New** | QR auth state machine hook (~120–150 lines) |
| `src/screens/peach-auth.jsx` | Modify | Wire real QR, remove mock handlers, keep dev auth |

**Not changing:** `useAuth.js`, `useApi.js`, `vite.config.js`, any other screens.

---

## Potential issues

1. **QR payload size** — base64-encoded PGP public key makes ~800–1000 char payload. `QRCodeSVG` with `level="M"` handles this but the code will be dense. Can drop to `level="L"` if scanning is difficult.
2. **ed25519Legacy** — POC uses this curve. openpgp v6.3.0 supports it. Should work.
3. **Production CORS** — Cloudflare Worker may need to support the v069 desktop connection endpoints. Not blocking for regtest testing (Vite proxy handles it).

## Verification

1. `npm run dev` — builds without errors
2. Navigate to auth screen on desktop → real QR code appears (not the static mock)
3. Countdown timer runs from 180s, auto-refreshes QR on expiry
4. Navigate to auth screen on mobile viewport → shows instructions (not QR)
5. "Can't scan?" shows the connection ID as copyable text
6. Scan QR with Peach mobile app on regtest → auth succeeds → redirects to `/home`
7. All screens work with the new auth (token, pgpPrivKey, xpub, profile all populated)
8. Dev auth paste flow still works as before
9. Network error during init → shows error message → retry works
10. PGP key verification passes (check console for "PGP key verified" log)
