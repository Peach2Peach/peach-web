import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SideNav, Topbar, CurrencyDropdown, formatPeachId } from "../../components/Navbars.jsx";
import { SatsAmount, IcoBtc } from "../../components/BitcoinAmount.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useApi } from "../../hooks/useApi.js";
import { markSentRequestCreated } from "../../hooks/useNotifications.js";
import { fetchWithSessionCheck } from "../../utils/sessionGuard.js";
import { extractPMsFromProfile, isApiError, generateSymmetricKey, encryptForRecipients, encryptSymmetric, encryptForPublicKey, signPGPMessage, hashPaymentFields } from "../../utils/pgp.js";
import { getCached, setCache, clearCache } from "../../hooks/useApi.js";
import { BTC_PRICE_FALLBACK as BTC_PRICE, fmtPct, fmtFiat, formatTradeId, toPeaches } from "../../utils/format.js";
import PeachRating from "../../components/PeachRating.jsx";
import Avatar from "../../components/Avatar.jsx";
import RequestedOfferPopup from "../../components/RequestedOfferPopup.jsx";
import { RefreshIndicator } from "../../components/RefreshIndicator.jsx";
import { CSS } from "./styles.js";
import { premiumStats, premiumCls, currSym, MultiSelect, Chips, RepCell, AmountCell, PriceCell } from "./components.jsx";
import { CATEGORY_META } from "../../components/AddPMFlow.jsx";
import {
  PM_NAMES, PM_CATEGORIES,
  METHOD_ID_BY_DISPLAY, methodDisplayName,
  normalizeApiPaymentMethods,
} from "../../data/paymentMethodMeta.js";

// ── Derived from static metadata (computed once at module load) ──
const CATEGORY_METHOD_IDS = {};
for (const id of Object.keys(PM_NAMES)) {
  const cat = PM_CATEGORIES[id] || "onlineWallet";
  (CATEGORY_METHOD_IDS[cat] ??= []).push(id);
}
const CATEGORY_ID_BY_LABEL = Object.fromEntries(
  Object.entries(CATEGORY_META).map(([id, meta]) => [meta.label, id])
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function PeachMarket() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab,            setTab]            = useState("buy");
  const [sortKey,        setSortKey]        = useState("premium");
  const [sortDir,        setSortDir]        = useState(1);
  const [selCurrencies,    setSelCurrencies]    = useState([]);   // [] = all
  const [selMethods,       setSelMethods]       = useState([]);   // [] = all
  const [selPaymentTypes,  setSelPaymentTypes]  = useState([]);   // [] = all
  const [searchQuery,      setSearchQuery]      = useState("");

  const [showMyOffers,        setShowMyOffers]        = useState(false);
  const [showMyOffersInfo,    setShowMyOffersInfo]    = useState(false);
  const infoRef = useRef(null);
  const [allPrices,           setAllPrices]           = useState(null);
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // ── AUTH + API ──
  const { get, post, patch, auth } = useApi();
  const [liveOffers,   setLiveOffers]   = useState(() => getCached("market-offers")?.data ?? null);
  const [liveUserPMs,  setLiveUserPMs]  = useState(null); // null = not yet loaded
  const [pmError,      setPmError]      = useState(false);
  const [offersLoading, setOffersLoading] = useState(() => !!auth && !getCached("market-offers"));
  const [isRefetching, setIsRefetching] = useState(false);
  const [pmCatalogue,  setPmCatalogue]  = useState(() => getCached("pm-catalogue")?.data ?? null);

  const { isLoggedIn, handleLogin, handleLogout, showAvatarMenu, setShowAvatarMenu } = useAuth();
  useEffect(() => {
    if (!showAvatarMenu) return;
    const close = (e) => { if (!e.target.closest(".avatar-menu-wrap")) setShowAvatarMenu(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAvatarMenu]);

  // Close info popup on outside click
  useEffect(() => {
    if (!showMyOffersInfo) return;
    function handler(e) {
      if (infoRef.current && !infoRef.current.contains(e.target)) setShowMyOffersInfo(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMyOffersInfo]);

  // ── Popup state ──
  const [popupOffer,     setPopupOffer]     = useState(null);   // offer object or null
  const [selectedPM,     setSelectedPM]     = useState(null);   // PM id for trade popup
  const [popupCurrency,  setPopupCurrency]  = useState(null);   // currency for trade popup
  const [requestAnim,    setRequestAnim]    = useState(false);  // "Trade requested" animation
  const [undoAnim,       setUndoAnim]       = useState(null);   // offer id being undone
  const [localRequested, setLocalRequested] = useState(() => new Set()); // track requested state locally
  const [acceptedContracts, setAcceptedContracts] = useState(() => new Map()); // offerId → contractId once seller accepts a sent request
  const [detailsLoading, setDetailsLoading] = useState(false);  // fetching /offer/:id/details
  const [offerDetails,   setOfferDetails]   = useState(null);   // fetched details for popupOffer
  const [highlightedIds, setHighlightedIds] = useState(() => new Set()); // newly published offers, briefly highlighted

  // ── Own-offer edit / withdraw state ──
  const [editingPremium,   setEditingPremium]   = useState(false);   // toggle edit mode
  const [editPremiumVal,   setEditPremiumVal]   = useState("");      // input value
  const [editSaving,       setEditSaving]       = useState(false);
  const [editError,        setEditError]        = useState(null);
  const [withdrawConfirm,  setWithdrawConfirm]  = useState(false);   // show confirm step
  const [withdrawing,      setWithdrawing]       = useState(false);
  const [withdrawError,    setWithdrawError]    = useState(null);
  const [signingModal,     setSigningModal]     = useState(null);    // { offerId } for sell offer cancel
  const [toast,            setToast]            = useState(null);
  const [tradeLoading,     setTradeLoading]     = useState(false);
  // Optimistic pending state during the 5s cancel window before the API fires.
  // Mirrors the mobile UndoButton pattern (peach-app UndoButton.tsx, TIMER_DURATION = 5000).
  const [pendingRequest,   setPendingRequest]   = useState(null); // { offer, kind: 'request' | 'instant' }
  const pendingTimerRef = useRef(null);
  useEffect(() => () => { if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current); }, []);

  const isSellTab = tab === "sell";

  // Derive current BTC price in selected currency
  const pricesLoaded = allPrices !== null;
  const btcPrice = Math.round(allPrices?.[selectedCurrency] ?? BTC_PRICE);

  // ── Popup helpers ──
  function openPopup(offer) {
    setSelectedPM(null);
    setPopupCurrency(offer.currencies.length === 1 ? offer.currencies[0] : null);
    setEditingPremium(false); setEditError(null);
    setWithdrawConfirm(false); setWithdrawError(null);
    setPopupOffer(offer);
  }
  function closePopup() {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    setPendingRequest(null);
    setPopupOffer(null);
    setSelectedPM(null);
    setPopupCurrency(null);
    setRequestAnim(false);
    setTradeLoading(false);
    setEditingPremium(false); setEditError(null);
    setWithdrawConfirm(false); setWithdrawError(null);
    setDetailsLoading(false);
    setOfferDetails(null);
  }

  // ── Fetch details when a sell offer is opened, then poll every 10s ──
  // Fires two v069 calls in parallel on open and on every poll tick:
  //   GET /sellOffer/:id                        — full offer details
  //   GET /sellOffer/:id/tradeRequestPerformed  — existing trade request + chat messages
  //     · 200 + SellOfferTradeRequest body → request exists (mark as requested)
  //     · 200 + APISuccess body ({success:true}) → no request exists
  //     · 404 → no request exists (treat same as APISuccess)
  // Skipped for own offers (the second endpoint is only meaningful for browsers).
  useEffect(() => {
    if (!popupOffer || !auth) {
      setDetailsLoading(false);
      setOfferDetails(null);
      return;
    }
    const offerId = popupOffer.id;
    const isOwn = popupOffer.isOwn;
    const isSell = popupOffer.type === "ask";
    const offerTypePath = isSell ? "sellOffer" : "buyOffer";
    let cancelled = false;
    setDetailsLoading(true);
    setOfferDetails(null);

    async function refresh(isInitial) {
      try {
        const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
        const hdrs = { Authorization: `Bearer ${auth.token}` };
        const [detailsRes, tradeReqRes, contractsRes] = await Promise.all([
          // Sell-offer details endpoint is sell-exclusive; skip for buy offers.
          isSell
            ? fetchWithSessionCheck(`${v069Base}/sellOffer/${offerId}`, { headers: hdrs })
            : Promise.resolve(null),
          isOwn
            ? Promise.resolve(null)
            : fetchWithSessionCheck(`${v069Base}/${offerTypePath}/${offerId}/tradeRequestPerformed`, { headers: hdrs }),
          // Detect "seller accepted my request" → a contract appears whose composite
          // ID ({buyOfferId}-{sellOfferId}) contains this offer's id.
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
            // APISuccess shape ({success:true}) means "no trade request"; anything
            // else is a SellOfferTradeRequest with chatMessages.
            if (body && body.success !== true) {
              tradeReq = body;
              tradeReqExists = true;
            }
          }
        }
        // Match a contract back to this offer via the composite contract id.
        let acceptedContractId = null;
        let contractsConfirmedNoMatch = false;
        if (contractsRes && contractsRes.ok) {
          const list = await contractsRes.json().catch(() => null);
          if (Array.isArray(list)) {
            const offerIdStr = String(offerId);
            const match = list.find(c => String(c.id).split("-").includes(offerIdStr));
            if (match) acceptedContractId = String(match.id);
            else contractsConfirmedNoMatch = true;
          }
        }
        if (cancelled) return;
        setOfferDetails({ details, tradeRequest: tradeReq });
        if (acceptedContractId) {
          setAcceptedContracts(prev => {
            if (prev.get(offerId) === acceptedContractId) return prev;
            const m = new Map(prev); m.set(offerId, acceptedContractId); return m;
          });
        }
        // Reconcile local optimistic state with server truth. Only remove from
        // localRequested when contracts/summary has confirmed no matching
        // contract — otherwise we race the popup-component swap when the
        // counterparty accepts (request endpoint goes empty before the new
        // contract is visible in the summary).
        if (tradeReqExists) {
          setLocalRequested(prev => prev.has(offerId) ? prev : new Set([...prev, offerId]));
        } else if (!isOwn && contractsConfirmedNoMatch) {
          setLocalRequested(prev => {
            if (!prev.has(offerId)) return prev;
            const s = new Set(prev); s.delete(offerId); return s;
          });
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
  }, [popupOffer?.id, popupOffer?.type, popupOffer?.isOwn]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Update offer in local state
      setPopupOffer(prev => ({ ...prev, premium: val }));
      if (liveOffers) {
        setLiveOffers(prev => prev.map(o => o.id === offer.id ? { ...o, premium: val } : o));
      }
      setEditingPremium(false);
      setToast("Premium updated"); setTimeout(() => setToast(null), 3000);
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
      // Sell offers return a PSBT → needs mobile signing
      if (data?.psbt) {
        setSigningModal({ offerId: offer.id });
        closePopup();
        // Remove from list
        if (liveOffers) setLiveOffers(prev => prev.filter(o => o.id !== offer.id));
        setToast("Refund sent to mobile for signing"); setTimeout(() => setToast(null), 4000);
        return;
      }
      // Buy offers — done
      closePopup();
      if (liveOffers) setLiveOffers(prev => prev.filter(o => o.id !== offer.id));
      setToast("Offer withdrawn"); setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setWithdrawError(err.message || "Failed to withdraw");
    } finally {
      setWithdrawing(false);
    }
  }

  // Does a user's PM have a valid combination for a given currency on this offer?
  // Requires BOTH: the offer accepts this PM type for that currency AND the user
  // has configured that currency on their PM.
  function pmWorksForCurrency(offer, pm, currency) {
    const methods = offer._raw?.meansOfPayment?.[currency] ?? [];
    return methods.includes(pm.type) && (pm.currencies ?? []).includes(currency);
  }

  // Resolve the offer owner's PGP public keys.
  // v069 SellOffer responses include a full `user` object with `pgpPublicKeys`,
  // but v069 BuyOffer69 responses only have `userId` — in that case we must
  // fetch the user profile separately (same approach as mobile's useUserDetails).
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

  // Begin the 5s cancel window. The popup swaps the action buttons for an Undo
  // button whose fill drains over 5s; on expiry executeRequestTrade/executeInstantTrade
  // fires the actual API call. Tapping Undo (or closing the popup) cancels.
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

  async function executeRequestTrade(offer) {
    if (!auth?.pgpPrivKey || !selectedPM || !popupCurrency || tradeLoading) return;
    setTradeLoading(true);

    const pmObj = userPMs.find(pm => pm.id === selectedPM);
    if (!pmObj) return;

    // Build clean PM data (strip structural fields, keep payment details only)
    const STRUCTURAL = new Set(["id", "methodId", "type", "name", "label", "currencies", "hashes", "details", "data", "country", "anonymous"]);
    const cleanData = {};
    const pmDetails = pmObj.details || {};
    for (const [k, v] of Object.entries(pmDetails)) {
      if (!STRUCTURAL.has(k) && typeof v !== "object") cleanData[k] = v;
    }

    try {
      // Encrypt PM data with symmetric key, encrypt symmetric key for counterparty
      const symmetricKey = generateSymmetricKey();
      const counterpartyKeys = await resolveCounterpartyKeys(offer);
      if (counterpartyKeys.length === 0) {
        setToast("Could not load recipient PGP key — please try again");
        setTimeout(() => setToast(null), 4000);
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

      // POST trade request to v069
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
        // Show animation, mark as requested, refresh offers from API,
        // then return to the offer modal in its "already requested" state.
        markSentRequestCreated(offer.id, offerType);
        setRequestAnim(true);
        setLocalRequested(prev => new Set([...prev, offer.id]));
        clearCache("market-offers");
        fetchMarket();
        setTimeout(() => {
          setRequestAnim(false);
          setTradeLoading(false);
        }, 1600);
      } else {
        const err = await res.json().catch(() => ({}));
        setToast("Trade request failed: " + (err.error || "try again"));
        setTimeout(() => setToast(null), 4000);
        setTradeLoading(false);
      }
    } catch (e) {
      setToast("Trade request error: " + e.message);
      setTimeout(() => setToast(null), 4000);
      setTradeLoading(false);
    }
  }

  async function executeInstantTrade(offer) {
    console.log("[InstantTrade] called", { pgpPrivKey: !!auth?.pgpPrivKey, selectedPM, popupCurrency, tradeLoading, offerType: offer?.type, offerId: offer?.id });
    if (!auth?.pgpPrivKey || !selectedPM || !popupCurrency || tradeLoading) return;
    setTradeLoading(true);

    // 1. Find the selected PM data
    const pmObj = userPMs.find(pm => pm.id === selectedPM);
    console.log("[InstantTrade] pmObj:", pmObj ? pmObj.id : "NOT FOUND", "selectedPM:", selectedPM, "userPMs IDs:", userPMs.map(p => p.id));
    if (!pmObj) return;

    // 2. Build clean PM data (same pattern as trades-dashboard match acceptance)
    const STRUCTURAL = new Set(["id", "methodId", "type", "name", "label", "currencies", "hashes", "details", "data", "country", "anonymous"]);
    const cleanData = {};
    const pmDetails = pmObj.details || {};
    for (const [k, v] of Object.entries(pmDetails)) {
      if (!STRUCTURAL.has(k) && typeof v !== "object") cleanData[k] = v;
    }
    console.log("[InstantTrade] cleanData:", cleanData);

    // 3. Generate symmetric key and encrypt for counterparty
    let symmetricKeyEncrypted = null;
    let symmetricKeySignature = null;
    let paymentDataEncrypted = null;
    let paymentDataSignature = null;
    let paymentDataHashed = null;

    try {
      // Fetch server PGP public key (server must decrypt paymentDataEncrypted)
      const infoRes = await get('/info');
      const infoData = await infoRes.json().catch(() => null);
      const serverPGPKey = infoData?.peach?.pgpPublicKey ?? null;
      console.log("[InstantTrade] Server PGP key:", serverPGPKey ? "fetched" : "MISSING");

      const symmetricKey = generateSymmetricKey();
      const counterpartyKeys = await resolveCounterpartyKeys(offer);
      console.log("[InstantTrade] counterpartyKeys count:", counterpartyKeys.length);
      if (counterpartyKeys.length === 0) {
        setToast("Could not load recipient PGP key — please try again");
        setTimeout(() => setToast(null), 4000);
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

      // 4. Call performInstantTrade (with 30s timeout to avoid hanging)
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
        closePopup();
        if (contractId) navigate(`/trade/${contractId}`);
      } else {
        const err = await res.json().catch(() => ({}));
        setToast("Instant trade failed: " + (err.error || "try again"));
        setTimeout(() => setToast(null), 4000);
      }
    } catch (e) {
      const msg = e.name === "AbortError" ? "Request timed out — try again" : e.message;
      setToast("Instant trade error: " + msg);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setTradeLoading(false);
    }
  }


  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await get('/market/prices');
        const data = await res.json();
        if (data && typeof data === "object") {
          setAllPrices(data);
          setAvailableCurrencies(Object.keys(data).sort());
        }
      } catch {
        // keep existing prices on failure
      }
    }
    fetchPrices();
    const iv = setInterval(fetchPrices, 30000);
    return () => clearInterval(iv);
  }, []);

  // Fetch Peach's full payment-method catalogue (used so filter dropdowns can
  // show every supported currency/method when no filters are active, not just
  // those present in current offers).
  useEffect(() => {
    if (pmCatalogue) return;
    (async () => {
      try {
        const res = await get('/info/paymentMethods');
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          const norm = normalizeApiPaymentMethods(data);
          setPmCatalogue(norm);
          setCache("pm-catalogue", norm);
        }
      } catch { /* catalogue is optional; fall back to offer-derived options */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Offer normalizers (stable references, used by fetchMarket + refresh) ──
  const peachId = auth?.peachId ?? null;

  function normalizeOffer(o, typeHint) {
    const currencies = o.meansOfPayment ? Object.keys(o.meansOfPayment) : [];
    const methods = o.meansOfPayment
      ? [...new Set(Object.values(o.meansOfPayment).flat())]
      : [];
    return {
      id: String(o.id),
      tradeId: formatTradeId(o.id, "offer"),
      type: o.type ?? typeHint,
      amount: o.amountSats ?? (Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0)),
      premium: o.premium ?? 0,
      methods,
      currencies,
      rep: toPeaches(o.user?.rating ?? 0),
      trades: o.user?.trades ?? 0,
      badges: o.user?.medals ?? o.user?.badges ?? [],
      auto: o.allowedToInstantTrade ?? false,
      experienceLevel: o.experienceLevelCriteria ?? null,
      online: o.user?.online ?? false,
      userId: o.user?.id ?? "",
      peachId: o.user?.id ? ("PEACH" + o.user.id.slice(0, 8).toUpperCase()) : "",
      isOwn: !!peachId && (o.user?.id === peachId || o.user?.id?.toLowerCase?.() === peachId?.toLowerCase?.()),
      hasPerformedTradeRequest: !!o.hasPerformedTradeRequest,
      _raw: o,
    };
  }

  function normalizeOwnOffer(o, type) {
    const methods = o.meansOfPayment ? Object.values(o.meansOfPayment).flat() : [];
    const currencies = o.meansOfPayment ? Object.keys(o.meansOfPayment) : [];
    return {
      id: String(o.id),
      tradeId: formatTradeId(o.id, "offer"),
      type,
      amount: o.amountSats ?? (Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0)),
      premium: o.premium ?? 0,
      methods: [...new Set(methods)],
      currencies,
      rep: toPeaches(auth?.profile?.rating ?? 0),
      trades: auth?.profile?.trades ?? 0,
      badges: auth?.profile?.medals ?? [],
      auto: false,
      experienceLevel: o.experienceLevelCriteria ?? null,
      online: true,
      isOwn: true,
      _raw: o,
    };
  }

  async function fetchMarket() {
    setIsRefetching(true);
    try {
      let all = [];

      if (auth) {
        // Authenticated: use v069 endpoints (same as mobile app)
        const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
        const hdrs = { Authorization: `Bearer ${auth.token}` };
        const [buyOffersRes, sellOffersRes, ownOffersRes] = await Promise.all([
          fetchWithSessionCheck(`${v069Base}/buyOffer`, { headers: hdrs }),
          fetchWithSessionCheck(`${v069Base}/sellOffer`, { headers: hdrs }),
          fetchWithSessionCheck(`${v069Base}/user/${peachId}/offers`, { headers: hdrs }),
        ]);
        const buyOffersJson  = buyOffersRes.ok  ? await buyOffersRes.json()  : {};
        const sellOffersJson = sellOffersRes.ok ? await sellOffersRes.json() : {};
        const ownOffersJson  = ownOffersRes.ok  ? await ownOffersRes.json()  : {};
        // v069 response: { offers: [...], stats: {...} }
        const bidsArr = Array.isArray(buyOffersJson) ? buyOffersJson : buyOffersJson?.offers ?? [];
        const asksArr = Array.isArray(sellOffersJson) ? sellOffersJson : sellOffersJson?.offers ?? [];
        // Own offers from /v069/user/{id}/offers — returns { buyOffers: [...], sellOffers: [...] }
        const ownBidsArr = ownOffersJson?.buyOffers ?? [];
        const ownAsksArr = ownOffersJson?.sellOffers ?? [];

        // Merge market + own offers, deduplicating by ID
        const seen = new Set();
        const merged = [];
        for (const o of ownBidsArr) { const id = String(o.id); if (!seen.has(id)) { seen.add(id); merged.push(normalizeOwnOffer(o, "bid")); } }
        for (const o of ownAsksArr) { const id = String(o.id); if (!seen.has(id)) { seen.add(id); merged.push(normalizeOwnOffer(o, "ask")); } }
        for (const o of bidsArr)    { const id = String(o.id); if (!seen.has(id)) { seen.add(id); merged.push(normalizeOffer(o, "bid")); } }
        for (const o of asksArr)    { const id = String(o.id); if (!seen.has(id)) { seen.add(id); merged.push(normalizeOffer(o, "ask")); } }
        all = merged;
      } else {
        // Not authenticated: use v1 public search
        const [bidsRes, asksRes] = await Promise.all([
          post('/offer/search', { type: 'bid', size: 50 }),
          post('/offer/search', { type: 'ask', size: 50 }),
        ]);
        const [bids, asks] = await Promise.all([
          bidsRes.ok ? bidsRes.json() : [],
          asksRes.ok ? asksRes.json() : [],
        ]);
        const bidsArr = Array.isArray(bids) ? bids : bids?.offers ?? [];
        const asksArr = Array.isArray(asks) ? asks : asks?.offers ?? [];
        console.log("[MarketView] v1 bids:", bidsArr.length, "asks:", asksArr.length);
        all = [
          ...bidsArr.map(normalizeOffer),
          ...asksArr.map(normalizeOffer),
        ];
      }
      setCache("market-offers", all);
      setLiveOffers(all);
    } catch (err) {
      console.error("[MarketView] fetchMarket failed:", err);
    } finally {
      setOffersLoading(false);
      setIsRefetching(false);
    }
  }

  function handleRefreshOffers() {
    clearCache("market-offers");
    setLiveOffers(null);
    setOffersLoading(true);
    fetchMarket();
  }

  // ── LIVE MARKET OFFERS + USER PMs ──
  useEffect(() => {
    fetchMarket();
    // Poll every 10s so hasPerformedTradeRequest and offer changes stay fresh.
    const iv = setInterval(fetchMarket, 10000);

    if (auth) {
      const selfUserBase = auth.baseUrl.replace(/\/v1$/, '/v069');
      fetchWithSessionCheck(`${selfUserBase}/selfUser`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(async (data) => {
          const profile = data?.user ?? data;
          if (!profile || isApiError(profile)) throw new Error(`API error: ${profile?.error || profile?.message || "no data"}`);
          const pms = auth?.pgpPrivKey
            ? await extractPMsFromProfile(profile, auth.pgpPrivKey)
            : null;
          if (!pms) {
            setLiveUserPMs([]);
            return;
          }
          // Keys that belong to the PM structure — everything else is a detail field
          const STRUCTURAL = new Set([
            "id", "methodId", "type", "name", "label", "currencies", "hashes",
            "details", "data", "country", "anonymous",
          ]);
          function shortId(raw) { return raw.replace(/-\d+$/, ""); }
          function sweepFields(obj) {
            const explicit = obj.data || obj.details || null;
            if (explicit) return explicit;
            const swept = {};
            for (const [k, v] of Object.entries(obj)) {
              if (!STRUCTURAL.has(k) && typeof v !== "object") swept[k] = v;
            }
            return swept;
          }
          if (Array.isArray(pms) && pms.length > 0) {
            setLiveUserPMs(pms.map(pm => ({
              id: pm.id,
              type: shortId(pm.type ?? pm.id),
              currencies: pm.currencies ?? [],
              details: sweepFields(pm),
            })));
          } else if (pms && typeof pms === "object") {
            setLiveUserPMs(Object.entries(pms).map(([key, val]) => ({
              id: val?.id || key,
              type: shortId(key),
              currencies: val?.currencies ?? [],
              details: sweepFields(val || {}),
            })));
          }
        })
        .catch((err) => {
          console.warn("[MarketView] PM fetch failed:", err.message);
          setPmError(true);
        });
    }
    return () => clearInterval(iv);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const marketOffers = liveOffers ?? [];
  const userPMs = liveUserPMs ?? [];

  // ── Open popup from navigation state (e.g. clicked a sent trade request on TRADES) ──
  // Once handled, clear the state so a remount/rerender doesn't reopen it.
  const navHandledRef = useRef(false);
  useEffect(() => {
    if (navHandledRef.current) return;
    const navState = location.state;
    if (!navState?.openOfferId) return;
    const found = marketOffers.find(o => String(o.id) === String(navState.openOfferId));
    if (found) {
      navHandledRef.current = true;
      openPopup(found);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    // Not in list — construct a minimal stub so the popup can fetch full details.
    if (navState.openOfferData) {
      navHandledRef.current = true;
      const d = navState.openOfferData;
      const stub = {
        id: String(d.id ?? navState.openOfferId),
        tradeId: d.tradeId ?? formatTradeId(d.id ?? navState.openOfferId, "offer"),
        type: navState.openOfferType === "buyOffer" ? "bid" : "ask",
        amount: d.amount ?? 0,
        premium: d.premium ?? 0,
        methods: d.methods ?? [],
        currencies: d.currencies ?? [],
        rep: 0, trades: 0, badges: [],
        auto: false,
        experienceLevel: null,
        online: false,
        userId: "",
        peachId: "",
        isOwn: false,
        hasPerformedTradeRequest: true,
      };
      openPopup(stub);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, marketOffers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Highlight newly published offers when arriving from Offer Creation ──
  // location.state shape: { highlightOfferIds: string[], highlightDirection: "buy"|"sell" }
  // A published "buy" offer (bid) lives on tab="sell"; a "sell" offer (ask) lives on tab="buy".
  // Two-phase: (1) extract IDs from state immediately and switch the view; (2) once the
  // matching offers are actually in marketOffers, scroll and start the fade-out timer.
  const highlightHandledRef = useRef(false);
  const highlightCommittedRef = useRef(false);
  useEffect(() => {
    if (highlightHandledRef.current) return;
    const navState = location.state;
    const ids = navState?.highlightOfferIds;
    if (!Array.isArray(ids) || ids.length === 0) return;
    highlightHandledRef.current = true;
    const direction = navState.highlightDirection;
    if (direction === "buy")  setTab("sell");
    if (direction === "sell") setTab("buy");
    setShowMyOffers(true);
    setHighlightedIds(new Set(ids.map(String)));
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Commit phase — runs whenever marketOffers updates after a highlight was set.
  // Waits for the new offers to appear in the list, then scrolls + starts fade timer.
  useEffect(() => {
    if (highlightCommittedRef.current) return;
    if (highlightedIds.size === 0) return;
    if (!marketOffers || marketOffers.length === 0) return;
    const found = marketOffers.some(o => highlightedIds.has(String(o.id)));
    if (!found) return;
    highlightCommittedRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelector(".new-offer-card, .new-offer-row")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    const t = setTimeout(() => setHighlightedIds(new Set()), 4000);
    return () => clearTimeout(t);
  }, [marketOffers, highlightedIds]);

  const offerType = isSellTab ? "bid" : "ask";

  // ── Faceted filter options ───────────────────────────────────────────
  // Build the set of (currency, method, category) pairs actually available
  // in the offers currently in scope (tab + own-offer toggle). Each filter's
  // dropdown is then derived from the pairs that match every *other* active
  // filter — so selecting USDT narrows payment methods to those actually
  // paired with USDT, and vice-versa.
  const marketPairs = (() => {
    const pairs = [];
    for (const o of marketOffers) {
      if (o.type !== offerType) continue;
      if (!showMyOffers && o.isOwn) continue;
      const mop = o._raw?.meansOfPayment;
      if (!mop) continue;
      for (const [currency, methods] of Object.entries(mop)) {
        for (const method of (methods || [])) {
          pairs.push({ currency, method, category: PM_CATEGORIES[method] || "onlineWallet" });
        }
      }
    }
    return pairs;
  })();

  const selMethodIds = selMethods.map(dn => METHOD_ID_BY_DISPLAY[dn] || dn);
  const selCatIds = selPaymentTypes.map(l => CATEGORY_ID_BY_LABEL[l]).filter(Boolean);
  function pairMatches(p, skip) {
    if (skip !== "currency" && selCurrencies.length > 0 && !selCurrencies.includes(p.currency)) return false;
    if (skip !== "method" && selMethodIds.length > 0 && !selMethodIds.includes(p.method)) return false;
    if (skip !== "category" && selCatIds.length > 0 && !selCatIds.includes(p.category)) return false;
    return true;
  }

  // Filter options are derived ONLY from the Peach catalogue and the user's
  // other active filters — never from what's currently offered. A filter's
  // dropdown just answers: "given the other filters, which values are even
  // possible in Peach?". Offer availability is reflected in the results list
  // itself (which may be empty), not in the dropdowns.
  function catalogueEntryMatches(methodId, entry, skip) {
    if (skip !== "currency" && selCurrencies.length > 0) {
      if (!(entry.currencies || []).some(c => selCurrencies.includes(c))) return false;
    }
    if (skip !== "method" && selMethodIds.length > 0) {
      if (!selMethodIds.includes(methodId)) return false;
    }
    if (skip !== "category" && selCatIds.length > 0) {
      if (!selCatIds.includes(entry.category)) return false;
    }
    return true;
  }

  let currencyOptions, methodOptions, paymentTypeOptions;
  if (pmCatalogue) {
    const currencyHits = Object.entries(pmCatalogue).filter(([id, e]) => catalogueEntryMatches(id, e, "currency"));
    currencyOptions = [...new Set(currencyHits.flatMap(([, e]) => e.currencies || []))].sort();

    const methodHits = Object.entries(pmCatalogue).filter(([id, e]) => catalogueEntryMatches(id, e, "method"));
    methodOptions = [...new Set(methodHits.map(([, e]) => e.name))].sort();

    const categoryHits = Object.entries(pmCatalogue).filter(([id, e]) => catalogueEntryMatches(id, e, "category"));
    const cats = new Set(categoryHits.map(([, e]) => e.category));
    paymentTypeOptions = Object.entries(CATEGORY_META)
      .filter(([id]) => cats.has(id))
      .map(([, m]) => m.label);
  } else {
    // Catalogue not loaded yet — fall back to what's present in current offers
    // so the dropdowns aren't empty during the initial fetch.
    currencyOptions = [...new Set(
      marketPairs.filter(p => pairMatches(p, "currency")).map(p => p.currency)
    )].sort();
    methodOptions = [...new Set(
      marketPairs.filter(p => pairMatches(p, "method")).map(p => methodDisplayName(p.method))
    )].sort();
    const paymentTypeCatsInScope = new Set(
      marketPairs.filter(p => pairMatches(p, "category")).map(p => p.category)
    );
    paymentTypeOptions = Object.entries(CATEGORY_META)
      .filter(([id]) => paymentTypeCatsInScope.has(id))
      .map(([, m]) => m.label);
  }

  // Always surface currently-selected values — even if the current market has
  // no offers matching them — so the user can still see the chip and uncheck
  // it. Without this the selection would vanish from the dropdown the moment
  // it produced zero results, which feels like the filters resetting.
  currencyOptions = [...new Set([...currencyOptions, ...selCurrencies])].sort();
  methodOptions   = [...new Set([...methodOptions, ...selMethods])].sort();
  const ptAllowed = new Set([...paymentTypeOptions, ...selPaymentTypes]);
  paymentTypeOptions = Object.values(CATEGORY_META).map(m => m.label).filter(l => ptAllowed.has(l));

  const filtered = marketOffers
    .filter(o => o.type === offerType)
    .filter(o => showMyOffers || !o.isOwn)
    .filter(o => selCurrencies.length === 0 || selCurrencies.some(c => o.currencies.includes(c)))
    .filter(o => selMethods.length === 0 || selMethods.some(displayName => {
      const apiId = METHOD_ID_BY_DISPLAY[displayName] || displayName;
      return o.methods.includes(apiId);
    }))
    .filter(o => selPaymentTypes.length === 0 || selPaymentTypes.some(label => {
      const catId = CATEGORY_ID_BY_LABEL[label];
      const catMethods = CATEGORY_METHOD_IDS[catId] || [];
      return catMethods.some(m => o.methods.includes(m));
    }))
    .filter(o => {
      const q = searchQuery.trim();
      if (q === "") return true;
      const ql = q.toLowerCase();
      const qNorm = ql.replace(/\u2011/g, "-");
      return (
        o.tradeId.toLowerCase().replace(/\u2011/g, "-").includes(qNorm) ||
        (o.userId && o.userId.toLowerCase().includes(ql)) ||
        (o.peachId && o.peachId.toLowerCase().includes(ql))
      );
    })
    .sort((a, b) => {
      if (sortKey === "premium") return (a.premium - b.premium) * sortDir;
      if (sortKey === "amount") {
        const aV = Array.isArray(a.amount) ? a.amount[0] : a.amount;
        const bV = Array.isArray(b.amount) ? b.amount[0] : b.amount;
        return (aV - bV) * sortDir;
      }
      if (sortKey === "rep") return (b.rep - a.rep) * sortDir;
      return 0;
    });

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(1); }
  }

  // When logged out, mask isOwn and clear requested status — browser has no session data
  const displayOffers = isLoggedIn ? filtered : filtered.map(o => ({ ...o, isOwn: false }));
  // Source of truth: hasPerformedTradeRequest from the /v069/sellOffer list.
  // localRequested is a short-lived optimistic overlay until fetchMarket() refreshes.
  const effectiveRequested = (() => {
    if (!isLoggedIn) return new Set();
    const s = new Set(localRequested);
    for (const o of (liveOffers ?? [])) {
      if (o.hasPerformedTradeRequest) s.add(o.id);
    }
    // Once we've seen a contract for an offer's request, keep the popup pinned
    // to the requested branch so the "accepted" state can render.
    for (const id of acceptedContracts.keys()) s.add(id);
    return s;
  })();

  function SortTh({ col, label }) {
    const active = sortKey === col;
    return (
      <th onClick={() => toggleSort(col)}>
        <span className="th-sort">
          {label}
          <span className={`sort-arrow${active ? " active" : ""}`}>
            {active ? (sortDir === 1 ? "▲" : "▼") : "⇅"}
          </span>
        </span>
      </th>
    );
  }

  const stats      = premiumStats(filtered);
  const satsPerCur  = Math.round(100_000_000 / btcPrice);

  // For stat pill: avg color follows the same perspective logic
  function statColor(val) {
    const n = parseFloat(val);
    if (n === 0) return "var(--black)";
    return isSellTab
      ? (n > 0 ? "var(--success)" : "var(--error)")
      : (n < 0 ? "var(--success)" : "var(--error)");
  }

  // ── Popup renderer (inline JSX, not a component — avoids remount flicker) ──
  const popupContent = (() => {
    if (!popupOffer) return null;
    const offer = popupOffer;
    const isOwn = offer.isOwn;
    const isReq = effectiveRequested.has(offer.id) && !isOwn;
    const isInstant = offer.auto;
    const sym = currSym(selectedCurrency);
    const rate = Math.round(btcPrice * (1 + offer.premium / 100));
    const fiat = (offer.amount / 100_000_000) * btcPrice * (1 + offer.premium / 100);
    const premCls = offer.premium === 0 ? "prem-zero" : isSellTab
      ? (offer.premium > 0 ? "prem-good" : "prem-bad")
      : (offer.premium < 0 ? "prem-good" : "prem-bad");
    // Compute valid PM/currency combinations: a row is valid iff the user's PM
    // supports that currency AND the offer accepts the PM for that currency.
    const validByPM = userPMs.map(pm => ({
      pm,
      currencies: offer.currencies.filter(c => pmWorksForCurrency(offer, pm, c)),
    }));
    const hasMissingPM = !validByPM.some(v => v.currencies.length > 0);
    // PM list to render: when a currency is selected, narrow to PMs valid for it;
    // otherwise show every PM that's valid for at least one offer currency.
    const visiblePMs = popupCurrency
      ? validByPM.filter(v => v.currencies.includes(popupCurrency)).map(v => v.pm)
      : validByPM.filter(v => v.currencies.length > 0).map(v => v.pm);

    // ── "Trade Requested" success animation ──
    if (requestAnim) {
      return (
        <div className="popup-overlay" onClick={closePopup}>
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
                You'll be notified when the {isSellTab ? "buyer" : "seller"} responds.
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Already-requested offer → use the shared RequestedOfferPopup component
    // (same modal as TRADES screen for sent trade requests).
    if (isReq && !isOwn) {
      const acceptedContractId = acceptedContracts.get(offer.id) || null;
      return (
        <RequestedOfferPopup
          offer={offer}
          auth={auth}
          selectedCurrency={selectedCurrency}
          btcPrice={btcPrice}
          onClose={closePopup}
          acceptedContractId={acceptedContractId}
          onAccepted={(contractId) => {
            setAcceptedContracts(prev => {
              if (prev.get(offer.id) === contractId) return prev;
              const m = new Map(prev); m.set(offer.id, contractId); return m;
            });
          }}
          onOpenTrade={() => {
            const id = acceptedContracts.get(offer.id);
            if (!id) return;
            closePopup();
            navigate(`/trade/${id}`);
          }}
          onUndoSuccess={(offerId) => {
            setLocalRequested(prev => { const s = new Set(prev); s.delete(offerId); return s; });
            setUndoAnim(offerId);
            setTimeout(() => setUndoAnim(null), 1200);
            clearCache("market-offers");
            fetchMarket();
          }}
        />
      );
    }

    return (
      <div className="popup-overlay" onClick={closePopup}>
        <div className="popup-card" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="popup-header">
            <span className="popup-title">
              {isOwn ? "Your offer" : isReq ? "Trade requested" : "Offer details"}
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
            <button className="popup-close" onClick={closePopup}>✕</button>
          </div>

          {/* Offer summary */}
          <div className="popup-body">
            {/* Peer row */}
            <div className="popup-peer-row">
              <div
                style={{cursor: offer.userId && !isOwn ? "pointer" : "default"}}
                onClick={(e) => { if (offer.userId && !isOwn) { e.stopPropagation(); closePopup(); navigate(`/user/${offer.userId}`); } }}
                title={offer.userId && !isOwn ? "View user profile" : undefined}
              >
                <Avatar peachId={offer.userId} size={30} online={offer.online} />
              </div>
              <div style={{flex:1}}>
                {offer.userId && (
                  <div
                    onClick={(e) => { if (!isOwn) { e.stopPropagation(); closePopup(); navigate(`/user/${offer.userId}`); } }}
                    style={{
                      fontSize:".76rem", fontWeight:700, fontFamily:"monospace", letterSpacing:".04em",
                      color: isOwn ? "var(--black-65)" : "var(--primary)",
                      cursor: isOwn ? "default" : "pointer",
                      textDecoration: isOwn ? "none" : "underline",
                      marginBottom: 2,
                    }}
                    title={isOwn ? undefined : "View user profile"}
                  >
                    {formatPeachId(offer.userId).toLowerCase()}
                  </div>
                )}
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <PeachRating rep={offer.rep} size={16}/>
                  <span className="rep-trades">({offer.trades} trades)</span>
                </div>
                <div style={{display:"flex",gap:3,marginTop:3}}>
                  {offer.badges.includes("supertrader") && <span className="badge badge-super">🏆 Super</span>}
                  {offer.badges.includes("fast") && <span className="badge badge-fast">⚡ Fast</span>}
                  {isOwn && <span className="own-label">Your offer</span>}
                </div>
              </div>
              {isInstant && <span className="auto-badge">⚡ Instant</span>}
              {offer.experienceLevel==="experiencedUsersOnly"&&<span className="exp-badge">👤 Experienced only</span>}
              {offer.experienceLevel==="newUsersOnly"&&<span className="exp-badge">🆕 New users</span>}
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
                    {offer.methods.map(m => <span key={m} className="method-chip">{methodDisplayName(m)}</span>)}
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

            {/* ── TRADE REQUEST variant: PM selector ── */}
            {!isOwn && !isReq && (
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
                    </div>
                  </div>
                ) : (
                  <div className="popup-pm-list">
                    {visiblePMs.map(pm => {
                      const sel = selectedPM === pm.id;
                      const detailStr = pm.type === "SEPA"
                        ? `${pm.details.beneficiary} · ${pm.details.iban?.slice(0,8)}…`
                        : pm.type === "Revolut"
                          ? pm.details.userName
                          : pm.details.email || pm.details.userName || "—";
                      const validChips = pm.currencies.filter(c => pmWorksForCurrency(offer, pm, c));
                      return (
                        <button key={pm.id}
                          className={`popup-pm-option${sel ? " selected" : ""}`}
                          onClick={() => {
                            if (sel) { setSelectedPM(null); return; }
                            setSelectedPM(pm.id);
                            const currencyValid = popupCurrency && pmWorksForCurrency(offer, pm, popupCurrency);
                            if (!currencyValid) {
                              // Auto-pick the first offer currency this PM supports
                              const firstValid = offer.currencies.find(c => pmWorksForCurrency(offer, pm, c)) ?? null;
                              setPopupCurrency(firstValid);
                            }
                          }}>
                          <div className={`popup-pm-radio${sel ? " checked" : ""}`}>
                            {sel && <div className="popup-pm-radio-dot"/>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:700,fontSize:".82rem"}}>{pm.type}</div>
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
                {!hasMissingPM && offer.currencies.length > 1 && (
                  <>
                    <div className="popup-section-label">
                      Select currency
                    </div>
                    <div className="popup-currency-pills">
                      {offer.currencies.map(c => (
                        <button key={c}
                          className={`popup-cur-pill${popupCurrency === c ? " selected" : ""}`}
                          onClick={() => {
                            if (popupCurrency === c) { setPopupCurrency(null); return; }
                            setPopupCurrency(c);
                            // Clear PM if the new currency makes it invalid
                            const pm = userPMs.find(p => p.id === selectedPM);
                            if (pm && !pmWorksForCurrency(offer, pm, c)) setSelectedPM(null);
                          }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

          </div>

          {/* Footer actions */}
          <div className="popup-footer">
            {/* ── Trade request (not own, not already requested) ── */}
            {!isOwn && !isReq && (
              pendingRequest && pendingRequest.offer.id === offer.id ? (
                <div className="popup-pending-row">
                  <div className="popup-pending-copy">
                    Sending in 5s — tap Undo to cancel
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
                      Withdraw
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
                    {withdrawing ? "Withdrawing…" : "Yes, withdraw"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  })();

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* ── POPUP ── */}
        {popupContent}

        {/* ── UNDO TOAST ── */}
        {undoAnim && (
          <div className="undo-toast">
            <span>↩ Trade request undone</span>
          </div>
        )}

        {/* ── TOAST ── */}
        {toast && (
          <div className="undo-toast">{toast}</div>
        )}

        {/* ── TOP BAR ── */}
        <Topbar
          onBurgerClick={() => setSidebarMobileOpen(o => !o)}
          isLoggedIn={isLoggedIn}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          showAvatarMenu={showAvatarMenu}
          setShowAvatarMenu={setShowAvatarMenu}
          btcPrice={btcPrice}
          pricesLoaded={pricesLoaded}
          selectedCurrency={selectedCurrency}
          availableCurrencies={availableCurrencies}
          onCurrencyChange={c => setSelectedCurrency(c)}
        />

        <SideNav
          active="market"
          mobileOpen={sidebarMobileOpen}
          onClose={() => setSidebarMobileOpen(false)}
          onNavigate={navigate}
          mobilePriceSlot={
            <div className="mobile-price-pill">
              <IcoBtc size={16}/>
              <div className="mobile-price-text">
                <span className="mobile-price-main">{pricesLoaded ? btcPrice.toLocaleString("fr-FR") : "?"} {selectedCurrency}</span>
                <span className="mobile-price-sats">{pricesLoaded ? satsPerCur.toLocaleString() : "?"} sats / {selectedCurrency.toLowerCase()}</span>
              </div>
              <CurrencyDropdown
                className="mobile-cur-select"
                value={selectedCurrency}
                options={availableCurrencies}
                onChange={setSelectedCurrency}
              />
            </div>
          }
        />

        <div className="page-wrap" style={{ marginTop:"var(--topbar)", marginLeft: 68, display:"flex", flexDirection:"column", flex:1 }}>

          {/* ── SUBHEADER ── */}
          <div className="subheader">
            {/* Tabs */}
            <div className="tabs">
              <button className={`tab${!isSellTab ? " active-buy"  : ""}`} onClick={()=>setTab("buy") }>Buy BTC</button>
              <button className={`tab${ isSellTab ? " active-sell" : ""}`} onClick={()=>setTab("sell")}>Sell BTC</button>
            </div>

            {/* Stats */}
            {stats.avg !== null && (
              <div className="stat-pill">
                <span>{filtered.length} offers</span>
                <span className="stat-sep">·</span>
                <span>Avg <strong style={{color:statColor(stats.avg)}}>{fmtPct(stats.avg)}</strong></span>
                <span className="stat-sep">·</span>
                {isSellTab ? (
                  <span>Best <strong style={{color:"var(--success)"}}>{fmtPct(stats.max)}</strong></span>
                ) : (
                  <span>Best <strong style={{color:"var(--success)"}}>{fmtPct(stats.min)}</strong></span>
                )}
                <RefreshIndicator active={isRefetching && !offersLoading} />
              </div>
            )}

            {/* Filters */}
            <MultiSelect
              label="Currency"
              options={currencyOptions}
              value={selCurrencies}
              onChange={setSelCurrencies}
              searchable
              searchPlaceholder="Search currencies…"
            />
            <MultiSelect
              label="Payment type"
              options={paymentTypeOptions}
              value={selPaymentTypes}
              onChange={setSelPaymentTypes}
            />
            <MultiSelect
              label="Payment method"
              options={methodOptions}
              value={selMethods}
              onChange={setSelMethods}
              searchable
              searchPlaceholder="Search payment methods…"
            />
            <input
              className="search-inp"
              placeholder="Search offers…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            <div className="my-offers-wrap" ref={infoRef}>
              <label className={`my-offers-check${!isLoggedIn ? " my-offers-check-disabled" : ""}`}>
                <input
                  type="checkbox"
                  checked={showMyOffers}
                  onChange={() => isLoggedIn && setShowMyOffers(v => !v)}
                  disabled={!isLoggedIn}
                />
                <span className="my-offers-check-box"/>
                Show My Offers
              </label>
              <span
                className="info-dot"
                onClick={(e) => { e.stopPropagation(); setShowMyOffersInfo(v => !v); }}
                title="What is this?"
              >i</span>
              {showMyOffersInfo && (
                <div className="info-popup">
                  <strong>Why are my offers in the other tab?</strong>
                  <p>Your offers appear where counterparties will find them:</p>
                  <ul>
                    <li><b>Buy BTC</b> tab shows sell offers — including yours</li>
                    <li><b>Sell BTC</b> tab shows buy offers — including yours</li>
                  </ul>
                  <p>This way, the people you want to trade with can see and accept your offer.</p>
                </div>
              )}
            </div>
            <button
              className="refresh-btn"
              onClick={handleRefreshOffers}
              title="Refresh offers"
              disabled={offersLoading}
              style={{opacity:offersLoading?0.5:1}}
            >
              ↻
            </button>
            <div className="cta-wrap">
              {isLoggedIn
                ? <button className="cta-btn" onClick={() => navigate("/offer/new")}>+ Create Offer</button>
                : <button className="cta-btn-disabled">+ Create Offer</button>
              }
              <span className="how-to-start">How to start</span>
            </div>
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className="table-wrap">
            <div className="info-sentence">
              Request as many trades as you want. You'll enter a trade with the first {isSellTab ? "buyer" : "seller"} who accepts your request, and your other requests will be automatically cancelled.
            </div>
            {offersLoading && auth ? (
              <div className="empty">
                <div className="empty-icon" style={{animation:"spin 1s linear infinite"}}>↻</div>
                <div className="empty-title">Loading offers…</div>
              </div>
            ) : displayOffers.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🍑</div>
                <div className="empty-title">No offers available at the moment</div>
                <div className="empty-sub">Try adjusting the currency, payment method, or reputation filter</div>
              </div>
            ) : (
              <table className="offer-table">
                <thead>
                  <tr>
                    <SortTh col="rep"     label="User & Trade ID" />
                    <SortTh col="amount"  label="Amount" />
                    <SortTh col="premium" label="Price" />
                    <th>Payment</th>
                    <th>Currencies</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayOffers.map(offer => (
                    <tr key={offer.id} className={[
                        offer.isOwn?"own-row":"",
                        effectiveRequested.has(offer.id)&&!offer.auto&&!offer.isOwn?"requested-row":"",
                        undoAnim===offer.id?"undo-row":"",
                        highlightedIds.has(offer.id)?"new-offer-row":""
                      ].filter(Boolean).join(" ")}
                      style={{cursor: isLoggedIn ? "pointer" : "default"}} onClick={() => isLoggedIn && openPopup(offer)}>
                      <td><RepCell offer={offer}/></td>
                      <td><AmountCell offer={offer} btcPrice={btcPrice} currency={selectedCurrency}/></td>
                      <td><PriceCell offer={offer} btcPrice={btcPrice} currency={selectedCurrency} isSellTab={isSellTab}/></td>
                      <td>
                        <div className="methods">
                          <Chips items={offer.methods.map(methodDisplayName)} className="method-chip"/>
                        </div>
                      </td>
                      <td>
                        <div className="currencies">
                          <Chips items={offer.currencies} className="currency-chip"/>
                        </div>
                      </td>
                      <td>
                        <div className="action-cell">
                          {offer.isOwn && <span className="own-label">Your offer</span>}
                          {(offer.auto||offer.experienceLevel)&&(
                            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                              {offer.auto&&<span className="auto-badge">⚡ Instant Trade</span>}
                              {offer.experienceLevel==="experiencedUsersOnly"&&<span className="exp-badge">👤 Experienced only</span>}
                              {offer.experienceLevel==="newUsersOnly"&&<span className="exp-badge">🆕 New users</span>}
                            </div>
                          )}
                          {offer.isOwn
                            ? <button className="action-btn edit-btn">✏ Edit</button>
                            : effectiveRequested.has(offer.id) && !offer.auto
                              ? <span className="requested-tag">Requested</span>
                              : isLoggedIn
                                ? <button className={`action-btn action-${tab}`}>{isSellTab ? "Sell" : "Buy"}</button>
                                : <button className="action-btn-disabled">{isSellTab ? "Sell" : "Buy"}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── MOBILE CARDS ── */}
          <div className="cards">
            <div className="info-sentence" style={{margin:"0 0 4px"}}>
              Request as many trades as you want. You'll enter a trade with the first {isSellTab ? "buyer" : "seller"} who accepts your request, and your other requests will be automatically cancelled.
            </div>
            {offersLoading && auth ? (
              <div className="empty">
                <div className="empty-icon" style={{animation:"spin 1s linear infinite"}}>↻</div>
                <div className="empty-title">Loading offers…</div>
              </div>
            ) : displayOffers.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🍑</div>
                <div className="empty-title">No offers available at the moment</div>
                <div className="empty-sub">Adjust your filters</div>
              </div>
            ) : displayOffers.map(offer => (
            <div key={offer.id} className={`offer-card${offer.isOwn?" own-card":""}${effectiveRequested.has(offer.id)&&!offer.auto&&!offer.isOwn?" requested-card":""}${undoAnim===offer.id?" undo-card":""}${highlightedIds.has(offer.id)?" new-offer-card":""}`}
              style={{cursor: isLoggedIn ? "pointer" : "default"}} onClick={() => isLoggedIn && openPopup(offer)}>
                {/* Row 1: tradeID + avatar · rep/badges (left) | action buttons (right) */}
                <span className="offer-id-label">{offer.tradeId}</span>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar peachId={offer.userId} size={27} online={offer.online} />
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                    <PeachRating rep={offer.rep} size={14}/>
                    <span className="rep-trades">({offer.trades})</span>
                    {offer.isOwn && <span className="own-label">Your offer</span>}
                    {offer.badges.includes("supertrader")&&<span className="badge badge-super">🏆</span>}
                    {offer.badges.includes("fast")&&<span className="badge badge-fast">⚡</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    {(offer.auto||offer.experienceLevel)&&(
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                        {offer.auto&&<span className="auto-badge">⚡ Instant Trade</span>}
                        {offer.experienceLevel==="experiencedUsersOnly"&&<span className="exp-badge">👤 Experienced only</span>}
                        {offer.experienceLevel==="newUsersOnly"&&<span className="exp-badge">🆕 New users</span>}
                      </div>
                    )}
                    {offer.isOwn
                      ? <button className="action-btn edit-btn">✏ Edit</button>
                      : effectiveRequested.has(offer.id) && !offer.auto
                        ? <span className="requested-tag">Requested</span>
                        : isLoggedIn
                          ? <button className={`action-btn action-${tab}`}>{isSellTab?"Sell":"Buy"}</button>
                          : <button className="action-btn-disabled">{isSellTab?"Sell":"Buy"}</button>
                    }
                  </div>
                </div>
                {/* Row 2: price (left) · sats amount (right) */}
                {/* Row 3: premium (left) · fiat (right) — uses selectedCurrency */}
                {(() => {
                  const sym  = currSym(selectedCurrency);
                  const rate = Math.round(btcPrice * (1 + offer.premium / 100));
                  const rateStr = rate.toLocaleString("fr-FR") + " " + sym;
                  const fiat = (offer.amount / 100_000_000) * btcPrice * (1 + offer.premium / 100);
                  const fiatVal = sym + fmtFiat(fiat);
                  const premCls = offer.premium === 0 ? "prem-zero" : isSellTab ? (offer.premium > 0 ? "prem-good" : "prem-bad") : (offer.premium < 0 ? "prem-good" : "prem-bad");
                  return (
                    <>
                      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
                        <span style={{fontSize:".9rem",fontWeight:800,color:"var(--black)"}}>{rateStr}</span>
                        <SatsAmount sats={offer.amount}/>
                      </div>
                      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
                        <span className={premCls} style={{fontSize:".9rem"}}>{offer.premium > 0 ? "+" : ""}{offer.premium.toFixed(2)}%</span>
                        <span style={{fontSize:".9rem",fontWeight:700,color:"var(--black)"}}>{fiatVal}</span>
                      </div>
                    </>
                  );
                })()}
                {/* Row 4: tags */}
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  <Chips items={offer.methods.map(methodDisplayName)} className="method-chip"/>
                  <Chips items={offer.currencies} className="currency-chip"/>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
