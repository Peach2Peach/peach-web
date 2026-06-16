/**
 * useServerNotifications — real, server-driven notifications.
 *
 * Polls GET /v069/selfUser/notifications/ every 7 seconds and exposes the list,
 * the unread count (for the bell badge), and a per-item "display as read" set.
 *
 * Read/colour model (manual):
 *   - Notifications stay unread (and keep counting toward the badge) until the
 *     user explicitly marks them read — either per-item or via "mark all read".
 *   - Marking read POSTs the ids to the server (POST /v069/selfUser/notifications/read),
 *     remembers them locally, and flips their colour to read immediately.
 *
 * Toasts:
 *   - On the first successful poll we seed the "already toasted" set with the
 *     current unread backlog, so logging in doesn't fire a burst of popups.
 *   - After that, every newly-arrived unread notification produces one toast.
 *
 * Singleton store with useSyncExternalStore, same shape as useNotifications.js:
 * polling starts on the first subscriber and stops when the last unsubscribes.
 */

import { useSyncExternalStore } from "react";
import { fetchWithSessionCheck } from "../utils/sessionGuard.js";
import { API_V1 } from "../utils/network.js";

const POLL_MS = 7_000;
const MAX_TOASTS = 4;

// ── Module state ──────────────────────────────────────────────────────────────
let _state = { notifications: [], unreadCount: 0, readDisplayIds: new Set(), toasts: [] };
let _listeners = new Set();
let _interval = null;

let _locallyRead = new Set();   // ids POSTed as read this session (optimistic)
let _toasted = new Set();       // ids we've already shown a toast for
let _seeded = false;            // has the first poll seeded the toast backlog?
let _currentPeachId = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function _effectiveRead(n) {
  return !!n.read || _locallyRead.has(n.id);
}

function _recompute(notifications) {
  const list = notifications ?? _state.notifications;
  const readDisplayIds = new Set();
  let unreadCount = 0;
  for (const n of list) {
    const read = _effectiveRead(n);
    if (!read) unreadCount++;
    if (read) readDisplayIds.add(n.id);
  }
  _state = { ..._state, notifications: list, unreadCount, readDisplayIds };
}

function _notify() {
  _listeners.forEach(fn => fn());
}

function _resetForUser(peachId) {
  _currentPeachId = peachId;
  _locallyRead = new Set();
  _toasted = new Set();
  _seeded = false;
  _state = { notifications: [], unreadCount: 0, readDisplayIds: new Set(), toasts: [] };
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

  if (auth.peachId !== _currentPeachId) _resetForUser(auth.peachId);

  const base = auth.baseUrl ?? API_V1;
  const v069Base = base.replace(/\/v1$/, "/v069");

  try {
    const res = await fetchWithSessionCheck(`${v069Base}/selfUser/notifications/`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    const list = Array.isArray(json?.notifications) ? json.notifications : [];

    // ── Toast newly-unread notifications ──
    const newToasts = [];
    if (!_seeded) {
      // First poll: don't toast the existing backlog, just remember it.
      for (const n of list) if (!_effectiveRead(n)) _toasted.add(n.id);
      _seeded = true;
    } else {
      for (const n of list) {
        if (_effectiveRead(n) || _toasted.has(n.id)) continue;
        _toasted.add(n.id);
        newToasts.push(n);
      }
    }
    const toasts = newToasts.length
      ? [...newToasts, ..._state.toasts].slice(0, MAX_TOASTS)
      : _state.toasts;

    _state = { ..._state, toasts };
    _recompute(list);
    _notify();
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

// ── Public actions ────────────────────────────────────────────────────────────
// POST the given ids to the server as read. Fire-and-forget: the next poll
// reconciles if it fails, and we've already updated locally.
function _postRead(ids) {
  const auth = window.__PEACH_AUTH__;
  if (!auth || ids.length === 0) return;
  const v069Base = (auth.baseUrl ?? API_V1).replace(/\/v1$/, "/v069");
  fetchWithSessionCheck(`${v069Base}/selfUser/notifications/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify({ ids }),
  }).catch(() => { /* server stays the source of truth; next poll reconciles */ });
}

// Mark a single notification read.
function _markRead(id) {
  if (_locallyRead.has(id)) return;
  _locallyRead.add(id);
  _recompute();
  _notify();
  _postRead([id]);
}

// Mark every currently-unread notification read.
function _markAllRead() {
  const unreadIds = _state.notifications.filter(n => !_effectiveRead(n)).map(n => n.id);
  if (unreadIds.length === 0) return;
  unreadIds.forEach(id => _locallyRead.add(id));
  _recompute();
  _notify();
  _postRead(unreadIds);
}

function _dismissToast(id) {
  if (!_state.toasts.some(t => t.id === id)) return;
  _state = { ..._state, toasts: _state.toasts.filter(t => t.id !== id) };
  _notify();
}

// ── React hook ──────────────────────────────────────────────────────────────
export function useServerNotifications() {
  const state = useSyncExternalStore(_subscribe, _getSnapshot);
  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    readDisplayIds: state.readDisplayIds,
    toasts: state.toasts,
    markRead: _markRead,
    markAllRead: _markAllRead,
    dismissToast: _dismissToast,
  };
}
