/**
 * useActiveDisputes — the logged-in user's currently-active disputes.
 *
 * Polls GET /v069/selfUser every 20 seconds and exposes the list of contract
 * ids that are in dispute (the `activeDisputeContractIds` field), plus the
 * count. This field is NOT on /v1/user/me (which populates auth.profile), so it
 * has to be fetched from the v069 selfUser endpoint.
 *
 * Singleton store with useSyncExternalStore, same shape as useServerNotifications.js:
 * polling starts on the first subscriber and stops when the last unsubscribes,
 * no-ops while logged out, and resets when the active user changes.
 */

import { useSyncExternalStore } from "react";
import { fetchWithSessionCheck } from "../utils/sessionGuard.js";
import { API_V1 } from "../utils/network.js";

const POLL_MS = 20_000;

// ── Module state ──────────────────────────────────────────────────────────────
let _state = { contractIds: [] };
let _listeners = new Set();
let _interval = null;
let _currentPeachId = null;

function _notify() { _listeners.forEach(fn => fn()); }

function _resetForUser(peachId) {
  _currentPeachId = peachId;
  _state = { contractIds: [] };
}

function _sameIds(a, b) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

// ── Polling ───────────────────────────────────────────────────────────────────
async function _poll() {
  const auth = window.__PEACH_AUTH__;
  // Logged out: stay subscribed and keep the timer alive so we resume the moment
  // the user logs in. Clear any previous user's data once.
  if (!auth) {
    if (_currentPeachId !== null) { _resetForUser(null); _notify(); }
    return;
  }

  if (auth.peachId !== _currentPeachId) { _resetForUser(auth.peachId); _notify(); }

  const base = auth.baseUrl ?? API_V1;
  const v069Base = base.replace(/\/v1$/, "/v069");

  try {
    const res = await fetchWithSessionCheck(`${v069Base}/selfUser`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    const profile = json?.user ?? json;
    const ids = Array.isArray(profile?.activeDisputeContractIds) ? profile.activeDisputeContractIds : [];
    // Only swap the snapshot (and re-render subscribers) when the set changes,
    // so a steady-state poll every 20s doesn't churn the UI.
    if (!_sameIds(ids, _state.contractIds)) {
      _state = { contractIds: ids };
      _notify();
    }
  } catch {
    // Keep last known state on network error.
  }
}

function _startPolling() {
  if (_interval) return;
  // Start the timer even when logged out — _poll() no-ops until auth appears, so
  // a login that happens after this first subscription is picked up on the next
  // tick without needing a re-subscribe.
  _poll();
  _interval = setInterval(_poll, POLL_MS);
}

function _stopPolling() {
  if (_interval) { clearInterval(_interval); _interval = null; }
}

function _subscribe(cb) {
  _listeners.add(cb);
  if (_listeners.size === 1) _startPolling();
  return () => {
    _listeners.delete(cb);
    if (_listeners.size === 0) _stopPolling();
  };
}

function _getSnapshot() { return _state; }

// ── React hook ──────────────────────────────────────────────────────────────
export function useActiveDisputes() {
  const state = useSyncExternalStore(_subscribe, _getSnapshot);
  return { contractIds: state.contractIds, count: state.contractIds.length };
}
