import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SatsAmount } from "../../components/BitcoinAmount.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useApi } from "../../hooks/useApi.js";
import { useCurrency } from "../../components/AppLayout.jsx";
import { fetchWithSessionCheck } from "../../utils/sessionGuard.js";
import { getCached, setCache, clearCache } from "../../hooks/useApi.js";
import { fmtPct, fmtFiat, formatTradeId, toPeaches, hasPrice, PRICE_PLACEHOLDER } from "../../utils/format.js";
import { normalizeOffer } from "../../utils/normalizeOffer.js";
import PeachRating from "../../components/PeachRating.jsx";
import Avatar from "../../components/Avatar.jsx";
import RepeatTraderBadge from "../../components/RepeatTraderBadge.jsx";
import OfferDetailPopup from "../../components/OfferDetailPopup.jsx";
import Toast from "../../components/Toast.jsx";
import { RefreshIndicator } from "../../components/RefreshIndicator.jsx";
import { LoadingSpinner } from "../../components/LoadingSpinner.jsx";
import { BadgesInfoPopup } from "../../components/InfoPopup.jsx";
import { CSS } from "./styles.js";
import { premiumStats, premiumCls, currSym, MultiSelect, Chips, RepCell, AmountCell, PriceCell, OfferIdCopy } from "./components.jsx";
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
  const [userSorted,     setUserSorted]     = useState(false);
  const [selCurrencies,    setSelCurrencies]    = useState([]);   // [] = all
  const [selMethods,       setSelMethods]       = useState([]);   // [] = all
  const [selPaymentTypes,  setSelPaymentTypes]  = useState([]);   // [] = all
  const [searchQuery,      setSearchQuery]      = useState("");

  const [showMyOffers,        setShowMyOffers]        = useState(() => getCached("market-show-my-offers")?.data ?? false);
  useEffect(() => { setCache("market-show-my-offers", showMyOffers); }, [showMyOffers]);
  const [showInstantOnly,     setShowInstantOnly]     = useState(() => getCached("market-show-instant-only")?.data ?? false);
  useEffect(() => { setCache("market-show-instant-only", showInstantOnly); }, [showInstantOnly]);
  const [showMyOffersInfo,    setShowMyOffersInfo]    = useState(false);
  const infoRef = useRef(null);
  // Currency state lives in AppLayout. Read btcPrice + selectedCurrency
  // for fiat conversions; the topbar dropdown is rendered by AppLayout.
  const { btcPrice, selectedCurrency } = useCurrency();

  // ── Mobile UI state ──
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen]       = useState(false);
  const [bannerOpen, setBannerOpen]   = useState(true);
  const [controlsCollapsed, setControlsCollapsed] = useState(() => {
    try { return localStorage.getItem("peach_marketControlsCollapsed") === "1"; }
    catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("peach_marketControlsCollapsed", controlsCollapsed ? "1" : "0"); }
    catch {}
  }, [controlsCollapsed]);

  // ── Pull-to-refresh (mobile) ──
  const ptrStartY = useRef(0);
  const ptrActiveTouch = useRef(false);
  const [ptrPull, setPtrPull] = useState(0);
  const [ptrRefreshing, setPtrRefreshing] = useState(false);
  const PTR_THRESHOLD = 70;

  // ── AUTH + API ──
  const { get, post, auth } = useApi();
  const [liveOffers,   setLiveOffers]   = useState(() => getCached("market-offers")?.data ?? null);
  const [offersLoading, setOffersLoading] = useState(() => !getCached("market-offers"));
  const [isRefetching, setIsRefetching] = useState(false);
  const [pmCatalogue,  setPmCatalogue]  = useState(() => getCached("pm-catalogue")?.data ?? null);

  // AppLayout owns Topbar/SideNav state. Market only needs isLoggedIn for popup gating.
  const { isLoggedIn } = useAuth();

  // Close info popup on outside click
  useEffect(() => {
    if (!showMyOffersInfo) return;
    function handler(e) {
      if (infoRef.current && !infoRef.current.contains(e.target)) setShowMyOffersInfo(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMyOffersInfo]);

  // ── Popup + list state ──
  // The OfferDetailPopup owns all popup-internal state; market-view only
  // remembers which offer id is currently open and tracks list-level state
  // that survives popup mount/unmount (requested pill, undo flash, etc.).
  // Holds the open offer object (not just its id) so the popup survives a 30s
  // list refresh — needed for the post-cancel "refund pending" state, which must
  // stay visible after the cancelled offer drops out of the live list.
  const [popupOffer,     setPopupOffer]     = useState(null);
  const [badgesHelpOpen, setBadgesHelpOpen] = useState(false);
  const [undoAnim,       setUndoAnim]       = useState(null);   // offer id being undone
  const [localRequested, setLocalRequested] = useState(() => new Set()); // track requested state locally
  const [acceptedContracts, setAcceptedContracts] = useState(() => new Map()); // offerId → contractId once seller accepts a sent request
  const [highlightedIds, setHighlightedIds] = useState(() => new Set()); // newly published offers, briefly highlighted
  const [toast,          setToast]          = useState(null);
  const [toastTone,      setToastTone]      = useState("default"); // "default" | "error" | "orange" | "success"

  const isSellTab = tab === "sell";

  // Default sort = most attractive premium for the tab's perspective:
  // Buy tab (buyer) → lowest premium first; Sell tab (seller) → highest first.
  // Stops applying once the user picks a sort manually.
  useEffect(() => {
    if (userSorted) return;
    setSortKey("premium");
    setSortDir(isSellTab ? -1 : 1);
  }, [tab, userSorted]);

  function showToast(message, tone = "default", durationMs = 3500) {
    setToast(message);
    setToastTone(tone);
    setTimeout(() => { setToast(null); setToastTone("default"); }, durationMs);
  }


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
      badges: (auth?.profile?.medals ?? []).map((m) =>
        m === "fastTrader" ? "fast"
          : m === "superTrader" ? "supertrader"
          : m,
      ),
      auto: false,
      experienceLevel: o.experienceLevelCriteria ?? null,
      online: true,
      userId: peachId ?? "",
      peachId: peachId ? ("PEACH" + peachId.slice(0, 8).toUpperCase()) : "",
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
        for (const o of bidsArr)    { const id = String(o.id); if (!seen.has(id)) { seen.add(id); merged.push(normalizeOffer(o, "bid", peachId)); } }
        for (const o of asksArr)    { const id = String(o.id); if (!seen.has(id)) { seen.add(id); merged.push(normalizeOffer(o, "ask", peachId)); } }
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
          ...bidsArr.map(o => normalizeOffer(o, "bid", null)),
          ...asksArr.map(o => normalizeOffer(o, "ask", null)),
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
    setOffersLoading(true);
    fetchMarket();
  }

  // ── Pull-to-refresh touch handlers (only attached on mobile) ──
  function onPtrTouchStart(e) {
    if (typeof window === "undefined" || window.scrollY > 0) {
      ptrActiveTouch.current = false;
      return;
    }
    ptrActiveTouch.current = true;
    ptrStartY.current = e.touches[0].clientY;
  }
  function onPtrTouchMove(e) {
    if (!ptrActiveTouch.current) return;
    const delta = e.touches[0].clientY - ptrStartY.current;
    if (delta <= 0) { setPtrPull(0); return; }
    setPtrPull(Math.min(delta * 0.5, 110));
  }
  function onPtrTouchEnd() {
    if (!ptrActiveTouch.current) return;
    ptrActiveTouch.current = false;
    if (ptrPull >= PTR_THRESHOLD && !ptrRefreshing) {
      setPtrRefreshing(true);
      handleRefreshOffers();
    }
    setPtrPull(0);
  }
  // Drop refreshing flag once the refresh finishes (offersLoading transitions back to false)
  useEffect(() => {
    if (ptrRefreshing && !offersLoading) {
      const t = setTimeout(() => setPtrRefreshing(false), 250);
      return () => clearTimeout(t);
    }
  }, [ptrRefreshing, offersLoading]);

  // ── Active filter / sort helpers (mobile UI) ──
  const activeFilterCount =
    selCurrencies.length + selPaymentTypes.length + selMethods.length + (searchQuery ? 1 : 0);
  function clearAllFilters() {
    setSelCurrencies([]);
    setSelPaymentTypes([]);
    setSelMethods([]);
    setSearchQuery("");
  }
  // For "rep", existing sort code reverses (b.rep - a.rep), so sortDir=1 yields descending.
  // Compute the display arrow accordingly so the button reflects the visible order.
  const sortDisplayAsc = sortKey === "rep" ? sortDir === -1 : sortDir === 1;
  const sortLabelMap = { premium: "Price", amount: "Amount", rep: "Reputation" };
  const sortOptions = [
    { label: "Price — low to high",       key: "premium", dir: 1 },
    { label: "Price — high to low",       key: "premium", dir: -1 },
    { label: "Amount — low to high",      key: "amount",  dir: 1 },
    { label: "Amount — high to low",      key: "amount",  dir: -1 },
    { label: "Reputation — high to low",  key: "rep",     dir: 1 },
    { label: "Reputation — low to high",  key: "rep",     dir: -1 },
  ];
  function pickSort(key, dir) {
    setUserSorted(true);
    setSortKey(key);
    setSortDir(dir);
    setSortOpen(false);
  }

  // ── LIVE MARKET OFFERS POLL ──
  useEffect(() => {
    fetchMarket();
    // Poll every 30s. Mainnet has hundreds of offers; a 10s poll was costly
    // both for the client (parse/render) and the API. Focus-based refetch
    // below covers the "user just came back to the tab" case.
    const iv = setInterval(fetchMarket, 30000);
    function onVisible() {
      if (document.visibilityState === "visible") fetchMarket();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const marketOffers = liveOffers ?? [];

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
    const direction = navState?.highlightDirection;
    const ids = navState?.highlightOfferIds;
    const hasIds = Array.isArray(ids) && ids.length > 0;
    if (!direction && !hasIds) return;
    highlightHandledRef.current = true;
    if (direction === "buy")  setTab("sell");
    if (direction === "sell") setTab("buy");
    setShowMyOffers(true);
    if (hasIds) setHighlightedIds(new Set(ids.map(String)));
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Plain tab pre-select when arriving from the home "Open Offers" card ──
  // location.state shape: { marketTab: "buy"|"sell" }. Unlike highlightDirection,
  // this just switches the tab — it does NOT enable the "my offers only" view.
  useEffect(() => {
    const t = location.state?.marketTab;
    if (t !== "buy" && t !== "sell") return;
    setTab(t);
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

  // Reactive offer counts per filter option. Each option's count reflects the
  // number of current-tab offers that would match if this option were the only
  // value in its dimension — i.e. all OTHER active filters still apply. This
  // lets the user see liquidity for the option they're considering, narrowed
  // by any context they've already set.
  const tabOffers = marketOffers.filter(o => o.type === offerType && (showMyOffers || !o.isOwn));
  function offerMatchesExcept(o, skip) {
    if (skip !== "currency" && selCurrencies.length > 0 &&
        !selCurrencies.some(c => o.currencies.includes(c))) return false;
    if (skip !== "method" && selMethodIds.length > 0 &&
        !selMethodIds.some(m => o.methods.includes(m))) return false;
    if (skip !== "category" && selCatIds.length > 0) {
      const offerCats = o.methods.map(m => PM_CATEGORIES[m] || "onlineWallet");
      if (!selCatIds.some(c => offerCats.includes(c))) return false;
    }
    return true;
  }
  const currencyCounts = {};
  for (const o of tabOffers) {
    if (!offerMatchesExcept(o, "currency")) continue;
    for (const c of o.currencies) currencyCounts[c] = (currencyCounts[c] || 0) + 1;
  }
  const methodCounts = {};
  for (const o of tabOffers) {
    if (!offerMatchesExcept(o, "method")) continue;
    const seen = new Set();
    for (const m of o.methods) {
      const dn = methodDisplayName(m);
      if (seen.has(dn)) continue;
      seen.add(dn);
      methodCounts[dn] = (methodCounts[dn] || 0) + 1;
    }
  }
  const typeCounts = {};
  for (const o of tabOffers) {
    if (!offerMatchesExcept(o, "category")) continue;
    const cats = new Set(o.methods.map(m => PM_CATEGORIES[m] || "onlineWallet"));
    for (const catId of cats) {
      const label = CATEGORY_META[catId]?.label;
      if (label) typeCounts[label] = (typeCounts[label] || 0) + 1;
    }
  }
  const byCountDesc = (a, b) => (b.count - a.count) || a.value.localeCompare(b.value);
  currencyOptions    = currencyOptions.map(v   => ({ value: v,   count: currencyCounts[v]   || 0 })).sort(byCountDesc);
  methodOptions      = methodOptions.map(v     => ({ value: v,   count: methodCounts[v]     || 0 })).sort(byCountDesc);
  paymentTypeOptions = paymentTypeOptions.map(v => ({ value: v,  count: typeCounts[v]       || 0 })).sort(byCountDesc);

  const filtered = marketOffers
    .filter(o => o.type === offerType)
    .filter(o => showMyOffers || !o.isOwn)
    .filter(o => !showInstantOnly || o.auto)
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
    setUserSorted(true);
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

  // For stat pill: avg color follows the same perspective logic
  function statColor(val) {
    const n = parseFloat(val);
    if (n === 0) return "var(--black)";
    return isSellTab
      ? (n > 0 ? "var(--success)" : "var(--error)")
      : (n < 0 ? "var(--success)" : "var(--error)");
  }


  return (
    <>
      <style>{CSS}</style>

        {/* ── POPUP ── */}
        {popupOffer && (() => {
          const offer = popupOffer;
          return (
            <OfferDetailPopup
              key={offer.id}
              offer={offer}
              onClose={() => setPopupOffer(null)}
              onLocalRequestedChange={(id, req) => {
                setLocalRequested(prev => {
                  const s = new Set(prev);
                  if (req) s.add(id); else s.delete(id);
                  return s;
                });
              }}
              onOfferUpdated={(updated) => {
                setLiveOffers(prev => prev ? prev.map(x => x.id === updated.id ? updated : x) : prev);
                setPopupOffer(prev => prev && prev.id === updated.id ? updated : prev);
              }}
              onOfferWithdrawn={(id) => {
                setLiveOffers(prev => prev ? prev.filter(x => x.id !== id) : prev);
              }}
              onContractAccepted={(contractId) => {
                setPopupOffer(null);
                navigate(`/trade/${contractId}`);
              }}
              onTradeRequested={() => {
                clearCache("market-offers");
                fetchMarket();
              }}
              onToast={(message, tone) => showToast(message, tone)}
            />
          );
        })()}

        {/* ── UNDO TOAST ── */}
        {undoAnim && <Toast message="↩ Trade request undone" />}

        {/* ── TOAST ── */}
        <Toast message={toast} tone={toastTone} />

        <div className="page-wrap" style={{ marginTop:"var(--topbar)", marginLeft: 68, display:"flex", flexDirection:"column", flex:1 }}>

          {/* ── SUBHEADER ── */}
          <div className="subheader">
            {/* Tabs */}
            <div className="tabs">
              <button className={`tab${!isSellTab ? " active-buy"  : ""}`} onClick={()=>setTab("buy") }>Buy BTC</button>
              <button className={`tab${ isSellTab ? " active-sell" : ""}`} onClick={()=>setTab("sell")}>Sell BTC</button>
            </div>

            {/* Mobile-only collapse toggle */}
            {isMobile && (
              <button
                type="button"
                className="controls-toggle"
                onClick={() => setControlsCollapsed(v => !v)}
                aria-expanded={!controlsCollapsed}
              >
                {controlsCollapsed ? "show more" : "show less"}
                <span className={`controls-toggle-chev${controlsCollapsed ? "" : " open"}`}>▾</span>
              </button>
            )}

            <div className={`subheader-collapsible${isMobile && controlsCollapsed ? " is-collapsed" : ""}`}>
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

            {/* Filters + Sort — mobile pill buttons (open bottom sheets) */}
            {isMobile && (
              <div className="mobile-filter-row">
                <button className="filters-btn" onClick={() => setFiltersOpen(true)}>
                  <span>Filters</span>
                  {activeFilterCount > 0 && <span className="filters-btn-count">{activeFilterCount}</span>}
                  <span className="filters-btn-arrow">▼</span>
                </button>
                <button className="sort-btn" onClick={() => setSortOpen(true)}>
                  <span>Sort: {sortLabelMap[sortKey]} {sortDisplayAsc ? "↑" : "↓"}</span>
                  <span className="sort-btn-arrow">▼</span>
                </button>
              </div>
            )}

            {isMobile && (
              <div className="my-offers-wrap" ref={infoRef}>
                <label className={`my-offers-check${!isLoggedIn ? " my-offers-check-disabled" : ""}`}>
                  <input
                    type="checkbox"
                    checked={showMyOffers}
                    onChange={() => isLoggedIn && setShowMyOffers(v => !v)}
                    disabled={!isLoggedIn}
                  />
                  <span className="my-offers-check-box"/>
                  Show my offers
                  <span
                    className="info-dot"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMyOffersInfo(v => !v); }}
                    title="What is this?"
                  >i</span>
                </label>
                {showMyOffersInfo && (
                  <div className="info-popup">
                    <strong>Why are my offers in the other tab?</strong>
                    <p>Your offers appear where counterparties will find them:</p>
                    <ul>
                      <li><b>Buy BTC</b> tab shows sell offers — including yours</li>
                      <li><b>Sell BTC</b> tab shows buy offers — including yours</li>
                    </ul>
                    <p>This way, the people you you can easily compare your offers with other peoples'.</p>
                  </div>
                )}
              </div>
            )}
            {isMobile && (
              <label className="my-offers-check">
                <input
                  type="checkbox"
                  checked={showInstantOnly}
                  onChange={() => setShowInstantOnly(v => !v)}
                />
                <span className="my-offers-check-box"/>
                Show only instant trades
              </label>
            )}
            {isMobile && (
              <button
                className="refresh-btn"
                onClick={handleRefreshOffers}
                title="Refresh offers"
                disabled={offersLoading}
                style={{opacity:offersLoading?0.5:1}}
              >
                ↻
              </button>
            )}
            <div className="cta-wrap">
              {isLoggedIn
                ? <button className="cta-btn" onClick={() => navigate(isSellTab ? "/offer/new?type=sell" : "/offer/new")}>+ Create Offer</button>
                : <button className="cta-btn-disabled">+ Create Offer</button>
              }
              <a className="how-to-start" href="https://peachbitcoin.com/support/" target="_blank" rel="noopener noreferrer">How to start</a>
            </div>

            {/* Filters — desktop dedicated row (hidden on mobile via isMobile gate) */}
            {!isMobile && (
              <div className="filters-row">
                <input
                  className="search-inp"
                  placeholder="Search offers…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
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
                <div className="my-offers-wrap" ref={infoRef}>
                  <label className={`my-offers-check${!isLoggedIn ? " my-offers-check-disabled" : ""}`}>
                    <input
                      type="checkbox"
                      checked={showMyOffers}
                      onChange={() => isLoggedIn && setShowMyOffers(v => !v)}
                      disabled={!isLoggedIn}
                    />
                    <span className="my-offers-check-box"/>
                    Show my offers
                    <span
                      className="info-dot"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMyOffersInfo(v => !v); }}
                      title="What is this?"
                    >i</span>
                  </label>
                  {showMyOffersInfo && (
                    <div className="info-popup">
                      <strong>Why are my offers in the other tab?</strong>
                      <p>Your offers appear where counterparties will find them:</p>
                      <ul>
                        <li><b>Buy BTC</b> tab shows sell offers — including yours</li>
                        <li><b>Sell BTC</b> tab shows buy offers — including yours</li>
                      </ul>
                      <p>This way, the people you you can easily compare your offers with other peoples'.</p>
                    </div>
                  )}
                </div>
                <label className="my-offers-check">
                  <input
                    type="checkbox"
                    checked={showInstantOnly}
                    onChange={() => setShowInstantOnly(v => !v)}
                  />
                  <span className="my-offers-check-box"/>
                  Show only instant trades
                </label>
                <button
                  className="refresh-btn refresh-btn-labeled"
                  onClick={handleRefreshOffers}
                  title="Refresh offers"
                  disabled={offersLoading}
                  style={{opacity:offersLoading?0.5:1}}
                >
                  ↻ Reload
                </button>
              </div>
            )}
            </div>
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className="table-wrap">
            <div className="info-sentence">
              Request as many trades as you want. You'll enter a trade with the first {isSellTab ? "buyer" : "seller"} who accepts your request, and your other requests will be automatically cancelled.
            </div>
            {offersLoading ? (
              <LoadingSpinner label="Loading offers…" />
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
                      style={{cursor: "pointer"}} onClick={() => setPopupOffer(offer)}>
                      <td><RepCell offer={offer}/></td>
                      <td><AmountCell offer={offer} btcPrice={btcPrice} currency={selectedCurrency}/></td>
                      <td><PriceCell offer={offer} btcPrice={btcPrice} currency={selectedCurrency} isSellTab={isSellTab}/></td>
                      <td>
                        <div className="methods">
                          <Chips items={offer.methods.map((m) => {
                            const c = offer._raw?.paymentData?.[m]?.country;
                            return `${methodDisplayName(m)}${c ? ` (${c})` : ""}`;
                          })} className="method-chip"/>
                        </div>
                      </td>
                      <td>
                        <div className="currencies">
                          <Chips items={offer.currencies} className="currency-chip"/>
                        </div>
                      </td>
                      <td>
                        <div className="action-cell">
                          <OfferIdCopy tradeId={offer.tradeId} />
                          {(offer.auto||offer.experienceLevel)&&(
                            <div className="action-cell-badges">
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

          {/* ── MOBILE CARDS (wrapped in pull-to-refresh host) ── */}
          <div
            className="ptr-host"
            onTouchStart={isMobile ? onPtrTouchStart : undefined}
            onTouchMove={isMobile ? onPtrTouchMove : undefined}
            onTouchEnd={isMobile ? onPtrTouchEnd : undefined}
            style={{
              transform: ptrPull ? `translateY(${ptrPull}px)` : undefined,
              transition: ptrPull === 0 ? "transform .22s ease" : "none",
            }}
          >
            {isMobile && (ptrPull > 0 || ptrRefreshing) && (
              <div className="ptr-indicator">
                <div
                  className={`ptr-spinner${ptrRefreshing ? " ptr-spin" : ""}`}
                  style={{
                    opacity: ptrRefreshing ? 1 : Math.min(ptrPull / PTR_THRESHOLD, 1),
                    transform: ptrRefreshing ? undefined : `rotate(${ptrPull * 4}deg)`,
                  }}
                />
              </div>
            )}
          <div className="cards">
            <div
              className={`info-sentence${isMobile ? " collapsible" : ""}${isMobile && !bannerOpen ? " collapsed" : ""}`}
              style={{margin:"0 0 4px"}}
              onClick={() => isMobile && setBannerOpen(v => !v)}
            >
              <span className="info-sentence-text">
                Request as many trades as you want. You'll enter a trade with the first {isSellTab ? "buyer" : "seller"} who accepts your request, and your other requests will be automatically cancelled.
              </span>
              {isMobile && <span className="info-sentence-chev">{bannerOpen ? "▴" : "▾"}</span>}
            </div>
            {offersLoading ? (
              <LoadingSpinner label="Loading offers…" />
            ) : displayOffers.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🍑</div>
                <div className="empty-title">No offers available at the moment</div>
                <div className="empty-sub">Adjust your filters</div>
              </div>
            ) : displayOffers.map(offer => (
            <div key={offer.id} className={`offer-card${offer.isOwn?" own-card":""}${effectiveRequested.has(offer.id)&&!offer.auto&&!offer.isOwn?" requested-card":""}${undoAnim===offer.id?" undo-card":""}${highlightedIds.has(offer.id)?" new-offer-card":""}`}
              style={{cursor: "pointer"}} onClick={() => setPopupOffer(offer)}>
                {/* Row 1: PeachID + avatar · rep/badges (left) | offer ID + action (right) */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                  <span className="user-peach-id">{offer.peachId}</span>
                  <OfferIdCopy tradeId={offer.tradeId} />
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {offer.isOwn ? (
                    <div style={{flex:1,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span className="my-offer-badge">My offer</span>
                      {offer.badges.includes("supertrader")&&<span className="badge badge-super" style={{cursor:"pointer"}} onClick={(e) => { e.stopPropagation(); setBadgesHelpOpen(true); }}>🏆</span>}
                      {offer.badges.includes("fast")&&<span className="badge badge-fast" style={{cursor:"pointer"}} onClick={(e) => { e.stopPropagation(); setBadgesHelpOpen(true); }}>⚡</span>}
                    </div>
                  ) : (
                    <>
                      <Avatar peachId={offer.userId} size={32} online={offer.online} />
                      <div style={{flex:1,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                        <PeachRating rep={offer.rep} size={14} trades={offer.trades}/>
                        <span className="rep-trades">({offer.trades})</span>
                        {offer.badges.includes("supertrader")&&<span className="badge badge-super" style={{cursor:"pointer"}} onClick={(e) => { e.stopPropagation(); setBadgesHelpOpen(true); }}>🏆</span>}
                        {offer.badges.includes("fast")&&<span className="badge badge-fast" style={{cursor:"pointer"}} onClick={(e) => { e.stopPropagation(); setBadgesHelpOpen(true); }}>⚡</span>}
                        <RepeatTraderBadge userId={offer.userId} />
                      </div>
                    </>
                  )}
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    {(offer.auto||offer.experienceLevel)&&(
                      <div className="action-cell-badges">
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
                  const priced = hasPrice(btcPrice);
                  const rate = Math.round(btcPrice * (1 + offer.premium / 100));
                  const rateStr = (priced ? rate.toLocaleString("fr-FR") : PRICE_PLACEHOLDER) + " " + sym;
                  const fiat = (offer.amount / 100_000_000) * btcPrice * (1 + offer.premium / 100);
                  const fiatVal = sym + (priced ? fmtFiat(fiat) : PRICE_PLACEHOLDER);
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
                  <Chips items={offer.methods.map((m) => {
                    const c = offer._raw?.paymentData?.[m]?.country;
                    return `${methodDisplayName(m)}${c ? ` (${c})` : ""}`;
                  })} className="method-chip"/>
                  <Chips items={offer.currencies} className="currency-chip"/>
                </div>
              </div>
            ))}
          </div>
          </div>

          {/* ── MOBILE FILTERS BOTTOM SHEET ── */}
          {isMobile && filtersOpen && (
            <>
              <div className="sheet-backdrop" onClick={() => setFiltersOpen(false)} />
              <div className="filter-sheet" role="dialog" aria-label="Filters">
                <div className="sheet-handle" />
                <div className="sheet-header">
                  <span>Filters</span>
                  <button className="sheet-close" onClick={() => setFiltersOpen(false)} aria-label="Close">×</button>
                </div>
                <div className="sheet-body">
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
                    className="search-inp search-inp-full"
                    placeholder="Search offers…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="sheet-footer">
                  <button className="sheet-clear" onClick={clearAllFilters}>Clear all</button>
                  <button className="sheet-done" onClick={() => setFiltersOpen(false)}>Done</button>
                </div>
              </div>
            </>
          )}

          {/* ── MOBILE SORT BOTTOM SHEET ── */}
          {isMobile && sortOpen && (
            <>
              <div className="sheet-backdrop" onClick={() => setSortOpen(false)} />
              <div className="filter-sheet" role="dialog" aria-label="Sort">
                <div className="sheet-handle" />
                <div className="sheet-header">
                  <span>Sort by</span>
                  <button className="sheet-close" onClick={() => setSortOpen(false)} aria-label="Close">×</button>
                </div>
                <div className="sheet-body">
                  {sortOptions.map(opt => {
                    const isSel = opt.key === sortKey && opt.dir === sortDir;
                    return (
                      <div
                        key={`${opt.key}-${opt.dir}`}
                        className={`sort-row${isSel ? " selected" : ""}`}
                        onClick={() => pickSort(opt.key, opt.dir)}
                      >
                        <span>{opt.label}</span>
                        {isSel && <span className="sort-row-check">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>
      {badgesHelpOpen && <BadgesInfoPopup onClose={() => setBadgesHelpOpen(false)} />}
    </>
  );
}
