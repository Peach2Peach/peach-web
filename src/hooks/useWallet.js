// useWallet — watch-only Peach wallet view.
//
// Scans the user's xpub (BIP84, account-level) for used receive and change
// addresses, aggregates a confirmed + pending balance, and builds a global
// tx timeline. Results are cached to sessionStorage and kept until the user
// logs out, the session expires, or the tab closes — no time-based stale check.
//
// Two refresh modes:
//   • quickRefresh() — cheap revisit-check: tip + re-fetch used addresses +
//     probe the fresh receive (and a few past it) + extend up to 5 more if
//     that probe finds new activity. Typical cost: ~10–20 HTTP requests.
//   • fullRefresh()  — full gap-limit rescan from scratch. Use when the
//     quick check hits its extension cap or the user wants a ground-truth
//     reconciliation.
//
// On mount: cache hit → instant render + silent quickRefresh; cache miss →
// full scan with progress UI. On tab visibility regain: silent quickRefresh.
//
// Privacy: every queried address is sent to the Peach Esplora node. The
// screen surfaces this in a banner — no scanning until the user has been
// shown the disclosure (banner dismissal lives in the screen, not here).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GAP_LIMIT,
  SCAN_BATCH_SIZE,
  deriveReceiveAddresses,
  deriveChangeAddresses,
  getXpubFingerprint,
} from "../utils/wallet.js";
import {
  getEsploraBaseUrl,
  getAddressInfo,
  getAddressTxs,
  getAddressMempool,
  getTipHeight,
  mapWithConcurrency,
} from "../utils/esplora.js";

const SCAN_CONCURRENCY = 5;
// How many unused addresses past the current fresh receive we probe during a
// quick refresh. Small enough to keep request count low, large enough that
// typical "user gave out 2-3 addresses on the phone" patterns are caught.
const QUICK_PROBE_AHEAD = 3;
// Max number of extra addresses to derive beyond the cached tail during a
// quick refresh. If exceeded, we set capHit and recommend a Full Refresh.
const QUICK_EXTEND_CAP = 5;
const CACHE_KEY_PREFIX = "peach_wallet_";
// v2: started storing the change[] array (not just changeCount) so quickScan
// can refresh change-side used addresses without re-deriving from scratch.
const CACHE_VERSION = 2;

function cacheKey(xpub) {
  return `${CACHE_KEY_PREFIX}${getXpubFingerprint(xpub)}_v${CACHE_VERSION}`;
}

function loadCache(xpub) {
  try {
    const raw = sessionStorage.getItem(cacheKey(xpub));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.scannedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(xpub, snapshot) {
  try {
    sessionStorage.setItem(cacheKey(xpub), JSON.stringify(snapshot));
  } catch {
    // Quota or serialisation errors are non-fatal — just skip the cache write.
  }
}

// ── Pure helpers ───────────────────────────────────────────────────────────
function txCountOf(info) {
  return (info?.chain_stats?.tx_count ?? 0) + (info?.mempool_stats?.tx_count ?? 0);
}

function aggregateBalance(allAddrs) {
  let confirmed = 0;
  let pending = 0;
  for (const a of allAddrs) {
    const cs = a.info?.chain_stats;
    const ms = a.info?.mempool_stats;
    if (cs) confirmed += (cs.funded_txo_sum ?? 0) - (cs.spent_txo_sum ?? 0);
    if (ms) pending += (ms.funded_txo_sum ?? 0) - (ms.spent_txo_sum ?? 0);
  }
  return { confirmed, pending, total: confirmed + pending };
}

function netDeltaForTx(tx, ourAddresses) {
  const ours = new Set(ourAddresses);
  let received = 0;
  let sent = 0;
  for (const vout of tx.vout ?? []) {
    if (vout.scriptpubkey_address && ours.has(vout.scriptpubkey_address)) {
      received += vout.value ?? 0;
    }
  }
  for (const vin of tx.vin ?? []) {
    const prev = vin.prevout;
    if (prev?.scriptpubkey_address && ours.has(prev.scriptpubkey_address)) {
      sent += prev.value ?? 0;
    }
  }
  return received - sent;
}

function buildTimeline(txArrays, ourAddresses) {
  const byTxid = new Map();
  for (const txs of txArrays) {
    for (const tx of txs) {
      if (!byTxid.has(tx.txid)) byTxid.set(tx.txid, tx);
    }
  }
  const flat = [];
  for (const tx of byTxid.values()) {
    flat.push({
      txid: tx.txid,
      blockHeight: tx.status?.block_height ?? null,
      blockTime: tx.status?.block_time ?? null,
      confirmed: !!tx.status?.confirmed,
      net: netDeltaForTx(tx, ourAddresses),
      fee: tx.fee ?? 0,
    });
  }
  flat.sort((a, b) => {
    if (a.blockTime == null && b.blockTime != null) return -1;
    if (a.blockTime != null && b.blockTime == null) return 1;
    return (b.blockTime ?? 0) - (a.blockTime ?? 0);
  });
  return flat;
}

// ── Full gap-limit scan of one chain ───────────────────────────────────────
async function scanChain({ xpub, baseUrl, chain, signal, onPartial }) {
  const derive = chain === 0 ? deriveReceiveAddresses : deriveChangeAddresses;
  const results = [];
  let unusedStreak = 0;
  let nextIdx = 0;

  while (unusedStreak < GAP_LIMIT) {
    const batch = derive(xpub, nextIdx, SCAN_BATCH_SIZE);
    const infos = await mapWithConcurrency(
      batch,
      SCAN_CONCURRENCY,
      (b) => getAddressInfo(baseUrl, b.address, { signal }),
      { signal },
    );
    for (let i = 0; i < batch.length; i++) {
      const info = infos[i];
      const used = txCountOf(info) > 0;
      results.push({ ...batch[i], info, used });
      if (used) unusedStreak = 0;
      else unusedStreak += 1;
      if (unusedStreak >= GAP_LIMIT) break;
    }
    nextIdx += SCAN_BATCH_SIZE;
    onPartial?.(results.length);
  }
  return results;
}

// ── Cheap revisit-check on one chain ───────────────────────────────────────
//
// Refreshes info on:
//   1. all previously-used addresses (catches new mempool entries / confirmations)
//   2. the current fresh address + QUICK_PROBE_AHEAD addresses past it
//      (catches deposits to fresh+0, fresh+1, fresh+2)
// If the probe hits a used address, extends by deriving one more at a time,
// up to QUICK_EXTEND_CAP. Beyond that the chain is considered "behind" and
// capHit is set so the screen can prompt for a Full Refresh.
//
// Returns { entries, changedAddrs, capHit }.
async function quickScanChain({ xpub, baseUrl, chain, cachedList, signal }) {
  const derive = chain === 0 ? deriveReceiveAddresses : deriveChangeAddresses;

  // Split cached list into used + unused (in derivation order).
  const used = cachedList.filter((a) => a.used);
  const unused = cachedList.filter((a) => !a.used);

  // We probe used + the first QUICK_PROBE_AHEAD unused.
  const probe = [...used, ...unused.slice(0, QUICK_PROBE_AHEAD)];
  const changedAddrs = new Set();

  const probeInfos = await mapWithConcurrency(
    probe,
    SCAN_CONCURRENCY,
    (a) => getAddressInfo(baseUrl, a.address, { signal }),
    { signal },
  );

  const byAddress = new Map();
  for (let i = 0; i < probe.length; i++) {
    const old = probe[i];
    const info = probeInfos[i];
    const newCount = txCountOf(info);
    const oldCount = txCountOf(old.info);
    if (newCount !== oldCount) changedAddrs.add(old.address);
    byAddress.set(old.address, { ...old, info, used: newCount > 0 });
  }

  // Build the result list: start with the cached order, swap in probed entries
  // where we have them, leave the rest untouched.
  const result = cachedList.map((a) => byAddress.get(a.address) ?? a);

  // Extension: if the tail of the chain is now used, derive more until we
  // either find a fresh one or hit the cap.
  let capHit = false;
  let extensions = 0;
  while (extensions < QUICK_EXTEND_CAP) {
    const tail = result[result.length - 1];
    if (!tail || !tail.used) break; // we have a fresh tail, done
    const nextIdx = tail.index + 1;
    const [next] = derive(xpub, nextIdx, 1);
    const info = await getAddressInfo(baseUrl, next.address, { signal });
    const used = txCountOf(info) > 0;
    const entry = { ...next, info, used };
    if (used) changedAddrs.add(next.address);
    result.push(entry);
    extensions += 1;
    if (!used) break;
  }
  if (extensions === QUICK_EXTEND_CAP && result[result.length - 1]?.used) {
    capHit = true;
  }

  return { entries: result, changedAddrs, capHit };
}

const INITIAL = {
  status: "idle", // "idle" | "scanning" | "ready" | "error"
  scanProgress: null, // { receive, change }
  balance: null,
  receive: [],
  change: [], // now stored in cache (was changeCount in v1)
  txs: [],
  tipHeight: null,
  scannedAt: null,
  error: null,
  isQuickSyncing: false,
  capHit: false, // last quick refresh hit the extension cap
};

export function useWallet() {
  const xpub = window.__PEACH_AUTH__?.xpub ?? null;
  const [state, setState] = useState(INITIAL);
  const abortRef = useRef(null);
  // Active flag prevents stale scan results from overwriting newer ones when
  // a refresh is fired mid-scan.
  const scanIdRef = useRef(0);

  // ── Full gap-limit scan ────────────────────────────────────────────────
  const fullScan = useCallback(async () => {
    if (!xpub) return;
    const myScanId = ++scanIdRef.current;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState((s) => ({ ...s, status: "scanning", error: null, scanProgress: { receive: 0, change: 0 }, isQuickSyncing: false }));

    const baseUrl = getEsploraBaseUrl(xpub);
    try {
      const [receive, change, tipHeight] = await Promise.all([
        scanChain({
          xpub, baseUrl, chain: 0, signal: ctrl.signal,
          onPartial: (n) => {
            if (scanIdRef.current !== myScanId) return;
            setState((s) => ({ ...s, scanProgress: { ...(s.scanProgress ?? { receive: 0, change: 0 }), receive: n } }));
          },
        }),
        scanChain({
          xpub, baseUrl, chain: 1, signal: ctrl.signal,
          onPartial: (n) => {
            if (scanIdRef.current !== myScanId) return;
            setState((s) => ({ ...s, scanProgress: { ...(s.scanProgress ?? { receive: 0, change: 0 }), change: n } }));
          },
        }),
        getTipHeight(baseUrl, { signal: ctrl.signal }),
      ]);

      const ourAddrs = [...receive, ...change].map((a) => a.address);
      const usedAddrs = [...receive, ...change].filter((a) => a.used);

      const txArrays = await mapWithConcurrency(
        usedAddrs,
        SCAN_CONCURRENCY,
        async (a) => {
          const [confirmed, mempool] = await Promise.all([
            getAddressTxs(baseUrl, a.address, undefined, { signal: ctrl.signal }),
            getAddressMempool(baseUrl, a.address, { signal: ctrl.signal }),
          ]);
          return [...mempool, ...confirmed];
        },
        { signal: ctrl.signal },
      );

      if (scanIdRef.current !== myScanId) return;

      const balance = aggregateBalance([...receive, ...change]);
      const txs = buildTimeline(txArrays, ourAddrs);

      const snapshot = {
        status: "ready",
        scanProgress: null,
        balance,
        receive,
        change,
        txs,
        tipHeight,
        scannedAt: Date.now(),
        error: null,
        isQuickSyncing: false,
        capHit: false,
      };
      setState(snapshot);
      saveCache(xpub, snapshot);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (scanIdRef.current !== myScanId) return;
      setState((s) => ({ ...s, status: "error", error: err, scanProgress: null, isQuickSyncing: false }));
    }
  }, [xpub]);

  // ── Cheap revisit-check ─────────────────────────────────────────────────
  // Reads from current state; safe to call when state.receive/change populated.
  const quickScan = useCallback(async (currentCache) => {
    if (!xpub) return;
    if (!currentCache || !currentCache.receive?.length) return; // nothing to refresh against — caller should fullScan instead
    const myScanId = ++scanIdRef.current;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState((s) => ({ ...s, isQuickSyncing: true, error: null }));

    const baseUrl = getEsploraBaseUrl(xpub);
    try {
      const [recvResult, chgResult, tipHeight] = await Promise.all([
        quickScanChain({ xpub, baseUrl, chain: 0, cachedList: currentCache.receive, signal: ctrl.signal }),
        quickScanChain({ xpub, baseUrl, chain: 1, cachedList: currentCache.change ?? [], signal: ctrl.signal }),
        getTipHeight(baseUrl, { signal: ctrl.signal }),
      ]);

      const receive = recvResult.entries;
      const change = chgResult.entries;
      const capHit = recvResult.capHit || chgResult.capHit;
      const allChanged = new Set([...recvResult.changedAddrs, ...chgResult.changedAddrs]);

      // Refresh tx history for currently-used addresses. Re-fetching for all
      // used (not only changed) keeps the timeline simple and stays cheap —
      // typical wallets have a handful of used addresses.
      const usedAddrs = [...receive, ...change].filter((a) => a.used);

      const txArrays = await mapWithConcurrency(
        usedAddrs,
        SCAN_CONCURRENCY,
        async (a) => {
          const [confirmed, mempool] = await Promise.all([
            getAddressTxs(baseUrl, a.address, undefined, { signal: ctrl.signal }),
            getAddressMempool(baseUrl, a.address, { signal: ctrl.signal }),
          ]);
          return [...mempool, ...confirmed];
        },
        { signal: ctrl.signal },
      );

      if (scanIdRef.current !== myScanId) return;

      const ourAddrs = [...receive, ...change].map((a) => a.address);
      const balance = aggregateBalance([...receive, ...change]);
      const txs = buildTimeline(txArrays, ourAddrs);

      // Reference allChanged so unused-import lint doesn't trip; the set is
      // computed for future use (per-address tx merge) — for now we just
      // re-fetch tx history for all used addresses.
      void allChanged;

      const snapshot = {
        status: "ready",
        scanProgress: null,
        balance,
        receive,
        change,
        txs,
        tipHeight,
        scannedAt: Date.now(),
        error: null,
        isQuickSyncing: false,
        capHit,
      };
      setState(snapshot);
      saveCache(xpub, snapshot);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (scanIdRef.current !== myScanId) return;
      // Quick refresh failures keep the existing data on screen — surface
      // the error in state but don't blank the UI.
      setState((s) => ({ ...s, isQuickSyncing: false, error: err }));
    }
  }, [xpub]);

  // ── Mount: hydrate from cache, scan if no cache, quick-refresh if cache ──
  useEffect(() => {
    if (!xpub) {
      setState(INITIAL);
      return;
    }
    const cached = loadCache(xpub);
    if (cached) {
      setState({ ...INITIAL, ...cached, status: "ready", isQuickSyncing: false });
      // Silent quick sync — surfaces new deposits without blanking the UI.
      quickScan(cached);
    } else {
      fullScan();
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xpub]);

  // ── Visibility regain → silent quick sync if we have a cache ───────────
  useEffect(() => {
    if (!xpub) return;
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (state.status !== "ready") return;
      if (state.isQuickSyncing) return;
      // Quick sync uses current in-memory state as its baseline.
      quickScan({ receive: state.receive, change: state.change });
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [xpub, state.status, state.isQuickSyncing, state.receive, state.change, quickScan]);

  const fullRefresh = useCallback(() => {
    if (state.status === "scanning" || state.isQuickSyncing) return;
    fullScan();
  }, [fullScan, state.status, state.isQuickSyncing]);

  const quickRefresh = useCallback(() => {
    if (state.status === "scanning" || state.isQuickSyncing) return;
    if (!state.receive?.length) {
      // No baseline → degrade to full scan.
      fullScan();
      return;
    }
    quickScan({ receive: state.receive, change: state.change });
  }, [quickScan, fullScan, state.status, state.isQuickSyncing, state.receive, state.change]);

  return {
    ...state,
    xpub,
    quickRefresh,
    fullRefresh,
    // Back-compat alias for any existing callers — points at the quick path
    // since that's the typical "give me an update" intent.
    refresh: quickRefresh,
    isLoggedIn: !!xpub,
  };
}

// Exposed for App.jsx handleReauth() — clears all wallet cache keys.
export function clearWalletCache() {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(CACHE_KEY_PREFIX)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
  } catch {
    // Non-fatal.
  }
}
