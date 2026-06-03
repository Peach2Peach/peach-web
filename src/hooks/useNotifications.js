import { useSyncExternalStore } from "react";
import { STATUS_CONFIG, PENDING_STATUSES } from "../data/statusConfig.js";
import { fetchWithSessionCheck } from "../utils/sessionGuard.js";
import { API_V1 } from "../utils/network.js";
import { getCached, setCache } from "./useApi.js";
import { normalizeOffer, normalizeContract } from "../utils/tradesNormalize.js";

// ── Seller-specific overrides (keyed by status) ─────────────────────────────
const SELLER_OVERRIDE = {
  fundEscrow:             { title: "Fund escrow",              body: "Trade accepted — fund the escrow now." },
  waitingForFunding:      { title: "Fund escrow",              body: "Waiting for you to fund the escrow." },
  paymentRequired:        { title: "Trade initiated ! Awaiting payment",         body: "Waiting for the buyer to send payment." },
  confirmPaymentRequired: { title: "The buyer made the payment",   body: "Check your bank  account and confirm receipt." },
  releaseEscrow:          { title: "Confirm payment receipt",  body: "Check your account and release escrow from mobile." },
};

// ── Status → notification mapping ────────────────────────────────────────────
const STATUS_NOTIF = {
  hasMatchesAvailable:          { title: "New trade requests available",   body: "Review and select a trade request.",             type: "match" },
  offerHiddenWithMatchesAvailable: { title: "New trade requests available", body: "Review and select a trade request.",            type: "match" },
  // acceptTradeRequest: owned by the totalTradeRequests counter diff — single source of truth for trade-request bells.
  fundEscrow:                   { title: "Trade accepted",          body: "Waiting for seller to fund escrow.",     type: "statusChange" },
  waitingForFunding:            { title: "Trade accepted",          body: "Waiting for seller to fund escrow.",     type: "statusChange" },
  escrowWaitingForConfirmation: { title: "Escrow funding",           body: "Waiting for blockchain confirmation.",   type: "statusChange" },
  paymentRequired:              { title: "Trade Initiated ! Payment required",        body: "Send payment to the seller.",            type: "statusChange" },
  confirmPaymentRequired:       { title: "Payment sent",            body: "you have marked the payment as sent. Waiting for seller to receive the money.",    type: "statusChange" },
  releaseEscrow:                { title: "Payment confirmed",       body: "Seller is releasing escrow.",            type: "statusChange" },
  tradeCompleted:               { title: "Trade completed",         body: "Bitcoin released successfully.",         type: "statusChange" },
  tradeCanceled:                { title: "Trade cancelled",         body: "",                                       type: "statusChange" },
  offerCanceled:                { title: "Offer cancelled",         body: "",                                       type: "statusChange" },
  dispute:                      { title: "Dispute opened",          body: "A mediator will review the trade.",      type: "dispute" },
  disputeWithoutEscrowFunded:   { title: "Dispute opened",          body: "A mediator will review the trade.",      type: "dispute" },
  fundingExpired:               { title: "Funding expired",         body: "Escrow was not funded in time.",         type: "expiry" },
  paymentTooLate:               { title: "Payment overdue",         body: "Payment deadline has passed.",           type: "statusChange" },
  confirmCancelation:           { title: "Cancellation requested",  body: "Review the cancellation request.",       type: "statusChange" },
  rateUser:                     { title: "Trade completed! Rate your trade partner",  body: "",                                      type: "statusChange" },
  createEscrow:                 { title: "Its a match ! Create escrow",            body: "Fund the escrow for this contract.",     type: "statusChange" },
  fundingAmountDifferent:       { title: "Wrong funding amount",     body: "Escrow funded with unexpected amount.",   type: "warning" },
  payoutPending:                { title: "Payout pending",           body: "Bitcoin is being sent to your wallet.",   type: "statusChange" },
  refundAddressRequired:        { title: "Refund address needed",    body: "Provide a refund address to continue.",   type: "warning" },
  refundOrReviveRequired:       { title: "Action needed",            body: "Decide whether to refund or republish.",  type: "warning" },
  refundTxSignatureRequired:    { title: "Refund signature needed",  body: "Sign the refund transaction to continue.", type: "warning" },
  wrongAmountFundedOnContract:  { title: "Wrong amount funded",      body: "Contract funded with incorrect amount.",  type: "warning" },
  wrongAmountFundedOnContractRefundWaiting: { title: "Refund pending", body: "You funded the escrow with the wrong amount. Waiting for refund.", type: "warning" },
};

// ── localStorage helpers (per-PeachID namespaced) ────────────────────────────
const LS_NOTIFS_PREFIX   = "peach_notifications";
const LS_READ_IDS_PREFIX = "peach_notif_read_ids";
const LS_BASELINE_PREFIX = "peach_notif_baseline";
const MAX_NOTIFS         = 50;

const _peachId    = () => window.__PEACH_AUTH__?.peachId ?? null;
const keyNotifs   = (id) => id ? `${LS_NOTIFS_PREFIX}:${id}`   : null;
const keyReadIds  = (id) => id ? `${LS_READ_IDS_PREFIX}:${id}` : null;
const keyBaseline = (id) => id ? `${LS_BASELINE_PREFIX}:${id}` : null;

// Strip legacy ": contract <id>" / ": offer <id>" suffix from titles persisted
// before the ID was promoted to its own header row in NotificationPanel.
const LEGACY_TITLE_SUFFIX = /: (?:contract|offer) [\w\-‑]+$/;
function loadNotifs(peachId) {
  const k = keyNotifs(peachId);
  if (!k) return [];
  try {
    const list = JSON.parse(localStorage.getItem(k)) || [];
    let migrated = false;
    const cleaned = list.map(n => {
      if (typeof n?.title === "string" && LEGACY_TITLE_SUFFIX.test(n.title)) {
        migrated = true;
        return { ...n, title: n.title.replace(LEGACY_TITLE_SUFFIX, "") };
      }
      return n;
    });
    if (migrated) {
      try { localStorage.setItem(k, JSON.stringify(cleaned.slice(0, MAX_NOTIFS))); } catch { /* ignore */ }
    }
    return cleaned;
  } catch { return []; }
}
function saveNotifs(list) {
  const k = keyNotifs(_peachId());
  if (!k) return;
  localStorage.setItem(k, JSON.stringify(list.slice(0, MAX_NOTIFS)));
}
function loadReadIds(notifs, peachId) {
  const k = keyReadIds(peachId);
  if (!k) return new Set();
  // Try new format first
  try {
    const arr = JSON.parse(localStorage.getItem(k));
    if (Array.isArray(arr)) return new Set(arr);
  } catch { /* fall through */ }
  // Migrate from old timestamp-based format
  const oldTs = parseInt(localStorage.getItem("peach_notif_last_read"), 10) || 0;
  if (oldTs > 0 && notifs.length > 0) {
    const ids = new Set(notifs.filter(n => n.createdAt <= oldTs).map(n => n.id));
    localStorage.removeItem("peach_notif_last_read");
    saveReadIds(ids, notifs);
    return ids;
  }
  localStorage.removeItem("peach_notif_last_read");
  return new Set();
}
function saveReadIds(readIds, notifs) {
  const k = keyReadIds(_peachId());
  if (!k) return;
  // Prune: only keep IDs that exist in current notifications
  const validIds = new Set(notifs.map(n => n.id));
  const pruned = [...readIds].filter(id => validIds.has(id));
  localStorage.setItem(k, JSON.stringify(pruned));
}

// Coerce all Map keys to strings. Old baselines (before sell offers moved from
// v069 → /offers/summary) persisted numeric keys for sells; new code keys them
// as strings. Without this, Map.get returns undefined and diff loops silently
// skip every sell-offer event.
function _stringKeyMap(entries) {
  const out = new Map();
  for (const [k, v] of entries) out.set(String(k), v);
  return out;
}

function loadBaseline(peachId) {
  const k = keyBaseline(peachId);
  if (!k) return null;
  try {
    const obj = JSON.parse(localStorage.getItem(k));
    if (!obj) return null;
    return {
      contracts:        new Map(obj.contracts        ?? []),
      offers:           _stringKeyMap(obj.offers           ?? []),
      tradeRequestCount: _stringKeyMap(obj.tradeRequestCount ?? []),
      matchCounts:      _stringKeyMap(obj.matchCounts      ?? []),
      offerUnread:      _stringKeyMap(obj.offerUnread       ?? []),
    };
  } catch { return null; }
}
function saveBaseline() {
  const k = keyBaseline(_peachId());
  if (!k) return;
  try {
    const obj = {
      contracts:        [..._prevContracts.entries()],
      offers:           [..._prevOffers.entries()],
      tradeRequestCount: [..._prevTradeRequestCount.entries()],
      matchCounts:      [..._prevMatchCounts.entries()],
      offerUnread:      [..._prevOfferUnread.entries()],
    };
    localStorage.setItem(k, JSON.stringify(obj));
  } catch { /* quota or other — silently skip */ }
}

// ── Pending-escrow tracking (per-PeachID, persisted in localStorage) ────────
const LS_ESCROW_PENDING_PREFIX = "peach_escrow_pending";
const keyEscrowPending = (id) => id ? `${LS_ESCROW_PENDING_PREFIX}:${id}` : null;

function loadEscrowPending(peachId) {
  const k = keyEscrowPending(peachId);
  if (!k) return [];
  try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; }
}
function saveEscrowPending(peachId, list) {
  const k = keyEscrowPending(peachId);
  if (!k) return;
  try { localStorage.setItem(k, JSON.stringify(list)); } catch { /* quota */ }
}

export function addPendingEscrow(offerId, amount) {
  const pid = _peachId();
  if (!pid || offerId == null) return;
  const list = loadEscrowPending(pid);
  if (list.some(e => String(e.offerId) === String(offerId))) return;
  list.push({ offerId: String(offerId), amount: Number(amount) || 0 });
  saveEscrowPending(pid, list);
}

export function removePendingEscrow(offerId) {
  const pid = _peachId();
  if (!pid || offerId == null) return;
  const list = loadEscrowPending(pid);
  const filtered = list.filter(e => String(e.offerId) !== String(offerId));
  if (filtered.length !== list.length) saveEscrowPending(pid, filtered);
}

// ── Wrong-amount-funded popup tracking (per-PeachID, persisted) ─────────────
// Records offers whose wrong-amount popup has already fired, so the global popup
// shows once per offer (not every 15s poll) and still surfaces once on a fresh
// login into an already-wrong offer.
const LS_WRONGAMOUNT_SHOWN_PREFIX = "peach_wrongamount_popup_shown";
const keyWrongAmountShown = (id) => id ? `${LS_WRONGAMOUNT_SHOWN_PREFIX}:${id}` : null;

function loadWrongAmountShown(peachId) {
  const k = keyWrongAmountShown(peachId);
  if (!k) return new Set();
  try { return new Set((JSON.parse(localStorage.getItem(k)) || []).map(String)); } catch { return new Set(); }
}
function saveWrongAmountShown(peachId, set) {
  const k = keyWrongAmountShown(peachId);
  if (!k) return;
  try { localStorage.setItem(k, JSON.stringify([...set])); } catch { /* quota */ }
}

// ── Contract wrong-amount refund-pending popup tracking ────────────────────
// Mirrors the offer-level dedup above, keyed by contract id, so the global
// contract refund popup shows once per contract (not every 15s poll) and still
// surfaces once on a fresh login into a contract already in refund-pending.
const LS_CONTRACT_WRONGAMOUNT_PREFIX = "peach_contract_wrongamount_shown";
const keyContractWrongShown = (id) => id ? `${LS_CONTRACT_WRONGAMOUNT_PREFIX}:${id}` : null;

function loadContractWrongShown(peachId) {
  const k = keyContractWrongShown(peachId);
  if (!k) return new Set();
  try { return new Set((JSON.parse(localStorage.getItem(k)) || []).map(String)); } catch { return new Set(); }
}
function saveContractWrongShown(peachId, set) {
  const k = keyContractWrongShown(peachId);
  if (!k) return;
  try { localStorage.setItem(k, JSON.stringify([...set])); } catch { /* quota */ }
}

export function addEscrowFundedNotification(offerId) {
  const dedupId = `escrow-funded-${offerId}`;
  if (_state.notifications.some(n => n.id === dedupId)) return;
  _addEvents([_makeNotif(
    dedupId, "statusChange",
    "Escrow funded",
    "The escrow has been funded and your offer is published.",
    null, String(offerId)
  )]);
}

// ── Singleton polling state ──────────────────────────────────────────────────
let _interval      = null;
let _listeners     = new Set();
let _state         = { notifications: [], unreadCount: 0, readIds: new Set() };
let _prevContracts = new Map();   // id → { tradeStatus, unreadMessages }
let _prevOffers    = new Map();   // id → tradeStatus
let _prevTradeRequestCount = new Map(); // offerId → totalTradeRequests (open incoming trade-request counter, populated for both buy and sell offers)
let _prevMatchCounts = new Map();  // buyOfferId → totalMatches (track additional matches arriving on hasMatchesAvailable offers)
let _prevOfferUnread = new Map();  // offerId → boolean; sourced from offer.unreadMessages (number, hidden when 0)
let _isFirstPoll   = true;
let _hydratedPeachId = null;

// Hydrate notifications, read state, and diff baselines for a given user.
// Idempotent — early-returns if already hydrated for this peachId.
// Restoring a saved baseline lets the first poll diff against last-known state,
// catching events that occurred while the user was logged out.
function _hydrateForUser(peachId) {
  if (!peachId || _hydratedPeachId === peachId) return;
  _hydratedPeachId = peachId;
  const notifs  = loadNotifs(peachId);
  const readIds = loadReadIds(notifs, peachId);
  _state = {
    notifications: notifs,
    unreadCount:   notifs.filter(n => !readIds.has(n.id)).length,
    readIds,
  };
  const baseline = loadBaseline(peachId);
  if (baseline) {
    _prevContracts          = baseline.contracts;
    _prevOffers             = baseline.offers;
    _prevTradeRequestCount  = baseline.tradeRequestCount ?? new Map();
    _prevMatchCounts        = baseline.matchCounts;
    _prevOfferUnread        = baseline.offerUnread ?? new Map();
    _isFirstPoll            = false;
  } else {
    _prevContracts          = new Map();
    _prevOffers             = new Map();
    _prevTradeRequestCount  = new Map();
    _prevMatchCounts        = new Map();
    _prevOfferUnread        = new Map();
    _isFirstPoll            = true;
  }
  _updateTitle();
  if (_listeners.size > 0) _notify();
}

function _notify() {
  _listeners.forEach(fn => fn());
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

function _addEvents(newEvents) {
  if (newEvents.length === 0) return;
  const notifications = [...newEvents, ..._state.notifications].slice(0, MAX_NOTIFS);
  const unreadCount = notifications.filter(n => !_state.readIds.has(n.id)).length;
  _state = { ..._state, notifications, unreadCount };
  saveNotifs(_state.notifications);
  saveReadIds(_state.readIds, _state.notifications);
  _updateTitle();
  _notify();
}

function _updateTitle() {
  // Defer to useUnread if it has a message count showing
  const unreadMsgTotal = window.__PEACH_UNREAD__?.total ?? 0;
  if (unreadMsgTotal > 0) return; // useUnread already sets "(N) Peach"
  if (_state.unreadCount > 0) {
    document.title = "(\u25CF) Peach";
  } else {
    document.title = "Peach";
  }
}

function _makeNotif(id, type, title, body, contractId, offerId, offerType) {
  return { id, type, title, body, contractId: contractId || null, offerId: offerId || null, offerType: offerType || null, createdAt: Date.now() };
}

async function _poll(auth, base) {
  if (!window.__PEACH_AUTH__) {
    _stopPolling();
    _state = { notifications: _state.notifications, unreadCount: _state.unreadCount, readIds: _state.readIds };
    _notify();
    return;
  }

  // Defensive: hydrate (or re-hydrate if user changed mid-session)
  _hydrateForUser(window.__PEACH_AUTH__.peachId);

  const hdrs = { Authorization: `Bearer ${auth.token}` };
  const v069Base = base.replace(/\/v1$/, "/v069");

  try {
    const peachId = window.__PEACH_AUTH__?.peachId;
    const [contractsRes, buyRes, offersSummaryRes] = await Promise.all([
      fetchWithSessionCheck(`${base}/contracts/summary`, { headers: hdrs }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetchWithSessionCheck(`${v069Base}/buyOffer?ownOffers=true`, { headers: hdrs }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetchWithSessionCheck(`${base}/offers/summary`, { headers: hdrs }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    // ── Parse responses ──
    const contracts = contractsRes
      ? (Array.isArray(contractsRes) ? contractsRes : (contractsRes.contracts ?? []))
      : [];
    // Share contracts with useUnread to avoid duplicate API calls
    window.__PEACH_CONTRACTS__ = { data: contracts, ts: Date.now() };

    // (Removed: per-poll hasTurnedToMyContract probing that auto-dismissed stale
    // "Trade request received" notifications once their offer became a contract.
    // Push notifications now drive the trade-request lifecycle; these local
    // notifications age out via MAX_NOTIFS / markRead instead.)

    const buyOffers  = buyRes  ? (Array.isArray(buyRes)  ? buyRes  : (buyRes.offers ?? []))  : [];
    const offersArr  = offersSummaryRes
      ? (Array.isArray(offersSummaryRes) ? offersSummaryRes : (offersSummaryRes.offers ?? []))
      : [];
    // Own sell offers come from /offers/summary — canonical for tradeStatus, unreadMessages (hidden when 0), and totalTradeRequests.
    const sellOffers = offersArr.filter(o => o.type === "ask");
    const allOffers  = [
      ...buyOffers.map(o => ({ ...o, _dir: "buy" })),
      ...sellOffers.map(o => ({ ...o, _dir: "sell" })),
    ];

    // ── totalTradeRequests lookup: /offers/summary for sells, buyOffer?ownOffers=true for buys ──
    const trReqLookup = new Map();
    for (const o of offersArr) trReqLookup.set(String(o.id), o.totalTradeRequests ?? 0);
    for (const o of buyOffers) trReqLookup.set(String(o.id), o.totalTradeRequests ?? 0);

    // ── Populate trades-items / trades-pending caches so trades-dashboard hydrates instantly ──
    // Mirrors the merge in trades-dashboard fast-tier: /offers/summary canonical for sells,
    // /v069/buyOffer overlays buys (carrying over v1's `prices` when v069 omits them).
    {
      const buyTagged = buyOffers.map(o => ({ ...o, _direction: "buy" }));
      const byId = new Map();
      offersArr.forEach(o => byId.set(o.id, o));
      buyTagged.forEach(o => {
        const existing = byId.get(o.id);
        if (existing?.prices && !o.prices) o.prices = existing.prices;
        byId.set(o.id, o);
      });
      const cachedPrices = getCached("market-prices")?.data ?? null;
      const normalizedOffers = [...byId.values()].map(o => normalizeOffer(o, { allPrices: cachedPrices }));
      const normalizedContracts = contracts.map(c => normalizeContract(c, { peachId }));
      setCache("trades-items", [...normalizedOffers, ...normalizedContracts]);
      // Seed trades-pending only when empty — trades-dashboard's slow tier owns the
      // enrichment fields (matches, sentRequests) on this key; don't clobber them.
      if (!getCached("trades-pending")) {
        const pending = normalizedOffers.filter(i => PENDING_STATUSES.has(i.tradeStatus));
        setCache("trades-pending", pending);
      }
    }

    // ── First poll = baseline only (only when no persisted baseline existed) ──
    if (_isFirstPoll) {
      _isFirstPoll = false;
      for (const c of contracts) {
        _prevContracts.set(c.id, { tradeStatus: c.tradeStatus, unreadMessages: c.unreadMessages ?? 0 });
      }
      for (const o of allOffers) {
        const oid = String(o.id);
        _prevOffers.set(oid, o.tradeStatus ?? o.tradeStatusNew ?? "");
        _prevOfferUnread.set(oid, (o.unreadMessages ?? 0) > 0);
        _prevTradeRequestCount.set(oid, trReqLookup.get(oid) ?? 0);
      }
      saveBaseline();
      _notify();
      return;
    }

    const events = [];
    const now = Date.now();

    // ── Diff contracts ──
    for (const c of contracts) {
      const prev = _prevContracts.get(c.id);
      const status = c.tradeStatus;
      const unread = c.unreadMessages ?? 0;
      const rawType  = (c.type ?? "").toLowerCase();
      const isBuyer  = rawType === "bid" || rawType === "buy" || (c.buyer?.id ?? c.buyerId) === peachId;
      const isSeller = !isBuyer;
      const sellerOv = isSeller ? SELLER_OVERRIDE[status] : null;

      if (prev) {
        // Seller granted more time after the buyer missed the payment window:
        // status flips paymentTooLate → paymentRequired. Override the default
        // "Payment required" notif with a buyer-specific message.
        if (isBuyer && prev.tradeStatus === "paymentTooLate" && status === "paymentRequired") {
          events.push(_makeNotif(
            `c-${c.id}-extended-${now}`, "statusChange",
            "Payment required",
            "the seller gave you more time to make the payment. Proceed as soon as possible.",
            c.id, null
          ));
        } else if (prev.tradeStatus !== status && STATUS_NOTIF[status]) {
          const sn = STATUS_NOTIF[status];
          events.push(_makeNotif(
            `c-${c.id}-${status}-${now}`, sn.type,
            sellerOv?.title ?? sn.title, sellerOv?.body ?? sn.body, c.id, null
          ));
        }
        // New unread messages
        if (unread > prev.unreadMessages) {
          const diff = unread - prev.unreadMessages;
          events.push(_makeNotif(
            `c-${c.id}-msg-${now}`, "message",
            diff === 1 ? "New message" : `${diff} new messages`,
            "", c.id, null
          ));
        }
      } else {
        // Brand new contract since last poll — notify if it has an interesting status.
        if (STATUS_NOTIF[status]) {
          const sn = STATUS_NOTIF[status];
          events.push(_makeNotif(
            `c-${c.id}-${status}-${now}`, sn.type,
            sellerOv?.title ?? sn.title, sellerOv?.body ?? sn.body, c.id, null
          ));
        }
      }

      _prevContracts.set(c.id, { tradeStatus: status, unreadMessages: unread });
    }

    // ── Diff offers ──
    // String(o.id) is mandatory: summary entries (sells) carry string ids while
    // v069 buyOffer entries (buys) carry numeric ids. Map.get is type-strict,
    // so missing the coercion silently skips every sell-offer diff event.
    for (const o of allOffers) {
      const oid = String(o.id);
      const status = o.tradeStatus ?? o.tradeStatusNew ?? "";
      const prev = _prevOffers.get(oid);

      if (prev && prev !== status && STATUS_NOTIF[status]) {
        const sn = STATUS_NOTIF[status];
        const body = (o._dir === "sell" && (status === "fundEscrow" || status === "waitingForFunding"))
          ? "Waiting for you to fund escrow."
          : sn.body;
        events.push(_makeNotif(
          `o-${oid}-${status}-${now}`, sn.type,
          sn.title, body, null, oid
        ));
      } else if (!prev && STATUS_NOTIF[status]) {
        // New offer appeared — skip, it's the user's own action
      }

      _prevOffers.set(oid, status);
    }

    // ── Diff per-offer unread chat flag (replaces per-chat polling) ──
    for (const o of allOffers) {
      const oid = String(o.id);
      const curr = (o.unreadMessages ?? 0) > 0;
      const prev = _prevOfferUnread.get(oid) ?? false;
      if (curr && !prev) {
        events.push(_makeNotif(
          `o-${oid}-msg-${now}`, "message",
          "New message", "", null, oid
        ));
      }
      _prevOfferUnread.set(oid, curr);
    }
    // Prune _prevOfferUnread for offers no longer present
    const currentOfferIds = new Set(allOffers.map(o => String(o.id)));
    for (const id of [..._prevOfferUnread.keys()]) {
      if (!currentOfferIds.has(id)) _prevOfferUnread.delete(id);
    }

    // ── Diff trade-request counts on own offers (buy + sell, via totalTradeRequests counter) ──
    for (const o of allOffers) {
      const oid = String(o.id);
      const current = trReqLookup.get(oid) ?? 0;
      const prev = _prevTradeRequestCount.get(oid);
      if (prev === undefined) {
        _prevTradeRequestCount.set(oid, current);
        continue;
      }
      const delta = current - prev;
      if (delta > 0) {
        const title = delta === 1
          ? "Trade request received"
          : `${delta} trade requests received`;
        events.push(_makeNotif(
          `o-${oid}-tradeReq-${now}`, "tradeRequest",
          title, "Review and accept or decline.", null, oid,
          o._dir === "buy" ? "buyOffer" : "sellOffer"
        ));
      }
      _prevTradeRequestCount.set(oid, current);
    }

    // Prune _prevTradeRequestCount for offers no longer present
    const currentAllOfferIds = new Set(allOffers.map(o => String(o.id)));
    for (const id of [..._prevTradeRequestCount.keys()]) {
      if (!currentAllOfferIds.has(id)) _prevTradeRequestCount.delete(id);
    }

    // ── Diff buy-offer match counts (notify on additional matches arriving) ──
    const matchAvailableBuyOffers = buyOffers.filter(
      o => o.tradeStatus === "hasMatchesAvailable" || o.tradeStatus === "offerHiddenWithMatchesAvailable"
    );
    const matchResults = await Promise.all(
      matchAvailableBuyOffers.map(o =>
        fetchWithSessionCheck(`${base}/offer/${o.id}/matches?page=0&size=1&sortBy=bestReputation`, { headers: hdrs })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
          .then(data => ({ offerId: String(o.id), data }))
      )
    );

    for (const { offerId, data } of matchResults) {
      if (!data || typeof data.totalMatches !== "number") continue;
      const current = data.totalMatches;
      const prev = _prevMatchCounts.get(offerId);
      if (prev === undefined) {
        // First time seeing this offer in match-available state — baseline only
        _prevMatchCounts.set(offerId, current);
        continue;
      }
      const delta = current - prev;
      if (delta > 0) {
        const title = delta === 1
          ? "1 new match"
          : `${delta} new matches`;
        events.push(_makeNotif(
          `o-${offerId}-moreMatches-${now}`, "match",
          title, "Review and select a match.", null, offerId
        ));
      }
      _prevMatchCounts.set(offerId, current);
    }

    // Prune _prevMatchCounts for offers no longer in match-available state
    const currentMatchAvailIds = new Set(matchAvailableBuyOffers.map(o => String(o.id)));
    for (const id of [..._prevMatchCounts.keys()]) {
      if (!currentMatchAvailIds.has(id)) _prevMatchCounts.delete(id);
    }

    // Accept/reject of the user's outbound trade requests is delivered by push
    // notifications now, so the poller no longer browses for sent requests or
    // probes hasTurnedToMyContract to synthesise "Its a match!" / "declined".

    // ── Check pending escrow funding ──
    // `/offer/:id/escrow` reports the on-chain funding result. FUNDED → published;
    // WRONG_FUNDING_AMOUNT → the seller funded a different amount than the offer
    // was made for, so we fire the global wrong-amount popup (App.jsx mounts it).
    const pendingEscrows = loadEscrowPending(peachId);
    if (pendingEscrows.length > 0) {
      const checks = await Promise.all(
        pendingEscrows.map(({ offerId, amount }) =>
          fetchWithSessionCheck(`${base}/offer/${offerId}/escrow`, { headers: hdrs })
            .then(r => r.ok ? r.json() : null)
            .then(data => ({
              offerId,
              amount,
              status: data?.funding?.status ?? null,
              amounts: data?.funding?.amounts ?? [],
              // raw (true | false | undefined) — distinguishes "explicitly forced
              // refund" (false) from "field absent" (default to offering a choice)
              userConfirmationRequired: data?.userConfirmationRequired,
            }))
            .catch(() => ({ offerId, amount, status: null, amounts: [], userConfirmationRequired: undefined }))
        )
      );
      const wrongShown = loadWrongAmountShown(peachId);
      let wrongShownDirty = false;
      for (const { offerId, amount, status, amounts, userConfirmationRequired } of checks) {
        const oid = String(offerId);
        // Wrong amount surfaces two ways on /offer/:id/escrow:
        //   userConfirmationRequired === true → seller may confirm this amount
        //     (valid during the mempool state) → continue-or-refund choice;
        //   funding.status === "WRONG_FUNDING_AMOUNT" → can't be used (e.g. above
        //     the trading limit, or multiple UTXOs) → refund only.
        const isChoice = userConfirmationRequired === true;
        const isWrong = isChoice || status === "WRONG_FUNDING_AMOUNT";
        if (isWrong) {
          if (!wrongShown.has(oid)) {
            const fundedSats = amounts.reduce((a, b) => a + b, 0);
            window.dispatchEvent(new CustomEvent("peach:funding-amount-different", {
              detail: {
                offerId: oid,
                variant: isChoice ? "choice" : "refund",
                expectedSats: amount || null,
                fundedSats: fundedSats || null,
              },
            }));
            // Persistent panel entry so dismissing the popup still leaves a trace.
            events.push(_makeNotif(
              `wrong-amount-${oid}`, "warning",
              "Wrong funding amount",
              "You funded the escrow with a different amount. Choose to continue or refund.",
              null, oid
            ));
            wrongShown.add(oid);
            wrongShownDirty = true;
          }
        } else if (status === "FUNDED") {
          const dedupId = `escrow-funded-${offerId}`;
          const isNew = !_state.notifications.some(n => n.id === dedupId);
          if (isNew) {
            events.push(_makeNotif(
              dedupId, "statusChange",
              "Escrow funded",
              "The escrow has been funded and your offer is published.",
              null, String(offerId)
            ));
            window.dispatchEvent(new CustomEvent("peach:offer-published", {
              detail: { offerId: String(offerId), amount },
            }));
          }
          removePendingEscrow(offerId);
        }
      }
      if (wrongShownDirty) saveWrongAmountShown(peachId, wrongShown);
    }

    // ── Contract funded with wrong amount, refund pending ──
    // Surface a global popup once per contract for wrongAmountFundedOnContractRefundWaiting
    // (escrow funded with an unusable amount → refund only). App.jsx mounts the popup.
    // Runs independently of the contract diff so it also fires on a fresh login into
    // a contract already sitting in this state.
    {
      const contractWrongShown = loadContractWrongShown(peachId);
      let contractWrongDirty = false;
      for (const c of contracts) {
        if (c.tradeStatus !== "wrongAmountFundedOnContractRefundWaiting") continue;
        const cid = String(c.id);
        if (contractWrongShown.has(cid)) continue;
        const rawType = (c.type ?? "").toLowerCase();
        const isBuyer = rawType === "bid" || rawType === "buy" || (c.buyer?.id ?? c.buyerId) === peachId;
        window.dispatchEvent(new CustomEvent("peach:contract-wrong-amount", {
          detail: { contractId: cid, role: isBuyer ? "buyer" : "seller" },
        }));
        contractWrongShown.add(cid);
        contractWrongDirty = true;
      }
      if (contractWrongDirty) saveContractWrongShown(peachId, contractWrongShown);
    }

    _addEvents(events);
    saveBaseline();
  } catch {
    // Silently keep last known state on error
  }
}

function _startPolling() {
  if (_interval) return;
  const auth = window.__PEACH_AUTH__;
  if (!auth) return;
  _hydrateForUser(auth.peachId);
  const base = auth.baseUrl ?? API_V1;
  _poll(auth, base);
  _interval = setInterval(() => _poll(auth, base), 15_000);
}

function _stopPolling() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}

// ── Public actions ───────────────────────────────────────────────────────────
function _markAllRead() {
  const readIds = new Set(_state.readIds);
  for (const n of _state.notifications) readIds.add(n.id);
  _state = { ..._state, readIds, unreadCount: 0 };
  saveReadIds(_state.readIds, _state.notifications);
  _updateTitle();
  _notify();
}

function _markRead(notifId) {
  if (_state.readIds.has(notifId)) return;
  const readIds = new Set(_state.readIds);
  readIds.add(notifId);
  const unreadCount = _state.notifications.filter(n => !readIds.has(n.id)).length;
  _state = { ..._state, readIds, unreadCount };
  saveReadIds(_state.readIds, _state.notifications);
  _updateTitle();
  _notify();
}


// ── React hook ───────────────────────────────────────────────────────────────
export function useNotifications() {
  // Hydrate synchronously so the very first render has the user's notifications
  // (idempotent — early-returns if already hydrated for this peachId).
  if (window.__PEACH_AUTH__?.peachId) _hydrateForUser(window.__PEACH_AUTH__.peachId);
  const state = useSyncExternalStore(_subscribe, _getSnapshot);

  return {
    notifications: state.notifications,
    unreadCount:   state.unreadCount,
    readIds:       state.readIds,
    markAllRead:   _markAllRead,
    markRead:      _markRead,
  };
}
