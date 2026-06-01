// useMarketStats — competing-offers + completed-trades premium stats for
// the offer-creation screen.
//
// Strategy:
//   - Count source: `GET /v069/buyOffer?ownOffers=false` (for buy direction)
//     or `GET /v069/sellOffer` (for sell direction). These are the same v069
//     endpoints the market view uses; they return only currently outstanding
//     offers (never contracts), and the server already excludes the caller's
//     own offers. We filter by selected PMs and premium client-side from a
//     single fetched list.
//   - Premium of completed trades: `POST /v1/market/offers/stats/history`
//     (public). Different data source — historical trades, not current offers.
//
//   - One fetch per direction change. Toggling a PM or dragging the premium
//     slider re-filters the cached list locally — no extra HTTP calls.

import { useState, useEffect, useMemo, useRef } from "react";
import { useApi } from "./useApi.js";
import { fetchWithSessionCheck } from "../utils/sessionGuard.js";

function stripDisambiguator(methodId) {
  // Strip only the long `-<Date.now()>` suffix (13 digits), not short trailing
  // numbers that belong to a cash event id (e.g. ...malaga-2140, ...bitcoin-42).
  return (methodId || "").replace(/-\d{10,}$/, "");
}

// Build the combined meansOfPayment object — used only for the avg-premium-of-
// completed-trades call. Same logic as buildPaymentPayload in
// offer-creation/index.jsx.
function buildCombinedMeansOfPayment(pms) {
  if (!pms || pms.length === 0) return null;
  const out = {};
  for (const pm of pms) {
    const methodType = stripDisambiguator(pm.methodId);
    if (!methodType) continue;
    for (const cur of pm.currencies || []) {
      if (!out[cur]) out[cur] = [];
      if (!out[cur].includes(methodType)) out[cur].push(methodType);
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function mopKey(mop) {
  if (!mop) return "";
  return Object.keys(mop)
    .sort()
    .map((c) => `${c}:${mop[c].slice().sort().join(",")}`)
    .join(";");
}

// Build a Set of "currency::methodType" pairs for strict pair matching.
function buildPmPairSet(pms) {
  const set = new Set();
  for (const pm of pms || []) {
    const methodType = stripDisambiguator(pm.methodId);
    if (!methodType) continue;
    for (const cur of pm.currencies || []) {
      set.add(`${cur}::${methodType}`);
    }
  }
  return set;
}

function offerMatchesPmPairs(offer, pairSet) {
  if (!offer?.meansOfPayment || typeof offer.meansOfPayment !== "object") return false;
  for (const [currency, methods] of Object.entries(offer.meansOfPayment)) {
    if (!Array.isArray(methods)) continue;
    for (const m of methods) {
      if (pairSet.has(`${currency}::${m}`)) return true;
    }
  }
  return false;
}

function isOwnOffer(offer, peachId) {
  if (!peachId) return false;
  // sell offers carry `user.id`; buy offers carry `userId`.
  if (offer?.user?.id && offer.user.id === peachId) return true;
  if (offer?.userId && offer.userId === peachId) return true;
  return false;
}

export function useMarketStats({ type, pms, premium }) {
  const { auth, post } = useApi();
  const apiType = type === "sell" ? "ask" : "bid";

  const [offers, setOffers] = useState(null);
  const [avgPremium, setAvgPremium] = useState(null);
  const [loading, setLoading] = useState(true);

  const reqIdRef = useRef(0);

  const meansOfPayment = useMemo(() => buildCombinedMeansOfPayment(pms), [pms]);
  const pmPairSet = useMemo(() => buildPmPairSet(pms), [pms]);
  const pmKey = mopKey(meansOfPayment);

  // ── Fetch outstanding offer list — only when direction changes ────────────
  useEffect(() => {
    let cancelled = false;
    const myReqId = ++reqIdRef.current;
    setLoading(true);

    async function run() {
      if (!auth) {
        if (!cancelled && myReqId === reqIdRef.current) {
          setOffers([]);
          setLoading(false);
        }
        return;
      }
      try {
        const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
        const path = type === "buy"
          ? `${v069Base}/buyOffer?ownOffers=false`
          : `${v069Base}/sellOffer`;
        const res = await fetchWithSessionCheck(path, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) {
          if (!cancelled && myReqId === reqIdRef.current) {
            setOffers([]);
            setLoading(false);
          }
          return;
        }
        const json = await res.json();
        const list = Array.isArray(json) ? json : json?.offers ?? [];
        if (cancelled || myReqId !== reqIdRef.current) return;
        setOffers(list);
        setLoading(false);
      } catch {
        if (!cancelled && myReqId === reqIdRef.current) {
          setOffers([]);
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // ── Fetch avg premium of completed trades — refreshes on PM-set change ───
  useEffect(() => {
    let cancelled = false;
    if (!auth) {
      setAvgPremium(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const body = meansOfPayment ? { meansOfPayment } : {};
        const res = await post("/market/offers/stats/history", body);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setAvgPremium(typeof data?.avgPremium === "number" ? data.avgPremium : null);
      } catch {
        if (!cancelled) setAvgPremium(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pmKey]);

  // ── Client-side filter + counts ──────────────────────────────────────────
  const derived = useMemo(() => {
    if (!Array.isArray(offers)) {
      return { total: 0, beyondCount: 0, hasData: false };
    }
    const peachId = auth?.peachId;
    let filtered = offers.filter((o) => !isOwnOffer(o, peachId));
    if (pms && pms.length > 0) {
      filtered = filtered.filter((o) => offerMatchesPmPairs(o, pmPairSet));
    }
    const beyondCount = filtered.filter((o) => {
      if (typeof o?.premium !== "number") return false;
      return type === "sell" ? o.premium < premium : o.premium > premium;
    }).length;
    return { total: filtered.length, beyondCount, hasData: true };
  }, [offers, pms, pmPairSet, premium, type, auth?.peachId]);

  return { ...derived, avgPremium, loading };
}
