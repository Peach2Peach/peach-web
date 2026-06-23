import { useSyncExternalStore } from "react";
import { STATUS_CONFIG, PENDING_STATUSES } from "../data/statusConfig.js";
import { fetchWithSessionCheck } from "../utils/sessionGuard.js";
import { API_V1 } from "../utils/network.js";
import { getCached, setCache } from "./useApi.js";
import { normalizeOffer, normalizeContract } from "../utils/tradesNormalize.js";
import { hasOfferTurnedToMyContract } from "../utils/peach069.js";

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
      sentRequests:     _stringKeyMap(obj.sentRequests     ?? []),
      rejectionCandidates: (() => {
        const v = obj.rejectionCandidates ?? [];
        // Migrate old format (array of bare offerId strings) to Map(offerId → offerType).
        // Old-format candidates lose their offerType — they're re-evaluated on
        // the next rejection tick once _prevSentRequests has the full info.
        if (v.length > 0 && typeof v[0] === "string") {
          return new Map(v.map(id => [id, null]));
        }
        return new Map(v);
      })(),
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
      sentRequests:     [..._prevSentRequests.entries()],
      rejectionCandidates: [..._rejectionCandidates.entries()],
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

// Mark an offer's wrong-amount popup as already shown. Exported so the
// offer-creation screen (which fires the popup itself the moment it detects the
// wrong amount) can suppress a duplicate pop from the next 15s background poll.
export function markWrongAmountShown(peachId, offerId) {
  if (!peachId || offerId == null) return;
  const set = loadWrongAmountShown(peachId);
  if (set.has(String(offerId))) return;
  set.add(String(offerId));
  saveWrongAmountShown(peachId, set);
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
let _prevSentRequests = new Map(); // offerId → offerType ("buyOffer" | "sellOffer") — outbound trade requests, used to detect rejection by offer owner
let _rejectionCandidates = new Map(); // offerId → offerType ("buyOffer" | "sellOffer") — outbound requests suspected of rejection; only emitted on the second consecutive confirmation tick (race protection)
let _pollTick      = 0;            // incremented every poll; chat layer runs only on even ticks (~16s cadence)
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
    _prevSentRequests       = baseline.sentRequests;
    _rejectionCandidates    = baseline.rejectionCandidates ?? new Map();
    _isFirstPoll            = false;
  } else {
    _prevContracts          = new Map();
    _prevOffers             = new Map();
    _prevTradeRequestCount  = new Map();
    _prevMatchCounts        = new Map();
    _prevOfferUnread        = new Map();
    _prevSentRequests       = new Map();
    _rejectionCandidates    = new Map();
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

// Build the pending-escrow poll list (localStorage ∪ own sell offers in the
// escrow-funding window) and fetch each one's `/offer/:id/escrow` result.
// Shared by the normal poll and the first (baseline) poll so the wrong-amount
// modal can fire on either.
const ESCROW_FUNDING_WINDOW = ["fundEscrow", "escrowWaitingForConfirmation", "fundingAmountDifferent"];
async function _fetchEscrowChecks(peachId, base, hdrs, sellOffers) {
  const byId = new Map();
  for (const e of loadEscrowPending(peachId)) {
    byId.set(String(e.offerId), { offerId: String(e.offerId), amount: e.amount });
  }
  for (const o of sellOffers) {
    if (!ESCROW_FUNDING_WINDOW.includes(o.tradeStatus)) continue;
    const oid = String(o.id);
    if (!byId.has(oid)) byId.set(oid, { offerId: oid, amount: o.amount });
  }
  const pendingEscrows = Array.from(byId.values());
  if (pendingEscrows.length === 0) return [];
  return Promise.all(
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
}

// Fire the global wrong-amount choice modal once per offer (deduped via the
// persisted wrongShown set) and return matching persistent-panel notifs. Callers
// on the normal path push those notifs; the baseline poll discards them so it
// stays notif-silent while still surfacing the urgent modal.
//   userConfirmationRequired === true → mempool, seller may confirm → "choice";
//   funding.status === "WRONG_FUNDING_AMOUNT" → unusable → "refund".
function _dispatchWrongAmountEscrows(checks, peachId) {
  const wrongShown = loadWrongAmountShown(peachId);
  let dirty = false;
  const notifs = [];
  for (const { offerId, amount, status, amounts, userConfirmationRequired } of checks) {
    const oid = String(offerId);
    const isChoice = userConfirmationRequired === true;
    const isWrong = isChoice || status === "WRONG_FUNDING_AMOUNT";
    if (!isWrong || wrongShown.has(oid)) continue;
    const fundedSats = amounts.reduce((a, b) => a + b, 0);
    window.dispatchEvent(new CustomEvent("peach:funding-amount-different", {
      detail: {
        offerId: oid,
        variant: isChoice ? "choice" : "refund",
        expectedSats: amount || null,
        fundedSats: fundedSats || null,
      },
    }));
    notifs.push(_makeNotif(
      `wrong-amount-${oid}`, "warning",
      "Wrong funding amount",
      "You funded the escrow with a different amount. Choose to continue or refund.",
      null, oid
    ));
    wrongShown.add(oid);
    dirty = true;
  }
  if (dirty) saveWrongAmountShown(peachId, wrongShown);
  return notifs;
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

  _pollTick++;
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

    // Auto-dismiss stale tradeRequest notifications: once a contract has been
    // created from an offer, the original "Trade request received" notification
    // is no longer actionable — clicking it would reopen an empty popup.
    // Authoritative linkage via /v069/{buyOffer|sellOffer}/:id/hasTurnedToMyContract:
    // v069 numeric ids and v1 contract.id parts live in different namespaces,
    // so the only reliable "did this offer become a contract for me" signal is
    // the dedicated endpoint. Notifs persisted before offerType existed are
    // skipped here and age out via MAX_NOTIFS / markRead.
    {
      const candidates = _state.notifications.filter(
        n => n.type === "tradeRequest"
          && n.offerId
          && n.offerType
          && !_state.readIds.has(n.id)
      );
      if (candidates.length > 0) {
        const checks = await Promise.all(
          candidates.map(n =>
            hasOfferTurnedToMyContract(n.offerId, n.offerType, auth)
              .then(r => ({ n, accepted: r.accepted }))
          )
        );
        const readIds = new Set(_state.readIds);
        let dismissedAny = false;
        for (const { n, accepted } of checks) {
          if (accepted === true && !readIds.has(n.id)) {
            readIds.add(n.id);
            dismissedAny = true;
          }
        }
        if (dismissedAny) {
          const unreadCount = _state.notifications.filter(n => !readIds.has(n.id)).length;
          _state = { ..._state, readIds, unreadCount };
          saveReadIds(_state.readIds, _state.notifications);
          _updateTitle();
          _notify();
        }
      }
    }

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
      // Even on the baseline poll, surface the urgent wrong-amount choice modal
      // (panel notifs are withheld here to keep the baseline poll notif-silent).
      const firstPollEscrowChecks = await _fetchEscrowChecks(peachId, base, hdrs, sellOffers);
      _dispatchWrongAmountEscrows(firstPollEscrowChecks, peachId);
      saveBaseline();
      _notify();
      return;
    }

    const events = [];
    const now = Date.now();

    // ── Detect acceptance of outbound trade requests ──
    // Positive signal, parallel to the rejection detector below. When the
    // hasTurnedToMyContract endpoint definitively returns accepted=true for
    // an offer the user sent a request to, fire an explicit "Its a match!"
    // and suppress the contract diff's first-sighting notification for the
    // same contract on this tick.
    //
    // Why this exists: on regtest (and any fast environment) the contract
    // can advance through fundEscrow → paymentRequired between two polls,
    // so the contract diff's brand-new branch only ever sees the downstream
    // state. The user then gets "Payment required" instead of the acceptance
    // milestone. Running this check pre-diff with same-tick suppression
    // guarantees the acceptance signal lands first, regardless of cadence.
    const acceptedContractIds = new Set();
    if (_prevSentRequests.size > 0) {
      const sentEntries = [..._prevSentRequests.entries()];
      const checks = await Promise.all(
        sentEntries.map(([offerId, offerType]) =>
          offerType
            ? hasOfferTurnedToMyContract(offerId, offerType, auth)
            : Promise.resolve({ accepted: null, contractId: null })
        )
      );
      sentEntries.forEach(([offerId], i) => {
        const { accepted, contractId } = checks[i];
        if (accepted !== true || !contractId) return;
        const cid = String(contractId);
        const notifId = `o-${offerId}-accepted-${cid}`;
        if (_state.notifications.some(n => n.id === notifId)) return;
        acceptedContractIds.add(cid);
        events.push(_makeNotif(
          notifId, "statusChange",
          "Its a match!",
          "Your trade request was accepted.",
          cid, offerId
        ));
        _prevSentRequests.delete(offerId);
        _rejectionCandidates.delete(offerId);
      });
    }

    // ── Diff contracts ──
    for (const c of contracts) {
      const prev = _prevContracts.get(c.id);
      const status = c.tradeStatus;
      const unread = c.unreadMessages ?? 0;
      const rawType  = (c.type ?? "").toLowerCase();
      const isBuyer  = rawType === "bid" || rawType === "buy" || (c.buyer?.id ?? c.buyerId) === peachId;
      const isSeller = !isBuyer;
      const sellerOv = isSeller ? SELLER_OVERRIDE[status] : null;
      const suppressEmit = acceptedContractIds.has(String(c.id));

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
        } else if (prev.tradeStatus !== status && STATUS_NOTIF[status] && !suppressEmit) {
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
        // Brand new contract since last poll — notify if it has an interesting status,
        // unless the acceptance emitter already fired for this contract on this tick.
        if (STATUS_NOTIF[status] && !suppressEmit) {
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

    // ── Diff outbound trade requests for rejection (every 2nd tick ≈ 16s) ──
    // Detects when an offer owner rejects our sent trade request:
    //   hasPerformedTradeRequest flips true → false on the offer in browse lists.
    // Acceptance (contract created) and self-cancel ("Undo request") also flip
    // the flag — we filter both out: contracts via the contracts list, self-cancel
    // via markSentRequestSelfCancelled() which pre-empties the baseline entry.
    if (_pollTick % 2 === 0) {
      const [browseBuyRes, browseSellRes] = await Promise.all([
        fetchWithSessionCheck(`${v069Base}/buyOffer?ownOffers=false`, { headers: hdrs })
          .then(r => r.ok ? r.json() : null).catch(() => null),
        fetchWithSessionCheck(`${v069Base}/sellOffer?ownOffers=false`, { headers: hdrs })
          .then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      // Skip diff if either list failed — avoid mass-emitting rejections on a transient error
      if (browseBuyRes && browseSellRes) {
        const browseBuyArr  = Array.isArray(browseBuyRes)  ? browseBuyRes  : (browseBuyRes.offers  ?? []);
        const browseSellArr = Array.isArray(browseSellRes) ? browseSellRes : (browseSellRes.offers ?? []);

        const currentSent = new Map(); // offerId → offerType
        for (const o of browseBuyArr)  if (o.hasPerformedTradeRequest) currentSent.set(String(o.id), "buyOffer");
        for (const o of browseSellArr) if (o.hasPerformedTradeRequest) currentSent.set(String(o.id), "sellOffer");

        // Authoritative "did this v069 offer become my contract?" check via
        // /v069/{buyOffer|sellOffer}/:id/hasTurnedToMyContract. Mirrors mobile
        // (ExpressBuyTradeRequestToSellOffer.tsx). Replaces the earlier attempt
        // to derive linkage from /contracts/summary — v069 numeric offer ids
        // and v1 contract.id parts live in different namespaces, so dash-split
        // and c.offerId checks were unreliable and produced false rejections.
        //
        // Tri-state result (true | false | null):
        //   true  → accepted into a contract; never emit rejection
        //   false → endpoint says no contract; eligible for rejection (still
        //           gated by the two-tick confirmation below)
        //   null  → endpoint error; treat as unknown, recheck next tick
        const candidateMap = new Map(); // offerId → offerType
        for (const [offerId, offerType] of _rejectionCandidates) {
          if (!currentSent.has(offerId)) candidateMap.set(offerId, offerType);
        }
        for (const [offerId, offerType] of _prevSentRequests) {
          if (!currentSent.has(offerId) && !candidateMap.has(offerId)) {
            candidateMap.set(offerId, offerType);
          }
        }

        const acceptanceMap = new Map(); // offerId → (true | false | null)
        if (candidateMap.size > 0) {
          const entries = [...candidateMap.entries()];
          const results = await Promise.all(
            entries.map(([id, type]) =>
              type
                ? hasOfferTurnedToMyContract(id, type, auth).then(r => r.accepted)
                : Promise.resolve(null)
            )
          );
          entries.forEach(([id], i) => acceptanceMap.set(id, results[i]));
        }

        // Two-tick confirmation: only emit "declined" when the offer is missing
        // AND hasTurnedToMyContract definitively returned `false` on this
        // (second) tick. Race protection against transient endpoint errors and
        // brief windows where browse-list updates faster than the contract is
        // visible to the endpoint.
        const confirmedRejections = new Set();
        for (const [offerId] of _rejectionCandidates) {
          if (currentSent.has(offerId)) continue;             // came back — false alarm
          if (acceptanceMap.get(offerId) === true) continue;  // accepted into contract
          if (acceptanceMap.get(offerId) !== false) continue; // null/undefined → unknown
          confirmedRejections.add(offerId);
        }
        for (const offerId of confirmedRejections) {
          events.push({
            ..._makeNotif(
              `o-${offerId}-tradeReqRejected-${now}`, "tradeRequest",
              "Trade request declined",
              "The offer owner rejected your request.",
              null, offerId
            ),
            noNavigate: true,
          });
        }

        // Carry forward unresolved candidates (missing AND not confirmed
        // accepted). Stored with offerType so the next rejection tick can
        // re-check via hasTurnedToMyContract even after _prevSentRequests rotates.
        const nextCandidates = new Map();
        for (const [offerId, offerType] of _prevSentRequests) {
          if (currentSent.has(offerId)) continue;
          if (acceptanceMap.get(offerId) === true) continue;
          if (confirmedRejections.has(offerId)) continue;
          nextCandidates.set(offerId, offerType);
        }
        for (const [offerId, offerType] of _rejectionCandidates) {
          if (currentSent.has(offerId)) continue;
          if (acceptanceMap.get(offerId) === true) continue;
          if (confirmedRejections.has(offerId)) continue;
          if (!nextCandidates.has(offerId)) nextCandidates.set(offerId, offerType);
        }
        _rejectionCandidates = nextCandidates;

        _prevSentRequests = currentSent;
      }
    }

    // ── Check pending escrow funding ──
    // `/offer/:id/escrow` reports the on-chain funding result. FUNDED → published;
    // WRONG_FUNDING_AMOUNT → the seller funded a different amount than the offer
    // was made for, so we fire the global wrong-amount popup (App.jsx mounts it).
    //
    // The poll list is the de-duplicated union of:
    //   • localStorage `pendingEscrows` — drives the FUNDED → published path for
    //     offers funded in this browser;
    //   • own sell offers from /offers/summary still in the escrow-funding window.
    // Seeding from the summary makes wrong-amount detection universal (independent
    // of localStorage). The escrow endpoint stays the detection signal because it
    // is the only mempool-timely source — the summary's tradeStatus only flips to
    // `fundingAmountDifferent` after on-chain confirmation.
    const escrowChecks = await _fetchEscrowChecks(peachId, base, hdrs, sellOffers);
    if (escrowChecks.length > 0) {
      // Wrong-amount choice modal + persistent panel notifs (shared helper; the
      // baseline poll above calls the same helper but discards the notifs).
      events.push(..._dispatchWrongAmountEscrows(escrowChecks, peachId));
      // FUNDED → published. Offers flagged wrong above are excluded.
      for (const { offerId, amount, status, userConfirmationRequired } of escrowChecks) {
        const isWrong = userConfirmationRequired === true || status === "WRONG_FUNDING_AMOUNT";
        if (isWrong || status !== "FUNDED") continue;
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

// Pre-empties the outbound trade-request from the diff baseline so a self-cancel
// ("Undo request") doesn't get misread as a rejection on the next poll.
export function markSentRequestSelfCancelled(offerId) {
  if (offerId == null) return;
  _prevSentRequests.delete(String(offerId));
  _rejectionCandidates.delete(String(offerId));
  saveBaseline();
}

// Eagerly seed the diff baseline when the user just sent a new trade request,
// so a fast rejection is detected on the next poll without waiting for the
// periodic browse-list bootstrap.
export function markSentRequestCreated(offerId, offerType) {
  if (offerId == null || !offerType) return;
  _prevSentRequests.set(String(offerId), offerType);
  _rejectionCandidates.delete(String(offerId));
  saveBaseline();
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
