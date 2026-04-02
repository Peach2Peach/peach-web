import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SideNav, Topbar } from "../../components/Navbars.jsx";
import { SatsAmount, IcoBtc } from "../../components/BitcoinAmount.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useApi } from "../../hooks/useApi.js";
import { fetchWithSessionCheck } from "../../utils/sessionGuard.js";
import { extractPMsFromProfile, isApiError, generateSymmetricKey, encryptForRecipients, encryptSymmetric, signPGPMessage, hashPaymentFields, decryptPGPMessage } from "../../utils/pgp.js";
import { getCached, setCache, clearCache } from "../../hooks/useApi.js";
import { BTC_PRICE_FALLBACK as BTC_PRICE, fmtPct, fmtFiat, formatTradeId } from "../../utils/format.js";
import { PeachRating } from "../trades-dashboard/components.jsx";
import { CSS } from "./styles.js";
import { toPeaches, premiumStats, premiumCls, currSym, MultiSelect, Chips, RepCell, AmountCell, PriceCell } from "./components.jsx";

const ALL_CURRENCIES = ["EUR","CHF","GBP"];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function PeachMarket() {
  const navigate = useNavigate();
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
  const [allPrices,           setAllPrices]           = useState({ EUR: BTC_PRICE });
  const [availableCurrencies, setAvailableCurrencies] = useState(ALL_CURRENCIES);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // ── AUTH + API ──
  const { get, post, patch, auth } = useApi();
  const [liveOffers,   setLiveOffers]   = useState(() => getCached("market-offers")?.data ?? null);
  const [liveUserPMs,  setLiveUserPMs]  = useState(null); // null = use mock
  const [pmError,      setPmError]      = useState(false);
  const [offersLoading, setOffersLoading] = useState(() => !!auth && !getCached("market-offers"));

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

  const isSellTab = tab === "sell";

  // Derive current BTC price in selected currency
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? BTC_PRICE);

  // ── Popup helpers ──
  function openPopup(offer) {
    setSelectedPM(null);
    setPopupCurrency(offer.currencies.length === 1 ? offer.currencies[0] : null);
    setEditingPremium(false); setEditError(null);
    setWithdrawConfirm(false); setWithdrawError(null);
    setPopupOffer(offer);
  }
  function closePopup() {
    setPopupOffer(null);
    setSelectedPM(null);
    setPopupCurrency(null);
    setRequestAnim(false);
    setEditingPremium(false); setEditError(null);
    setWithdrawConfirm(false); setWithdrawError(null);
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

  // Find which of the user's PMs match the offer's methods
  function matchingUserPMs(offer) {
    return userPMs.filter(pm => offer.methods.includes(pm.type));
  }

  async function handleRequestTrade(offer) {
    if (!auth?.pgpPrivKey || !selectedPM || !popupCurrency) return;

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
      const counterpartyKeys = (offer._raw?.user?.pgpPublicKeys ?? [])
        .map(k => typeof k === "string" ? k : k?.publicKey)
        .filter(Boolean);

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
        // Show animation, mark as requested, close popup
        setRequestAnim(true);
        setTimeout(() => {
          setLocalRequested(prev => new Set([...prev, offer.id]));
          closePopup();
        }, 1600);
      } else {
        const err = await res.json().catch(() => ({}));
        setToast("Trade request failed: " + (err.error || "try again"));
        setTimeout(() => setToast(null), 4000);
      }
    } catch (e) {
      setToast("Trade request error: " + e.message);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleInstantTrade(offer) {
    if (!auth?.pgpPrivKey || !selectedPM || !popupCurrency) return;

    // 1. Find the selected PM data
    const pmObj = userPMs.find(pm => pm.id === selectedPM);
    if (!pmObj) return;

    // 2. Build clean PM data (same pattern as trades-dashboard match acceptance)
    const STRUCTURAL = new Set(["id", "methodId", "type", "name", "label", "currencies", "hashes", "details", "data", "country", "anonymous"]);
    const cleanData = {};
    const pmDetails = pmObj.details || {};
    for (const [k, v] of Object.entries(pmDetails)) {
      if (!STRUCTURAL.has(k) && typeof v !== "object") cleanData[k] = v;
    }

    // 3. Generate symmetric key and encrypt for counterparty
    let symmetricKeyEncrypted = null;
    let symmetricKeySignature = null;
    let paymentDataEncrypted = null;
    let paymentDataSignature = null;
    let paymentDataHashed = null;

    try {
      const symmetricKey = generateSymmetricKey();
      const counterpartyKeys = (offer._raw?.user?.pgpPublicKeys ?? [])
        .map(k => typeof k === "string" ? k : k?.publicKey)
        .filter(Boolean);

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

      // 4. Call performInstantTrade
      const offerType = offer.type === "bid" ? "buyOffer" : "sellOffer";
      const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
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
      });

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
      setToast("Instant trade error: " + e.message);
      setTimeout(() => setToast(null), 4000);
    }
  }

  function handleUndoRequest(offer) {
    closePopup();
    setUndoAnim(offer.id);
    setTimeout(() => {
      setLocalRequested(prev => { const s = new Set(prev); s.delete(offer.id); return s; });
      setUndoAnim(null);
    }, 1200);
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
      isOwn: !!peachId && (o.user?.id === peachId || o.user?.id?.toLowerCase?.() === peachId?.toLowerCase?.()),
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
    };
  }

  async function fetchMarket() {
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

        // Debug: decrypt selfEncrypted PM data on own offers
        if (auth?.pgpPrivKey) {
          for (const o of [...ownBidsArr, ...ownAsksArr]) {
            const pd = o.paymentData;
            if (!pd) continue;
            for (const [method, data] of Object.entries(pd)) {
              if (data?.selfEncrypted) {
                decryptPGPMessage(data.selfEncrypted, auth.pgpPrivKey).then(decrypted => {
                  console.log(`[MarketView] Offer ${o.id} → ${method} selfEncrypted:`, decrypted);
                }).catch(() => {});
              }
            }
          }
        }

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
      console.log("[MarketView] normalized sample:", all[0]);

      setCache("market-offers", all);
      setLiveOffers(all);
    } catch (err) {
      console.error("[MarketView] fetchMarket failed:", err);
    } finally {
      setOffersLoading(false);
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
          if (!pms) throw new Error("No PM data found in profile");
          // Keys that belong to the PM structure — everything else is a detail field
          const STRUCTURAL = new Set([
            "id", "methodId", "type", "name", "label", "currencies", "hashes",
            "details", "data", "country", "anonymous",
          ]);
          function mapD(d) {
            const m = { ...d };
            if (d.userName && !d.username) m.username = d.userName;
            if (d.userName && !d.email)    m.email    = d.userName;
            if (d.beneficiary && !d.holder) m.holder  = d.beneficiary;
            return m;
          }
          function shortId(raw) { return raw.replace(/-\d+$/, ""); }
          function sweepFields(obj) {
            const explicit = obj.data || obj.details || null;
            const swept = {};
            if (!explicit) {
              for (const [k, v] of Object.entries(obj)) {
                if (!STRUCTURAL.has(k) && typeof v !== "object") swept[k] = v;
              }
            }
            return mapD(explicit || (Object.keys(swept).length ? swept : {}));
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const marketOffers = liveOffers ?? [];
  const userPMs = liveUserPMs ?? [];

  const offerType = isSellTab ? "bid" : "ask";

  const PAYMENT_TYPE_MAP = {
    "Cash":      ["Cash"],
    "Online":    ["SEPA","Revolut","Wise","PayPal"],
    "Gift card": ["Amazon","iTunes"],
  };

  const filtered = marketOffers
    .filter(o => o.type === offerType)
    .filter(o => showMyOffers || !o.isOwn)
    .filter(o => selCurrencies.length === 0 || selCurrencies.some(c => o.currencies.includes(c)))
    .filter(o => selMethods.length === 0    || selMethods.some(m => o.methods.includes(m)))
    .filter(o => selPaymentTypes.length === 0 || selPaymentTypes.some(pt =>
      (PAYMENT_TYPE_MAP[pt] || []).some(m => o.methods.includes(m))
    ))
    .filter(o => searchQuery.trim() === "" ||
      o.methods.some(m => m.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.currencies.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
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
  const effectiveRequested = isLoggedIn ? localRequested : new Set();

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
    const matching = matchingUserPMs(offer);
    const hasMissingPM = matching.length === 0;

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

    return (
      <div className="popup-overlay" onClick={closePopup}>
        <div className="popup-card" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="popup-header">
            <span className="popup-title">
              {isOwn ? "Your offer" : isReq ? "Trade requested" : "Offer details"}
              <span className="offer-id-label" style={{marginLeft:8}}>{offer.tradeId}</span>
            </span>
            <button className="popup-close" onClick={closePopup}>✕</button>
          </div>

          {/* Offer summary */}
          <div className="popup-body">
            {/* Peer row */}
            <div className="popup-peer-row">
              <div className="rep-avatar" style={{width:30,height:30,fontSize:".6rem"}}>
                {offer.id.toUpperCase().slice(0,2)}
                {offer.online && <span className="online-dot"/>}
              </div>
              <div style={{flex:1}}>
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
                    {offer.methods.map(m => <span key={m} className="method-chip">{m}</span>)}
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
                        This offer accepts {offer.methods.join(", ")} but you haven't configured any of these.
                      </div>
                      <button className="popup-pm-link" onClick={() => navigate("/payment-methods")}>
                        Go to Payment Methods →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="popup-pm-list">
                    {matching.map(pm => {
                      const sel = selectedPM === pm.id;
                      const detailStr = pm.type === "SEPA"
                        ? `${pm.details.holder} · ${pm.details.iban?.slice(0,8)}…`
                        : pm.type === "Revolut"
                          ? pm.details.username
                          : pm.details.email || pm.details.username || "—";
                      return (
                        <button key={pm.id}
                          className={`popup-pm-option${sel ? " selected" : ""}`}
                          onClick={() => setSelectedPM(pm.id)}>
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
                            {pm.currencies.filter(c => offer.currencies.includes(c)).map(c =>
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
                          onClick={() => setPopupCurrency(c)}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── ALREADY REQUESTED variant: read-only state ── */}
            {!isOwn && isReq && (
              <div className="popup-requested-state">
                <div className="popup-requested-badge">✓ Trade requested</div>
                <div style={{fontSize:".78rem",color:"var(--black-65)",marginTop:4}}>
                  Waiting for the {isSellTab ? "buyer" : "seller"} to respond.
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="popup-footer">
            {/* ── Trade request (not own, not already requested) ── */}
            {!isOwn && !isReq && (
              isInstant ? (
                <button className="popup-btn popup-btn-instant"
                  disabled={!selectedPM || !popupCurrency}
                  onClick={() => handleInstantTrade(offer)}>
                  ⚡ Instant trade
                </button>
              ) : (
                <button className="popup-btn popup-btn-request"
                  disabled={!selectedPM || !popupCurrency}
                  onClick={() => handleRequestTrade(offer)}>
                  Request trade
                </button>
              )
            )}

            {/* ── Already requested ── */}
            {!isOwn && isReq && (
              <div style={{display:"flex",gap:8,width:"100%"}}>
                <button className="popup-btn popup-btn-undo"
                  onClick={() => handleUndoRequest(offer)}>
                  Undo request
                </button>
                <button className="popup-btn popup-btn-chat" style={{opacity:.45,cursor:"not-allowed"}}
                  title="Coming soon" disabled>
                  💬 Chat
                </button>
              </div>
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
          selectedCurrency={selectedCurrency}
          availableCurrencies={availableCurrencies}
          onCurrencyChange={c => setSelectedCurrency(c)}
        />

        <SideNav
          active="market"
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          mobileOpen={sidebarMobileOpen}
          onClose={() => setSidebarMobileOpen(false)}
          onNavigate={navigate}
          mobilePriceSlot={
            <div className="mobile-price-pill">
              <IcoBtc size={16}/>
              <div className="mobile-price-text">
                <span className="mobile-price-main">{btcPrice.toLocaleString("fr-FR")} {selectedCurrency}</span>
                <span className="mobile-price-sats">{satsPerCur.toLocaleString()} sats / {selectedCurrency.toLowerCase()}</span>
              </div>
              <div className="topbar-cur-select mobile-cur-select">
                <span className="cur-select-label">{selectedCurrency}</span>
                <svg className="cur-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:"none",flexShrink:0}}><polyline points="1,1 5,5 9,1"/></svg>
                <select
                  value={selectedCurrency}
                  onChange={e => setSelectedCurrency(e.target.value)}
                  className="cur-select-inner"
                >
                  {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          }
        />

        <div className="page-wrap" style={{ marginTop:"var(--topbar)", marginLeft: sidebarCollapsed ? 44 : 68, display:"flex", flexDirection:"column", flex:1 }}>

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
              </div>
            )}

            {/* Filters */}
            <MultiSelect
              label="Payment type"
              options={["Cash","Online","Gift card"]}
              value={selPaymentTypes}
              onChange={setSelPaymentTypes}
            />
            <MultiSelect
              label="Currency"
              options={ALL_CURRENCIES}
              value={selCurrencies}
              onChange={setSelCurrencies}
            />
            <MultiSelect
              label="Payment method"
              options={[...new Set(marketOffers.flatMap(o => o.methods || []))].sort()}
              value={selMethods}
              onChange={setSelMethods}
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
                <div className="empty-title">No offers match your filters</div>
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
                        undoAnim===offer.id?"undo-row":""
                      ].filter(Boolean).join(" ")}
                      style={{cursor: isLoggedIn ? "pointer" : "default"}} onClick={() => isLoggedIn && openPopup(offer)}>
                      <td><RepCell offer={offer}/></td>
                      <td><AmountCell offer={offer} btcPrice={btcPrice} currency={selectedCurrency}/></td>
                      <td><PriceCell offer={offer} btcPrice={btcPrice} currency={selectedCurrency} isSellTab={isSellTab}/></td>
                      <td>
                        <div className="methods">
                          <Chips items={offer.methods} className="method-chip"/>
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
                              {offer.auto&&<span className="auto-badge">⚡ Instant Match</span>}
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
                <div className="empty-title">No offers found</div>
                <div className="empty-sub">Adjust your filters</div>
              </div>
            ) : displayOffers.map(offer => (
            <div key={offer.id} className={`offer-card${offer.isOwn?" own-card":""}${effectiveRequested.has(offer.id)&&!offer.auto&&!offer.isOwn?" requested-card":""}${undoAnim===offer.id?" undo-card":""}`}
              style={{cursor: isLoggedIn ? "pointer" : "default"}} onClick={() => isLoggedIn && openPopup(offer)}>
                {/* Row 1: tradeID + avatar · rep/badges (left) | action buttons (right) */}
                <span className="offer-id-label">{offer.tradeId}</span>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div className="rep-avatar" style={{flexShrink:0}}>
                    {offer.id.toUpperCase().slice(0,2)}
                    {offer.online && <span className="online-dot"/>}
                  </div>
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
                        {offer.auto&&<span className="auto-badge">⚡ Instant Match</span>}
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
                  <Chips items={offer.methods} className="method-chip"/>
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
