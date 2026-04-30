import { useState, useEffect } from "react";
import { STATUS_CONFIG } from "../data/statusConfig.js";
import { formatTradeId } from "../utils/format.js";
import { fetchWithSessionCheck } from "../utils/sessionGuard.js";

// ── Seller-specific overrides (keyed by status) ─────────────────────────────
const SELLER_OVERRIDE = {
  fundEscrow:             { title: "Fund escrow",              body: "Trade accepted — fund the escrow now." },
  waitingForFunding:      { title: "Fund escrow",              body: "Waiting for you to fund the escrow." },
  paymentRequired:        { title: "Trade initiated ! Awaiting payment",         body: "Waiting for the buyer to send payment." },
  confirmPaymentRequired: { title: "Payment marked as sent",   body: "Check yourbank  account and confirm receipt." },
  releaseEscrow:          { title: "Confirm payment receipt",  body: "Check your account and release escrow from mobile." },
};

// ── Status → notification mapping ────────────────────────────────────────────
const STATUS_NOTIF = {
  hasMatchesAvailable:          { title: "New matches available",   body: "Review and select a match.",             type: "match" },
  offerHiddenWithMatchesAvailable: { title: "New matches available", body: "Review and select a match.",            type: "match" },
  acceptTradeRequest:           { title: "Trade request received",  body: "Review and accept or decline.",          type: "tradeRequest" },
  fundEscrow:                   { title: "Trade accepted",          body: "Waiting for seller to fund escrow.",     type: "statusChange" },
  waitingForFunding:            { title: "Trade accepted",          body: "Waiting for seller to fund escrow.",     type: "statusChange" },
  escrowWaitingForConfirmation: { title: "Escrow funded",           body: "Waiting for blockchain confirmation.",   type: "statusChange" },
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
  createEscrow:                 { title: "Create escrow",            body: "Fun the escrow for this contract.",     type: "statusChange" },
  fundingAmountDifferent:       { title: "Wrong funding amount",     body: "Escrow funded with unexpected amount.",   type: "warning" },
  payoutPending:                { title: "Payout pending",           body: "Bitcoin is being sent to your wallet.",   type: "statusChange" },
  refundAddressRequired:        { title: "Refund address needed",    body: "Provide a refund address to continue.",   type: "warning" },
  refundOrReviveRequired:       { title: "Action needed",            body: "Decide whether to refund or republish.",  type: "warning" },
  refundTxSignatureRequired:    { title: "Refund signature needed",  body: "Sign the refund transaction to continue.", type: "warning" },
  wrongAmountFundedOnContract:  { title: "Wrong amount funded",      body: "Contract funded with incorrect amount.",  type: "warning" },
  wrongAmountFundedOnContractRefundWaiting: { title: "Refund pending", body: "Waiting for refund of incorrect amount.", type: "warning" },
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

function loadNotifs(peachId) {
  const k = keyNotifs(peachId);
  if (!k) return [];
  try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; }
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

function loadBaseline(peachId) {
  const k = keyBaseline(peachId);
  if (!k) return null;
  try {
    const obj = JSON.parse(localStorage.getItem(k));
    if (!obj) return null;
    return {
      contracts:        new Map(obj.contracts        ?? []),
      offers:           new Map(obj.offers           ?? []),
      sellRequests:     new Map((obj.sellRequests    ?? []).map(([id, ids]) => [id, new Set(ids)])),
      matchCounts:      new Map(obj.matchCounts      ?? []),
      preContractChats: new Map((obj.preContractChats ?? []).map(([key, ids]) => [key, new Set(ids)])),
      sentRequests:     new Map(obj.sentRequests     ?? []),
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
      sellRequests:     [..._prevSellRequests.entries()].map(([id, set]) => [id, [...set]]),
      matchCounts:      [..._prevMatchCounts.entries()],
      preContractChats: [..._prevPreContractChats.entries()].map(([key, set]) => [key, [...set]]),
      sentRequests:     [..._prevSentRequests.entries()],
    };
    localStorage.setItem(k, JSON.stringify(obj));
  } catch { /* quota or other — silently skip */ }
}

// ── Singleton polling state ──────────────────────────────────────────────────
let _interval      = null;
let _listeners     = new Set();
let _state         = { notifications: [], unreadCount: 0, readIds: new Set() };
let _prevContracts = new Map();   // id → { tradeStatus, unreadMessages }
let _prevOffers    = new Map();   // id → tradeStatus
let _prevSellRequests = new Map(); // sellOfferId → Set<tradeRequestId> (sell-offer trade-requests workaround for missing tradeStatus)
let _prevMatchCounts = new Map();  // buyOfferId → totalMatches (track additional matches arriving on hasMatchesAvailable offers)
let _prevPreContractChats = new Map(); // chatKey "offerType:offerId:userId" → Set<String(messageId)> (pre-contract chat diff)
let _prevSentRequests = new Map(); // offerId → offerType ("buyOffer" | "sellOffer") — outbound trade requests, used to detect rejection by offer owner
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
    _prevContracts        = baseline.contracts;
    _prevOffers           = baseline.offers;
    _prevSellRequests     = baseline.sellRequests;
    _prevMatchCounts      = baseline.matchCounts;
    _prevPreContractChats = baseline.preContractChats;
    _prevSentRequests     = baseline.sentRequests;
    _isFirstPoll          = false;
  } else {
    _prevContracts        = new Map();
    _prevOffers           = new Map();
    _prevSellRequests     = new Map();
    _prevMatchCounts      = new Map();
    _prevPreContractChats = new Map();
    _prevSentRequests     = new Map();
    _isFirstPoll          = true;
  }
  _updateTitle();
  if (_listeners.size > 0) _notify();
}

function _notify() {
  _listeners.forEach(fn => fn({ ..._state }));
}

function _addEvents(newEvents) {
  if (newEvents.length === 0) return;
  _state.notifications = [...newEvents, ..._state.notifications].slice(0, MAX_NOTIFS);
  _state.unreadCount = _state.notifications.filter(n => !_state.readIds.has(n.id)).length;
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

function _makeNotif(id, type, title, body, contractId, offerId) {
  return { id, type, title, body, contractId: contractId || null, offerId: offerId || null, createdAt: Date.now() };
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
    const [contractsRes, buyRes, ownOffersRes] = await Promise.all([
      fetchWithSessionCheck(`${base}/contracts/summary`, { headers: hdrs }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetchWithSessionCheck(`${v069Base}/buyOffer?ownOffers=true`, { headers: hdrs }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetchWithSessionCheck(`${v069Base}/user/${peachId}/offers`, { headers: hdrs }).then(r => r.ok ? r.json() : null).catch(() => null),
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
    // Contract IDs are composite "buyOfferId-sellOfferId", so both halves count.
    {
      const offerIdsWithContract = new Set();
      for (const c of contracts) {
        for (const part of String(c.id).split("-")) offerIdsWithContract.add(part);
      }
      let dismissedAny = false;
      for (const n of _state.notifications) {
        if (n.type === "tradeRequest" && n.offerId
            && offerIdsWithContract.has(String(n.offerId))
            && !_state.readIds.has(n.id)) {
          _state.readIds.add(n.id);
          dismissedAny = true;
        }
      }
      if (dismissedAny) {
        _state.unreadCount = _state.notifications.filter(n => !_state.readIds.has(n.id)).length;
        saveReadIds(_state.readIds, _state.notifications);
        _updateTitle();
        _notify();
      }
    }

    const buyOffers  = buyRes  ? (Array.isArray(buyRes)  ? buyRes  : (buyRes.offers ?? []))  : [];
    // Own sell offers from /v069/user/{id}/offers (sellOffer endpoint doesn't support ownOffers param)
    const sellOffers = ownOffersRes?.sellOffers ?? [];
    const allOffers  = [
      ...buyOffers.map(o => ({ ...o, _dir: "buy" })),
      ...sellOffers.map(o => ({ ...o, _dir: "sell" })),
    ];

    // ── First poll = baseline only (only when no persisted baseline existed) ──
    if (_isFirstPoll) {
      _isFirstPoll = false;
      for (const c of contracts) {
        _prevContracts.set(c.id, { tradeStatus: c.tradeStatus, unreadMessages: c.unreadMessages ?? 0 });
      }
      for (const o of allOffers) {
        _prevOffers.set(o.id, o.tradeStatus ?? o.tradeStatusNew ?? "");
      }
      saveBaseline();
      _notify();
      return;
    }

    // ── Diff contracts ──
    const events = [];
    const now = Date.now();

    for (const c of contracts) {
      const prev = _prevContracts.get(c.id);
      const status = c.tradeStatus;
      const unread = c.unreadMessages ?? 0;
      const fmtId = formatTradeId(c.id);
      const rawType  = (c.type ?? "").toLowerCase();
      const isBuyer  = rawType === "bid" || rawType === "buy" || (c.buyer?.id ?? c.buyerId) === peachId;
      const isSeller = !isBuyer;
      const sellerOv = isSeller ? SELLER_OVERRIDE[status] : null;

      if (prev) {
        // Status changed
        if (prev.tradeStatus !== status && STATUS_NOTIF[status]) {
          const sn = STATUS_NOTIF[status];
          events.push(_makeNotif(
            `c-${c.id}-${status}-${now}`, sn.type,
            `${sellerOv?.title ?? sn.title}: contract ${fmtId}`, sellerOv?.body ?? sn.body, c.id, null
          ));
        }
        // New unread messages
        if (unread > prev.unreadMessages) {
          const diff = unread - prev.unreadMessages;
          events.push(_makeNotif(
            `c-${c.id}-msg-${now}`, "message",
            diff === 1 ? `New message: contract ${fmtId}` : `${diff} new messages: contract ${fmtId}`,
            "", c.id, null
          ));
        }
      } else {
        // Brand new contract since last poll — notify if it has an interesting status
        if (STATUS_NOTIF[status]) {
          const sn = STATUS_NOTIF[status];
          events.push(_makeNotif(
            `c-${c.id}-${status}-${now}`, sn.type,
            `${sellerOv?.title ?? sn.title}: contract ${fmtId}`, sellerOv?.body ?? sn.body, c.id, null
          ));
        }
      }

      _prevContracts.set(c.id, { tradeStatus: status, unreadMessages: unread });
    }

    // ── Diff offers ──
    for (const o of allOffers) {
      const status = o.tradeStatus ?? o.tradeStatusNew ?? "";
      const prev = _prevOffers.get(o.id);
      const fmtId = formatTradeId(o.id, "offer");

      if (prev && prev !== status && STATUS_NOTIF[status]) {
        const sn = STATUS_NOTIF[status];
        const body = (o._dir === "sell" && (status === "fundEscrow" || status === "waitingForFunding"))
          ? "Waiting for you to fund escrow."
          : sn.body;
        events.push(_makeNotif(
          `o-${o.id}-${status}-${now}`, sn.type,
          `${sn.title}: offer ${fmtId}`, body, null, o.id
        ));
      } else if (!prev && STATUS_NOTIF[status]) {
        // New offer appeared — skip, it's the user's own action
      }

      _prevOffers.set(o.id, status);
    }

    // ── Diff sell-offer trade requests (workaround: sell offers lack tradeStatus) ──
    const trReqResults = await Promise.all(
      sellOffers.map(o =>
        fetchWithSessionCheck(`${v069Base}/sellOffer/${o.id}/tradeRequestReceived/`, { headers: hdrs })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
          .then(data => ({ offerId: String(o.id), data }))
      )
    );

    for (const { offerId, data } of trReqResults) {
      if (!Array.isArray(data)) continue;
      const currentIds = new Set(data.map(tr => String(tr.id)));
      const prevIds = _prevSellRequests.get(offerId);
      if (prevIds === undefined) {
        // First time seeing this offer — baseline only, no notification
        _prevSellRequests.set(offerId, currentIds);
        continue;
      }
      const newIds = [...currentIds].filter(id => !prevIds.has(id));
      if (newIds.length > 0) {
        const fmtId = formatTradeId(offerId, "offer");
        const title = newIds.length === 1
          ? `Trade request received: offer ${fmtId}`
          : `${newIds.length} trade requests received: offer ${fmtId}`;
        events.push(_makeNotif(
          `o-${offerId}-tradeReq-${now}`, "tradeRequest",
          title, "Review and accept or decline.", null, offerId
        ));
      }
      _prevSellRequests.set(offerId, currentIds);
    }

    // Prune _prevSellRequests for sell offers no longer present
    const currentSellIds = new Set(sellOffers.map(o => String(o.id)));
    for (const id of [..._prevSellRequests.keys()]) {
      if (!currentSellIds.has(id)) _prevSellRequests.delete(id);
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
        const fmtId = formatTradeId(offerId, "offer");
        const title = delta === 1
          ? `1 new match: offer ${fmtId}`
          : `${delta} new matches: offer ${fmtId}`;
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

        // Build set of offer ids that became contracts (composite "buyOfferId-sellOfferId")
        const offerIdsWithContract = new Set();
        for (const c of contracts) {
          for (const part of String(c.id).split("-")) offerIdsWithContract.add(part);
        }

        // Emit rejection events for offers that disappeared without becoming a contract.
        // The offer is gone, so the notification is inert (noNavigate) — clicking it does nothing.
        for (const [offerId] of _prevSentRequests) {
          if (currentSent.has(offerId)) continue;
          if (offerIdsWithContract.has(offerId)) continue;
          const fmtId = formatTradeId(offerId, "offer");
          events.push({
            ..._makeNotif(
              `o-${offerId}-tradeReqRejected-${now}`, "tradeRequest",
              `Trade request declined: offer ${fmtId}`,
              "The offer owner rejected your request.",
              null, null
            ),
            noNavigate: true,
          });
        }

        _prevSentRequests = currentSent;
      }
    }

    // ── Diff pre-contract chats (every 2nd tick ≈ 16s) ──
    if (_pollTick % 2 === 0) {
      // Build chat references from sell-offer trade requests (reuse Fix #3 data)
      const chatRefs = [];
      for (const { offerId, data } of trReqResults) {
        if (!Array.isArray(data)) continue;
        for (const tr of data) {
          if (tr.userId) chatRefs.push({ offerType: "sellOffer", offerId, userId: tr.userId });
        }
      }
      // Buy-offer trade-request lists (only offers in acceptTradeRequest state)
      const buyOffersWithRequests = buyOffers.filter(o => o.tradeStatus === "acceptTradeRequest");
      const buyTrResults = await Promise.all(
        buyOffersWithRequests.map(o =>
          fetchWithSessionCheck(`${v069Base}/buyOffer/${o.id}/tradeRequestReceived/`, { headers: hdrs })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
            .then(data => ({ offerId: String(o.id), data }))
        )
      );
      for (const { offerId, data } of buyTrResults) {
        const arr = Array.isArray(data) ? data : (data?.tradeRequests ?? []);
        for (const tr of arr) {
          if (tr.userId) chatRefs.push({ offerType: "buyOffer", offerId, userId: tr.userId });
        }
      }

      // Fetch each pre-contract chat in parallel
      const chatResults = await Promise.all(
        chatRefs.map(ref =>
          fetchWithSessionCheck(`${v069Base}/${ref.offerType}/${ref.offerId}/tradeRequestReceived/${ref.userId}/chat`, { headers: hdrs })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
            .then(data => ({ ref, data }))
        )
      );

      for (const { ref, data } of chatResults) {
        const msgs = Array.isArray(data) ? data : (data?.messages ?? data?.data ?? []);
        if (!Array.isArray(msgs)) continue;
        const theirMsgs = msgs.filter(m => m.sender === "tradeRequester");
        const currentIds = new Set(theirMsgs.map(m => String(m.id)));
        const chatKey = `${ref.offerType}:${ref.offerId}:${ref.userId}`;
        const prevIds = _prevPreContractChats.get(chatKey);
        if (prevIds === undefined) {
          // First time seeing this chat — baseline only, no notification
          _prevPreContractChats.set(chatKey, currentIds);
          continue;
        }
        const newIds = [...currentIds].filter(id => !prevIds.has(id));
        if (newIds.length > 0) {
          const fmtId = formatTradeId(ref.offerId, "offer");
          const title = newIds.length === 1
            ? `New message: offer ${fmtId}`
            : `${newIds.length} new messages: offer ${fmtId}`;
          events.push(_makeNotif(
            `chat-${ref.offerType}-${ref.offerId}-${ref.userId}-${now}`, "message",
            title, "", null, ref.offerId
          ));
        }
        _prevPreContractChats.set(chatKey, currentIds);
      }

      // Prune _prevPreContractChats for chats no longer present
      const currentChatKeys = new Set(chatRefs.map(r => `${r.offerType}:${r.offerId}:${r.userId}`));
      for (const key of [..._prevPreContractChats.keys()]) {
        if (!currentChatKeys.has(key)) _prevPreContractChats.delete(key);
      }
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
  const base = auth.baseUrl ?? import.meta.env.VITE_API_BASE;
  _poll(auth, base);
  _interval = setInterval(() => _poll(auth, base), 8_000);
}

function _stopPolling() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}

// ── Public actions ───────────────────────────────────────────────────────────
function _markAllRead() {
  for (const n of _state.notifications) _state.readIds.add(n.id);
  _state.unreadCount = 0;
  saveReadIds(_state.readIds, _state.notifications);
  _updateTitle();
  _notify();
}

function _markRead(notifId) {
  if (_state.readIds.has(notifId)) return;
  _state.readIds.add(notifId);
  _state.unreadCount = _state.notifications.filter(n => !_state.readIds.has(n.id)).length;
  saveReadIds(_state.readIds, _state.notifications);
  _updateTitle();
  _notify();
}

// Pre-empties the outbound trade-request from the diff baseline so a self-cancel
// ("Undo request") doesn't get misread as a rejection on the next poll.
export function markSentRequestSelfCancelled(offerId) {
  if (offerId == null) return;
  _prevSentRequests.delete(String(offerId));
  saveBaseline();
}

// Eagerly seed the diff baseline when the user just sent a new trade request,
// so a fast rejection is detected on the next poll without waiting for the
// periodic browse-list bootstrap.
export function markSentRequestCreated(offerId, offerType) {
  if (offerId == null || !offerType) return;
  _prevSentRequests.set(String(offerId), offerType);
  saveBaseline();
}

// ── React hook ───────────────────────────────────────────────────────────────
export function useNotifications() {
  // Hydrate synchronously so the very first render has the user's notifications
  // (idempotent — early-returns if already hydrated for this peachId).
  if (window.__PEACH_AUTH__?.peachId) _hydrateForUser(window.__PEACH_AUTH__.peachId);
  const [state, setState] = useState(_state);

  useEffect(() => {
    _listeners.add(setState);
    if (_listeners.size === 1) _startPolling();
    return () => {
      _listeners.delete(setState);
      if (_listeners.size === 0) _stopPolling();
    };
  }, []);

  return {
    notifications: state.notifications,
    unreadCount:   state.unreadCount,
    readIds:       state.readIds,
    markAllRead:   _markAllRead,
    markRead:      _markRead,
  };
}
