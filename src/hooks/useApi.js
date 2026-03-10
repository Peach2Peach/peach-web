/**
 * useApi — shared API helper for all Peach screens.
 *
 * Returns get / post / patch helpers that automatically:
 *   - Route to auth.baseUrl (regtest) when window.__PEACH_AUTH__ is set,
 *     or to VITE_API_BASE (Vite proxy / Cloudflare worker) otherwise.
 *   - Attach the Bearer token header when logged in.
 *
 * Usage:
 *   const { get, post, patch, del, auth, isLoggedIn } = useApi();
 *   const res = await get('/market/prices');
 *   const res = await post('/offer/search', { type: 'bid' });
 *   const res = await patch('/user', { payoutAddress: addr });
 *   const res = await del('/offer/match', { matchOfferId: '...' });
 */
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

    del(path, body) {
      return fetch(`${base}${path}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body),
      });
    },
  };
}
