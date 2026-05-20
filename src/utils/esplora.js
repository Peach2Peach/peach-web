// Thin Esplora HTTP REST client.
//
// All requests go through the path-prefixed proxy: /esplora/<net>/...
//   dev:   Vite proxy → electrum-<net>.peachbitcoin.com
//   prod:  Cloudflare worker → same
// The worker strips Authorization, so the Peach JWT never reaches the
// Bitcoin node. There is no batch endpoint in Esplora — concurrency is
// handled at the caller level via mapWithConcurrency().
//
// Esplora endpoints used:
//   GET /address/{addr}              → {chain_stats, mempool_stats}
//   GET /address/{addr}/txs          → confirmed txs (most recent 25, paginated)
//   GET /address/{addr}/txs/mempool  → unconfirmed txs
//   GET /blocks/tip/height           → integer
//
// Per-host rate-limit is unknown for Peach's instance. We cap concurrency at
// 5 and retry 5xx/network errors twice with backoff.

import { getEsploraNet } from "./wallet.js";

export function getEsploraBaseUrl(xpub) {
  return `/esplora/${getEsploraNet(xpub)}`;
}

class EsploraError extends Error {
  constructor(message, { status, url } = {}) {
    super(message);
    this.name = "EsploraError";
    this.status = status;
    this.url = url;
  }
}

async function request(url, { signal, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    try {
      const res = await fetch(url, { signal });
      if (res.ok) return res.json();
      // 4xx (other than 429) is a real failure — no retry.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new EsploraError(`HTTP ${res.status} ${res.statusText}`, {
          status: res.status,
          url,
        });
      }
      lastErr = new EsploraError(`HTTP ${res.status} ${res.statusText}`, {
        status: res.status,
        url,
      });
    } catch (err) {
      if (err.name === "AbortError") throw err;
      lastErr = err;
    }
    // Backoff: 300ms, 900ms.
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 300 * Math.pow(3, attempt)));
    }
  }
  throw lastErr;
}

// Run async fn over items with at most `limit` in flight. Preserves order.
// Honours an optional AbortSignal — when aborted, pending tasks reject.
export async function mapWithConcurrency(items, limit, fn, { signal } = {}) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      out[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return out;
}

// GET /address/{addr} → {chain_stats, mempool_stats, …}.
// On 404 (some proxies return that for never-seen addresses) we synthesise an
// all-zero record so callers don't need to special-case.
export async function getAddressInfo(baseUrl, addr, opts = {}) {
  try {
    return await request(`${baseUrl}/address/${addr}`, opts);
  } catch (err) {
    if (err instanceof EsploraError && err.status === 404) {
      return {
        address: addr,
        chain_stats: {
          funded_txo_count: 0,
          funded_txo_sum: 0,
          spent_txo_count: 0,
          spent_txo_sum: 0,
          tx_count: 0,
        },
        mempool_stats: {
          funded_txo_count: 0,
          funded_txo_sum: 0,
          spent_txo_count: 0,
          spent_txo_sum: 0,
          tx_count: 0,
        },
      };
    }
    throw err;
  }
}

// GET /address/{addr}/txs           → first 25 confirmed txs, newest first
// GET /address/{addr}/txs/chain/{lastSeenTxid} → next 25
export async function getAddressTxs(baseUrl, addr, lastSeenTxid, opts = {}) {
  const suffix = lastSeenTxid ? `/chain/${lastSeenTxid}` : "";
  return request(`${baseUrl}/address/${addr}/txs${suffix}`, opts);
}

// GET /address/{addr}/txs/mempool — unconfirmed transactions.
export async function getAddressMempool(baseUrl, addr, opts = {}) {
  return request(`${baseUrl}/address/${addr}/txs/mempool`, opts);
}

// GET /blocks/tip/height → number (chain tip height).
export async function getTipHeight(baseUrl, opts = {}) {
  // The tip endpoint returns a raw integer as text, not JSON. Override request().
  const res = await fetch(`${baseUrl}/blocks/tip/height`, {
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new EsploraError(`tip/height HTTP ${res.status}`, {
      status: res.status,
    });
  }
  const text = await res.text();
  const h = parseInt(text, 10);
  if (!Number.isFinite(h)) throw new EsploraError("tip/height: bad response");
  return h;
}

export { EsploraError };
