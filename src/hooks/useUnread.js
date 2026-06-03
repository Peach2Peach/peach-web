import { useState, useEffect } from "react";
import { fetchWithSessionCheck } from "../utils/sessionGuard.js";
import { API_V1 } from "../utils/network.js";

// ── Singleton polling state ──────────────────────────────────────────────────
let _interval = null;
let _listeners = new Set();
let _state = { total: 0, byContract: {} };

function _notify() {
  _listeners.forEach(fn => fn({ ..._state }));
}

function _processContracts(arr) {
  const byContract = {};
  let total = 0;
  for (const c of arr) {
    const n = c.unreadMessages ?? 0;
    if (n > 0) {
      byContract[c.id] = n;
      total += n;
    }
  }
  _state = { total, byContract };
  window.__PEACH_UNREAD__ = _state;
  document.title = total > 0 ? `(${total}) Peach` : "Peach";
  _notify();
}

async function _poll(auth, base) {
  // Re-check auth each cycle (handles logout between polls)
  if (!window.__PEACH_AUTH__) {
    _stopPolling();
    _state = { total: 0, byContract: {} };
    document.title = "Peach";
    _notify();
    return;
  }
  // Reuse the contracts data useNotifications already fetched. Its window is
  // just over that poller's 15s cadence so we ride on it every tick instead of
  // racing it — in steady state useUnread issues no /contracts/summary of its
  // own. The fetch below stays as a fallback for first load (before the
  // notifications poll has written) or if that poller stalls (>16s stale).
  const shared = window.__PEACH_CONTRACTS__;
  if (shared && (Date.now() - shared.ts) < 16_000) {
    _processContracts(shared.data);
    return;
  }
  // Fallback: fetch our own copy
  try {
    const res = await fetchWithSessionCheck(`${base}/contracts/summary`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data?.contracts ?? []);
    _processContracts(arr);
  } catch {
    // Silently keep last known state on error
  }
}

function _startPolling() {
  if (_interval) return;
  const auth = window.__PEACH_AUTH__;
  if (!auth) return;
  const base = auth.baseUrl ?? API_V1;
  _poll(auth, base);
  _interval = setInterval(() => _poll(auth, base), 10_000);
}

function _stopPolling() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}

// ── React hook ───────────────────────────────────────────────────────────────
export function useUnread() {
  const [state, setState] = useState(_state);

  useEffect(() => {
    _listeners.add(setState);
    if (_listeners.size === 1) _startPolling();
    return () => {
      _listeners.delete(setState);
      if (_listeners.size === 0) _stopPolling();
    };
  }, []);

  return state;
}
