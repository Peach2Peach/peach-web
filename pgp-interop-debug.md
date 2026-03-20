# PGP Interop Debug — openpgp.js v6.3.0 (web) ↔ GopenPGP v0.38.2 (mobile)

**Problem:** When the web app encrypts and signs PM data during a trade, the mobile counterparty cannot decrypt it. Error on mobile: "could not decrypt payment data, ask for details in the chat if needed".

**Date:** 2026-03-20

---

## Libraries

| Side | Library | Version |
|------|---------|---------|
| Web | openpgp.js | 6.3.0 |
| Mobile | react-native-fast-openpgp (GopenPGP) | 2.9.3 (GopenPGP v0.38.2) |

---

## Trade PM encryption flow

### How PM data gets encrypted during a trade

**Web as seller accepting v069 trade request:**
1. Mobile (buyer) sends trade request with `symmetricKeyEncrypted` (symmetric key encrypted to seller's PGP public key)
2. Web (seller) decrypts symmetric key: `decryptPGPMessage(symmetricKeyEncrypted, privKey)`
3. Web encrypts seller's PM data: `encryptSymmetric(pmJson, symmetricKey)` → `paymentDataEncrypted`
4. Web signs PM data: `signPGPMessage(pmJson, privKey)` → `paymentDataSignature`
5. Web sends `{ paymentDataEncrypted, paymentDataSignature }` to accept endpoint

**Web initiating a match (v1 path):**
1. Web generates symmetric key: `generateSymmetricKey()` (32 random bytes → hex string)
2. Web encrypts symmetric key for both parties: `encryptForRecipients(symmetricKey, counterpartyKeys, privKey)` → `symmetricKeyEncrypted` + `symmetricKeySignature`
3. Web encrypts buyer's PM data: `encryptSymmetric(pmJson, symmetricKey)` → `paymentDataEncrypted`
4. Web signs PM data: `signPGPMessage(pmJson, privKey)` → `paymentDataSignature`
5. Web sends all four fields to match endpoint

### How mobile decrypts (from `useDecryptedContractData.tsx`)

1. **Decrypt symmetric key:** `OpenPGP.decrypt(symmetricKeyEncrypted, privateKey, "")` — asymmetric
2. **Verify symmetric key signature:** `OpenPGP.verify(symmetricKeySignature, symmetricKey, publicKey)` — if fails → returns null → everything fails
3. **Decrypt PM data:** `OpenPGP.decryptSymmetric(paymentDataEncrypted, symmetricKey, { cipher: 2 })` — AES-256
4. **Verify PM data signature:** `OpenPGP.verify(paymentDataSignature, decryptedPM, publicKey)` — if fails → throws

If step 2 fails, symmetric key is discarded as null, step 3 fails with null passphrase, and mobile shows the error.

---

## Issues found and fixed

### 1. Signature format — FIXED
- **Problem:** `openpgp.sign({ message: createMessage(...) })` produces `-----BEGIN PGP MESSAGE-----` (inline signed message). GopenPGP's `verify()` expects `-----BEGIN PGP SIGNED MESSAGE-----` (cleartext signed).
- **Fix:** Changed `signPGPMessage()` and `encryptForRecipients()` to use `createCleartextMessage()` instead of `createMessage()`.
- **File:** `src/utils/pgp.js`

### 2. Salt notation — FIXED
- **Problem:** openpgp.js v6 has `nonDeterministicSignaturesViaNotation: true` by default, adding a `salt@notations.openpgpjs.org` subpacket to every signature. GopenPGP v0.38.2 may not handle this.
- **Fix:** Added `nonDeterministicSignaturesViaNotation: false` to `GOPENPGP_COMPAT` config applied to all operations.
- **File:** `src/utils/pgp.js`

### 3. Hash algorithm — FIXED
- **Problem:** openpgp.js v6 defaults to SHA-512 (`preferredHashAlgorithm: 10`). GopenPGP defaults to SHA-256. Cleartext signatures with SHA-512 caused a crash on mobile.
- **Fix:** Added `preferredHashAlgorithm: openpgp.enums.hash.sha256` to `GOPENPGP_COMPAT` config. Note: this may be overridden by the key's own hash preference depending on which key is used.
- **File:** `src/utils/pgp.js`

### 4. Embedded signing — FIXED
- **Problem:** `encryptPGPMessage()` and `encryptForRecipients()` passed `signingKeys` to `openpgp.encrypt()`, embedding the signature inside the encrypted message. GopenPGP may have issues with signed+encrypted compound messages.
- **Fix:** Removed `signingKeys` from all encrypt calls. Signatures are created separately.
- **File:** `src/utils/pgp.js`

### 5. Web decryption fallback — FIXED (separate issue)
- **Problem:** Web's trade execution only tried `decryptSymmetric()` for PM data. Mobile sometimes encrypts PM data asymmetrically. Error: "No symmetrically encrypted session key packet found."
- **Fix:** Added asymmetric fallback (`decryptPGPMessage`) after symmetric attempt in `trade-execution/index.jsx`.
- **File:** `src/screens/trade-execution/index.jsx`

---

## Current status: STILL FAILING (web → mobile direction)

After all fixes above, the mobile still shows "failed to decrypt buyer/seller payment data" on new trades. The web side now works (can decrypt mobile-encrypted PM data).

### What we know
- The SKESK packet from `encryptSymmetric` is standard: v4, AES-256, iterated S2K with SHA-256, wrapped session key (33 bytes)
- SEIPD v1 (no AEAD) — `aeadProtect: false`
- `GOPENPGP_COMPAT` config applied to all encrypt/sign operations
- Round-trip test on web (encrypt then decrypt) has not been verified yet — **debug logging added, needs testing**

### What to check next
1. **Run the round-trip test** — the web accept flow now logs `[Trades] Round-trip decrypt OK:` and the decrypted symmetric key length. Create a new trade and check browser console.
2. **If round-trip passes** — the encryption is valid and the problem is GopenPGP-specific. Possible causes:
   - GopenPGP v0.38.2 has a specific S2K or session key handling bug with openpgp.js v6 output
   - The `{ cipher: 2 }` option in GopenPGP's `decryptSymmetric` overrides the packet's algo byte
   - Need to test if signing is still causing issues (try sending without signature as a test)
3. **If round-trip fails** — we broke something in `encryptSymmetric` with the config changes
4. **Signature verification** — even if decryption works, GopenPGP's `verify()` could fail on the cleartext signature. The mobile code throws if signature verification fails. Try creating a trade without `paymentDataSignature` to isolate.
5. **Check counterparty keys** — for the v1 match path, verify `match._raw?.pgpPublicKeys` is populated (debug log added at line ~1332 of trades-dashboard/index.jsx)

### Debug logging currently in place
- `trades-dashboard/index.jsx` line ~1289: Round-trip decrypt test + symmetric key info
- `trades-dashboard/index.jsx` line ~1332: counterpartyKeys count (v1 match path only)

### Mobile debugging setup
- GrapheneOS phone connected via USB
- udev rules installed at `/etc/udev/rules.d/51-android.rules`
- Filter command: `adb logcat *:S ReactNativeJS:V | grep -v "Firebase\|rnfirebase\|deprecated"`

---

## Key files

| File | Role |
|------|------|
| `src/utils/pgp.js` | All PGP encrypt/decrypt/sign functions. `GOPENPGP_COMPAT` config defined here. |
| `src/screens/trades-dashboard/index.jsx` | Trade acceptance flow (v069 + v1 paths). Encrypts PM data + symmetric key. |
| `src/screens/trade-execution/index.jsx` | Trade view. Decrypts PM data from contract. |
| `src/screens/trades-dashboard/MatchesPopup.jsx` | Match detail + chat. Uses symmetric encryption for chat messages. |

## Mobile source reference

| File | Role |
|------|------|
| `peach-app/src/utils/pgp/signAndEncrypt.ts` | Mobile's asymmetric encrypt (no embedded signing) |
| `peach-app/src/utils/pgp/signAndEncryptSymmetric.ts` | Mobile's symmetric encrypt: `OpenPGP.encryptSymmetric(msg, pass, undefined, { cipher: 2 })` |
| `peach-app/src/utils/pgp/decryptSymmetric.ts` | Mobile's symmetric decrypt: `OpenPGP.decryptSymmetric(enc, pass, { cipher: 2 })` |
| `peach-app/src/utils/pgp/decrypt.ts` | Mobile's asymmetric decrypt: `OpenPGP.decrypt(enc, privKey, "")` |
| `peach-app/src/views/contractChat/useDecryptedContractData.tsx` | Mobile's full PM decryption flow with fallbacks |
| `peach-app/src/views/contract/helpers/decryptSymmetricKey.ts` | Mobile's symmetric key decryption + signature verification |
| `peach-app/src/views/contract/helpers/hasValidSignature.ts` | Mobile's signature verification via `OpenPGP.verify()` |
