/**
 * sessionGuard — global session-expiry detection.
 *
 * Provides a fetch() wrapper that detects HTTP 401 and verifies whether
 * the session is truly expired before dispatching the event.
 *
 * Two-step verification on 401:
 *   1. Fast path — decode the JWT and check its `exp` claim (client-side, instant).
 *   2. Slow path — if JWT looks valid, probe the server with a lightweight
 *      authenticated request to confirm the session is dead (handles server-side
 *      token revocation). Only dispatches if the probe also fails.
 *
 * App.jsx listens for the 'peach:session-expired' event and shows the
 * SessionExpiredModal.
 */

let _fired = false;
let _probePromise = null;

// ── In-flight GET de-duplication ─────────────────────────────────────
// Collapse concurrent identical GET requests into a single network call.
// React.StrictMode (dev) double-invokes mount effects, and fast remounts /
// two components reading the same endpoint can fire overlapping fetches; all
// of those resolve from one request instead of N. In-flight only — once a
// request resolves its entry is dropped, so a later navigation still refetches
// (no stale caching). Mutations (POST/PATCH/PUT/DELETE) are never de-duped.
const _inflightGets = new Map(); // key -> Promise<Response>

function _isIdempotent(options) {
  const method = (options?.method ?? 'GET').toUpperCase();
  return method === 'GET' || method === 'HEAD';
}

function _dedupKey(url, options) {
  const method = (options?.method ?? 'GET').toUpperCase();
  const auth = options?.headers?.Authorization ?? '';
  return `${method} ${url} ${auth}`;
}

// ── JWT helpers ──────────────────────────────────────────────────────

/** Decode JWT payload without verification (we only need `exp`). */
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

/** True if the token's `exp` claim is in the past (with grace window). */
export function isTokenExpired(token, graceSeconds = 30) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return (Date.now() / 1000) >= (payload.exp - graceSeconds);
}

// ── Server probe ─────────────────────────────────────────────────────

/**
 * Probe the server to confirm the session is truly expired.
 * Uses native fetch() (not the guarded wrapper) to avoid recursion.
 * Concurrent calls are coalesced into a single request.
 * Returns true if session is expired, false if still valid.
 */
async function probeSessionExpired() {
  if (_probePromise) return _probePromise;

  _probePromise = (async () => {
    try {
      const auth = window.__PEACH_AUTH__;
      if (!auth?.token || !auth?.baseUrl) return true;
      const res = await fetch(`${auth.baseUrl}/user/tradingLimit`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      return res.status === 401;
    } catch {
      return false; // network error — don't lock the user out
    } finally {
      _probePromise = null;
    }
  })();

  return _probePromise;
}

// ── Public API ───────────────────────────────────────────────────────

/** Dispatch a one-time session-expired event on window. */
export function dispatchSessionExpired() {
  if (_fired) return;
  _fired = true;
  window.dispatchEvent(new CustomEvent('peach:session-expired'));
}

/** Reset the guard so the event can fire again after re-auth. */
export function resetSessionExpiredFlag() {
  _fired = false;
}

/**
 * Drop-in replacement for fetch() that checks for 401 responses.
 * - If the session has already expired (_fired), short-circuits with
 *   a synthetic 401 to avoid hammering the server.
 * - Otherwise, forwards to native fetch() and checks the status.
 * - On 401: verifies session is truly expired before dispatching.
 * - Always returns the original Response so callers are unaffected.
 */
export async function fetchWithSessionCheck(url, options) {
  if (_fired) {
    return new Response(JSON.stringify({ error: 'Session expired' }), {
      status: 401,
      statusText: 'Session Expired',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Join an already in-flight identical GET rather than issuing a second one.
  // Each caller gets its own clone so bodies can be read independently.
  if (_isIdempotent(options)) {
    const key = _dedupKey(url, options);
    const existing = _inflightGets.get(key);
    if (existing) {
      const shared = await existing;
      return shared.clone();
    }
    const promise = _fetchWithSessionCheck(url, options);
    _inflightGets.set(key, promise);
    try {
      const res = await promise;
      return res.clone();
    } finally {
      _inflightGets.delete(key);
    }
  }

  return _fetchWithSessionCheck(url, options);
}

/** Underlying fetch + 401 session-expiry handling (no de-duplication). */
async function _fetchWithSessionCheck(url, options) {
  const res = await fetch(url, options);

  if (res.status === 401) {
    const token = window.__PEACH_AUTH__?.token;

    // Fast path: JWT expired or missing → session is dead
    if (!token || isTokenExpired(token)) {
      dispatchSessionExpired();
      return res;
    }

    // Slow path: JWT looks valid → probe server to confirm
    const expired = await probeSessionExpired();
    if (expired) dispatchSessionExpired();
    // Otherwise the 401 was action-specific — caller handles it
  }

  return res;
}
