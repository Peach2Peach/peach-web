// ─── OFFER CREATION — MAIN SCREEN ───────────────────────────────────────────
// Split from peach-offer-creation.jsx
// Sub-components in: ./components.jsx, CSS in: ./styles.js
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SatsAmount } from "../../components/BitcoinAmount.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useApi, clearCache } from "../../hooks/useApi.js";
import { useCurrency } from "../../components/AppLayout.jsx";
import { useMarketStats } from "../../hooks/useMarketStats.js";
import { useUserPMs } from "../../hooks/useUserPMs.js";
import { useMeetupEvents } from "../../hooks/useMeetupEvents.js";
import { addPendingEscrow, removePendingEscrow, addEscrowFundedNotification } from "../../hooks/useNotifications.js";
import { fetchWithSessionCheck } from "../../utils/sessionGuard.js";
import { isApiError, hashPaymentFields, encryptForPublicKey, encryptPGPMessage, signPGPMessage } from "../../utils/pgp.js";
import { deriveEscrowPubKey, deriveReturnAddress, isReturnAddressFromXpub } from "../../utils/escrow.js";
import { validateBtcAddress } from "../../peach-validators.js";
import { QRCodeSVG } from "qrcode.react";
import { SAT, fmt, satsToFiatRaw as satsToFiat, fmtFiat as fmtEur, formatTradeId, truncateAddress } from "../../utils/format.js";
import { extractCustomRefundAddressFromProfile } from "../../utils/customRefundAddressSync.js";
import { fetchSavedCustomPayoutAddress } from "../../utils/customPayoutAddressSync.js";
import PayoutAddressWizard from "../../components/PayoutAddressWizard.jsx";
import { BITCOIN_NETWORK } from "../../utils/network.js";
import { CSS } from "./styles.js";
import {
  minSatsAtLimit, maxSatsAtLimit, currSym,
  getSteps, LivePreview, AmountSlider,
  MultiOfferControl, MultiEscrowFunding, ReviewPills,
} from "./components.jsx";
import {
  AddPMFlow, methodLabel, normalizeApiPaymentMethods,
} from "../../components/AddPMFlow.jsx";
import InfoPopup, { InfoDot } from "../../components/InfoPopup.jsx";
import MobilePendingButton from "../../components/MobilePendingButton.jsx";
import { syncPMsToServer } from "../../utils/pmSync.js";

// ─── Help-popup copy (verbatim from mobile app) ─────────────────────────────
const INFO_COPY = {
  amountSell: {
    title: "selling bitcoin",
    body: (
      <>
        <p className="ip-text">Selling sats on Peach is free!</p>
        <p className="ip-text">To publish a sell offer, send your sats to escrow to prove ownership.</p>
        <p className="ip-text">Escrow is a multi-signature wallet: you hold one key, Peach holds another.</p>
      </>
    ),
  },
  amountBuy: {
    title: "buying bitcoin on Peach costs 2% of the transaction",
    body: (
      <>
        <p className="ip-text">Peach wallet is self-custodial: YOU control your keys.</p>
        <p className="ip-text">Go to Settings &gt; seed phrase and write it down! #NotYourKeysNotYourBitcoin</p>
      </>
    ),
  },
  multi: {
    title: "fund multiple sell offers",
    body: (
      <p className="ip-text">Create multiple sell offers with a single transaction to save network fees!</p>
    ),
  },
  instant: {
    title: "instant trade",
    body: (
      <>
        <p className="ip-text">Enable a buyer to start trading instantly, without your confirmation.</p>
        <p className="ip-text">You can select some criteria to allow the instant trade to happen.</p>
        <p className="ip-text">"no new users " will still allow new users to request to trade, but they will require your confirmation.</p>
        <p className="ip-text">To completely avoid new users, use the "experience level" option below.</p>
      </>
    ),
  },
  experience: {
    title: "experience level",
    body: (
      <>
        <p className="ip-text">Create offers exclusively for users depending on their experience.</p>
        <p className="ip-text">New Users are users with less than 4 successful trades.</p>
      </>
    ),
  },
  marketStats: {
    title: "How you compare",
    body: (
      <>
        <p className="ip-text"><strong>Competing</strong> — The number of other offers that share at least one of your selected payment methods.</p>
        <p className="ip-text"><strong>Avg premium</strong> — The average premium of recently completed trades using your selected payment methods.</p>
        <p className="ip-text"><strong>Below / Above yours</strong> — How many competing offers have a more attractive premium than yours.</p>
      </>
    ),
  },
};


// ─── PM SELECTION PERSISTENCE ───────────────────────────────────────────────
// Selected PMs survive Buy↔Sell tab switches and screen navigation within the
// same browser tab. sessionStorage clears on tab close.
const PM_SELECTION_KEY = "peach_offer_creation_pm_selection";
function readPersistedPMSelection() {
  try {
    const raw = sessionStorage.getItem(PM_SELECTION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === "string") : [];
  } catch { return []; }
}

// ─── Address display with copy + explorer link ─────────────────────────────
function AddressWithActions({ addr, label }) {
  const [copied, setCopied] = useState(false);
  if (!addr) return "—";
  const handleCopy = () => {
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <span style={{display:"inline-flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
      <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
        {label && (
          <span style={{fontSize:".72rem",fontWeight:700,color:"var(--black-65)",
            background:"var(--black-5)",border:"1px solid var(--black-10)",
            borderRadius:6,padding:"2px 8px",whiteSpace:"nowrap"}}>
            {label}
          </span>
        )}
        <span style={{fontFamily:"monospace",fontSize:".76rem",color:"var(--black)",wordBreak:"break-all"}}>
          {truncateAddress(addr)}
        </span>
      </span>
      <span style={{display:"inline-flex",gap:8,alignItems:"center"}}>
        <button type="button" onClick={handleCopy}
          style={{background:"none",border:"none",cursor:"pointer",padding:0,
            fontSize:".68rem",fontWeight:700,color:copied?"var(--success)":"var(--primary)",
            fontFamily:"var(--font)",textDecoration:"underline",textUnderlineOffset:"2px"}}>
          {copied?"copied":"copy"}
        </button>
        <a href={`https://mempool.space/address/${addr}`} target="_blank" rel="noopener noreferrer"
          style={{fontSize:".68rem",fontWeight:700,color:"var(--primary)",
            fontFamily:"var(--font)",textDecoration:"underline",textUnderlineOffset:"2px"}}>
          see in explorer
        </a>
      </span>
    </span>
  );
}

// ─── Stat pills (market intel) ──────────────────────────────────────────────
function MarketStatPills({ marketStats, isSell, onInfo }) {
  if (marketStats.loading || !marketStats.hasData) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12}}>
      <div className="stat-pills" style={{marginTop:0}}>
        <div className="stat-pill">
          <span className="stat-pill-label">Competing</span>
          <span className="stat-pill-value">
            {marketStats.total} {isSell ? "sell" : "buy"} {marketStats.total === 1 ? "offer" : "offers"}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Avg premium</span>
          <span className="stat-pill-value">
            {marketStats.avgPremium == null ? "–" : `${marketStats.avgPremium.toFixed(2)}%`}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">{isSell ? "Below yours" : "Above yours"}</span>
          <span className="stat-pill-value">
            {marketStats.beyondCount} {marketStats.beyondCount === 1 ? "offer" : "offers"}
          </span>
        </div>
      </div>
      {onInfo && <InfoDot ariaLabel="About market stats" onClick={onInfo} />}
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
export default function OfferCreation({ initialType="buy" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeFromUrl = searchParams.get("type") === "sell" ? "sell" : initialType;
  const [type,         setType]         = useState(typeFromUrl);
  const [step,         setStep]         = useState(0);
  // Currency state lives in AppLayout. Read btcPrice + selectedCurrency for offer math.
  const { btcPrice, selectedCurrency, pricesLoaded, allPrices } = useCurrency();
  const [done,         setDone]         = useState(false);
  const [copiedAddr,   setCopiedAddr]   = useState(false);
  const [qrWithAmount, setQrWithAmount] = useState(true);
  const [escrowFunded,  setEscrowFunded]  = useState(false);
  const [fundingStatus, setFundingStatus] = useState(null); // null → "MEMPOOL" → "FUNDED" | "WRONG_FUNDING_AMOUNT"
  const [fundingAmounts, setFundingAmounts] = useState(null); // amounts array from API (for wrong-amount case)
  const [savedMethods, setSavedMethods] = useState([]);
  const [methodsCatalogue, setMethodsCatalogue] = useState({});
  const { events: meetupEvents } = useMeetupEvents();
  const [catalogueError, setCatalogueError] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPM,    setEditingPM]    = useState(null); // PM object being edited
  const [openInfo,     setOpenInfo]     = useState(null); // "amount" | "instant" | "experience" | "multi" | null
  const [pmError,      setPmError]      = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [escrowAddress, setEscrowAddress] = useState(null);
  const [sellOfferId,   setSellOfferId]   = useState(null);
  const [fundMobileLoading, setFundMobileLoading] = useState(false);
  // Pending-action id from server. null = not yet triggered. Truthy means
  // POST succeeded; on phone we render an "Open Peach App" deep-link button.
  const [fundMobileActionId, setFundMobileActionId] = useState(null);
  const [fundMobileError, setFundMobileError] = useState(null);

  // ── MULTI-OFFER STATE ──
  const [multiEnabled,     setMultiEnabled]     = useState(false);
  const [multiCount,       setMultiCount]       = useState(2);
  const [multiResults,     setMultiResults]     = useState(null); // [{ offerId, escrowAddress, status, fundingStatus, error }]
  const [selectedEscrowIdx, setSelectedEscrowIdx] = useState(0);
  const [multiPublishProgress, setMultiPublishProgress] = useState(null); // { done, total }

  // PM fetch + decryption is delegated to the shared useUserPMs hook below
  // (declared after useApi gives us `auth`). The sync effect there mirrors
  // the decrypted list into savedMethods and reconciles persisted selection.

  // ── AUTH STATE ──
  // AppLayout owns Topbar/SideNav state. Offer creation only needs auth/isLoggedIn for guards.
  const { isLoggedIn, handleLogin } = useAuth();
  const { get, post, auth } = useApi();
  const btcNetwork = BITCOIN_NETWORK;

  // ── USER PMs (shared cache) ──
  const { pms: pmsRaw, error: pmFetchError, refetch } = useUserPMs(auth);
  useEffect(() => { setPmError(!!pmFetchError); }, [pmFetchError]);
  useEffect(() => {
    if (!pmsRaw) return;
    // `country` is intentionally NOT in this STRUCTURAL set — it's a
    // legitimate per-PM detail (e.g. SEPA IBAN's 2-letter country code)
    // that must survive into pm.details so buildPaymentPayload can forward
    // it to hashPaymentFields. PM_STRUCTURAL below (used by cleanPMData)
    // DOES include "country" so it never lands in the encrypted payload.
    const STRUCTURAL = new Set([
      "id", "methodId", "type", "name", "label", "currencies", "hashes",
      "details", "data", "anonymous",
    ]);
    // Strip only the long `-<Date.now()>` suffix (13 digits), not short trailing
    // numbers that belong to a cash event id (e.g. ...malaga-2140, ...bitcoin-42).
    const shortId = (raw) => raw.replace(/-\d{10,}$/, "");
    const sweepFields = (obj) => {
      const explicit = obj.data || obj.details || null;
      if (explicit) return explicit;
      const swept = {};
      for (const [k, v] of Object.entries(obj)) {
        if (!STRUCTURAL.has(k) && typeof v !== "object") swept[k] = v;
      }
      return swept;
    };
    let fetched = [];
    if (Array.isArray(pmsRaw) && pmsRaw.length > 0) {
      fetched = pmsRaw.map((pm, i) => {
        const rawId = pm.methodId || pm.type || pm.id || "unknown";
        const mid = shortId(rawId);
        return {
          id:         pm.id || `api-pm-${i}`,
          methodId:   mid,
          name:       pm.name || pm.label || mid,
          label:      pm.label || pm.name || "",
          currencies: pm.currencies ?? [],
          details:    sweepFields(pm),
        };
      });
    } else if (typeof pmsRaw === "object") {
      fetched = Object.entries(pmsRaw).map(([key, val]) => {
        const mid = shortId(key);
        return {
          id:         val?.id || key,
          methodId:   mid,
          name:       val?.name || val?.label || mid,
          label:      val?.label || val?.name || "",
          currencies: val?.currencies ?? [],
          details:    sweepFields(val || {}),
        };
      });
    }
    setSavedMethods(fetched);
    const validIds = new Set(fetched.map(m => m.id));
    setForm(f => {
      const cleaned = f.selectedMethodIds.filter(id => validIds.has(id));
      if (cleaned.length === 0 && fetched.length === 1) {
        return { ...f, selectedMethodIds: [fetched[0].id] };
      }
      return cleaned.length === f.selectedMethodIds.length
        ? f
        : { ...f, selectedMethodIds: cleaned };
    });
  }, [pmsRaw]);

  const initForm = (selectedMethodIds=[])=>({amtFixed:minSatsAtLimit(allPrices?.CHF),
    selectedMethodIds,premium:"0",instantMatch:false,noNewUsers:false,
    minReputation:false,instantMatchBadges:[],experienceLevel:"",
    releaseMode:"peach",
    refundChoices:[{ mode:"peach", address:"" }]});
  const [form, setForm] = useState(()=>initForm(readPersistedPMSelection()));
  const [refundErrors, setRefundErrors] = useState({});
  const [refundExpanded, setRefundExpanded] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [savedRefund, setSavedRefund] = useState(null); // { address, label } or null
  const [savedPayoutAddress, setSavedPayoutAddress] = useState(null);
  const [editingPremiumInline, setEditingPremiumInline] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const userTouchedRefundRef = useRef(false);

  // Fetch the user's saved refund address from /v069/selfUser on mount.
  // If absent, decryption fails, signature is invalid, or the address is on
  // the wrong network for this session, savedRefund stays null and the
  // third pill button is hidden.
  useEffect(() => {
    if (!auth?.token || !auth?.pgpPrivKey || !auth?.baseUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
        const res = await fetchWithSessionCheck(`${v069Base}/selfUser`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const profile = data.user ?? data;
        const saved = await extractCustomRefundAddressFromProfile(profile, auth.pgpPrivKey);
        if (cancelled || !saved?.address) return;
        if (!validateBtcAddress(saved.address, btcNetwork).valid) return;
        setSavedRefund({ address: saved.address, label: saved.label || "" });
      } catch (err) {
        console.warn("[OfferCreation] Saved refund fetch failed:", err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.token, auth?.pgpPrivKey, auth?.baseUrl, btcNetwork]);

  useEffect(() => {
    if (!auth?.token || !auth?.pgpPrivKey || !auth?.baseUrl || type === "sell") return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await fetchSavedCustomPayoutAddress(auth);
        if (cancelled || !saved?.address) return;
        setSavedPayoutAddress(saved);
      } catch (err) {
        console.warn("[OfferCreation] Payout address fetch failed:", err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.token, auth?.pgpPrivKey, auth?.baseUrl, type]);

  // Persist PM selection so it survives Buy↔Sell tab switches and screen
  // navigation within the same browser tab.
  useEffect(() => {
    try {
      sessionStorage.setItem(PM_SELECTION_KEY, JSON.stringify(form.selectedMethodIds));
    } catch {}
  }, [form.selectedMethodIds]);

  const isSell = type==="sell";
  const STEPS  = getSteps(type);
  const prem   = parseFloat(form.premium)||0;
  const effP   = btcPrice*(1+prem/100);

  // Derive method types and currencies from selected saved PMs
  const selectedSaved    = savedMethods.filter(m=>form.selectedMethodIds.includes(m.id));
  const offerMethods     = [...new Set(selectedSaved.map(m=>m.methodId))];
  const offerCurrencies  = [...new Set(selectedSaved.flatMap(m=>m.currencies||[]))];

  // Pill-driven display currency for the lower sections (amount slider's fiat
  // pill, Section 3 market/effective/fiat box, review step, escrow step,
  // LivePreview). Falls back to the topbar's selectedCurrency when no PMs are
  // selected. Repaired by the effect below when offerCurrencies changes.
  const [pickedCurrency, setPickedCurrency] = useState(null);
  const offerCurrenciesKey = offerCurrencies.join("|");
  useEffect(() => {
    if (offerCurrencies.length === 0) { setPickedCurrency(null); return; }
    setPickedCurrency(c => {
      if (c && offerCurrencies.includes(c)) return c;
      if (offerCurrencies.includes(selectedCurrency)) return selectedCurrency;
      return offerCurrencies[0];
    });
  }, [offerCurrenciesKey, selectedCurrency]);

  const activeCurrency = pickedCurrency ?? selectedCurrency;
  const activeBtcPrice = allPrices?.[activeCurrency] ?? btcPrice;
  const activeEffP     = activeBtcPrice * (1 + prem/100);

  // Live market stats (competing offers + avg premium of completed trades).
  const marketStats = useMarketStats({ type, pms: selectedSaved, premium: prem });

  // ── FETCH PAYMENT METHOD CATALOGUE (for AddPMFlow) ──
  const fetchCatalogue = async () => {
    setCatalogueError(false);
    try {
      const res = await get('/info/paymentMethods');
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        setMethodsCatalogue(normalizeApiPaymentMethods(data));
      } else {
        setCatalogueError(true);
      }
    } catch {
      setCatalogueError(true);
    }
  };
  useEffect(() => {
    fetchCatalogue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── POLL ESCROW FUNDING STATUS ──
  // `/offer/:id/escrow` reports FUNDED even when the amount is wrong, so we
  // also poll `/offer/:id/details` — its `tradeStatus` flips to
  // "fundingAmountDifferent" and `funding.status` to "WRONG_FUNDING_AMOUNT"
  // once the backend validates the amount. We must not leave the user on the
  // "Offer is live!" screen when the amount is wrong.
  useEffect(() => {
    if (step !== 2 || !sellOfferId || !auth || escrowFunded) return;
    let cancelled = false;
    let redirected = false;
    const triggerRedirect = (amounts) => {
      if (redirected) return;
      redirected = true;
      setFundingStatus("WRONG_FUNDING_AMOUNT");
      setFundingAmounts(amounts ?? []);
      setTimeout(() => {
        if (!cancelled) {
          navigate("/trades", { state: { openOfferId: sellOfferId } });
        }
      }, 2500);
    };
    async function check() {
      try {
        const [escrowRes, detailsRes] = await Promise.all([
          get('/offer/' + sellOfferId + '/escrow'),
          get('/offer/' + sellOfferId + '/details'),
        ]);
        if (cancelled) return;
        if (detailsRes.ok) {
          const details = await detailsRes.json();
          const maId = details?.mobileActionFundEscrowWasTriggered;
          if (typeof maId === "number") setFundMobileActionId(maId);
          if (
            details?.tradeStatus === "fundingAmountDifferent" ||
            details?.funding?.status === "WRONG_FUNDING_AMOUNT"
          ) {
            triggerRedirect(details?.funding?.amounts);
            return;
          }
        }
        if (!escrowRes.ok) return;
        const data = await escrowRes.json();
        const s = data?.funding?.status;
        if (s === "MEMPOOL") {
          setFundingStatus("MEMPOOL");
        } else if (s === "FUNDED") {
          setFundingStatus("FUNDED");
          setEscrowFunded(true);
          removePendingEscrow(sellOfferId);
          addEscrowFundedNotification(sellOfferId);
          window.dispatchEvent(new CustomEvent("peach:offer-published", {
            detail: { offerId: String(sellOfferId), amount: form.amtFixed },
          }));
        } else if (s === "WRONG_FUNDING_AMOUNT") {
          triggerRedirect(data?.funding?.amounts);
        }
      } catch (err) {
        console.warn("[OfferCreation] Escrow poll error:", err.message);
      }
    }
    check();
    const iv = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [step, sellOfferId, auth, navigate, escrowFunded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Invalidate trades + market caches once an offer is published. Without this,
  // the user's just-created offer would be missing on trades-dashboard and
  // market-view until the next background poll (~15 s).
  useEffect(() => {
    if (step === 2 || done) {
      clearCache("trades-items");
      clearCache("trades-pending");
      clearCache("market-offers");
    }
  }, [step, done]);

  // ── MULTI-ESCROW POLLING ──
  useEffect(() => {
    if (step !== 2 || !multiResults || multiResults.length < 2) return;
    const unfunded = multiResults.filter(r => r.offerId && r.status !== "failed" && r.fundingStatus !== "FUNDED");
    if (unfunded.length === 0) return;

    let cancelled = false;
    async function checkAll() {
      const updates = await Promise.allSettled(
        unfunded.map(r => get('/offer/' + r.offerId + '/escrow').then(res => res.ok ? res.json() : null))
      );
      if (cancelled) return;
      setMultiResults(prev => {
        if (!prev) return prev;
        const next = [...prev];
        let changed = false;
        unfunded.forEach((r, i) => {
          const data = updates[i].status === "fulfilled" ? updates[i].value : null;
          const idx = next.findIndex(x => x.offerId === r.offerId);
          if (idx === -1 || !data) return;
          const s = data?.funding?.status;
          if (s === "MEMPOOL" && next[idx].fundingStatus !== "MEMPOOL") {
            next[idx] = { ...next[idx], fundingStatus: "MEMPOOL" };
            changed = true;
          } else if (s === "FUNDED" && next[idx].fundingStatus !== "FUNDED") {
            next[idx] = { ...next[idx], fundingStatus: "FUNDED", status: "funded" };
            changed = true;
            removePendingEscrow(r.offerId);
            addEscrowFundedNotification(r.offerId);
          } else if (s === "WRONG_FUNDING_AMOUNT" && next[idx].fundingStatus !== "WRONG_FUNDING_AMOUNT") {
            next[idx] = { ...next[idx], fundingStatus: "WRONG_FUNDING_AMOUNT" };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
    checkAll();
    const iv = setInterval(checkAll, 10000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [step, multiResults, auth]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispatch popup event when all multi-offers are funded
  useEffect(() => {
    if (!multiResults || multiResults.length < 2) return;
    const valid = multiResults.filter(r => r.status !== "failed" && r.escrowAddress);
    if (valid.length === 0 || !valid.every(r => r.fundingStatus === "FUNDED")) return;
    const first = valid[0];
    window.dispatchEvent(new CustomEvent("peach:offer-published", {
      detail: { offerId: String(first.offerId), amount: form.amtFixed },
    }));
  }, [multiResults]); // eslint-disable-line react-hooks/exhaustive-deps

  function setF(k,v){ setForm(f=>({...f,[k]:v})); }

  // Keep form.refundChoices length in sync with active offer count (1 when multi off, multiCount when on)
  useEffect(() => {
    const target = multiEnabled ? multiCount : 1;
    setForm(f => {
      const cur = f.refundChoices ?? [];
      if (cur.length === target) return f;
      if (cur.length < target) {
        const extra = Array.from({ length: target - cur.length }, () => ({ mode:"peach", address:"" }));
        return { ...f, refundChoices: [...cur, ...extra] };
      }
      return { ...f, refundChoices: cur.slice(0, target) };
    });
    setRefundErrors(prev => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) if (Number(k) < target) next[k] = v;
      return next;
    });
  }, [multiEnabled, multiCount]);

  const updateRefund = (i, patch) =>
    setForm(f => ({ ...f, refundChoices: f.refundChoices.map((c, j) => j === i ? { ...c, ...patch } : c) }));

  // Default offer 0 to "saved" once the saved address loads, but only if
  // the user hasn't touched the refund pickers yet — avoids clobbering a
  // manual choice if the fetch resolves after the user has already started.
  useEffect(() => {
    if (!isSell) return;
    if (!savedRefund?.address) return;
    if (userTouchedRefundRef.current) return;
    setForm(f => {
      const cur = f.refundChoices ?? [];
      if (!cur[0] || cur[0].mode !== "peach" || cur[0].address) return f;
      const next = [...cur];
      next[0] = { mode: "saved", address: "" };
      return { ...f, refundChoices: next };
    });
  }, [savedRefund?.address, isSell]);
  function reset(){
    setStep(0);setDone(false);setEscrowFunded(false);setFundingStatus(null);setFundingAmounts(null);setPublishError(null);setEscrowAddress(null);setSellOfferId(null);
    // Preserve PM selection across resets so Buy↔Sell tab switches don't lose it.
    setForm(f=>initForm(f.selectedMethodIds));
    setMultiEnabled(false);setMultiCount(2);setMultiResults(null);setSelectedEscrowIdx(0);setMultiPublishProgress(null);
    setFundMobileLoading(false);setFundMobileActionId(null);setFundMobileError(null);
    setRefundErrors({});
    setRefundExpanded(false);
    userTouchedRefundRef.current = false;
  }

  useEffect(() => {
    const handler = () => { if (step === 2 && escrowFunded) reset(); };
    window.addEventListener("peach:offer-published-dismissed", handler);
    return () => window.removeEventListener("peach:offer-published-dismissed", handler);
  }, [step, escrowFunded]);
  function switchType(t){ setType(t); reset(); }

  function buildInstantTradeCriteria(){
    if(!form.instantMatch) return undefined;
    let mr = -1;
    if(form.minReputation) mr = 0.8;        // 4.5 stars on 0-5 scale → (4.5/5)*2-1
    else if(form.noNewUsers) mr = 0.5;
    return {
      minReputation: mr,
      minTrades: form.noNewUsers ? 4 : 0,
      badges: [...form.instantMatchBadges],
    };
  }

  function handleSavePM(pm) {
    let nextList;
    if(editingPM) {
      // Update existing PM in place
      setSavedMethods(prev => {
        nextList = prev.map(m => m.id === pm.id ? pm : m);
        return nextList;
      });
      setEditingPM(null);
    } else {
      // Add new PM and auto-select it
      setSavedMethods(prev => {
        nextList = [...prev, pm];
        return nextList;
      });
      setF("selectedMethodIds",[...form.selectedMethodIds, pm.id]);
      setShowAddModal(false);
    }
    if (auth && nextList) {
      syncPMsToServer(nextList, auth).finally(() => refetch());
    }
  }


  function openEditPM(pm, e) {
    e.stopPropagation(); // don't toggle selection
    setEditingPM(pm);
  }

  function toggleMethod(id) {
    const sel = form.selectedMethodIds;
    if (sel.includes(id)) {
      setF("selectedMethodIds", sel.filter(x=>x!==id));
      return;
    }
    const target = savedMethods.find(m=>m.id===id);
    if (target?.methodId &&
        savedMethods.some(m=>m.methodId===target.methodId&&sel.includes(m.id))) {
      return;
    }
    setF("selectedMethodIds", [...sel, id]);
  }

  // Validation for Configure step
  const minS   = minSatsAtLimit(allPrices?.CHF);
  const maxS   = maxSatsAtLimit(allPrices?.CHF);
  const amtOk  = form.amtFixed>=minS&&form.amtFixed<=maxS;
  const payOk  = form.selectedMethodIds.length > 0;
  const premOk = form.premium!=="";
  const refundOk = !isSell || form.refundChoices.every(c =>
    c.mode === "peach" ||
    (c.mode === "saved" && !!savedRefund?.address) ||
    validateBtcAddress((c.address ?? "").trim(), btcNetwork).valid
  );
  const configOk = amtOk&&payOk&&premOk&&refundOk;

  // Fields that are structural (not actual payment details to encrypt)
  const PM_STRUCTURAL = new Set(["id", "methodId", "type", "name", "label", "currencies", "hashes", "details", "data", "country", "anonymous"]);

  // Extract clean payment detail fields from a PM (strips structural fields)
  function cleanPMData(pm) {
    const details = pm.details || {};
    const clean = {};
    for (const [k, v] of Object.entries(details)) {
      if (!PM_STRUCTURAL.has(k) && typeof v !== "object" && v) clean[k] = v;
    }
    return clean;
  }

  // Build meansOfPayment + paymentData from selected PMs (shared by buy & sell)
  // When serverPGPKey is provided (instant trade), encrypts PM details for the server.
  // When requireInstant is true, throws rather than publishing an instant offer whose
  // payment details were never encrypted to Peach's key (which would leave a taker
  // unable to receive the seller's PM data).
  async function buildPaymentPayload(serverPGPKey, { requireInstant = false } = {}){
    if (requireInstant && (!serverPGPKey || !auth?.pgpPrivKey)) {
      throw new Error("Couldn't reach Peach to secure this instant offer's payment details. Please try again.");
    }
    const meansOfPayment = {};
    for(const pm of selectedSaved){
      const methodType = (pm.methodId||"").replace(/-\d{10,}$/, "");
      for(const cur of (pm.currencies||[])){
        if(!meansOfPayment[cur]) meansOfPayment[cur] = [];
        if(!meansOfPayment[cur].includes(methodType)) meansOfPayment[cur].push(methodType);
      }
    }
    const paymentData = {};
    for(const pm of selectedSaved){
      const methodType = (pm.methodId||"").replace(/-\d{10,}$/, "");
      if(paymentData[methodType]) continue;
      const rawDetails = pm.details || {};
      const details = {};
      for (const [k, v] of Object.entries(rawDetails)) {
        if (!k.startsWith("_")) details[k] = v;
      }
      // Cash/meetup PMs must carry `country` in paymentData (server rejects it otherwise).
      // Older stored cash PMs may have lost it; derive from the id, e.g. cash.gr.* → "GR".
      if (methodType.startsWith("cash.") && !details.country) {
        details.country = (methodType.split(".")[1] || "").toUpperCase();
      }
      const hashed = await hashPaymentFields(methodType, details, details.country);
      Object.assign(paymentData, hashed);

      const cleanData = details;

      // Self-encrypt PM details with user's own PGP key
      if (auth?.pgpPrivKey && Object.keys(cleanData).length > 0) {
        const plaintext = JSON.stringify(cleanData);
        const [enc, sig] = await Promise.all([
          encryptPGPMessage(plaintext, auth.pgpPrivKey),
          signPGPMessage(plaintext, auth.pgpPrivKey),
        ]);
        if (enc) {
          paymentData[methodType].selfEncrypted = enc;
          paymentData[methodType].selfEncryptedSignature = sig;
        }
      }

      // Instant trade: encrypt PM details with server's PGP key + sign with user's key
      if (serverPGPKey && auth?.pgpPrivKey) {
        if (Object.keys(cleanData).length > 0) {
          const plaintext = JSON.stringify(cleanData);
          const [encrypted, signature] = await Promise.all([
            encryptForPublicKey(plaintext, serverPGPKey),
            signPGPMessage(plaintext, auth.pgpPrivKey),
          ]);
          if (encrypted && signature) {
            paymentData[methodType].encrypted = encrypted;
            paymentData[methodType].signature = signature;
          } else if (requireInstant) {
            throw new Error("Couldn't encrypt payment details for instant trading. Please try again.");
          }
        }
      }
    }

    return { meansOfPayment, paymentData };
  }

  async function handleNext(){
    if(step===0){ setStep(1); setPublishError(null); return; }
    if(step===1){

      // ── SELL OFFER SUBMISSION ──
      if(isSell){
        if(!auth){ setPublishError("You must be logged in to create a sell offer"); return; }

        if(!auth.multisigXpub){
          setPublishError("No multisigXpub available — please re-authenticate");
          return;
        }

        if (sellOfferId && escrowAddress) { setStep(2); return; }
        if (multiResults && multiResults.some(r => r.status !== "failed" && r.escrowAddress)) { setStep(2); return; }

        setPublishing(true);
        setPublishError(null);
        try{
          // For instant trade: fetch the Peach server PGP key to encrypt PM data
          let serverPGPKey = null;
          if (form.instantMatch) {
            try {
              const infoRes = await get('/info');
              const infoData = await infoRes.json().catch(() => null);
              serverPGPKey = infoData?.peach?.pgpPublicKey ?? null;
            } catch (e) {
              console.warn("[OfferCreation] Failed to fetch server PGP key:", e.message);
            }
          }
          const { meansOfPayment, paymentData } = await buildPaymentPayload(serverPGPKey, { requireInstant: form.instantMatch });

          // 1. Derive base return address index — count only past offers whose returnAddress was derived from this xpub.
          // External-address offers don't consume an `m/84'/.../1/N` slot, so they shouldn't bump the counter.
          const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
          const hdrs = { Authorization: `Bearer ${auth.token}` };
          const [ownOffersRes, historySellRes] = await Promise.all([
            fetchWithSessionCheck(`${v069Base}/user/${auth.peachId}/offers`, { headers: hdrs }),
            get('/offers/summary'),
          ]);
          const ownOffersData = await ownOffersRes.json().catch(() => ({}));
          const historySell = await historySellRes.json().catch(()=>[]);
          const activeSell = ownOffersData?.sellOffers ?? [];
          const allPastSellOffers = [
            ...activeSell,
            ...(Array.isArray(historySell) ? historySell.filter(o => o.type === "ask") : []),
          ];
          let baseAddrIdx;
          if (allPastSellOffers.some(o => o?.returnAddress)) {
            baseAddrIdx = allPastSellOffers.reduce((n, o) => {
              const addr = o?.returnAddress;
              return addr && isReturnAddressFromXpub(auth.xpub, addr, 1000) ? n + 1 : n;
            }, 0);
          } else {
            console.warn("[OfferCreation] No returnAddress on past offers — falling back to total count");
            baseAddrIdx = allPastSellOffers.length;
          }

          const count = multiEnabled ? multiCount : 1;

          // resolveReturnAddress: per offer, returns either the user's saved
          // refund address, the typed external address, or the next derived
          // xpub address — counter advances only for Peach rows (saved and
          // external don't consume a derivation slot).
          let peachIdxOffset = 0;
          const resolveReturnAddress = (i) => {
            const choice = form.refundChoices[i] ?? { mode:"peach", address:"" };
            if (choice.mode === "saved" && savedRefund?.address) {
              return savedRefund.address;
            }
            if (choice.mode === "external" && (choice.address ?? "").trim()) {
              return choice.address.trim();
            }
            const addr = deriveReturnAddress(auth.xpub, baseAddrIdx + peachIdxOffset);
            peachIdxOffset += 1;
            return addr;
          };

          if(count > 1) {
            // ── MULTI SELL — sequential loop ──
            setMultiPublishProgress({ done: 0, total: count });
            const results = [];
            for(let i = 0; i < count; i++){
              try {
                const returnAddress = resolveReturnAddress(i);
                const sellPayload = {
                  type: "ask", amount: form.amtFixed,
                  premium: parseFloat(form.premium) || 0,
                  meansOfPayment, paymentData, returnAddress,
                  ...(buildInstantTradeCriteria() ? { instantTradeCriteria: buildInstantTradeCriteria() } : {}),
                  ...(form.experienceLevel ? { experienceLevelCriteria: form.experienceLevel } : {}),
                };
                const offerRes = await post('/offer', sellPayload);
                const offerData = await offerRes.json().catch(()=>null);
                if(!offerRes.ok) throw new Error(offerData?.error || offerData?.message || `Server error ${offerRes.status}`);

                const newOfferId = offerData.offerId || offerData.id;
                const pubKeyHex = deriveEscrowPubKey(auth.multisigXpub, Number(newOfferId));

                const escrowRes = await post(`/offer/${newOfferId}/escrow`, {
                  publicKey: pubKeyHex, derivationPathVersion: 2,
                });
                const escrowData = await escrowRes.json().catch(()=>null);
                if(!escrowRes.ok) throw new Error(escrowData?.error || escrowData?.message || `Escrow creation failed ${escrowRes.status}`);

                results.push({ offerId: String(newOfferId), escrowAddress: escrowData.escrow, status: "escrow_ready", fundingStatus: null, error: null });
                addPendingEscrow(newOfferId, form.amtFixed);
              } catch(e) {
                results.push({ offerId: null, escrowAddress: null, status: "failed", fundingStatus: null, error: e.message });
              }
              setMultiPublishProgress({ done: i + 1, total: count });
            }
            setMultiResults(results);
            const ok = results.filter(r => r.status !== "failed");
            if(ok.length === 0){
              setPublishError("All sell offers failed to publish");
            } else {
              if(ok.length < count) setPublishError(`${results.filter(r=>r.status==="failed").length} of ${count} offers failed`);
              setStep(2);
            }
          } else {
            // ── SINGLE SELL ──
            const returnAddress = resolveReturnAddress(0);
            const sellPayload = {
              type: "ask", amount: form.amtFixed,
              premium: parseFloat(form.premium) || 0,
              meansOfPayment, paymentData, returnAddress,
              ...(buildInstantTradeCriteria() ? { instantTradeCriteria: buildInstantTradeCriteria() } : {}),
              ...(form.experienceLevel ? { experienceLevelCriteria: form.experienceLevel } : {}),
            };
            const offerRes = await post('/offer', sellPayload);
            const offerData = await offerRes.json().catch(()=>null);
            if(!offerRes.ok) throw new Error(offerData?.error || offerData?.message || `Server error ${offerRes.status}`);

            const newOfferId = offerData.offerId || offerData.id;
            const pubKeyHex = deriveEscrowPubKey(auth.multisigXpub, Number(newOfferId));

            const escrowRes = await post(`/offer/${newOfferId}/escrow`, {
              publicKey: pubKeyHex, derivationPathVersion: 2,
            });
            const escrowData = await escrowRes.json().catch(()=>null);
            if(!escrowRes.ok) throw new Error(escrowData?.error || escrowData?.message || `Escrow creation failed ${escrowRes.status}`);

            setSellOfferId(newOfferId);
            setEscrowAddress(escrowData.escrow);
            addPendingEscrow(newOfferId, form.amtFixed);
            setStep(2);
          }
        }catch(err){
          console.error("[OfferCreation] Sell offer failed:", err);
          setPublishError(err.message || "Failed to publish sell offer");
        }finally{
          setPublishing(false);
          setMultiPublishProgress(null);
        }
        return;
      }

      // ── BUY OFFER SUBMISSION ──
      if(!auth){
        setDone(true); return;
      }

      setPublishing(true);
      setPublishError(null);
      try{
        // For instant trade: fetch the Peach server PGP key to encrypt PM data
        let buyServerPGPKey = null;
        if (form.instantMatch) {
          try {
            const infoRes = await get('/info');
            const infoData = await infoRes.json().catch(() => null);
            buyServerPGPKey = infoData?.peach?.pgpPublicKey ?? null;
          } catch (e) {
            console.warn("[OfferCreation] Failed to fetch server PGP key:", e.message);
          }
        }
        const { meansOfPayment, paymentData } = await buildPaymentPayload(buyServerPGPKey, { requireInstant: form.instantMatch });

        const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
        const buyBody = JSON.stringify({
          amount: form.amtFixed,
          meansOfPayment,
          paymentData,
          premium: parseFloat(form.premium) || 0,
          ...(buildInstantTradeCriteria() ? { instantTradeCriteria: buildInstantTradeCriteria() } : {}),
          ...(form.experienceLevel ? { experienceLevelCriteria: form.experienceLevel } : {}),
        });

        const count = multiEnabled ? multiCount : 1;

        if(count > 1) {
          // ── MULTI BUY ──
          setMultiPublishProgress({ done: 0, total: count });
          const results = [];
          const settled = await Promise.allSettled(
            Array.from({ length: count }, () =>
              fetchWithSessionCheck(`${v069Base}/buyOffer`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
                body: buyBody,
              }).then(async r => {
                const d = await r.json().catch(() => null);
                if (!r.ok) throw new Error(d?.error || d?.message || `Error ${r.status}`);
                return { status: "created", offerId: String(d?.id ?? d?.offerId ?? ""), error: null };
              })
            )
          );
          for (const s of settled) {
            results.push(s.status === "fulfilled"
              ? s.value
              : { status: "failed", offerId: null, error: s.reason?.message || "Unknown error" });
            setMultiPublishProgress(p => ({ ...p, done: (p?.done ?? 0) + 1 }));
          }
          setMultiResults(results);
          const allOk = results.every(r => r.status === "created");
          if (allOk) setDone(true);
          else setPublishError(`${results.filter(r=>r.status==="failed").length} of ${count} offers failed`);
        } else {
          // ── SINGLE BUY ──
          const res = await fetchWithSessionCheck(`${v069Base}/buyOffer`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
            body: buyBody,
          });
          const data = await res.json().catch(()=>null);
          if(!res.ok){
            throw new Error(data?.error || data?.message || `Server error ${res.status}`);
          }
          setMultiResults([{ status: "created", offerId: String(data?.id ?? data?.offerId ?? ""), error: null }]);
          setDone(true);
        }
      }catch(err){
        console.error("[OfferCreation] Buy offer failed:", err);
        setPublishError(err.message || "Failed to publish offer");
      }finally{
        setPublishing(false);
        setMultiPublishProgress(null);
      }
      return;
    }
  }
  async function retryFailedBuy(){
    if(!auth || !multiResults) return;
    const failedIdxs = multiResults.map((r,i)=>r.status==="failed"?i:-1).filter(i=>i>=0);
    if(failedIdxs.length===0) return;

    setPublishing(true);
    setPublishError(null);
    let buyServerPGPKey = null;
    if (form.instantMatch) {
      try {
        const infoRes = await get('/info');
        const infoData = await infoRes.json().catch(()=>null);
        buyServerPGPKey = infoData?.peach?.pgpPublicKey ?? null;
      } catch(e){}
    }
    let meansOfPayment, paymentData;
    try {
      ({ meansOfPayment, paymentData } = await buildPaymentPayload(buyServerPGPKey, { requireInstant: form.instantMatch }));
    } catch (e) {
      setPublishing(false);
      setPublishError(e.message || "Couldn't prepare instant offer");
      return;
    }
    const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
    const buyBody = JSON.stringify({
      amount: form.amtFixed, meansOfPayment, paymentData,
      premium: parseFloat(form.premium) || 0,
      ...(buildInstantTradeCriteria() ? { instantTradeCriteria: buildInstantTradeCriteria() } : {}),
      ...(form.experienceLevel ? { experienceLevelCriteria: form.experienceLevel } : {}),
    });

    const settled = await Promise.allSettled(
      failedIdxs.map(() =>
        fetchWithSessionCheck(`${v069Base}/buyOffer`, {
          method:'POST',
          headers:{ Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'},
          body:buyBody,
        }).then(async r => {
          const d = await r.json().catch(()=>null);
          if(!r.ok) throw new Error(d?.error||d?.message||`Error ${r.status}`);
          return { status:"created", offerId:String(d?.id??d?.offerId??""), error:null };
        })
      )
    );

    setMultiResults(prev => {
      const next = [...prev];
      failedIdxs.forEach((idx, i) => {
        next[idx] = settled[i].status === "fulfilled"
          ? settled[i].value
          : { status:"failed", offerId:null, error: settled[i].reason?.message || "Unknown error" };
      });
      return next;
    });

    setPublishing(false);
    const updated = multiResults.map((r,i) => {
      const fi = failedIdxs.indexOf(i);
      if(fi===-1) return r;
      return settled[fi].status==="fulfilled" ? settled[fi].value : { status:"failed", offerId:null, error:settled[fi].reason?.message||"Unknown error" };
    });
    if(updated.every(r=>r.status==="created")) { setDone(true); setPublishError(null); }
    else setPublishError(`${updated.filter(r=>r.status==="failed").length} of ${updated.length} offers still failing`);
  }

  async function retryFailedSell(){
    if(!auth || !multiResults) return;
    const failedIdxs = multiResults.map((r,i)=>r.status==="failed"?i:-1).filter(i=>i>=0);
    if(failedIdxs.length===0) return;

    setPublishing(true);
    setPublishError(null);
    let serverPGPKey = null;
    if (form.instantMatch) {
      try { const r = await get('/info'); const d = await r.json().catch(()=>null); serverPGPKey=d?.peach?.pgpPublicKey??null; } catch(e){}
    }
    let meansOfPayment, paymentData;
    try {
      ({ meansOfPayment, paymentData } = await buildPaymentPayload(serverPGPKey, { requireInstant: form.instantMatch }));
    } catch (e) {
      setPublishing(false);
      setPublishError(e.message || "Couldn't prepare instant offer");
      return;
    }
    // Re-derive base index — count existing offers now (which includes the ones that succeeded earlier)
    const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
    const hdrs = { Authorization: `Bearer ${auth.token}` };
    const [ownOffersRes, historySellRes] = await Promise.all([
      fetchWithSessionCheck(`${v069Base}/user/${auth.peachId}/offers`, { headers: hdrs }),
      get('/offers/summary'),
    ]);
    const ownOffersData = await ownOffersRes.json().catch(()=>({}));
    const historySell = await historySellRes.json().catch(()=>[]);
    const activeSellRetry = ownOffersData?.sellOffers ?? [];
    const allPastSellOffersRetry = [
      ...activeSellRetry,
      ...(Array.isArray(historySell) ? historySell.filter(o => o.type === "ask") : []),
    ];
    let nextIdx;
    if (allPastSellOffersRetry.some(o => o?.returnAddress)) {
      nextIdx = allPastSellOffersRetry.reduce((n, o) => {
        const addr = o?.returnAddress;
        return addr && isReturnAddressFromXpub(auth.xpub, addr, 1000) ? n + 1 : n;
      }, 0);
    } else {
      console.warn("[OfferCreation] No returnAddress on past offers (retry path) — falling back to total count");
      nextIdx = allPastSellOffersRetry.length;
    }

    const updated = [...multiResults];
    for(const idx of failedIdxs){
      try {
        const choice = form.refundChoices[idx] ?? { mode:"peach", address:"" };
        const returnAddress = (choice.mode === "external" && (choice.address ?? "").trim())
          ? choice.address.trim()
          : deriveReturnAddress(auth.xpub, nextIdx++);
        const payload = {
          type:"ask", amount:form.amtFixed, premium:parseFloat(form.premium)||0,
          meansOfPayment, paymentData, returnAddress,
          ...(buildInstantTradeCriteria()?{instantTradeCriteria:buildInstantTradeCriteria()}:{}),
          ...(form.experienceLevel?{experienceLevelCriteria:form.experienceLevel}:{}),
        };
        const offerRes = await post('/offer', payload);
        const offerData = await offerRes.json().catch(()=>null);
        if(!offerRes.ok) throw new Error(offerData?.error||offerData?.message||`Error ${offerRes.status}`);
        const newOfferId = offerData.offerId||offerData.id;
        const pubKeyHex = deriveEscrowPubKey(auth.multisigXpub, Number(newOfferId));
        const escrowRes = await post(`/offer/${newOfferId}/escrow`, { publicKey:pubKeyHex, derivationPathVersion:2 });
        const escrowData = await escrowRes.json().catch(()=>null);
        if(!escrowRes.ok) throw new Error(escrowData?.error||escrowData?.message||`Escrow failed ${escrowRes.status}`);
        updated[idx] = { offerId:String(newOfferId), escrowAddress:escrowData.escrow, status:"escrow_ready", fundingStatus:null, error:null };
      } catch(e){
        updated[idx] = { offerId:null, escrowAddress:null, status:"failed", fundingStatus:null, error:e.message };
      }
    }
    setMultiResults(updated);
    setPublishing(false);
    const stillFailing = updated.filter(r=>r.status==="failed").length;
    if(stillFailing===0) { setPublishError(null); setStep(2); }
    else setPublishError(`${stillFailing} of ${updated.length} offers still failing`);
  }

  function handleBack(){
    if (step === 1) {
      setSellOfferId(null);
      setEscrowAddress(null);
      setFundingStatus(null);
      setEscrowFunded(false);
      setMultiResults(null);
    }
    setStep(s => s - 1);
  }

  const sliderBg=`linear-gradient(to right,var(--primary) 0%,var(--primary) ${((prem+21)/42)*100}%,var(--black-10) ${((prem+21)/42)*100}%,var(--black-10) 100%)`;

  // ── BUY SUCCESS ────────────────────────────────────────────────────────────
  if(done&&!isSell) return (
    <>
      <style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",minHeight:"100vh",gap:22,padding:40,
        marginLeft: 68,
        textAlign:"center",animation:"stepFwd .4s ease both"}}>
        <div className="success-icon">✓</div>
        <div style={{fontSize:"1.45rem",fontWeight:800,color:"var(--success)"}}>
          {multiResults && multiResults.length > 1
            ? `All ${multiResults.length} offers published!`
            : "Offer published!"}
        </div>
        <p style={{fontSize:".88rem",color:"var(--black-65)",lineHeight:1.65,maxWidth:360}}>
          {multiResults && multiResults.length > 1
            ? <>{multiResults.length} buy offers for <strong style={{color:"var(--black)"}}>{fmt(form.amtFixed)} sats</strong> each are live in the market. You'll be notified when sellers send a trade request.</>
            : <>Your buy offer for <strong style={{color:"var(--black)"}}>{fmt(form.amtFixed)} sats</strong> is live in the market. You'll be notified when a seller sends a trade request.</>
          }
        </p>
        <div style={{display:"flex",gap:12}}>
          <button onClick={() => {
            const ids = (multiResults ?? [])
              .filter(r => r.status !== "failed" && r.offerId)
              .map(r => String(r.offerId));
            navigate("/market", {
              state: { highlightOfferIds: ids, highlightDirection: "buy" },
            });
          }} style={{padding:"10px 28px",borderRadius:999,
            border:"1.5px solid var(--black-10)",background:"transparent",color:"var(--black-65)",
            cursor:"pointer",fontFamily:"var(--font)",fontSize:".88rem",fontWeight:700}}>
            View in market
          </button>
          <button onClick={reset} style={{padding:"10px 28px",borderRadius:999,
            background:"var(--grad)",color:"white",border:"none",cursor:"pointer",
            fontFamily:"var(--font)",fontSize:".88rem",fontWeight:800,
            boxShadow:"0 2px 12px rgba(245,101,34,.3)"}}>
            Create another offer
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      {showAddModal&&(
        <AddPMFlow methods={methodsCatalogue} meetupEvents={meetupEvents} existingPMs={savedMethods} onSave={handleSavePM}
          onClose={()=>setShowAddModal(false)}
          error={catalogueError} onRetry={fetchCatalogue}/>
      )}
      {editingPM&&(
        <AddPMFlow methods={methodsCatalogue} meetupEvents={meetupEvents} existingPMs={savedMethods} editData={editingPM}
          onSave={handleSavePM} onClose={()=>setEditingPM(null)}
          error={catalogueError} onRetry={fetchCatalogue}/>
      )}
      {showPayoutModal&&(
        <PayoutAddressWizard
          auth={auth}
          asModal
          onClose={()=>setShowPayoutModal(false)}
          onDone={(saved)=>{
            if(saved){
              setSavedPayoutAddress(saved);
              setForm(f=>({...f, releaseMode:"saved"}));
            } else {
              setSavedPayoutAddress(null);
              setForm(f=>({...f, releaseMode:"peach"}));
            }
          }}
        />
      )}
      {openInfo&&(() => {
        const key = openInfo === "amount" ? (isSell ? "amountSell" : "amountBuy") : openInfo;
        const copy = INFO_COPY[key];
        return (
          <InfoPopup title={copy.title} onClose={()=>setOpenInfo(null)}>
            {copy.body}
          </InfoPopup>
        );
      })()}
      <div className="layout" style={{marginLeft: 68}}>
        {/* ── WIZARD ── */}
        <div className="wizard">

          {/* Header row: title + type toggle */}
          <div className="wizard-header">
            <div>
              <div style={{fontSize:".72rem",fontWeight:700,textTransform:"uppercase",
                letterSpacing:".08em",color:"var(--black-65)",marginBottom:4}}>
                New offer
                {step===2 && sellOfferId && (
                  <span style={{marginLeft:8,opacity:.75}}>
                    · {formatTradeId(sellOfferId, "offer")}
                  </span>
                )}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                <div className="wizard-title">
                  {step===0?"Create your offer":step===1?"Review & publish":"Fund escrow"}
                </div>
                <div className="type-toggle" style={step===1?{opacity:0.45,pointerEvents:"none"}:{}}>
                  <button className={`type-btn${!isSell?" buy-on":""}`}
                    onClick={()=>switchType("buy")}>Buy BTC</button>
                  <button className={`type-btn${isSell?" sell-on":""}`}
                    onClick={()=>switchType("sell")}>Sell BTC</button>
                </div>
              </div>
            </div>
          </div>

          {/* Step bar */}
          <div className="step-bar">
            {STEPS.map((label,i)=>(
              <div key={label} style={{display:"contents"}}>
                {i>0&&<div className={`sb-line${i<=step?" done":" todo"}`}/>}
                <div className="sb-item">
                  <div className={`sb-dot${i<step?" done":i===step?" active":" todo"}`}>
                    {i<step?"✓":i+1}
                  </div>
                  <span className={`sb-label${i<step?" done":i===step?" active":" todo"}`}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── STEP 0: CONFIGURE (single card, 3 sections) ── */}
          {step===0&&(
            <div className="step-anim config-card">

              {/* §1 Amount */}
              <div className="card-section">
                <div className="section-header">
                  <div className={`section-num${amtOk?" filled":""}`}>1</div>
                  <span className="section-title">
                    {isSell?"Amount to sell":"Amount to buy"}
                    <InfoDot
                      ariaLabel={isSell?"About selling bitcoin":"About buying bitcoin"}
                      onClick={()=>setOpenInfo("amount")}
                    />
                  </span>
                </div>

                <AmountSlider form={form} setF={setF} btcPrice={btcPrice}
                  activeCurrency={activeCurrency} activeBtcPrice={activeBtcPrice}/>
              </div>

              {/* §2 Payment */}
              <div className="card-section">
                <div className="section-header">
                  <div className={`section-num${payOk?" filled":""}`}>2</div>
                  <span className="section-title">Payment methods</span>
                  <button className="btn-add-pm" onClick={()=>setShowAddModal(true)}>
                    + Add
                  </button>
                  {!pmError && savedMethods.length >= 2 && form.selectedMethodIds.length === 0 && (
                    <span className="pm-warn-wrap">
                      <span className="pm-warn-pill">Select a payment method</span>
                    </span>
                  )}
                </div>

                {pmError ? (
                  <div className="pm-empty">
                    <div style={{padding:"12px 16px",borderRadius:12,background:"var(--error-bg)",
                      color:"var(--error)",fontWeight:700,fontSize:".82rem",textAlign:"center"}}>
                      Failed to load payment data
                    </div>
                  </div>
                ) : savedMethods.length === 0 ? (
                  <div className="pm-empty">
                    <div style={{fontSize:"1.6rem",opacity:.35}}>💳</div>
                    <div style={{fontSize:".82rem",fontWeight:700,color:"var(--black-65)"}}>
                      No payment methods yet
                    </div>
                    <div style={{fontSize:".72rem",fontWeight:500}}>
                      Add your first payment method to continue
                    </div>
                    <button className="btn-add-pm" style={{marginLeft:0,marginTop:4}}
                      onClick={()=>setShowAddModal(true)}>
                      + Add your first payment method
                    </button>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {savedMethods.map(pm=>{
                      const sel = form.selectedMethodIds.includes(pm.id);
                      const blocked = !sel && !!pm.methodId && savedMethods.some(m=>
                        m.id!==pm.id&&m.methodId===pm.methodId&&
                        form.selectedMethodIds.includes(m.id));
                      return (
                        <div key={pm.id} style={{display:"flex",alignItems:"center",gap:6}}>
                          <button className={`pm-chip${sel?" sel":""}`}
                            disabled={blocked}
                            title={blocked?`You already selected a ${pm.methodId} payment method`:undefined}
                            style={blocked?{opacity:.5,cursor:"not-allowed"}:undefined}
                            onClick={()=>toggleMethod(pm.id)}>
                            <span className="pm-chip-type">{pm.name || pm.methodId}</span>
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",
                              whiteSpace:"nowrap"}}>
                              {methodLabel(pm)}
                            </span>
                            {/* inline currency tags — for m-pesa PMs we
                                collapse the (long) currency list down to the
                                single mpesa_finalCurrency to keep the chip readable. */}
                            <span style={{display:"flex",gap:3,flexShrink:0}}>
                              {(pm.details?.isMpesa
                                ? (pm.details?.mpesa_finalCurrency ? [pm.details.mpesa_finalCurrency] : [])
                                : (pm.currencies||[])
                              ).map(c=>(
                                <span key={c} style={{
                                  padding:"1px 5px",borderRadius:4,fontSize:".6rem",fontWeight:800,
                                  background:sel?"rgba(245,101,34,.15)":"var(--black-5)",
                                  color:sel?"var(--primary-dark)":"var(--black-65)",
                                  letterSpacing:".04em"}}>
                                  {c}
                                </span>
                              ))}
                            </span>
                            <span className="pm-chip-check">✓</span>
                          </button>
                          <button className="btn-edit-pm" onClick={e=>openEditPM(pm,e)}>
                            ✏ Edit
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Currency tab strip — drives the display currency for the
                    lower sections. Mobile-style: bold+underlined active tab,
                    separated by thin vertical rules. All currencies remain
                    valid on the offer; the pick is display-only. Centers on
                    narrow viewports via .offer-currency-tabs in styles.js. */}
                {offerCurrencies.length > 0 && (
                  <div className="offer-currency-tabs"
                    style={{display:"flex",alignItems:"center",marginTop:10,flexWrap:"wrap"}}>
                    {offerCurrencies.flatMap((c, i) => {
                      const isSel = c === activeCurrency;
                      const interactive = offerCurrencies.length > 1;
                      const tab = (
                        <button
                          key={c}
                          type="button"
                          onClick={interactive ? ()=>setPickedCurrency(c) : undefined}
                          disabled={!interactive}
                          aria-pressed={isSel}
                          style={{
                            background:"transparent",
                            border:"none",
                            padding:"2px 0",
                            fontFamily:"var(--font)",
                            fontSize:".75rem",
                            fontWeight:isSel?800:600,
                            letterSpacing:".06em",
                            textTransform:"uppercase",
                            color:isSel?"var(--primary-dark)":"var(--black-65)",
                            borderBottom:isSel?"2px solid var(--primary-dark)":"2px solid transparent",
                            cursor:interactive?"pointer":"default",
                          }}
                        >
                          {c}
                        </button>
                      );
                      if (i === 0) return [tab];
                      return [
                        <span key={`sep-${i}`} aria-hidden="true" style={{
                          width:1,height:14,background:"var(--black-10)",margin:"0 10px",
                        }}/>,
                        tab,
                      ];
                    })}
                  </div>
                )}

                {/* Market stat pills */}
                {savedMethods.length > 0 && <MarketStatPills marketStats={marketStats} isSell={isSell} onInfo={() => setOpenInfo("marketStats")} />}
              </div>

              {/* §3 Premium */}
              <div className="card-section">
                <div className="section-header">
                  <div className={`section-num${premOk?" filled":""}`}>3</div>
                  <span className="section-title">
                    {isSell?"Asking premium":"Max premium you'll pay"}
                  </span>
                  {premOk&&prem!==0&&(
                    <span className="section-done" style={{
                      color:isSell?(prem>0?"var(--success)":"var(--error)"):(prem<0?"var(--success)":"var(--error)"),
                      background:isSell?(prem>0?"var(--success-bg)":"var(--error-bg)"):(prem<0?"var(--success-bg)":"var(--error-bg)")
                    }}>
                      {prem>0?"+":""}{prem.toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="slider-val" style={{color:prem===0?"var(--black-65)":
                  isSell?(prem>0?"var(--success)":"var(--error)"):(prem<0?"var(--success)":"var(--error)")}}>
                  {prem>0?"+":""}{prem.toFixed(1)}%
                </div>

                <div className="prem-row">
                  <div className="prem-slider-wrap">
                    <input type="range" className="prem-slider" min={-21} max={21} step={0.1}
                      value={prem} style={{background:sliderBg}}
                      onChange={e=>setF("premium",parseFloat(e.target.value).toFixed(1))}/>
                    <div className="slider-labels">
                      <span>−21%</span><span>0%</span><span>+21%</span>
                    </div>
                  </div>
                  <div className="prem-input-wrap">
                    <input className="prem-input" type="number" step="0.1" min="-21" max="21"
                      value={form.premium}
                      onChange={e=>{
                        const v=e.target.value;
                        if(v===""||v==="-"){setF("premium",v);return;}
                        const n=parseFloat(v);
                        if(!isNaN(n))setF("premium",Math.max(-21,Math.min(21,n)).toFixed(1));
                      }}/>
                    <div style={{fontSize:".65rem",color:"var(--black-65)",fontWeight:600,
                      textAlign:"center",marginTop:4}}>manual</div>
                  </div>
                </div>

                {/* Effective price */}
                <div style={{display:"flex",gap:12,marginTop:14,
                  background:"var(--bg)",borderRadius:8,padding:"8px 12px",
                  border:"1px solid var(--black-10)"}}>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:".65rem",fontWeight:700,color:"var(--black-65)",
                      textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Market</div>
                    <div style={{fontSize:".88rem",fontWeight:800}}>{currSym(activeCurrency)}{pricesLoaded ? activeBtcPrice.toLocaleString() : "?"}</div>
                  </div>
                  <div style={{width:1,background:"var(--black-10)"}}/>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:".65rem",fontWeight:700,color:"var(--black-65)",
                      textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Effective</div>
                    <div style={{fontSize:".88rem",fontWeight:800,
                      color:prem===0?"var(--black)":
                        isSell?(prem>0?"var(--success)":"var(--error)"):(prem<0?"var(--success)":"var(--error)")}}>
                      {currSym(activeCurrency)}{Math.round(activeEffP).toLocaleString()}
                    </div>
                  </div>
                  {(isSell?form.amtFixed:form.amtFixed)>0&&(
                    <>
                      <div style={{width:1,background:"var(--black-10)"}}/>
                      <div style={{flex:1,textAlign:"center"}}>
                        <div style={{fontSize:".65rem",fontWeight:700,color:"var(--black-65)",
                          textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>
                          {isSell?"You receive":"You pay"}
                        </div>
                        <div style={{fontSize:".88rem",fontWeight:800}}>
                          {isSell
                            ? `${currSym(activeCurrency)}${fmtEur(satsToFiat(form.amtFixed,activeEffP))}`
                            : `${currSym(activeCurrency)}${fmtEur(satsToFiat(form.amtFixed,activeEffP))}`}
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* §4 Advanced options */}
              <div className="card-section">
                <div
                  className={`section-header collapsible${advancedExpanded ? " expanded" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={advancedExpanded}
                  onClick={() => setAdvancedExpanded(v => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAdvancedExpanded(v => !v);
                    }
                  }}
                >
                  <div className="section-num filled">4</div>
                  <span className="section-title">Advanced options</span>
                  <svg
                    className={`chev${advancedExpanded ? " open" : ""}`}
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    aria-hidden="true"
                  >
                    <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {advancedExpanded && (<>
                {/* ── INSTANT MATCH TOGGLE ── */}
                <div className="check-row" style={{marginTop:0}}
                  onClick={()=>setForm(f=>({...f, instantMatch:!f.instantMatch,
                    ...(f.instantMatch ? {noNewUsers:false,minReputation:false,instantMatchBadges:[]} : {})}))}>
                  <div className="check-box" style={{
                    border:`2px solid ${form.instantMatch?"var(--primary)":"var(--black-10)"}`,
                    background:form.instantMatch?"var(--primary-mild)":"var(--surface)"}}>
                    {form.instantMatch&&"✓"}
                  </div>
                  <div>
                    <div style={{fontSize:".8rem",fontWeight:700}}>
                      ⚡ Enable Instant Trade
                      <InfoDot ariaLabel="About instant trade" onClick={()=>setOpenInfo("instant")}/>
                    </div>
                    <div style={{fontSize:".7rem",color:"var(--black-65)",fontWeight:500}}>
                      Auto-accept any qualifying {isSell?"buy":"sell"} offer
                    </div>
                  </div>
                </div>

                {/* ── INSTANT MATCH SUB-OPTIONS (only when enabled) ── */}
                {form.instantMatch&&(
                  <div style={{marginTop:10,marginLeft:32,display:"flex",flexDirection:"column",gap:8}}>
                    {/* No new users */}
                    <div className="check-row" style={{cursor:"pointer"}}
                      onClick={()=>setForm(f=>({...f, noNewUsers:!f.noNewUsers,
                        ...((!f.noNewUsers && f.experienceLevel==="newUsersOnly") ? {experienceLevel:""} : {})}))}>
                      <div style={{width:16,height:16,borderRadius:"50%",
                        border:`2px solid ${form.noNewUsers?"var(--primary)":"var(--black-10)"}`,
                        background:form.noNewUsers?"var(--primary)":"var(--surface)",
                        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {form.noNewUsers&&<div style={{width:6,height:6,borderRadius:"50%",background:"var(--surface)"}}/>}
                      </div>
                      <div>
                        <div style={{fontSize:".78rem",fontWeight:600}}>No new users</div>
                        <div style={{fontSize:".68rem",color:"var(--black-65)",fontWeight:500}}>
                          Only accept trade requests from traders who have completed at least 1 trade
                        </div>
                      </div>
                    </div>

                    {/* Minimum reputation */}
                    <div className="check-row" style={{cursor:"pointer"}}
                      onClick={()=>setForm(f=>({...f, minReputation:!f.minReputation}))}>
                      <div style={{width:16,height:16,borderRadius:"50%",
                        border:`2px solid ${form.minReputation?"var(--primary)":"var(--black-10)"}`,
                        background:form.minReputation?"var(--primary)":"var(--surface)",
                        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {form.minReputation&&<div style={{width:6,height:6,borderRadius:"50%",background:"var(--surface)"}}/>}
                      </div>
                      <span style={{fontSize:".78rem",fontWeight:600}}>Minimum reputation : 4.5</span>
                    </div>

                    {/* Badge filter chips */}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:2}}>
                      {[["fastTrader","Fast trader"],["superTrader","super trader"]].map(([val,label])=>(
                        <span key={val}
                          className={`badge-chip${form.instantMatchBadges.includes(val)?" sel":""}`}
                          onClick={()=>setForm(f=>({...f,
                            instantMatchBadges: f.instantMatchBadges.includes(val)
                              ? f.instantMatchBadges.filter(b=>b!==val)
                              : [...f.instantMatchBadges, val]
                          }))}>{label}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── EXPERIENCE LEVEL FILTER ── */}
                <div className="check-row" style={{marginTop:16}}
                  onClick={()=>setForm(f=>({...f, experienceLevel: f.experienceLevel ? "" : "experiencedUsersOnly"}))}>
                  <div className="check-box" style={{
                    border:`2px solid ${form.experienceLevel?"var(--primary)":"var(--black-10)"}`,
                    background:form.experienceLevel?"var(--primary-mild)":"var(--surface)"}}>
                    {form.experienceLevel&&"✓"}
                  </div>
                  <div>
                    <div style={{fontSize:".8rem",fontWeight:700}}>
                      Filter by experience level
                      <InfoDot ariaLabel="About experience level" onClick={()=>setOpenInfo("experience")}/>
                    </div>
                    <div style={{fontSize:".7rem",color:"var(--black-65)",fontWeight:500}}>
                      Only accept trades from {isSell?"buyers":"sellers"} matching your criteria
                    </div>
                  </div>
                </div>
                {form.experienceLevel&&(
                  <div style={{marginTop:10,marginLeft:32,display:"flex",flexDirection:"column",gap:8}}>
                    {[["experiencedUsersOnly","Experienced users only"],["newUsersOnly","New users only (< 4 trades)"]].map(([val,label])=>(
                      <div key={val} className="check-row" style={{cursor:"pointer"}}
                        onClick={()=>setForm(f=>({...f, experienceLevel:val, ...(val==="newUsersOnly"&&f.noNewUsers ? {noNewUsers:false} : {})}))}>
                        <div style={{
                          width:16,height:16,borderRadius:"50%",
                          border:`2px solid ${form.experienceLevel===val?"var(--primary)":"var(--black-10)"}`,
                          background:form.experienceLevel===val?"var(--primary)":"var(--surface)",
                          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {form.experienceLevel===val&&<div style={{width:6,height:6,borderRadius:"50%",background:"var(--surface)"}}/>}
                        </div>
                        <span style={{fontSize:".78rem",fontWeight:600}}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── CREATE MULTIPLE OFFERS ── */}
                <MultiOfferControl
                  enabled={multiEnabled}
                  count={multiCount}
                  onToggle={() => { setMultiEnabled(e => !e); setMultiResults(null); setRefundExpanded(false); }}
                  onCountChange={setMultiCount}
                  onInfoClick={() => setOpenInfo("multi")}
                />
                </>)}
              </div>

              {/* §5 Release to (buy only) */}
              {!isSell && (
                <div className="card-section">
                  <div className="section-header">
                    <div className="section-num filled">5</div>
                    <span className="section-title">Release to</span>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6,marginBottom:8}}>
                    {[
                      ["peach","Peach Wallet"],
                      ...(savedPayoutAddress?.address
                        ? [["saved", savedPayoutAddress.label || "Custom address"]]
                        : []),
                    ].map(([val,label])=>{
                      const sel = form.releaseMode===val;
                      return (
                        <button key={val} type="button"
                          onClick={()=>setF("releaseMode",val)}
                          style={{
                            border:"1.5px solid var(--primary)",
                            background: sel ? "var(--primary)" : "transparent",
                            color: sel ? "var(--surface)" : "var(--primary)",
                            padding:"8px 16px",borderRadius:999,fontWeight:700,
                            fontSize:".78rem",fontFamily:"'Baloo 2', cursive",
                            cursor:"pointer",transition:"background .15s, color .15s",
                          }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {form.releaseMode==="saved" && savedPayoutAddress?.address && (
                    <div style={{marginBottom:8}}>
                      <span style={{fontFamily:"monospace",fontSize:".74rem",color:"var(--black-65)",wordBreak:"break-all"}}>
                        {savedPayoutAddress.address}
                      </span>
                    </div>
                  )}
                  <button type="button" style={{display:"block",background:"none",border:"none",
                    cursor:"pointer",fontSize:".76rem",fontWeight:700,color:"var(--primary)",
                    fontFamily:"var(--font)",padding:0,textDecoration:"underline",textUnderlineOffset:"2px"}}
                    onClick={()=>setShowPayoutModal(true)}>
                    {savedPayoutAddress?.address ? "Change custom address →" : "Set up custom address →"}
                  </button>
                </div>
              )}

              {/* §5 Refund (sell only) */}
              {isSell && (
                <div className="card-section">
                  <div className="section-header">
                    <div className={`section-num${refundOk?" filled":""}`}>5</div>
                    <span className="section-title">Refund</span>
                  </div>
                  {(() => {
                  const externalDupes = new Map();
                  form.refundChoices.forEach((c, i) => {
                    if (c.mode !== "external") return;
                    const a = (c.address ?? "").trim().toLowerCase();
                    if (!a) return;
                    if (!externalDupes.has(a)) externalDupes.set(a, []);
                    externalDupes.get(a).push(i);
                  });
                  const dupeOf = (i) => {
                    const c = form.refundChoices[i];
                    if (c?.mode !== "external" || !c.address.trim()) return null;
                    const list = externalDupes.get(c.address.trim().toLowerCase()) ?? [];
                    if (list.length < 2) return null;
                    return list.find(j => j !== i);
                  };
                  const externalCount = form.refundChoices.filter(c => c.mode === "external").length;
                  const savedCount    = form.refundChoices.filter(c => c.mode === "saved").length;
                  const peachCount    = form.refundChoices.length - externalCount - savedCount;
                  const summaryLabel = (() => {
                    if (peachCount === form.refundChoices.length) return "Peach Wallet (default)";
                    if (savedCount === form.refundChoices.length)
                      return `Saved address${savedCount === 1 ? "" : ` (×${savedCount})`}`;
                    if (externalCount === form.refundChoices.length)
                      return `${externalCount} external address${externalCount === 1 ? "" : "es"}`;
                    const parts = [];
                    if (savedCount)    parts.push(`${savedCount} saved`);
                    if (externalCount) parts.push(`${externalCount} external`);
                    if (peachCount)    parts.push(`${peachCount} Peach Wallet`);
                    return parts.join(", ");
                  })();
                  const showExpanded = !multiEnabled || refundExpanded || !refundOk;

                  const renderChoiceRow = (choice, i) => {
                    const dup = dupeOf(i);
                    const err = refundErrors[i];
                    return (
                      <div key={i} style={{
                        padding: multiEnabled ? "10px 12px" : 0,
                        background: multiEnabled ? "var(--black-3)" : "transparent",
                        borderRadius: multiEnabled ? 8 : 0,
                      }}>
                        {multiEnabled && (
                          <div style={{fontSize:".72rem",fontWeight:700,color:"var(--black-65)",marginBottom:8}}>
                            Offer {i + 1}
                          </div>
                        )}
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {[
                            ...(savedRefund?.address
                              ? [["saved", `${savedRefund.label || "Saved address"} — ${truncateAddress(savedRefund.address)}`]]
                              : []),
                            ["peach","Peach Wallet"],
                            ["external","Add external address"],
                          ].map(([val,label])=>{
                            const selected = choice.mode === val;
                            return (
                              <button key={val} type="button"
                                onClick={()=>{
                                  userTouchedRefundRef.current = true;
                                  updateRefund(i, { mode: val });
                                  if (val !== "external") setRefundErrors(p => { const n={...p}; delete n[i]; return n; });
                                }}
                                style={{
                                  border:"1.5px solid var(--primary)",
                                  background: selected ? "var(--primary)" : "transparent",
                                  color: selected ? "var(--surface)" : "var(--primary)",
                                  padding:"8px 16px",
                                  borderRadius:999,
                                  fontWeight:700,
                                  fontSize:".78rem",
                                  fontFamily:"'Baloo 2', cursive",
                                  cursor:"pointer",
                                  transition:"background .15s, color .15s",
                                }}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        {choice.mode === "external" && (
                          <div style={{marginTop:10,marginLeft:32}}>
                            <input
                              value={choice.address}
                              onChange={e => {
                                userTouchedRefundRef.current = true;
                                updateRefund(i, { address: e.target.value });
                                setRefundErrors(p => { const n={...p}; delete n[i]; return n; });
                              }}
                              onBlur={() => {
                                const v = (choice.address ?? "").trim();
                                if (!v) { setRefundErrors(p => { const n={...p}; delete n[i]; return n; }); return; }
                                const r = validateBtcAddress(v, btcNetwork);
                                setRefundErrors(p => ({ ...p, [i]: r.valid ? null : r.error }));
                              }}
                              placeholder={btcNetwork === "regtest" ? "bcrt1q…" : "bc1q… / 3… / 1…"}
                              style={{
                                width:"100%",padding:"10px 14px",borderRadius:10,
                                border: err ? "1.5px solid var(--error)" : "1.5px solid var(--black-25)",
                                background:"var(--surface)",fontFamily:"'Baloo 2',cursive",
                                fontSize:".85rem",color:"var(--black)",outline:"none"
                              }}/>
                            {err && (
                              <div style={{fontSize:".72rem",color:"var(--error)",marginTop:6}}>{err}</div>
                            )}
                            {!err && (choice.address ?? "").trim() && validateBtcAddress(choice.address.trim(), btcNetwork).valid && (
                              <div style={{fontSize:".72rem",color:"var(--success)",fontWeight:700,marginTop:6}}>✓ Valid address</div>
                            )}
                            {!err && dup != null && (
                              <div style={{fontSize:".72rem",color:"#C77700",marginTop:6}}>
                                This address is also used by Offer {dup + 1}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  };

                  if (!multiEnabled) {
                    return (
                      <div style={{marginTop:14}}>
                        <div style={{fontSize:".78rem",fontWeight:700,marginBottom:8}}>Refund to:</div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {form.refundChoices.map((choice, i) => renderChoiceRow(choice, i))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div style={{marginTop:14}}>
                      <div style={{display:"flex",flexWrap:"wrap",alignItems:"baseline",gap:6,marginBottom:6}}>
                        <span style={{fontSize:".78rem",fontWeight:700}}>Refund to:</span>
                        <span style={{fontSize:".78rem",fontWeight:500,color:"var(--black-65)"}}>{summaryLabel}</span>
                      </div>
                      <button type="button"
                        onClick={() => { if (refundOk) setRefundExpanded(v => !v); }}
                        disabled={!refundOk}
                        style={{
                          background:"transparent",border:"none",padding:0,
                          color:"var(--primary)",fontWeight:700,fontSize:".78rem",
                          fontFamily:"'Baloo 2', cursive",
                          cursor: refundOk ? "pointer" : "default",
                          opacity: refundOk ? 1 : 0.85,
                        }}>
                        {showExpanded ? "▼" : "▶"} Edit refund addresses individually
                      </button>
                      {showExpanded && (
                        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:10}}>
                          {form.refundChoices.map((choice, i) => renderChoiceRow(choice, i))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: REVIEW ── */}
          {step===1&&(
            <div className="step-anim">
              <div style={{marginBottom:16,fontSize:".84rem",color:"var(--black-65)",
                fontWeight:500,lineHeight:1.6}}>
                {isSell
                  ? "Check everything carefully — payment method can't be changed after publishing. You'll have to fund the escrow in the next step for the offer to be published."
                  : "Check everything carefully — payment method and amount can't be changed after publishing."}
              </div>
              <div className="review-card">
                {[
                  ["Type",
                    <span style={{color:isSell?"var(--error)":"var(--success)",fontWeight:800}}>
                      {isSell?"Sell BTC":"Buy BTC"}
                    </span>],
                  ["Amount",
                    <span style={{display:"inline-flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <SatsAmount sats={form.amtFixed}/>
                      <span style={{color:"var(--black-65)",fontWeight:600,fontSize:".82rem"}}>
                        ≈ {currSym(activeCurrency)}{fmtEur(satsToFiat(form.amtFixed,activeEffP))}
                      </span>
                    </span>],
                  ["Premium",
                    <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:800,color:prem===0?"var(--black-65)":
                        isSell?(prem>0?"var(--success)":"var(--error)"):(prem<0?"var(--success)":"var(--error)")}}>
                        {prem>0?"+":""}{prem.toFixed(1)}%
                      </span>
                      <button type="button" className="review-edit-btn"
                        onClick={()=>setEditingPremiumInline(v=>!v)}>
                        {editingPremiumInline?"close":"edit"}
                      </button>
                    </span>],
                  ["Current effective price", `${currSym(activeCurrency)}${Math.round(activeEffP).toLocaleString()}/BTC`],
                  ["Methods", offerMethods.join(", ")||"—"],
                  ["Currencies", (() => {
                    // For m-pesa PMs we collapse the (long) currencies list down
                    // to the single mpesa_finalCurrency on the review card.
                    const display = [...new Set(selectedSaved.flatMap((m) =>
                      m.details?.isMpesa
                        ? (m.details?.mpesa_finalCurrency ? [m.details.mpesa_finalCurrency] : [])
                        : (m.currencies || [])
                    ))];
                    return display.join(", ") || "—";
                  })()],
                  ...(!isSell?[["Release to",
                    form.releaseMode==="saved" && savedPayoutAddress?.address
                      ? <AddressWithActions addr={savedPayoutAddress.address} label={savedPayoutAddress.label}/>
                      : "Peach Wallet"
                  ]]:[]),
                  ...(isSell?[["Refund to", (() => {
                    const c = form.refundChoices[0];
                    if (!c || c.mode === "peach") return "Peach Wallet";
                    if (c.mode === "saved") return <AddressWithActions addr={savedRefund?.address} label={savedRefund?.label}/>;
                    return <AddressWithActions addr={c.address}/>;
                  })()]]:[]),
                ].map(([k,v])=>(
                  <div key={k} className="review-row">
                    <span className="rk">{k}</span>
                    <span className="rv">{v}</span>
                  </div>
                ))}
              </div>

              {editingPremiumInline && (
                <div className="review-inline-editor">
                  <div className="prem-row">
                    <div className="prem-slider-wrap">
                      <input type="range" className="prem-slider" min={-21} max={21} step={0.1}
                        value={prem} style={{background:sliderBg}}
                        onChange={e=>setF("premium",parseFloat(e.target.value).toFixed(1))}/>
                      <div className="slider-labels">
                        <span>−21%</span><span>0%</span><span>+21%</span>
                      </div>
                    </div>
                    <div className="prem-input-wrap">
                      <input className="prem-input" type="number" step="0.1" min="-21" max="21"
                        value={form.premium}
                        onChange={e=>{
                          const v=e.target.value;
                          if(v===""||v==="-"){setF("premium",v);return;}
                          const n=parseFloat(v);
                          if(!isNaN(n))setF("premium",Math.max(-21,Math.min(21,n)).toFixed(1));
                        }}/>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:12,marginTop:14,
                    background:"var(--bg)",borderRadius:8,padding:"8px 12px",
                    border:"1px solid var(--black-10)"}}>
                    <div style={{flex:1,textAlign:"center"}}>
                      <div style={{fontSize:".65rem",fontWeight:700,color:"var(--black-65)",
                        textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Market</div>
                      <div style={{fontSize:".88rem",fontWeight:800}}>{currSym(activeCurrency)}{pricesLoaded ? activeBtcPrice.toLocaleString() : "?"}</div>
                    </div>
                    <div style={{width:1,background:"var(--black-10)"}}/>
                    <div style={{flex:1,textAlign:"center"}}>
                      <div style={{fontSize:".65rem",fontWeight:700,color:"var(--black-65)",
                        textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Effective</div>
                      <div style={{fontSize:".88rem",fontWeight:800,
                        color:prem===0?"var(--black)":
                          isSell?(prem>0?"var(--success)":"var(--error)"):(prem<0?"var(--success)":"var(--error)")}}>
                        {currSym(activeCurrency)}{Math.round(activeEffP).toLocaleString()}
                      </div>
                    </div>
                    <div style={{width:1,background:"var(--black-10)"}}/>
                    <div style={{flex:1,textAlign:"center"}}>
                      <div style={{fontSize:".65rem",fontWeight:700,color:"var(--black-65)",
                        textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>
                        {isSell?"You receive":"You pay"}
                      </div>
                      <div style={{fontSize:".88rem",fontWeight:800}}>
                        {currSym(activeCurrency)}{fmtEur(satsToFiat(form.amtFixed,activeEffP))}
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign:"center",marginTop:12}}>
                    <button type="button" className="btn-next" style={{padding:"8px 24px",fontSize:".82rem"}}
                      onClick={()=>setEditingPremiumInline(false)}>Done</button>
                  </div>
                </div>
              )}

              <ReviewPills form={form} multiEnabled={multiEnabled} multiCount={multiCount}/>

              {/* ── PUBLISH PROGRESS BAR (multi-offer) ── */}
              {multiPublishProgress && (
                <div className="multi-publish-progress" style={{marginTop:16}}>
                  <div className="multi-publish-bar">
                    <div className="multi-publish-fill"
                      style={{width:`${(multiPublishProgress.done/multiPublishProgress.total)*100}%`}}/>
                  </div>
                  <div className="multi-publish-text">
                    Creating offer {multiPublishProgress.done} of {multiPublishProgress.total}…
                  </div>
                </div>
              )}

              {/* ── PARTIAL FAILURE (multi-offer) ── */}
              {multiResults && multiResults.some(r => r.status === "failed") && (
                <div style={{marginTop:16,padding:"14px 16px",borderRadius:12,
                  background:"var(--error-bg)",border:"1px solid var(--error)"}}>
                  <div style={{fontSize:".82rem",fontWeight:700,color:"var(--error)",marginBottom:8}}>
                    {multiResults.filter(r=>r.status==="created").length} of {multiResults.length} offers published
                  </div>
                  <div style={{fontSize:".72rem",color:"var(--black-65)",fontWeight:500,lineHeight:1.5,marginBottom:10}}>
                    {multiResults.filter(r=>r.status==="failed").length} offer{multiResults.filter(r=>r.status==="failed").length>1?"s":""} failed.
                    {multiResults.filter(r=>r.status==="failed").map((r,i)=>(
                      <span key={i} style={{display:"block",color:"var(--error)",fontSize:".7rem",marginTop:2}}>
                        Offer {multiResults.indexOf(r)+1}: {r.error}
                      </span>
                    ))}
                  </div>
                  <button className="btn-retry" onClick={isSell ? retryFailedSell : retryFailedBuy} disabled={publishing}>
                    {publishing ? "Retrying…" : `Retry ${multiResults.filter(r=>r.status==="failed").length} failed`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: ESCROW (sell only) ── */}
          {step===2 && multiResults && multiResults.filter(r=>r.status!=="failed"&&r.escrowAddress).length > 1 && (
            <div className="step-anim">
              <MultiEscrowFunding
                results={multiResults}
                selectedIdx={selectedEscrowIdx}
                onSelectIdx={setSelectedEscrowIdx}
                amtFixed={form.amtFixed}
                effP={activeEffP}
                activeCurrency={activeCurrency}
                post={post}
                navigate={navigate}
                reset={reset}
                allFunded={multiResults.filter(r=>r.status!=="failed"&&r.escrowAddress).every(r=>r.fundingStatus==="FUNDED")}
              />
            </div>
          )}
          {step===2 && !(multiResults && multiResults.filter(r=>r.status!=="failed"&&r.escrowAddress).length > 1) && (
            <div className="step-anim">
              {fundingStatus === "WRONG_FUNDING_AMOUNT" ? (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                  gap:18,paddingTop:32,textAlign:"center",animation:"stepFwd .4s ease both"}}>
                  <div style={{width:76,height:76,borderRadius:"50%",
                    background:"var(--warning)",display:"flex",alignItems:"center",
                    justifyContent:"center",color:"white",fontSize:"2.4rem",fontWeight:800,
                    boxShadow:"0 8px 32px rgba(245,158,11,.3)"}}>⚠</div>
                  <div style={{fontSize:"1.2rem",fontWeight:800,color:"var(--warning)"}}>
                    Wrong amount funded
                  </div>
                  <p style={{fontSize:".88rem",color:"var(--black-65)",lineHeight:1.65,maxWidth:360}}>
                    You funded the escrow with{" "}
                    <strong style={{color:"var(--black)"}}>
                      {(fundingAmounts ? fundingAmounts.reduce((a,b)=>a+b,0) : 0).toLocaleString("en-US")}
                    </strong>{" "}
                    sats, but the offer was created for{" "}
                    <strong style={{color:"var(--black)"}}>
                      {form.amtFixed.toLocaleString("en-US")}
                    </strong>{" "}
                    sats. Redirecting you to Trades so you can choose to continue with the funded amount or refund the escrow…
                  </p>
                  <button
                    onClick={() => navigate("/trades", { state: { openOfferId: sellOfferId } })}
                    style={{padding:"10px 28px",borderRadius:999,background:"var(--grad)",
                      color:"white",border:"none",cursor:"pointer",fontFamily:"var(--font)",
                      fontSize:".88rem",fontWeight:800}}
                  >
                    Go to Trades now
                  </button>
                </div>
              ) : !escrowFunded?(
                <>
                  <div style={{fontSize:".84rem",color:"var(--black-65)",fontWeight:500,
                    lineHeight:1.6,marginBottom:20}}>
                    Send any amount within the accepted limits to the address below to activate your offer. It goes live on confirmation.
                  </div>
                  {fundingStatus === "FUNDED" ? (
                    <div style={{background:"var(--success-bg)",borderRadius:12,
                      border:"1px solid var(--success)",padding:"14px 16px",
                      display:"flex",alignItems:"center",gap:14,marginBottom:18,
                      animation:"stepFwd .4s ease both"}}>
                      <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
                        background:"var(--success)",display:"flex",alignItems:"center",
                        justifyContent:"center",color:"white",fontSize:".75rem",fontWeight:800}}>✓</div>
                      <div>
                        <div style={{fontSize:".8rem",fontWeight:700,color:"var(--success)",marginBottom:2}}>
                          Confirmed!
                        </div>
                        <div style={{fontSize:".7rem",color:"var(--black-65)",fontWeight:500}}>
                          Your offer is going live...
                        </div>
                      </div>
                    </div>
                  ) : fundingStatus === "MEMPOOL" ? (
                    <div style={{background:"var(--success-bg)",borderRadius:12,
                      border:"1px solid var(--success)",padding:"14px 16px",
                      display:"flex",alignItems:"center",gap:14,marginBottom:18,
                      animation:"stepFwd .4s ease both"}}>
                      <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
                        background:"var(--success)",display:"flex",alignItems:"center",
                        justifyContent:"center",color:"white",fontSize:".75rem",fontWeight:800}}>✓</div>
                      <div>
                        <div style={{fontSize:".8rem",fontWeight:700,color:"var(--success)",marginBottom:2}}>
                          Transaction detected!
                        </div>
                        <div style={{fontSize:".7rem",color:"var(--black-65)",fontWeight:500}}>
                          Waiting for confirmation<span className="wait-dot"/> (~10–30 min)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{background:"var(--black-5)",borderRadius:12,
                      border:"1px solid var(--black-10)",padding:"14px 16px",
                      display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
                      <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
                        border:"3px solid var(--black-10)",borderTopColor:"var(--primary)",
                        animation:"spin .9s linear infinite"}}/>
                      <div>
                        <div style={{fontSize:".8rem",fontWeight:700,marginBottom:2}}>
                          Waiting for funding<span className="wait-dot"/>
                        </div>
                        <div style={{fontSize:".7rem",color:"var(--black-65)",fontWeight:500}}>
                          Send any amount within the accepted limits to this address
                        </div>
                      </div>
                    </div>
                  )}
                  <label className="field-label" style={{marginBottom:6}}>Escrow address</label>
                  {escrowAddress ? (
                  <>
                  <div className="escrow-addr"
                    onClick={()=>{
                      navigator.clipboard.writeText(escrowAddress).catch(()=>{});
                      setCopiedAddr(true);setTimeout(()=>setCopiedAddr(false),2000);
                    }}
                    style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                    <span style={{flex:1,minWidth:0,wordBreak:"break-all"}}>{escrowAddress}</span>
                    <span style={{flexShrink:0,display:"inline-flex",alignItems:"center",
                      color: copiedAddr ? "var(--success)" : "var(--black-65)"}}>
                      {copiedAddr ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      )}
                    </span>
                  </div>
                  <div style={{textAlign:"center",marginBottom:14}}>
                    <label className="field-label" style={{marginBottom:6,display:"block"}}>Amount to send</label>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
                      <SatsAmount sats={form.amtFixed} fontSize="1.6rem"/>
                      <span style={{fontSize:".88rem",color:"var(--black-65)",fontWeight:600}}>
                        ≈ {currSym(activeCurrency)}{fmtEur(satsToFiat(form.amtFixed,activeEffP))}
                      </span>
                    </div>
                  </div>
                  {/* QR code / green check on detection */}
                  <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
                    <div style={{padding:12,background:"white",borderRadius:12,
                      border:"1px solid var(--black-10)",display:"inline-block"}}>
                      {(fundingStatus === "MEMPOOL" || fundingStatus === "FUNDED") ? (
                        <div style={{width:140,height:140,display:"flex",
                          alignItems:"center",justifyContent:"center"}}>
                          <div style={{width:76,height:76,borderRadius:"50%",
                            background:"var(--success)",display:"flex",
                            alignItems:"center",justifyContent:"center",
                            color:"white",fontSize:"2.4rem",fontWeight:800,
                            boxShadow:"0 8px 32px rgba(101,165,25,.3)"}}>✓</div>
                        </div>
                      ) : (
                        <QRCodeSVG
                          value={qrWithAmount
                            ? `bitcoin:${escrowAddress}?amount=${(form.amtFixed / 1e8).toFixed(8)}`
                            : escrowAddress}
                          size={140} level="L" bgColor="#ffffff" fgColor="#2B1911"
                        />
                      )}
                    </div>
                  </div>
                  {/* Address only / Address + amount toggle */}
                  {fundingStatus !== "MEMPOOL" && fundingStatus !== "FUNDED" && (<>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                    <div style={{
                      display:"flex", alignItems:"center", gap:0,
                      background:"var(--black-5)", borderRadius:999, padding:3,
                      fontSize:".72rem", fontWeight:700,
                    }}>
                      <button
                        type="button"
                        style={{
                          border:"none", borderRadius:999, padding:"4px 14px", cursor:"pointer",
                          fontFamily:"Baloo 2, cursive", fontSize:".72rem", fontWeight:700,
                          background: !qrWithAmount ? "white" : "transparent",
                          color: !qrWithAmount ? "#2B1911" : "var(--black-65)",
                          boxShadow: !qrWithAmount ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                          transition:"all .15s",
                        }}
                        onClick={() => setQrWithAmount(false)}
                      >Address only</button>
                      <button
                        type="button"
                        style={{
                          border:"none", borderRadius:999, padding:"4px 14px", cursor:"pointer",
                          fontFamily:"Baloo 2, cursive", fontSize:".72rem", fontWeight:700,
                          background: qrWithAmount ? "white" : "transparent",
                          color: qrWithAmount ? "#2B1911" : "var(--black-65)",
                          boxShadow: qrWithAmount ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                          transition:"all .15s",
                        }}
                        onClick={() => setQrWithAmount(true)}
                      >Address + amount</button>
                    </div>
                  </div>
                  <div style={{
                    fontSize:".68rem", color:"var(--black-65)", textAlign:"center",
                    lineHeight:1.5, marginBottom:20,
                  }}>
                    {qrWithAmount
                      ? "QR includes amount — most wallets will fill it in automatically"
                      : "QR contains address only — enter the amount manually in your wallet"}
                  </div>
                  </>
                  )}
                  {/* Or fund via mobile app */}
                  {auth && sellOfferId && !fundingStatus && (
                    <div style={{marginBottom:20}}>
                      <div style={{fontSize:".68rem",fontWeight:700,color:"var(--black-65)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:6,textAlign:"center"}}>
                        Or fund from your Peach mobile app
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                        {fundMobileActionId ? (
                          <MobilePendingButton
                            label="Request sent — check your phone"
                            type="fundEscrow"
                            actionId={fundMobileActionId}
                          />
                        ) : (
                        <button
                          disabled={fundMobileLoading}
                          onClick={async () => {
                            setFundMobileError(null);
                            setFundMobileLoading(true);
                            try {
                              const res = await post(`/offer/${sellOfferId}/fundEscrowPendingAction`);
                              if (!res.ok) {
                                const err = await res.json().catch(() => null);
                                throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
                              }
                              // Fetch /details to pick up the new pending-action id
                              // (server replaced the boolean field with an integer DB id).
                              const detailsRes = await get(`/offer/${sellOfferId}/details`);
                              if (detailsRes.ok) {
                                const body = await detailsRes.json().catch(() => null);
                                const id = body?.mobileActionFundEscrowWasTriggered;
                                setFundMobileActionId(typeof id === "number" ? id : true);
                              } else {
                                setFundMobileActionId(true);
                              }
                            } catch (e) {
                              setFundMobileError("Failed to request funding: " + e.message);
                            } finally {
                              setFundMobileLoading(false);
                            }
                          }}
                          style={{
                            padding:"10px 24px",borderRadius:999,border:"none",
                            background:"var(--grad)",color:"white",
                            fontFamily:"var(--font)",fontSize:".82rem",fontWeight:800,
                            cursor:fundMobileLoading?"default":"pointer",
                            opacity: fundMobileLoading ? 0.6 : 1,
                          }}
                        >
                          {fundMobileLoading ? "Sending request…" : "Fund via mobile app"}
                        </button>
                        )}
                        <button
                          onClick={() => navigate("/trades", { state: { tab: "pending", refresh: true } })}
                          className="btn-save-fund-later"
                        >
                          save and fund later
                        </button>
                      </div>
                      {fundMobileError && (
                        <div style={{color:"var(--error)",fontSize:".74rem",fontWeight:600,marginTop:6,textAlign:"center"}}>{fundMobileError}</div>
                      )}
                    </div>
                  )}
                  </>
                  ) : (
                  <div style={{padding:"24px 0",textAlign:"center",color:"var(--black-40)",fontSize:".84rem",fontWeight:600}}>
                    Waiting for escrow address…
                  </div>
                  )}
                </>
              ):(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                  gap:16,paddingTop:48,textAlign:"center",animation:"stepFwd .4s ease both"}}>
                  <div className="success-icon">✓</div>
                  <div style={{fontSize:"1.2rem",fontWeight:800,color:"var(--success)"}}>
                    Offer published
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── NAV ── */}
          {!(step===2&&(escrowFunded || (multiResults && multiResults.filter(r=>r.status!=="failed"&&r.escrowAddress).length > 1)))&&(
            <div className="oc-nav">
              {step>0
                ? <button className="btn-back-nav" onClick={handleBack}>← Back</button>
                : <div/>}
              {step===0&&(
                <button className="btn-next" onClick={handleNext} disabled={!configOk}>
                  Review {isSell?"sell":"buy"} offer →
                </button>
              )}
              {step===1&&(<>
                {publishError&&(
                  <div style={{color:"var(--error)",fontSize:".82rem",fontWeight:600,
                    background:"var(--error-bg)",padding:"8px 14px",borderRadius:10,maxWidth:340}}>
                    {publishError}
                  </div>
                )}
                <button className={`btn-next btn-publish-${type}`} onClick={handleNext} disabled={publishing}>
                  {publishing
                    ? (multiPublishProgress ? `Publishing ${multiPublishProgress.done}/${multiPublishProgress.total}…` : "Publishing…")
                    : multiEnabled
                      ? (isSell?`Fund escrows`:`Publish ${multiCount} offers →`)
                      : (isSell?"Fund escrow":"Publish offer →")}
                </button>
              </>)}
              {step===2&&!escrowFunded&&<div/>}
            </div>
          )}
        </div>

        {/* ── PREVIEW PANEL ── */}
        <div className="preview-panel">
          <LivePreview type={type} form={form}
            offerMethods={offerMethods} offerCurrencies={offerCurrencies}
            activeCurrency={activeCurrency} activeBtcPrice={activeBtcPrice}/>

          <MarketStatPills marketStats={marketStats} isSell={isSell} onInfo={() => setOpenInfo("marketStats")} />
        </div>
      </div>

      {/* ── AUTH POPUP (when logged out) ── */}
      {!isLoggedIn && (
        <div className="auth-screen-overlay">
          <div className="auth-popup">
            <div className="auth-popup-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><rect x="5" y="12" width="18" height="13" rx="3"/><path d="M9 12V9a5 5 0 0 1 10 0v3"/><circle cx="14" cy="19" r="1.5" fill="var(--primary)"/></svg>
            </div>
            <div className="auth-popup-title">Authentication required</div>
            <div className="auth-popup-sub">Please authenticate to create offers and start trading</div>
            <button className="auth-popup-btn" onClick={handleLogin}>Log in</button>
          </div>
        </div>
      )}
    </>
  );
}
