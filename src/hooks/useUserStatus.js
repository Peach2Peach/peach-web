/**
 * useUserStatus — fetches block/trade/rating status for {userId} relative to the
 * current user, batching requests via POST /v1/user/status/batch.
 *
 * Powers the Repeat Trader badge. Per-user result shape:
 *   { isBlocked: boolean, trades: number, badExperience: boolean }
 * where `trades` is the count of past trades between the current user and {userId}.
 *
 * Many badges render at once (one per offer/match/row), each asking for a
 * different userId. Rather than firing one GET /user/{userId}/status per badge,
 * all userIds requested within the same tick are collected and sent as a single
 * POST /user/status/batch (chunked at the server's 100-id limit). Results are
 * cached per userId for the lifetime of the page and concurrent requests for the
 * same userId are de-duplicated. Silently returns null on error or when not
 * authenticated.
 */
import { useEffect, useState } from "react";
import { useApi } from "./useApi.js";

const MAX_BATCH = 100; // server caps `ids` at 100 per request

const cache = new Map();       // userId -> { trades, badExperience, isBlocked } | null
const inflight = new Map();    // userId -> Promise<status>
const resolvers = new Map();   // userId -> (value) => void  (settles the inflight promise)
const subscribers = new Map(); // userId -> Set<setState>

let queue = [];           // userIds awaiting the next flush
let flushScheduled = false;
let queuedPost = null;    // useApi().post captured for the pending flush

function notify(userId, value) {
  const subs = subscribers.get(userId);
  if (!subs) return;
  for (const fn of subs) fn(value);
}

/** Cache + broadcast a resolved value and settle its inflight promise. */
function settle(userId, value) {
  cache.set(userId, value);
  const resolve = resolvers.get(userId);
  resolvers.delete(userId);
  inflight.delete(userId);
  notify(userId, value);
  resolve?.(value);
}

async function runBatch(ids, post) {
  try {
    const res = await post("/user/status/batch", { ids });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const byId = new Map();
    for (const entry of Array.isArray(data) ? data : []) {
      if (!entry || !entry.userId) continue;
      byId.set(entry.userId, {
        trades: entry.trades ?? 0,
        badExperience: !!entry.badExperience,
        isBlocked: !!entry.isBlocked,
      });
    }
    // Any id without a returned entry settles to null (silent fail pattern).
    for (const id of ids) settle(id, byId.get(id) ?? null);
  } catch {
    for (const id of ids) settle(id, null);
  }
}

function flush() {
  flushScheduled = false;
  const ids = queue;
  const post = queuedPost;
  queue = [];
  queuedPost = null;
  if (!ids.length || !post) return;
  for (let i = 0; i < ids.length; i += MAX_BATCH) {
    runBatch(ids.slice(i, i + MAX_BATCH), post);
  }
}

/** Queue a userId for the next batch and return a promise for its status. */
function loadStatus(userId, post) {
  if (cache.has(userId)) return Promise.resolve(cache.get(userId));
  const existing = inflight.get(userId);
  if (existing) return existing;

  const promise = new Promise((resolve) => resolvers.set(userId, resolve));
  inflight.set(userId, promise);
  queue.push(userId);
  queuedPost = post; // latest authed post() wins; identical across renders
  if (!flushScheduled) {
    flushScheduled = true;
    // Defer to the end of the tick so all badges rendered together batch once.
    setTimeout(flush, 0);
  }
  return promise;
}

export function useUserStatus(userId) {
  const { post, isLoggedIn, auth } = useApi();
  const ownId = auth?.peachId ?? null;
  const skip = !isLoggedIn || !userId || userId === ownId;

  const [status, setStatus] = useState(() => (skip ? null : (cache.get(userId) ?? null)));

  useEffect(() => {
    if (skip) {
      setStatus(null);
      return;
    }

    // Hit cache immediately
    if (cache.has(userId)) {
      setStatus(cache.get(userId));
      return;
    }

    let cancelled = false;

    // Subscribe so other components asking for the same userId get notified
    if (!subscribers.has(userId)) subscribers.set(userId, new Set());
    const subs = subscribers.get(userId);
    subs.add(setStatus);

    loadStatus(userId, post).then((value) => {
      if (!cancelled) setStatus(value);
    });

    return () => {
      cancelled = true;
      subs.delete(setStatus);
      if (subs.size === 0) subscribers.delete(userId);
    };
  }, [userId, skip]); // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}

/** Drop the in-memory cache (e.g. on logout). */
export function clearUserStatusCache() {
  cache.clear();
  inflight.clear();
  resolvers.clear();
  subscribers.clear();
  queue = [];
  queuedPost = null;
}
