import { useState, useEffect } from "react";
import { fetchWithSessionCheck } from "../utils/sessionGuard.js";

// ── Singleton polling state ──────────────────────────────────────────────────
let _interval = null;
let _listeners = new Set();
let _state = { total: 0, byContract: {} };

function _notify() {
  _listeners.forEach(fn => fn({ ..._state }));
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
  try {
    const res = await fetchWithSessionCheck(`${base}/contracts/summary`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data?.contracts ?? []);
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
  } catch {
    // Silently keep last known state on error
  }
}

function _startPolling() {
  if (_interval) return;
  const auth = window.__PEACH_AUTH__;
  if (!auth) return;
  const base = auth.baseUrl ?? import.meta.env.VITE_API_BASE;
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
