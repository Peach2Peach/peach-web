/**
 * sessionGuard — global session-expiry detection.
 *
 * Provides a fetch() wrapper that detects HTTP 401 (expired JWT)
 * and dispatches a single 'peach:session-expired' event on window.
 * App.jsx listens for this event and shows the SessionExpiredModal.
 */

let _fired = false;

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
  const res = await fetch(url, options);
  if (res.status === 401) dispatchSessionExpired();
  return res;
}
