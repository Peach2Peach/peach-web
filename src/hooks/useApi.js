/**
 * useApi — shared API helper for all Peach screens.
 *
 * Returns get / post / patch helpers that automatically:
 *   - Route to auth.baseUrl (regtest) when window.__PEACH_AUTH__ is set,
 *     or to VITE_API_BASE (Vite proxy / Cloudflare worker) otherwise.
 *   - Attach the Bearer token header when logged in.
 *
 * Usage:
 *   const { get, post, patch, put, del, auth, isLoggedIn } = useApi();
 *   const res = await get('/market/prices');
 *   const res = await post('/offer/search', { type: 'bid' });
 *   const res = await patch('/user', { payoutAddress: addr });
 *   const res = await put('/user/abc123/block');
 *   const res = await del('/offer/match', { matchOfferId: '...' });
 */

// ── In-memory cache (survives navigation, cleared on page refresh) ──
if (!window.__PEACH_CACHE__) window.__PEACH_CACHE__ = {};

/** Get cached entry. Returns { data, ts } or null. */
export function getCached(key) {
  return window.__PEACH_CACHE__[key] ?? null;
}

/** Store data with current timestamp. */
export function setCache(key, data) {
  window.__PEACH_CACHE__[key] = { data, ts: Date.now() };
}

/** Clear one key or the entire cache. */
export function clearCache(key) {
  if (key) delete window.__PEACH_CACHE__[key];
  else window.__PEACH_CACHE__ = {};
}

/**
 * createTask — request a mobile signing action via the server.
 *
 * When the backend endpoint is ready, this will POST to /v1/task/create.
 * For now it's a mock that logs to console and returns a fake taskId.
 *
 * @param {Function} post - the post() function from useApi()
 * @param {string}   type - task type: "release" | "refund" | "rate" | "escrow"
 * @param {object}   payload - task-specific data (e.g. { contractId })
 * @returns {Promise<{taskId: string}>}
 */
export async function createTask(post, type, payload) {
  // TODO: replace with real endpoint when backend confirms shape
  // return post('/task/create', { type, ...payload }).then(r => r.json());
  console.log('[createTask mock]', type, payload);
  return { taskId: 'mock-' + Date.now() };
}
export function useApi() {
  const auth = window.__PEACH_AUTH__ ?? null;
  const base = auth?.baseUrl ?? import.meta.env.VITE_API_BASE;
  const authHeaders = auth ? { Authorization: `Bearer ${auth.token}` } : {};

  return {
    auth,
    isLoggedIn: !!auth,

    get(path) {
      return fetch(`${base}${path}`, { headers: authHeaders });
    },

    post(path, body) {
      return fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body),
      });
    },

    patch(path, body) {
      return fetch(`${base}${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body),
      });
    },

    put(path, body) {
      return fetch(`${base}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: body ? JSON.stringify(body) : undefined,
      });
    },

    del(path, body) {
      return fetch(`${base}${path}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body),
      });
    },
  };
}
