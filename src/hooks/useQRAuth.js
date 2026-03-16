/**
 * useQRAuth — QR-based authentication state machine.
 *
 * Implements the full desktop↔mobile auth handshake:
 *   1. Generate ephemeral PGP keypair
 *   2. Create desktop connection on server
 *   3. Display QR code for mobile to scan
 *   4. Poll for mobile's encrypted response
 *   5. Decrypt credentials, validate, fetch profile
 *   6. Set window.__PEACH_AUTH__ and signal success
 *
 * Usage:
 *   const { phase, qrPayload, connectionId, secsLeft, error, profile, restart } = useQRAuth({ baseUrl });
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  generateEphemeralKeyPair,
  verifyDetachedSignature,
  decryptPGPMessage,
  signPGPMessage,
} from "../utils/pgp.js";
import * as openpgp from "openpgp";

const POLL_INTERVAL = 2000;
const TOTAL_SECONDS = 180;

export function useQRAuth({ baseUrl }) {
  const [phase, setPhase] = useState("init"); // init|ready|decrypting|validating|verifying|success|error
  const [qrPayload, setQrPayload] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [secsLeft, setSecsLeft] = useState(TOTAL_SECONDS);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  const ephemeralPrivKeyRef = useRef(null);
  const connectionIdRef = useRef(null);
  const pollRef = useRef(null);
  const countdownRef = useRef(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  // ── Cleanup helpers ──────────────────────────────────────────────────────
  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }

  function abortFetches() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  }

  // ── Core init flow ───────────────────────────────────────────────────────
  const init = useCallback(async () => {
    stopPolling();
    abortFetches();

    const ac = new AbortController();
    abortRef.current = ac;

    setPhase("init");
    setQrPayload(null);
    setConnectionId(null);
    setError(null);
    setProfile(null);
    setSecsLeft(TOTAL_SECONDS);

    try {
      // 1. Generate ephemeral keypair
      const { publicKeyArmored, privateKeyArmored } = await generateEphemeralKeyPair();
      ephemeralPrivKeyRef.current = privateKeyArmored;

      if (ac.signal.aborted) return;

      // 2. Fetch server PGP public key
      const infoRes = await fetch(`${baseUrl}/v1/info`, { signal: ac.signal });
      if (!infoRes.ok) throw new Error(`Server info failed (${infoRes.status})`);
      const info = await infoRes.json();
      const serverPubKey = info?.peach?.pgpPublicKey;
      if (!serverPubKey) throw new Error("Server PGP public key not found in /v1/info");

      if (ac.signal.aborted) return;

      // 3. Create desktop connection
      const connRes = await fetch(`${baseUrl}/v069/desktop/desktopConnection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgpPublicKey: publicKeyArmored }),
        signal: ac.signal,
      });
      if (!connRes.ok) throw new Error(`Create connection failed (${connRes.status})`);
      const connData = await connRes.json();

      if (ac.signal.aborted) return;

      // 4. Decrypt connection ID
      const privKeyObj = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
      const encMsg = await openpgp.readMessage({ armoredMessage: connData.encryptedDesktopConnectionId });
      const { data: decryptedId } = await openpgp.decrypt({ message: encMsg, decryptionKeys: privKeyObj });

      // 5. Verify server signature
      const sigValid = await verifyDetachedSignature(
        decryptedId,
        connData.signatureDesktopConnectionId,
        serverPubKey
      );
      if (!sigValid) throw new Error("Server signature verification failed");

      if (ac.signal.aborted) return;

      // 6. Build QR payload
      const payload = JSON.stringify({
        desktopConnectionId: decryptedId,
        ephemeralPgpPublicKey: btoa(unescape(encodeURIComponent(publicKeyArmored))),
        peachDesktopConnectionVersion: 1,
      });

      connectionIdRef.current = decryptedId;
      if (!mountedRef.current) return;

      setConnectionId(decryptedId);
      setQrPayload(payload);
      setPhase("ready");

      // 7. Start polling + countdown
      startPolling(decryptedId, privateKeyArmored, ac);
      startCountdown();

    } catch (err) {
      if (ac.signal.aborted) return;
      console.error("[useQRAuth] init error:", err);
      if (mountedRef.current) {
        setError(err.message || "Failed to initialize QR authentication");
        setPhase("error");
      }
    }
  }, [baseUrl]);

  // ── Polling ──────────────────────────────────────────────────────────────
  function startPolling(connId, privKeyArmored, ac) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${baseUrl}/v069/desktop/desktopConnection/${connId}/`,
          { signal: ac.signal }
        );

        if (res.status === 401) return; // not ready yet — mobile hasn't responded

        if (!res.ok) return; // transient error, keep polling

        const data = await res.json();
        if (!data?.desktopConnectionEncryptedData) return; // not ready yet

        // Mobile has responded — stop polling
        stopPolling();
        if (!mountedRef.current) return;

        setPhase("decrypting");

        // Decrypt mobile's response
        const privKeyObj = await openpgp.readPrivateKey({ armoredKey: privKeyArmored });
        const encMsg = await openpgp.readMessage({ armoredMessage: data.desktopConnectionEncryptedData });
        const { data: decrypted } = await openpgp.decrypt({ message: encMsg, decryptionKeys: privKeyObj });

        const parsed = JSON.parse(decrypted);
        const { validationPassword, pgpPrivateKey, xpub } = parsed;

        if (!mountedRef.current) return;
        setPhase("validating");

        // Validate with server
        const valRes = await fetch(
          `${baseUrl}/v069/desktop/desktopConnection/${connId}/validate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: validationPassword }),
            signal: ac.signal,
          }
        );
        if (!valRes.ok) throw new Error(`Validation failed (${valRes.status})`);
        const { accessToken } = await valRes.json();

        if (!mountedRef.current) return;
        setPhase("verifying");

        // Fetch user profile
        const userRes = await fetch(`${baseUrl}/v1/user/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: ac.signal,
        });
        if (!userRes.ok) throw new Error(`User fetch failed (${userRes.status})`);
        const userProfile = await userRes.json();

        // Verify PGP key: sign test message with received key, verify against server pubkey
        try {
          const receivedPrivKeyObj = await openpgp.readPrivateKey({ armoredKey: pgpPrivateKey });
          const testSig = await openpgp.sign({
            message: await openpgp.createMessage({ text: "peach-auth-verify" }),
            signingKeys: receivedPrivKeyObj,
          });
          const serverPubKeyObj = await openpgp.readKey({ armoredKey: userProfile.pgpPublicKey });
          const verResult = await openpgp.verify({
            message: await openpgp.readMessage({ armoredMessage: testSig }),
            verificationKeys: [serverPubKeyObj],
          });
          const valid = await verResult.signatures[0].verified;
          if (!valid) throw new Error("PGP key mismatch");
          console.log("[useQRAuth] PGP key verified successfully");
        } catch (pgpErr) {
          console.warn("[useQRAuth] PGP key verification failed:", pgpErr.message);
          throw new Error("PGP key verification failed — the key from mobile doesn't match the server record");
        }

        if (!mountedRef.current) return;

        // Set global auth
        window.__PEACH_AUTH__ = {
          token: accessToken,
          pgpPrivKey: pgpPrivateKey,
          xpub: xpub || null,
          peachId: userProfile.id || userProfile.publicKey || null,
          baseUrl: baseUrl + "/v1",
          profile: userProfile,
        };

        try { localStorage.setItem("peach_logged_in", "true"); } catch {}

        setProfile(userProfile);
        setPhase("success");

      } catch (err) {
        if (ac.signal.aborted) return;
        console.error("[useQRAuth] polling/auth error:", err);
        stopPolling();
        if (mountedRef.current) {
          setError(err.message || "Authentication failed");
          setPhase("error");
        }
      }
    }, POLL_INTERVAL);
  }

  // ── Countdown ────────────────────────────────────────────────────────────
  function startCountdown() {
    countdownRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) {
          // Auto-refresh on expiry
          stopPolling();
          if (mountedRef.current) init();
          return TOTAL_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    init();
    return () => {
      mountedRef.current = false;
      stopPolling();
      abortFetches();
    };
  }, [init]);

  return { phase, qrPayload, connectionId, secsLeft, error, profile, restart: init };
}
