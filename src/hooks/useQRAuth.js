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
const TOTAL_SECONDS = 30;
const STORAGE_KEY = "peach_qr_active_session"; // single entry: latest in-flight session
const STORAGE_TTL_MS = 10 * 60 * 1000; // 10 minutes — older entries are treated as stale

function readActiveSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.sessionId || !v?.privateKey || !v?.ts) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - v.ts > STORAGE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      dbg("active session expired, cleared", { age: Date.now() - v.ts });
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

function writeActiveSession(sessionId, privateKey) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId, privateKey, ts: Date.now() }),
    );
    dbg("wrote active session", { sessionId });
  } catch (e) {
    dbg("writeActiveSession failed", e?.message || String(e));
  }
}

function clearActiveSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    dbg("cleared active session");
  } catch {}
}

function dbg(msg, data) {
  // eslint-disable-next-line no-console
  console.log("[useQRAuth]", msg, data ?? "");
}

export function useQRAuth({ baseUrl, auto = true }) {
  const [phase, setPhase] = useState("init"); // init|ready|decrypting|validating|verifying|success|error
  const [qrPayload, setQrPayload] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [secsLeft, setSecsLeft] = useState(TOTAL_SECONDS);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  const ephemeralPrivKeyRef = useRef(null);
  const connectionIdRef = useRef(null);
  const pollRef = useRef(null);
  const pollFnRef = useRef(null); // current poll-once fn so we can fire it on focus
  const countdownRef = useRef(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  // ── Cleanup helpers ──────────────────────────────────────────────────────
  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    pollFnRef.current = null;
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

      // Persist the active session so a future page load can query the server
      // and either resume (if the app already authorized) or discard it.
      writeActiveSession(decryptedId, privateKeyArmored);

      // 7. Start polling + countdown
      startPolling(decryptedId, privateKeyArmored, ac);
      startCountdown();

      return { payload, connectionId: decryptedId };
    } catch (err) {
      if (ac.signal.aborted) return null;
      console.error("[useQRAuth] init error:", err);
      if (mountedRef.current) {
        setError(err.message || "Failed to initialize QR authentication");
        setPhase("error");
      }
      return null;
    }
  }, [baseUrl]);

  // ── Polling ──────────────────────────────────────────────────────────────
  // pollOnce returns one of: "completed" | "not_ready" | "error" | "aborted"
  // (callers in setInterval ignore the return; tryResume uses it to decide
  // whether to wipe localStorage and start over.)
  function makePollOnce(connId, privKeyArmored, ac) {
    return async () => {
      try {
        const res = await fetch(
          `${baseUrl}/v069/desktop/desktopConnection/${connId}/`,
          { signal: ac.signal }
        );

        if (res.status === 401) return "not_ready"; // mobile hasn't responded yet

        if (!res.ok) return "not_ready"; // transient — caller decides what to do

        const data = await res.json();
        if (!data?.desktopConnectionEncryptedData) return "not_ready";

        // Mobile has responded — stop polling
        stopPolling();
        if (!mountedRef.current) return "aborted";

        setPhase("decrypting");

        // Decrypt mobile's response
        const privKeyObj = await openpgp.readPrivateKey({ armoredKey: privKeyArmored });
        const encMsg = await openpgp.readMessage({ armoredMessage: data.desktopConnectionEncryptedData });
        const { data: decrypted } = await openpgp.decrypt({ message: encMsg, decryptionKeys: privKeyObj });

        const parsed = JSON.parse(decrypted);
        const { validationPassword, pgpPrivateKey, xpub, multisigXpub } = parsed;

        if (!mountedRef.current) return "aborted";
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

        if (!mountedRef.current) return "aborted";
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

        if (!mountedRef.current) return "aborted";

        // Set global auth
        window.__PEACH_AUTH__ = {
          token: accessToken,
          pgpPrivKey: pgpPrivateKey,
          xpub: xpub || null,
          multisigXpub: multisigXpub || null,
          peachId: userProfile.id || userProfile.publicKey || null,
          baseUrl: baseUrl + "/v1",
          profile: userProfile,
          loginTime: Date.now(),
        };

        try { localStorage.setItem("peach_logged_in", "true"); } catch {}
        try { sessionStorage.setItem("peach_auth", JSON.stringify(window.__PEACH_AUTH__)); } catch {}

        // Active session has been consumed — don't try to resume on next page load.
        clearActiveSession();

        setProfile(userProfile);
        setPhase("success");
        return "completed";

      } catch (err) {
        if (ac.signal.aborted) return "aborted";
        console.error("[useQRAuth] polling/auth error:", err);
        stopPolling();
        if (mountedRef.current) {
          setError(err.message || "Authentication failed");
          setPhase("error");
        }
        return "error";
      }
    };
  }

  function startPolling(connId, privKeyArmored, ac) {
    const pollOnce = makePollOnce(connId, privKeyArmored, ac);
    pollFnRef.current = pollOnce;
    pollRef.current = setInterval(pollOnce, POLL_INTERVAL);
    pollOnce(); // also poll once immediately so we don't wait POLL_INTERVAL for the first tick
  }

  // One-shot resume: rehydrate state from storage, query server once, decide.
  // Returns the same status as pollOnce ("completed" | "not_ready" | "error" | "aborted").
  async function tryResume(stored) {
    const ac = new AbortController();
    abortRef.current = ac;
    ephemeralPrivKeyRef.current = stored.privateKey;
    connectionIdRef.current = stored.sessionId;
    setConnectionId(stored.sessionId);
    setPhase("ready");
    dbg("tryResume: querying session", { sessionId: stored.sessionId });
    const pollOnce = makePollOnce(stored.sessionId, stored.privateKey, ac);
    const status = await pollOnce();
    dbg("tryResume: result", { status });
    return status;
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
    dbg("mount", { auto, href: location.href });

    let cancelled = false;

    (async () => {
      const stored = readActiveSession();
      dbg(
        "active session in storage",
        stored
          ? { sessionId: stored.sessionId, ageMs: Date.now() - stored.ts }
          : null,
      );

      if (stored) {
        // Single server query: did the app already authorize this session?
        const status = await tryResume(stored);
        if (cancelled) return;

        if (status === "completed") {
          // tryResume already advanced phase through to "success"
          return;
        }

        // App hasn't authorized yet (or error / expired) — wipe storage and
        // either auto-init (desktop) or sit idle (phone) per `auto`.
        dbg("resume did not complete — wiping storage", { status });
        clearActiveSession();
        ephemeralPrivKeyRef.current = null;
        connectionIdRef.current = null;
        if (mountedRef.current) {
          setConnectionId(null);
          setPhase("init");
        }
      }

      if (cancelled) return;
      if (auto) {
        dbg("auto-initializing fresh session");
        init();
      } else {
        dbg("idle — waiting for user to tap deep-link button");
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      stopPolling();
      abortFetches();
    };
  }, [init, auto]);

  // Force an immediate poll whenever the page becomes visible / focused again.
  // Mobile Safari throttles / suspends background timers and may also collapse
  // an inbound URL into "just bring the existing tab forward" without actually
  // navigating. Either way, the moment the user is back on the tab we want to
  // poll again so the auth completes regardless of whether the URL roundtrip worked.
  useEffect(() => {
    function onResume(reason) {
      dbg("page resumed", { reason, hidden: document.hidden });
      if (document.hidden) return;
      if (pollFnRef.current) {
        dbg("forcing immediate poll after resume");
        pollFnRef.current();
      } else {
        dbg("resume: no active poll fn (not currently polling a session)");
      }
    }
    const onVis = () => onResume("visibilitychange");
    const onShow = () => onResume("pageshow");
    const onFocus = () => onResume("focus");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return { phase, qrPayload, connectionId, secsLeft, error, profile, restart: init };
}
