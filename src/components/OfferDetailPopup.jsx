// ─── OFFER DETAIL POPUP — shared across MARKET and USER PROFILE screens ──
// Self-contained: owns all UI state, polling, PGP encryption, trade request
// flow, premium-edit and withdraw flows for own offers, and the 5s undo
// window. Delegates to RequestedOfferPopup for already-requested offers.
//
// Parents pass the offer + callbacks; the popup signals events back via
// callbacks (caller decides side effects on its own offer-list state).
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { formatPeachId } from "./Navbars.jsx";
import { SatsAmount } from "./BitcoinAmount.jsx";
import { useApi } from "../hooks/useApi.js";
import { useCurrency } from "./AppLayout.jsx";
import { useUserPMs } from "../hooks/useUserPMs.js";
import { markSentRequestCreated } from "../hooks/useNotifications.js";
import { fetchWithSessionCheck } from "../utils/sessionGuard.js";
import {
  generateSymmetricKey, encryptForRecipients, encryptSymmetric,
  encryptForPublicKey, signPGPMessage, hashPaymentFields,
} from "../utils/pgp.js";
import { fmtFiat } from "../utils/format.js";
import PeachRating from "./PeachRating.jsx";
import Avatar from "./Avatar.jsx";
import RepeatTraderBadge from "./RepeatTraderBadge.jsx";
import RequestedOfferPopup from "./RequestedOfferPopup.jsx";
import { BadgesInfoPopup } from "./InfoPopup.jsx";
import { methodDisplayName } from "../data/paymentMethodMeta.js";
import { methodLabel } from "./AddPMFlow.jsx";

const CURRENCY_SYMS = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF " };
const currSym = (c) => CURRENCY_SYMS[c] ?? `${c} `;

// PM normalization (mirrors market-view) — strips structural fields and
// builds the {id, type, currencies, details} shape the popup expects.
function normalizeUserPMs(pmsRaw) {
  if (!pmsRaw) return [];
  // NOTE: `country` is intentionally NOT in this STRUCTURAL set — it's a
  // legitimate per-PM detail (e.g. SEPA IBAN's 2-letter country code) that
  // must survive into pm.details so executeRequestTrade can forward it to
  // hashPaymentFields. The cleanData STRUCTURAL sets below DO include
  // "country" — that's correct, since country travels in the plaintext
  // hash bucket and must not be duplicated into the encrypted payload.
  const STRUCTURAL = new Set([
    "id", "methodId", "type", "name", "label", "currencies", "hashes",
    "details", "data", "anonymous",
  ]);
  const shortId = (raw) => raw.replace(/-\d+$/, "");
  const sweepFields = (obj) => {
    const explicit = obj.data || obj.details || null;
    if (explicit) return explicit;
    const swept = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!STRUCTURAL.has(k) && typeof v !== "object") swept[k] = v;
    }
    return swept;
  };
  if (Array.isArray(pmsRaw) && pmsRaw.length > 0) {
    return pmsRaw.map(pm => ({
      id: pm.id,
      type: shortId(pm.type ?? pm.id),
      label: pm.label || "",
      currencies: pm.currencies ?? [],
      details: sweepFields(pm),
    }));
  }
  if (typeof pmsRaw === "object") {
    return Object.entries(pmsRaw).map(([key, val]) => ({
      id: val?.id || key,
      type: shortId(key),
      label: val?.label || "",
      currencies: val?.currencies ?? [],
      details: sweepFields(val || {}),
    }));
  }
  return [];
}

export default function OfferDetailPopup({
  offer,
  onClose,
  onLocalRequestedChange = () => {},
  onOfferUpdated = () => {},
  onOfferWithdrawn = () => {},
  onContractAccepted = () => {},
  onTradeRequested = () => {},
  onToast = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { get, post, patch, auth } = useApi();
  const isLoggedIn = !!auth;
  const { btcPrice, selectedCurrency, allPrices } = useCurrency();
  const { pms: pmsRaw, error: pmFetchError } = useUserPMs(auth);
  const pmError = !!pmFetchError;
  const userPMs = normalizeUserPMs(pmsRaw);

  // ── Lifted state (was in market-view) ──
  const [selectedPM, setSelectedPM] = useState(null);
  const [popupCurrency, setPopupCurrency] = useState(
    offer && offer.currencies.length === 1 ? offer.currencies[0] : null
  );
  const [requestAnim, setRequestAnim] = useState(false);
  const [localJustRequested, setLocalJustRequested] = useState(false);
  const [acceptedContractId, setAcceptedContractId] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [offerDetails, setOfferDetails] = useState(null);
  const [editingPremium, setEditingPremium] = useState(false);
  const [editPremiumVal, setEditPremiumVal] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [badgesHelpOpen, setBadgesHelpOpen] = useState(false);

  const pendingTimerRef = useRef(null);
  const popupRequestSeenRef = useRef(false);
  const popupRequestMissingRef = useRef(0);
  const notifiedRequestedRef = useRef(false);
  const autoSelectedForRef = useRef(null);
  useEffect(() => () => { if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current); }, []);

  // Pre-select the only compatible PM (and its currency) when the popup opens
  // for an offer where the user has exactly one matching PM. Runs once per
  // distinct offer.id; never overrides an explicit user choice.
  useEffect(() => {
    if (!offer || !userPMs.length) return;
    if (autoSelectedForRef.current === offer.id) return;
    if (selectedPM !== null) return;
    const compatible = userPMs.filter(pm =>
      offer.currencies.some(c => pmWorksForCurrency(offer, pm, c))
    );
    if (compatible.length === 1) {
      const pm = compatible[0];
      setSelectedPM(pm.id);
      if (!popupCurrency) {
        const cur = pickRelevantCurrency(offer, pm, selectedCurrency);
        if (cur) setPopupCurrency(cur);
      }
    }
    autoSelectedForRef.current = offer.id;
  }, [offer, userPMs, selectedPM, popupCurrency, selectedCurrency]);

  // ── Fetch details + polling (mirrors market-view 183-300) ──
  useEffect(() => {
    if (!offer || !auth) {
      setDetailsLoading(false);
      setOfferDetails(null);
      return;
    }
    const offerId = offer.id;
    const isOwn = offer.isOwn;
    const isSell = offer.type === "ask";
    const offerTypePath = isSell ? "sellOffer" : "buyOffer";
    let cancelled = false;
    setDetailsLoading(true);
    setOfferDetails(null);

    async function refresh(isInitial) {
      try {
        const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
        const hdrs = { Authorization: `Bearer ${auth.token}` };
        const [detailsRes, tradeReqRes, contractsRes] = await Promise.all([
          isSell
            ? fetchWithSessionCheck(`${v069Base}/sellOffer/${offerId}`, { headers: hdrs })
            : Promise.resolve(null),
          isOwn
            ? Promise.resolve(null)
            : fetchWithSessionCheck(`${v069Base}/${offerTypePath}/${offerId}/tradeRequestPerformed`, { headers: hdrs }),
          isOwn
            ? Promise.resolve(null)
            : get('/contracts/summary'),
        ]);
        if (cancelled) return;
        const details = detailsRes && detailsRes.ok ? await detailsRes.json().catch(() => null) : null;
        let tradeReq = null;
        let tradeReqExists = false;
        if (tradeReqRes) {
          if (tradeReqRes.status === 404) {
            tradeReqExists = false;
          } else if (tradeReqRes.ok) {
            const body = await tradeReqRes.json().catch(() => null);
            if (body && body.success !== true) {
              tradeReq = body;
              tradeReqExists = true;
            }
          }
        }
        let acceptedContract = null;
        let contractsConfirmedNoMatch = false;
        if (contractsRes && contractsRes.ok) {
          const list = await contractsRes.json().catch(() => null);
          if (Array.isArray(list)) {
            const offerIdStr = String(offerId);
            const match = list.find(c =>
              (c.offerId != null && String(c.offerId) === offerIdStr) ||
              String(c.id).split("-").includes(offerIdStr)
            );
            if (match) acceptedContract = String(match.id);
            else contractsConfirmedNoMatch = true;
          }
        }
        if (cancelled) return;
        setOfferDetails({ details, tradeRequest: tradeReq });
        if (acceptedContract) {
          setAcceptedContractId(prev => prev === acceptedContract ? prev : acceptedContract);
        }
        if (tradeReqExists) {
          popupRequestSeenRef.current = true;
          popupRequestMissingRef.current = 0;
          if (!notifiedRequestedRef.current) {
            notifiedRequestedRef.current = true;
            setLocalJustRequested(true);
            onLocalRequestedChange(offerId, true);
          }
        } else if (!isOwn && contractsConfirmedNoMatch) {
          if (popupRequestSeenRef.current) {
            popupRequestMissingRef.current += 1;
            if (popupRequestMissingRef.current >= 3 && !acceptedContractId) {
              notifiedRequestedRef.current = false;
              setLocalJustRequested(false);
              onLocalRequestedChange(offerId, false);
              onClose();
            }
          } else if (notifiedRequestedRef.current) {
            notifiedRequestedRef.current = false;
            setLocalJustRequested(false);
            onLocalRequestedChange(offerId, false);
          }
        }
      } catch {
        // Swallow — popup still shows cached offer data on failure.
      } finally {
        if (isInitial && !cancelled) setDetailsLoading(false);
      }
    }

    refresh(true);
    const iv = setInterval(() => refresh(false), 10000);
    return () => { cancelled = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer?.id, offer?.type, offer?.isOwn]);

  // ── Helpers ──
  function pmWorksForCurrency(offer, pm, currency) {
    const methods = offer._raw?.meansOfPayment?.[currency] ?? [];
    return methods.includes(pm.type) && (pm.currencies ?? []).includes(currency);
  }

  // Prefer `prefer` if the PM supports it on this offer; otherwise the first
  // currency in offer.currencies the PM supports. Null when nothing works.
  function pickRelevantCurrency(offer, pm, prefer) {
    if (prefer && pmWorksForCurrency(offer, pm, prefer)) return prefer;
    return offer.currencies.find(c => pmWorksForCurrency(offer, pm, c)) ?? null;
  }

  async function resolveCounterpartyKeys(offer) {
    const direct = (offer._raw?.user?.pgpPublicKeys ?? [])
      .map(k => typeof k === "string" ? k : k?.publicKey)
      .filter(Boolean);
    if (direct.length > 0) return direct;

    const userId = offer._raw?.userId ?? offer._raw?.user?.id;
    if (!userId) return [];
    try {
      const res = await get(`/user/${userId}`);
      if (!res.ok) return [];
      const user = await res.json().catch(() => null);
      return (user?.pgpPublicKeys ?? [])
        .map(k => typeof k === "string" ? k : k?.publicKey)
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  // ── Own-offer handlers ──
  async function handleSavePremium(offer) {
    const val = parseFloat(editPremiumVal);
    if (isNaN(val)) { setEditError("Enter a valid number"); return; }
    setEditSaving(true); setEditError(null);
    try {
      const res = await patch(`/offer/${offer.id}`, { premium: val });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || d?.message || `Server error ${res.status}`);
      }
      const updated = { ...offer, premium: val };
      onOfferUpdated(updated);
      setEditingPremium(false);
      onToast("Premium updated", "success");
    } catch (err) {
      setEditError(err.message || "Failed to save");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleWithdraw(offer) {
    setWithdrawing(true); setWithdrawError(null);
    try {
      const res = await post(`/offer/${offer.id}/cancel`, {});
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Server error ${res.status}`);
      }
      if (data?.psbt) {
        onOfferWithdrawn(offer.id, { needsMobileSign: true });
        onToast("Refund sent to mobile for signing", "orange");
        onClose();
        return;
      }
      onOfferWithdrawn(offer.id, { needsMobileSign: false });
      onToast("Offer withdrawn", "success");
      onClose();
    } catch (err) {
      setWithdrawError(err.message || "Failed to withdraw");
    } finally {
      setWithdrawing(false);
    }
  }

  // ── 5s cancel window ──
  function stageRequest(offer, kind) {
    if (!auth?.pgpPrivKey || !selectedPM || !popupCurrency || tradeLoading) return;
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    setPendingRequest({ offer, kind });
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      setPendingRequest(null);
      if (kind === "instant") executeInstantTrade(offer);
      else executeRequestTrade(offer);
    }, 5000);
  }

  function cancelPendingRequest() {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    setPendingRequest(null);
  }

  function sendNowPendingRequest() {
    if (!pendingRequest) return;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    const { offer, kind } = pendingRequest;
    setPendingRequest(null);
    if (kind === "instant") executeInstantTrade(offer);
    else executeRequestTrade(offer);
  }

  async function executeRequestTrade(offer) {
    if (!auth?.pgpPrivKey || !selectedPM || !popupCurrency || tradeLoading) return;
    setTradeLoading(true);

    const pmObj = userPMs.find(pm => pm.id === selectedPM);
    if (!pmObj) return;

    const STRUCTURAL = new Set(["id", "methodId", "type", "name", "label", "currencies", "hashes", "details", "data", "country", "anonymous"]);
    const cleanData = {};
    const pmDetails = pmObj.details || {};
    for (const [k, v] of Object.entries(pmDetails)) {
      if (!STRUCTURAL.has(k) && typeof v !== "object") cleanData[k] = v;
    }

    try {
      const symmetricKey = generateSymmetricKey();
      const counterpartyKeys = await resolveCounterpartyKeys(offer);
      if (counterpartyKeys.length === 0) {
        onToast("Could not load recipient PGP key — please try again", "error");
        setTradeLoading(false);
        return;
      }

      let symmetricKeyEncrypted = null;
      let symmetricKeySignature = null;
      let paymentDataEncrypted = null;
      let paymentDataSignature = null;
      let paymentDataHashed = null;

      const keyResult = await encryptForRecipients(symmetricKey, counterpartyKeys, auth.pgpPrivKey);
      if (keyResult) {
        symmetricKeyEncrypted = keyResult.encrypted;
        symmetricKeySignature = keyResult.signature;
      }

      if (Object.keys(cleanData).length > 0 && symmetricKey) {
        const pmJson = JSON.stringify(cleanData);
        paymentDataEncrypted = await encryptSymmetric(pmJson, symmetricKey);
        paymentDataSignature = await signPGPMessage(pmJson, auth.pgpPrivKey);
        paymentDataHashed = await hashPaymentFields(pmObj.type, cleanData, pmDetails.country || undefined);
      }

      const offerType = offer.type === "bid" ? "buyOffer" : "sellOffer";
      const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
      const res = await fetchWithSessionCheck(`${v069Base}/${offerType}/${offer.id}/tradeRequestPerformed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          paymentMethod: pmObj.type,
          currency: popupCurrency,
          paymentDataHashed,
          paymentDataEncrypted,
          paymentDataSignature,
          symmetricKeyEncrypted,
          symmetricKeySignature,
        }),
      });

      if (res.ok) {
        markSentRequestCreated(offer.id, offerType);
        setRequestAnim(true);
        setLocalJustRequested(true);
        onLocalRequestedChange(offer.id, true);
        onTradeRequested(offer.id);
        setTimeout(() => {
          setRequestAnim(false);
          setTradeLoading(false);
        }, 1600);
      } else {
        const err = await res.json().catch(() => ({}));
        onToast("Trade request failed: " + (err.error || "try again"), "error");
        setTradeLoading(false);
      }
    } catch (e) {
      onToast("Trade request error: " + e.message, "error");
      setTradeLoading(false);
    }
  }

  async function executeInstantTrade(offer) {
    console.log("[InstantTrade] called", { pgpPrivKey: !!auth?.pgpPrivKey, selectedPM, popupCurrency, tradeLoading, offerType: offer?.type, offerId: offer?.id });
    if (!auth?.pgpPrivKey || !selectedPM || !popupCurrency || tradeLoading) return;
    setTradeLoading(true);

    const pmObj = userPMs.find(pm => pm.id === selectedPM);
    console.log("[InstantTrade] pmObj:", pmObj ? pmObj.id : "NOT FOUND", "selectedPM:", selectedPM, "userPMs IDs:", userPMs.map(p => p.id));
    if (!pmObj) return;

    const STRUCTURAL = new Set(["id", "methodId", "type", "name", "label", "currencies", "hashes", "details", "data", "country", "anonymous"]);
    const cleanData = {};
    const pmDetails = pmObj.details || {};
    for (const [k, v] of Object.entries(pmDetails)) {
      if (!STRUCTURAL.has(k) && typeof v !== "object") cleanData[k] = v;
    }
    console.log("[InstantTrade] cleanData:", cleanData);

    let symmetricKeyEncrypted = null;
    let symmetricKeySignature = null;
    let paymentDataEncrypted = null;
    let paymentDataSignature = null;
    let paymentDataHashed = null;

    try {
      const infoRes = await get('/info');
      const infoData = await infoRes.json().catch(() => null);
      const serverPGPKey = infoData?.peach?.pgpPublicKey ?? null;
      console.log("[InstantTrade] Server PGP key:", serverPGPKey ? "fetched" : "MISSING");

      const symmetricKey = generateSymmetricKey();
      const counterpartyKeys = await resolveCounterpartyKeys(offer);
      console.log("[InstantTrade] counterpartyKeys count:", counterpartyKeys.length);
      if (counterpartyKeys.length === 0) {
        onToast("Could not load recipient PGP key — please try again", "error");
        setTradeLoading(false);
        return;
      }

      const keyResult = await encryptForRecipients(symmetricKey, counterpartyKeys, auth.pgpPrivKey);
      if (keyResult) {
        symmetricKeyEncrypted = keyResult.encrypted;
        symmetricKeySignature = keyResult.signature;
      }
      console.log("[InstantTrade] encryptForRecipients:", keyResult ? "OK" : "FAILED");

      if (Object.keys(cleanData).length > 0 && symmetricKey) {
        const pmJson = JSON.stringify(cleanData);
        if (serverPGPKey) {
          paymentDataEncrypted = await encryptForPublicKey(pmJson, serverPGPKey);
          console.log("[InstantTrade] encryptForPublicKey result:", paymentDataEncrypted ? "OK" : "FAILED (null)");
        }
        if (!paymentDataEncrypted) {
          console.warn("[InstantTrade] Falling back to symmetric encryption");
          paymentDataEncrypted = await encryptSymmetric(pmJson, symmetricKey);
        }
        paymentDataSignature = await signPGPMessage(pmJson, auth.pgpPrivKey);
        paymentDataHashed = await hashPaymentFields(pmObj.type, cleanData, pmDetails.country || undefined);
      }
      console.log("[InstantTrade] encryption done, paymentDataEncrypted:", !!paymentDataEncrypted);

      const offerType = offer.type === "bid" ? "buyOffer" : "sellOffer";
      const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetchWithSessionCheck(`${v069Base}/${offerType}/${offer.id}/performInstantTrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          paymentMethod: pmObj.type,
          currency: popupCurrency,
          paymentDataHashed,
          paymentDataEncrypted,
          paymentDataSignature,
          symmetricKeyEncrypted,
          symmetricKeySignature,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const contract = await res.json();
        const contractId = contract.id ?? contract.contractId;
        if (contractId) onContractAccepted(String(contractId));
      } else {
        const err = await res.json().catch(() => ({}));
        onToast("Instant trade failed: " + (err.error || "try again"), "error");
      }
    } catch (e) {
      const msg = e.name === "AbortError" ? "Request timed out — try again" : e.message;
      onToast("Instant trade error: " + msg, "error");
    } finally {
      setTradeLoading(false);
    }
  }

  // ── Guards ──
  if (!offer) return null;

  const isOwn = offer.isOwn;
  const isRequested = (offer.hasPerformedTradeRequest || localJustRequested || !!acceptedContractId) && !isOwn;
  const isInstant = offer.auto;
  const displayCurrency = popupCurrency ?? selectedCurrency;
  const displayBtcPrice = Math.round(allPrices?.[displayCurrency] ?? btcPrice);
  const sym = currSym(displayCurrency);
  const rate = Math.round(displayBtcPrice * (1 + offer.premium / 100));
  const fiat = (offer.amount / 100_000_000) * displayBtcPrice * (1 + offer.premium / 100);
  // Color from the viewer's perspective, matching the list row's premiumCls(premium, isSellTab):
  // ask/buy-tab → positive = bad (red); bid/sell-tab → positive = good (green).
  const premCls = offer.premium === 0 ? "prem-zero" : offer.type === "ask"
    ? (offer.premium > 0 ? "prem-bad" : "prem-good")
    : (offer.premium < 0 ? "prem-bad" : "prem-good");

  const validByPM = userPMs.map(pm => ({
    pm,
    currencies: offer.currencies.filter(c => pmWorksForCurrency(offer, pm, c)),
  }));
  const hasMissingPM = !validByPM.some(v => v.currencies.length > 0);
  const visiblePMs = popupCurrency
    ? validByPM.filter(v => v.currencies.includes(popupCurrency)).map(v => v.pm)
    : validByPM.filter(v => v.currencies.length > 0).map(v => v.pm);

  // Avatar / peachId profile link — disabled when we're already on a /user/ route.
  const onProfileRoute = location.pathname.startsWith("/user/");
  const canVisitProfile = isLoggedIn && offer.userId && !isOwn && !onProfileRoute;
  const handleVisitProfile = (e) => {
    if (!canVisitProfile) return;
    e.stopPropagation();
    onClose();
    navigate(`/user/${offer.userId}`);
  };

  // ── "Trade Requested" success animation ──
  if (requestAnim) {
    return (
      <div className="popup-overlay" onClick={onClose}>
        <div className="popup-card popup-anim-card" onClick={e => e.stopPropagation()}>
          <div className="popup-success-anim">
            <div className="popup-success-circle">
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                <path d="M10 19l6 6 12-12" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                  className="popup-check-path"/>
              </svg>
            </div>
            <div style={{fontWeight:800,fontSize:"1.1rem",color:"var(--black)",marginTop:16}}>Trade requested!</div>
            <div style={{fontSize:".82rem",color:"var(--black-65)",fontWeight:500,marginTop:4}}>
              You'll be notified when the {offer.type === "ask" ? "seller" : "buyer"} responds.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Already-requested branch → RequestedOfferPopup ──
  if (isRequested) {
    return (
      <RequestedOfferPopup
        offer={offer}
        auth={auth}
        selectedCurrency={selectedCurrency}
        btcPrice={btcPrice}
        onClose={onClose}
        acceptedContractId={acceptedContractId}
        onAccepted={(contractId) => {
          setAcceptedContractId(prev => prev === contractId ? prev : contractId);
        }}
        onOpenTrade={() => {
          if (!acceptedContractId) return;
          onContractAccepted(acceptedContractId);
        }}
        onUndoSuccess={(offerId) => {
          notifiedRequestedRef.current = false;
          setLocalJustRequested(false);
          onLocalRequestedChange(offerId, false);
        }}
      />
    );
  }

  // ── Main detail card ──
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="popup-header">
          <div className="popup-header-left">
            <span className="popup-title">
              {isOwn ? "Your offer" : "Offer details"}
              <span className="offer-id-label" style={{marginLeft:8}}>{offer.tradeId}</span>
              {detailsLoading && (
                <span
                  aria-label="Loading details"
                  title="Loading details"
                  style={{
                    display:"inline-block",
                    marginLeft:8,
                    fontSize:".78rem",
                    animation:"spin 1s linear infinite",
                    color:"var(--black-50)",
                    verticalAlign:"middle",
                  }}
                >↻</span>
              )}
            </span>
            {isInstant && <span className="auto-badge">⚡ Instant</span>}
            {offer.experienceLevel === "newUsersOnly" && <span className="exp-badge">🆕 FOR NEW USERS</span>}
            {offer.experienceLevel === "experiencedUsersOnly" && <span className="exp-badge">👤 FOR EXPERIENCED USERS</span>}
          </div>
          <button className="popup-close" onClick={onClose}>✕</button>
        </div>

        {/* Offer summary */}
        <div className="popup-body">
          {/* Peer row */}
          <div className="popup-peer-row">
            <div
              style={{cursor: canVisitProfile ? "pointer" : "default"}}
              onClick={handleVisitProfile}
              title={canVisitProfile ? "View user profile" : undefined}
            >
              <Avatar peachId={offer.userId} size={30} online={offer.online} />
            </div>
            <div style={{flex:1}}>
              {offer.userId && (
                <div
                  onClick={handleVisitProfile}
                  style={{
                    fontSize:".76rem", fontWeight:700, fontFamily:"monospace", letterSpacing:".04em",
                    color: canVisitProfile ? "var(--primary)" : "var(--black-65)",
                    cursor: canVisitProfile ? "pointer" : "default",
                    textDecoration: canVisitProfile ? "underline" : "none",
                    marginBottom: 2,
                  }}
                  title={canVisitProfile ? "View user profile" : undefined}
                >
                  {formatPeachId(offer.userId).toLowerCase()}
                </div>
              )}
              <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                <PeachRating rep={offer.rep} size={16} trades={offer.trades}/>
                <span className="rep-trades">({offer.trades} trades)</span>
                {isOwn && <span className="own-label" style={{marginLeft:6}}>Your offer</span>}
              </div>
            </div>
            <div className="popup-user-badges">
              {offer.badges.includes("supertrader") && <span className="badge badge-super" style={{cursor:"pointer"}} onClick={(e) => { e.stopPropagation(); setBadgesHelpOpen(true); }}>🏆 Super</span>}
              {offer.badges.includes("fast") && <span className="badge badge-fast" style={{cursor:"pointer"}} onClick={(e) => { e.stopPropagation(); setBadgesHelpOpen(true); }}>⚡ Fast</span>}
              {offer.badges.includes("ambassador") && <span className="badge badge-ambassador" style={{cursor:"pointer"}} onClick={(e) => { e.stopPropagation(); setBadgesHelpOpen(true); }}>⭐ Early adopter</span>}
              <RepeatTraderBadge userId={offer.userId} />
            </div>
          </div>

          {/* Summary rows */}
          <div className="popup-summary">
            <div className="popup-row">
              <span className="popup-label">Amount</span>
              <span className="popup-value"><SatsAmount sats={offer.amount}/></span>
            </div>
            <div className="popup-row">
              <span className="popup-label">Fiat value</span>
              <span className="popup-value" style={{fontWeight:800}}>{sym}{fmtFiat(fiat)}</span>
            </div>
            <div className="popup-row">
              <span className="popup-label">Price</span>
              <span className="popup-value">{rate.toLocaleString("fr-FR")} {sym} / BTC</span>
            </div>
            <div className="popup-row">
              <span className="popup-label">Premium</span>
              <span className={`popup-value ${premCls}`} style={{fontWeight:800}}>
                {offer.premium > 0 ? "+" : ""}{offer.premium.toFixed(2)}%
              </span>
            </div>
            <div className="popup-row">
              <span className="popup-label">Payment methods</span>
              <span className="popup-value">
                <span style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                  {offer.methods.map(m => {
                    // Country code comes from the seller's hash bucket
                    // (auto-extracted from IBAN's first 2 chars on save). For
                    // SEPA in particular this distinguishes SEPA-NL from SEPA-DE.
                    const country = offerDetails?.details?.paymentData?.[m]?.country;
                    return (
                      <span key={m} className="method-chip">
                        {methodDisplayName(m)}{country ? ` (${country})` : ""}
                      </span>
                    );
                  })}
                </span>
              </span>
            </div>
            <div className="popup-row">
              <span className="popup-label">Currencies</span>
              <span className="popup-value">
                <span style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"flex-end"}}>
                  {offer.currencies.map(c => <span key={c} className="currency-chip">{c}</span>)}
                </span>
              </span>
            </div>
            {offerDetails?.details?.escrow && (
              <div className="popup-row">
                <span className="popup-label">Onchain escrow</span>
                <span className="popup-value">
                  <a
                    href={`https://mempool.space/address/${offerDetails.details.escrow}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize:".78rem", fontWeight:600, color:"var(--primary)",
                      textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4,
                    }}
                  >
                    See on mempool.space
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 9L9 2M9 2H5M9 2v4"/>
                    </svg>
                  </a>
                </span>
              </div>
            )}
          </div>

          {/* ── TRADE REQUEST variant: PM selector (or sign-in CTA) ── */}
          {!isOwn && !isLoggedIn && (
            <div style={{textAlign:"center",padding:"18px 0 4px"}}>
              <div style={{fontWeight:700,fontSize:".88rem",color:"var(--black)"}}>
                Sign in to trade!
              </div>
              <div style={{fontSize:".78rem",color:"var(--black-65)",lineHeight:1.5,marginTop:4}}>
                Create an account or log in to match with this offer.
              </div>
            </div>
          )}
          {!isOwn && isLoggedIn && (
            <>
              <div className="popup-section-label">
                Select your payment method
              </div>
              {pmError ? (
                <div style={{padding:"12px 16px",borderRadius:10,background:"var(--error-bg)",
                  color:"var(--error)",fontWeight:700,fontSize:".82rem",textAlign:"center"}}>
                  Failed to load payment data
                </div>
              ) : hasMissingPM ? (
                <div className="popup-pm-warning">
                  <span style={{fontSize:"1rem",flexShrink:0}}>⚠️</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:".82rem",color:"var(--black)",marginBottom:2}}>
                      No matching payment method
                    </div>
                    <div style={{fontSize:".76rem",color:"var(--black-65)",lineHeight:1.5}}>
                      This offer accepts {offer.methods.map(methodDisplayName).join(", ")} but you haven't configured any of these.
                    </div>
                    <button className="popup-pm-link" onClick={() => navigate("/payment-methods")}>
                      Go to Payment Methods →
                    </button>
                  </div>
                </div>
              ) : visiblePMs.length === 0 ? (
                <div className="popup-pm-warning">
                  <span style={{fontSize:"1rem",flexShrink:0}}>⚠️</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:".82rem",color:"var(--black)",marginBottom:2}}>
                      No payment method for {popupCurrency}
                    </div>
                    <div style={{fontSize:".76rem",color:"var(--black-65)",lineHeight:1.5}}>
                      None of your configured payment methods support {popupCurrency} for this offer.
                    </div>
                    <button className="popup-pm-link" onClick={() => navigate("/payment-methods")}>
                      Go to Payment Methods →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="popup-pm-list">
                  {visiblePMs.map(pm => {
                    const sel = selectedPM === pm.id;
                    // Use the shared methodLabel helper so SEPA shows a masked
                    // IBAN preview, Revolut shows the username, m-pesa shows
                    // the masked phone, etc. — same precedence as the PM cards
                    // on the Payment Methods screen.
                    const detailStr = methodLabel(pm);
                    const validChips = pm.currencies.filter(c => pmWorksForCurrency(offer, pm, c));
                    return (
                      <button key={pm.id}
                        className={`popup-pm-option${sel ? " selected" : ""}`}
                        onClick={() => {
                          if (sel) { setSelectedPM(null); return; }
                          setSelectedPM(pm.id);
                          // Keep the current currency if it still works with
                          // the new PM; otherwise auto-pick the most relevant
                          // (prefers the user's global selectedCurrency).
                          if (popupCurrency && pmWorksForCurrency(offer, pm, popupCurrency)) return;
                          setPopupCurrency(pickRelevantCurrency(offer, pm, selectedCurrency));
                        }}>
                        <div className={`popup-pm-radio${sel ? " checked" : ""}`}>
                          {sel && <div className="popup-pm-radio-dot"/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:".82rem"}}>{pm.type}</div>
                          {pm.label && pm.label.trim().toLowerCase() !== (pm.type || "").trim().toLowerCase() && (
                            <div style={{fontSize:".72rem",fontWeight:600,color:"var(--black-80, var(--black))",
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {pm.label}
                            </div>
                          )}
                          <div style={{fontSize:".72rem",color:"var(--black-65)",
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {detailStr}
                          </div>
                        </div>
                        <span style={{display:"flex",gap:3,flexShrink:0}}>
                          {validChips.map(c =>
                            <span key={c} className="currency-chip" style={{fontSize:".6rem"}}>{c}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Currency selector — only when offer has 2+ currencies */}
              {offer.currencies.length > 1 && (
                <>
                  <div className="popup-section-label">
                    Select currency
                  </div>
                  <div className="popup-currency-pills">
                    {offer.currencies.map(c => {
                      const selectedPMObj = selectedPM ? userPMs.find(p => p.id === selectedPM) : null;
                      const pmReady = selectedPMObj
                        ? pmWorksForCurrency(offer, selectedPMObj, c)
                        : userPMs.some(pm => pmWorksForCurrency(offer, pm, c));
                      const level = popupCurrency === c ? "selected" : pmReady ? "pm-ready" : "accepted";
                      return (
                        <button key={c}
                          className={`popup-cur-pill ${level}`}
                          onClick={() => {
                            if (popupCurrency === c) { setPopupCurrency(null); return; }
                            setPopupCurrency(c);
                            const pm = userPMs.find(p => p.id === selectedPM);
                            if (pm && !pmWorksForCurrency(offer, pm, c)) setSelectedPM(null);
                          }}>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* M-Pesa notice — sell offer side: seller marked their PM as
                  isMpesa, so the buyer must use the m-pesa flow inside their
                  own Wise / Revolut to pay. */}
              {(() => {
                if (offer.type !== "ask" || !selectedPM) return null;
                const pm = userPMs.find(p => p.id === selectedPM);
                if (!pm) return null;
                const sellerIsMpesa = offerDetails?.details?.paymentData?.[pm.type]?.isMpesa === true;
                if (!sellerIsMpesa) return null;
                return (
                  <div style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    background: "var(--primary-mild)",
                    borderRadius: 10,
                    fontSize: ".78rem",
                    fontWeight: 600,
                    color: "var(--black-80, var(--black))",
                    lineHeight: 1.45,
                  }}>
                    Attention — you will need to pay using the <strong>M-Pesa alternative</strong> on
                    your {methodDisplayName(pm.type)} app to settle this trade.
                  </div>
                );
              })()}
            </>
          )}

        </div>

        {/* Footer actions */}
        <div className="popup-footer">
          {/* ── Trade request (not own) ── */}
          {!isOwn && !isLoggedIn && (
            <button className="popup-btn popup-btn-request"
              onClick={() => { onClose(); navigate("/"); }}>
              Sign in to trade
            </button>
          )}
          {!isOwn && isLoggedIn && (
            pendingRequest && pendingRequest.offer.id === offer.id ? (
              <div className="popup-pending-row">
                <div className="popup-pending-top">
                  <div className="popup-pending-copy">
                    Sending in 5s — tap Undo to cancel
                  </div>
                  <button
                    type="button"
                    className="popup-pending-sendnow"
                    onClick={sendNowPendingRequest}>
                    send now →
                  </button>
                </div>
                <button
                  className={`popup-pending-btn${pendingRequest.kind === "instant" ? " popup-pending-btn-instant" : ""}`}
                  onClick={cancelPendingRequest}>
                  <span className="fill" />
                  <span className="label">Undo</span>
                </button>
              </div>
            ) : isInstant ? (
              <button className="popup-btn popup-btn-instant"
                disabled={!selectedPM || !popupCurrency || tradeLoading}
                onClick={() => stageRequest(offer, "instant")}>
                {tradeLoading ? "Requesting…" : "⚡ Instant trade"}
              </button>
            ) : (
              <button className="popup-btn popup-btn-request"
                disabled={!selectedPM || !popupCurrency || tradeLoading}
                onClick={() => stageRequest(offer, "request")}>
                {tradeLoading ? "Sending…" : "Request trade"}
              </button>
            )
          )}

          {/* ── Own offer ── */}
          {isOwn && !withdrawConfirm && (
            <>
              {/* Premium edit */}
              {editingPremium ? (
                <div style={{display:"flex",gap:8,width:"100%",alignItems:"center"}}>
                  <input type="number" step="0.1" value={editPremiumVal}
                    onChange={e => setEditPremiumVal(e.target.value)}
                    style={{flex:1,padding:"10px 14px",borderRadius:10,border:"1.5px solid var(--black-10)",
                      fontFamily:"var(--font)",fontSize:".88rem",fontWeight:700,outline:"none"}}
                    placeholder="e.g. 5.0" autoFocus/>
                  <span style={{fontSize:".82rem",fontWeight:700,color:"var(--black-50)"}}>%</span>
                  <button className="popup-btn popup-btn-edit" onClick={() => handleSavePremium(offer)}
                    disabled={editSaving} style={{flex:"none",width:"auto",padding:"10px 20px"}}>
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                  <button className="popup-btn popup-btn-withdraw" onClick={() => { setEditingPremium(false); setEditError(null); }}
                    style={{flex:"none",width:"auto",padding:"10px 16px"}}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{display:"flex",gap:8,width:"100%"}}>
                  <button className="popup-btn popup-btn-edit"
                    onClick={() => { setEditPremiumVal(String(offer.premium ?? 0)); setEditingPremium(true); setEditError(null); }}>
                    Edit premium
                  </button>
                  <button className="popup-btn popup-btn-withdraw"
                    onClick={() => { setWithdrawConfirm(true); setWithdrawError(null); }}>
                    {offer.type === "ask" ? "Cancel and refund offer" : "Withdraw"}
                  </button>
                </div>
              )}
              {editError && (
                <div style={{color:"var(--error)",fontSize:".78rem",fontWeight:600,marginTop:6}}>{editError}</div>
              )}
            </>
          )}
          {/* ── Withdraw confirmation ── */}
          {isOwn && withdrawConfirm && (
            <div style={{width:"100%"}}>
              <div style={{fontSize:".84rem",fontWeight:600,color:"var(--black)",marginBottom:10}}>
                Withdraw this offer?
              </div>
              <div style={{fontSize:".78rem",color:"var(--black-65)",lineHeight:1.5,marginBottom:12}}>
                {offer.type === "ask"
                  ? "The escrow funds will be returned via your mobile app."
                  : "This action cannot be undone."}
              </div>
              {withdrawError && (
                <div style={{color:"var(--error)",fontSize:".78rem",fontWeight:600,marginBottom:8}}>{withdrawError}</div>
              )}
              <div style={{display:"flex",gap:8}}>
                <button className="popup-btn popup-btn-edit"
                  onClick={() => { setWithdrawConfirm(false); setWithdrawError(null); }}>
                  Keep offer
                </button>
                <button className="popup-btn popup-btn-withdraw" style={{background:"var(--error)",color:"white",borderColor:"var(--error)"}}
                  onClick={() => handleWithdraw(offer)} disabled={withdrawing}>
                  {withdrawing
                    ? "Withdrawing…"
                    : (offer.type === "ask" ? "Refund (sign on mobile)" : "Yes, withdraw")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {badgesHelpOpen && <BadgesInfoPopup onClose={() => setBadgesHelpOpen(false)} />}
    </div>
  );
}
