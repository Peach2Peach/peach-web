// Shared user-PM fetch + decrypt with module-level cache, in-flight dedup,
// retry on transient TypeError, and explicit invalidation for logout/writes.

import { useEffect, useState, useCallback } from "react";
import { fetchWithSessionCheck } from "../utils/sessionGuard";
import { extractPMsFromProfile, isApiError } from "../utils/pgp";

let cache = null;        // { pms } once loaded
let inflight = null;     // Promise<pms> | null
let lastError = null;    // Error from most recent failed load, surfaced to consumers
let lastLoadedAt = 0;    // ms timestamp of last successful load — used by refetchIfStale()
const subscribers = new Set();

function notify() {
  for (const fn of subscribers) fn();
}

export function invalidateUserPMs() {
  cache = null;
  inflight = null;
  lastError = null;
  lastLoadedAt = 0;
  notify();
}

async function fetchAndDecrypt(auth) {
  const v069 = auth.baseUrl.replace(/\/v1$/, "/v069");
  const res = await fetchWithSessionCheck(`${v069}/selfUser`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  if (!res.ok) throw new Error(`/v069/selfUser ${res.status}`);
  const data = await res.json();
  const profile = data?.user ?? data;
  if (!profile || isApiError(profile)) {
    throw new Error(`API error: ${profile?.error || profile?.message || "no data"}`);
  }
  return extractPMsFromProfile(profile, auth.pgpPrivKey);
}

// One retry on TypeError ("Failed to fetch") since the regtest server's CORS
// preflight is flaky right after a fresh login burst. Real errors fall through.
async function loadWithRetry(auth) {
  try {
    return await fetchAndDecrypt(auth);
  } catch (err) {
    if (err instanceof TypeError) {
      await new Promise((r) => setTimeout(r, 500));
      return await fetchAndDecrypt(auth);
    }
    throw err;
  }
}

function startLoad(auth) {
  inflight = loadWithRetry(auth)
    .then((pms) => {
      cache = { pms };
      lastError = null;
      lastLoadedAt = Date.now();
      inflight = null;
      notify();
      return pms;
    })
    .catch((err) => {
      lastError = err;
      inflight = null;
      notify();
      throw err;
    });
  return inflight;
}

export function useUserPMs(auth) {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const sub = () => forceRender((n) => n + 1);
    subscribers.add(sub);
    return () => subscribers.delete(sub);
  }, []);

  useEffect(() => {
    if (!auth?.token || !auth?.pgpPrivKey) return;
    if (cache || inflight) return;
    startLoad(auth).catch(() => {});
  }, [auth?.token, auth?.pgpPrivKey]);

  const refetch = useCallback(() => {
    cache = null;
    lastError = null;
    if (!inflight && auth?.token && auth?.pgpPrivKey) {
      return startLoad(auth);
    }
    return inflight ?? Promise.resolve(null);
  }, [auth]);

  // Refetch only if the cached PMs are older than `maxAgeMs`. Useful for
  // page-mount triggers where we want to keep the data fresh but avoid
  // hammering the server on every navigation.
  const refetchIfStale = useCallback((maxAgeMs = 30_000) => {
    if (!auth?.token || !auth?.pgpPrivKey) return Promise.resolve(null);
    if (inflight) return inflight;
    if (Date.now() - lastLoadedAt < maxAgeMs) return Promise.resolve(cache?.pms ?? null);
    return refetch();
  }, [auth, refetch]);

  return {
    pms: cache?.pms ?? null,
    loading: !!inflight,
    error: lastError,
    ready: !!auth?.token && !!auth?.pgpPrivKey,
    refetch,
    refetchIfStale,
  };
}
