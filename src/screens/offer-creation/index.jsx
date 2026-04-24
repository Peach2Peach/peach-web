// ─── OFFER CREATION — MAIN SCREEN ───────────────────────────────────────────
// Split from peach-offer-creation.jsx
// Sub-components in: ./components.jsx, CSS in: ./styles.js
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SideNav, Topbar } from "../../components/Navbars.jsx";
import { SatsAmount, IcoBtc } from "../../components/BitcoinAmount.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useApi } from "../../hooks/useApi.js";
import { fetchWithSessionCheck } from "../../utils/sessionGuard.js";
import { extractPMsFromProfile, isApiError, hashPaymentFields, encryptForPublicKey, encryptPGPMessage, signPGPMessage } from "../../utils/pgp.js";
import { deriveEscrowPubKey, deriveReturnAddress } from "../../utils/escrow.js";
import { QRCodeSVG } from "qrcode.react";
import { SAT, BTC_PRICE_FALLBACK as BTC_PRICE_INIT, fmt, satsToFiatRaw as satsToFiat, fmtFiat as fmtEur, formatTradeId } from "../../utils/format.js";
import { CSS } from "./styles.js";
import {
  MIN_SATS, maxSatsAtPrice,
  getSteps, LivePreview, AmountSlider,
  MultiOfferControl, MultiEscrowFunding,
} from "./components.jsx";
import {
  AddPMFlow, methodLabel, normalizeApiPaymentMethods,
} from "../../components/AddPMFlow.jsx";
import { syncPMsToServer } from "../../utils/pmSync.js";


// ─── MAIN ───────────────────────────────────────────────────────────────────
export default function OfferCreation({ initialType="buy" }) {
  const navigate = useNavigate();
  const [type,         setType]         = useState(initialType);
  const [step,         setStep]         = useState(0);
  const [allPrices,           setAllPrices]           = useState(null);
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const pricesLoaded = allPrices !== null;
  const btcPrice = Math.round(allPrices?.[selectedCurrency] ?? BTC_PRICE_INIT);
  const [done,         setDone]         = useState(false);
  const [copiedAddr,   setCopiedAddr]   = useState(false);
  const [qrWithAmount, setQrWithAmount] = useState(true);
  const [escrowFunded,  setEscrowFunded]  = useState(false);
  const [fundingStatus, setFundingStatus] = useState(null); // null → "MEMPOOL" → "FUNDED" | "WRONG_FUNDING_AMOUNT"
  const [fundingAmounts, setFundingAmounts] = useState(null); // amounts array from API (for wrong-amount case)
  const [savedMethods, setSavedMethods] = useState([]);
  const [methodsCatalogue, setMethodsCatalogue] = useState({});
  const [catalogueError, setCatalogueError] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPM,    setEditingPM]    = useState(null); // PM object being edited
  const [pmError,      setPmError]      = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [escrowAddress, setEscrowAddress] = useState(null);
  const [sellOfferId,   setSellOfferId]   = useState(null);
  const [fundMobileLoading, setFundMobileLoading] = useState(false);
  const [fundMobileRequested, setFundMobileRequested] = useState(false);
  const [fundMobileError, setFundMobileError] = useState(null);

  // ── MULTI-OFFER STATE ──
  const [multiEnabled,     setMultiEnabled]     = useState(false);
  const [multiCount,       setMultiCount]       = useState(2);
  const [multiResults,     setMultiResults]     = useState(null); // [{ offerId, escrowAddress, status, fundingStatus, error }]
  const [selectedEscrowIdx, setSelectedEscrowIdx] = useState(0);
  const [multiPublishProgress, setMultiPublishProgress] = useState(null); // { done, total }

  // ── FETCH LIVE SAVED PMs ──
  useEffect(() => {
    if (!auth) return;
    // Clear PMs before fetching fresh data
    setSavedMethods([]);
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
          setSavedMethods([]);
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
          setSavedMethods(pms.map((pm, i) => {
            const rawId = pm.methodId || pm.type || pm.id || "unknown";
            const mid = shortId(rawId);
            return {
              id:         pm.id || `api-pm-${i}`,
              methodId:   mid,
              name:       pm.name || pm.label || mid,
              currencies: pm.currencies ?? [],
              details:    sweepFields(pm),
            };
          }));
        } else if (pms && typeof pms === "object") {
          setSavedMethods(Object.entries(pms).map(([key, val]) => {
            const mid = shortId(key);
            return {
              id:         val?.id || key,
              methodId:   mid,
              name:       val?.name || val?.label || mid,
              currencies: val?.currencies ?? [],
              details:    sweepFields(val || {}),
            };
          }));
        }
      })
      .catch((err) => {
        console.warn("[OfferCreation] PM fetch failed:", err.message);
        setPmError(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // ── AUTH STATE ──
  const { isLoggedIn, handleLogin, handleLogout, showAvatarMenu, setShowAvatarMenu } = useAuth();
  const { get, post, auth } = useApi();
  useEffect(() => {
    if (!showAvatarMenu) return;
    const close = (e) => { if (!e.target.closest(".avatar-menu-wrap")) setShowAvatarMenu(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAvatarMenu]);

  const initForm = ()=>({amtFixed:MIN_SATS,
    selectedMethodIds:[],premium:"0",instantMatch:false,noNewUsers:false,
    minReputation:false,instantMatchBadges:[],experienceLevel:""});
  const [form, setForm] = useState(initForm());

  const isSell = type==="sell";
  const STEPS  = getSteps(type);
  const prem   = parseFloat(form.premium)||0;
  const effP   = btcPrice*(1+prem/100);

  // Derive method types and currencies from selected saved PMs
  const selectedSaved    = savedMethods.filter(m=>form.selectedMethodIds.includes(m.id));
  const offerMethods     = [...new Set(selectedSaved.map(m=>m.methodId))];
  const offerCurrencies  = [...new Set(selectedSaved.flatMap(m=>m.currencies||[]))];

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await get('/market/prices');
        const data = await res.json();
        if (data && typeof data === "object") {
          setAllPrices(data);
          setAvailableCurrencies(Object.keys(data).sort());
        }
      } catch {}
    }
    fetchPrices();
    const iv = setInterval(fetchPrices, 30000);
    return () => clearInterval(iv);
  }, []);

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
    if (step !== 2 || !sellOfferId || !auth) return;
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
        // Check details first — it's the authoritative source for wrong-amount.
        if (detailsRes.ok) {
          const details = await detailsRes.json();
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
          setTimeout(() => { if (!cancelled) setEscrowFunded(true); }, 1500);
        } else if (s === "WRONG_FUNDING_AMOUNT") {
          triggerRedirect(data?.funding?.amounts);
        }
      } catch (err) {
        console.warn("[OfferCreation] Escrow poll error:", err.message);
      }
    }
    check(); // immediate first check
    const iv = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [step, sellOfferId, auth, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function setF(k,v){ setForm(f=>({...f,[k]:v})); }
  function reset(){
    setStep(0);setDone(false);setEscrowFunded(false);setFundingStatus(null);setFundingAmounts(null);setPublishError(null);setEscrowAddress(null);setSellOfferId(null);setForm(initForm());
    setMultiEnabled(false);setMultiCount(2);setMultiResults(null);setSelectedEscrowIdx(0);setMultiPublishProgress(null);
  }
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
    if (auth && nextList) syncPMsToServer(nextList, auth);
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
  const maxS   = maxSatsAtPrice(btcPrice);
  const amtOk  = isSell
    ? form.amtFixed>=MIN_SATS&&form.amtFixed<=maxS
    : form.amtFixed>=MIN_SATS&&form.amtFixed<=maxS;
  const payOk  = form.selectedMethodIds.length > 0;
  const premOk = form.premium!=="";
  const configOk = amtOk&&payOk&&premOk;

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
  // When serverPGPKey is provided (instant trade), encrypts PM details for the server
  async function buildPaymentPayload(serverPGPKey){
    const meansOfPayment = {};
    for(const pm of selectedSaved){
      const methodType = (pm.methodId||"").replace(/-\d+$/, "");
      for(const cur of (pm.currencies||[])){
        if(!meansOfPayment[cur]) meansOfPayment[cur] = [];
        if(!meansOfPayment[cur].includes(methodType)) meansOfPayment[cur].push(methodType);
      }
    }
    const paymentData = {};
    for(const pm of selectedSaved){
      const methodType = (pm.methodId||"").replace(/-\d+$/, "");
      if(paymentData[methodType]) continue;
      const rawDetails = pm.details || {};
      const details = {};
      for (const [k, v] of Object.entries(rawDetails)) {
        if (!k.startsWith("_")) details[k] = v;
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
          const { meansOfPayment, paymentData } = await buildPaymentPayload(serverPGPKey);

          // 1. Derive base return address index
          const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
          const hdrs = { Authorization: `Bearer ${auth.token}` };
          const [ownOffersRes, historySellRes] = await Promise.all([
            fetchWithSessionCheck(`${v069Base}/user/${auth.peachId}/offers`, { headers: hdrs }),
            get('/offers/summary'),
          ]);
          const ownOffersData = await ownOffersRes.json().catch(() => ({}));
          const historySell = await historySellRes.json().catch(()=>[]);
          const activeSell = ownOffersData?.sellOffers ?? [];
          const activeCount = activeSell.length;
          const historyCount = Array.isArray(historySell) ? historySell.filter(o => o.type === "ask").length : 0;
          const baseAddrIdx = activeCount + historyCount;

          const count = multiEnabled ? multiCount : 1;

          if(count > 1) {
            // ── MULTI SELL — sequential loop ──
            setMultiPublishProgress({ done: 0, total: count });
            const results = [];
            for(let i = 0; i < count; i++){
              try {
                const returnAddress = deriveReturnAddress(auth.xpub, baseAddrIdx + i);
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
            const returnAddress = deriveReturnAddress(auth.xpub, baseAddrIdx);
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
        const { meansOfPayment, paymentData } = await buildPaymentPayload(buyServerPGPKey);

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
    const { meansOfPayment, paymentData } = await buildPaymentPayload(buyServerPGPKey);
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
    const { meansOfPayment, paymentData } = await buildPaymentPayload(serverPGPKey);
    // Re-derive base index — count existing offers now (which includes the ones that succeeded earlier)
    const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
    const hdrs = { Authorization: `Bearer ${auth.token}` };
    const [ownOffersRes, historySellRes] = await Promise.all([
      fetchWithSessionCheck(`${v069Base}/user/${auth.peachId}/offers`, { headers: hdrs }),
      get('/offers/summary'),
    ]);
    const ownOffersData = await ownOffersRes.json().catch(()=>({}));
    const historySell = await historySellRes.json().catch(()=>[]);
    const activeCount = (ownOffersData?.sellOffers??[]).length;
    const historyCount = Array.isArray(historySell)?historySell.filter(o=>o.type==="ask").length:0;
    let nextIdx = activeCount + historyCount;

    const updated = [...multiResults];
    for(const idx of failedIdxs){
      try {
        const returnAddress = deriveReturnAddress(auth.xpub, nextIdx++);
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

  function handleBack(){ setStep(s=>s-1); }

  const sliderBg=`linear-gradient(to right,var(--primary) 0%,var(--primary) ${((prem+21)/42)*100}%,var(--black-10) ${((prem+21)/42)*100}%,var(--black-10) 100%)`;

  // ── BUY SUCCESS ────────────────────────────────────────────────────────────
  if(done&&!isSell) return (
    <>
      <style>{CSS}</style>
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
        showPrice={false}
      />
      <SideNav
        active="create"
        mobileOpen={sidebarMobileOpen}
        onClose={() => setSidebarMobileOpen(false)}
        onNavigate={navigate}
        mobilePriceSlot={
          <div className="mobile-price-pill">
            <IcoBtc size={16}/>
            <div className="mobile-price-text">
              <span className="mobile-price-main">{pricesLoaded ? btcPrice.toLocaleString("fr-FR") : "?"} {selectedCurrency}</span>
              <span className="mobile-price-sats">{pricesLoaded ? Math.round(SAT/btcPrice).toLocaleString() : "?"} sats / {selectedCurrency.toLowerCase()}</span>
            </div>
            <div className="topbar-cur-select mobile-cur-select">
              <span className="cur-select-label">{selectedCurrency}</span>
              <svg className="cur-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:"none",flexShrink:0}}><polyline points="1,1 5,5 9,1"/></svg>
              <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="cur-select-inner">
                {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        }
      />
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
            ? <>{multiResults.length} buy offers for <strong style={{color:"var(--black)"}}>{fmt(form.amtFixed)} sats</strong> each are live in the market. You'll be notified when sellers match.</>
            : <>Your buy offer for <strong style={{color:"var(--black)"}}>{fmt(form.amtFixed)} sats</strong> is live in the market. You'll be notified when a seller matches.</>
          }
        </p>
        <div style={{display:"flex",gap:12}}>
          <button onClick={() => navigate("/market")} style={{padding:"10px 28px",borderRadius:999,
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
        <AddPMFlow methods={methodsCatalogue} onSave={handleSavePM}
          onClose={()=>setShowAddModal(false)}
          error={catalogueError} onRetry={fetchCatalogue}/>
      )}
      {editingPM&&(
        <AddPMFlow methods={methodsCatalogue} editData={editingPM}
          onSave={handleSavePM} onClose={()=>setEditingPM(null)}
          error={catalogueError} onRetry={fetchCatalogue}/>
      )}
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
        active="create"
        mobileOpen={sidebarMobileOpen}
        onClose={() => setSidebarMobileOpen(false)}
        onNavigate={navigate}
        mobilePriceSlot={
          <div className="mobile-price-pill">
            <IcoBtc size={16}/>
            <div className="mobile-price-text">
              <span className="mobile-price-main">{pricesLoaded ? btcPrice.toLocaleString("fr-FR") : "?"} {selectedCurrency}</span>
              <span className="mobile-price-sats">{pricesLoaded ? Math.round(SAT/btcPrice).toLocaleString() : "?"} sats / {selectedCurrency.toLowerCase()}</span>
            </div>
            <div className="topbar-cur-select mobile-cur-select">
              <span className="cur-select-label">{selectedCurrency}</span>
              <svg className="cur-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:"none",flexShrink:0}}><polyline points="1,1 5,5 9,1"/></svg>
              <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="cur-select-inner">
                {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        }
      />

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
                  </span>
                  {amtOk&&<span className="section-done">✓ Done</span>}
                </div>

                <AmountSlider form={form} setF={setF} btcPrice={btcPrice}/>
              </div>

              {/* §2 Payment */}
              <div className="card-section">
                <div className="section-header">
                  <div className={`section-num${payOk?" filled":""}`}>2</div>
                  <span className="section-title">Payment methods</span>
                  {payOk&&<span className="section-done" style={{marginLeft:0}}>✓ Done</span>}
                  <button className="btn-add-pm" onClick={()=>setShowAddModal(true)}>
                    + Add
                  </button>
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
                            {/* inline currency tags */}
                            <span style={{display:"flex",gap:3,flexShrink:0}}>
                              {(pm.currencies||[]).map(c=>(
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

                {/* Derived currencies display */}
                {offerCurrencies.length > 0 && (
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10,
                    flexWrap:"wrap"}}>
                    <span style={{fontSize:".65rem",fontWeight:700,textTransform:"uppercase",
                      letterSpacing:".07em",color:"var(--black-65)"}}>Currencies:</span>
                    {offerCurrencies.map(c=>(
                      <span key={c} style={{padding:"2px 8px",borderRadius:4,fontSize:".72rem",
                        fontWeight:800,background:"var(--primary-mild)",color:"var(--primary-dark)",
                        letterSpacing:".04em"}}>{c}</span>
                    ))}
                  </div>
                )}
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
                    <div style={{fontSize:".88rem",fontWeight:800}}>€{pricesLoaded ? btcPrice.toLocaleString() : "?"}</div>
                  </div>
                  <div style={{width:1,background:"var(--black-10)"}}/>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:".65rem",fontWeight:700,color:"var(--black-65)",
                      textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Effective</div>
                    <div style={{fontSize:".88rem",fontWeight:800,
                      color:prem===0?"var(--black)":
                        isSell?(prem>0?"var(--success)":"var(--error)"):(prem<0?"var(--success)":"var(--error)")}}>
                      €{Math.round(effP).toLocaleString()}
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
                            ? `€${fmtEur(satsToFiat(form.amtFixed,effP))}`
                            : `€${fmtEur(satsToFiat(form.amtFixed,effP))}`}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* ── INSTANT MATCH TOGGLE ── */}
                <div className="check-row" style={{marginTop:12}}
                  onClick={()=>setForm(f=>({...f, instantMatch:!f.instantMatch,
                    ...(f.instantMatch ? {noNewUsers:false,minReputation:false,instantMatchBadges:[]} : {})}))}>
                  <div className="check-box" style={{
                    border:`2px solid ${form.instantMatch?"var(--primary)":"var(--black-10)"}`,
                    background:form.instantMatch?"var(--primary-mild)":"var(--surface)"}}>
                    {form.instantMatch&&"✓"}
                  </div>
                  <div>
                    <div style={{fontSize:".8rem",fontWeight:700}}>⚡ Enable Instant Match</div>
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
                          Only match with traders who have completed at least 1 trade
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
                    <div style={{fontSize:".8rem",fontWeight:700}}>Filter by experience level</div>
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
                  onToggle={() => { setMultiEnabled(e => !e); setMultiResults(null); }}
                  onCountChange={setMultiCount}
                />
              </div>
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
                        ≈ €{fmtEur(satsToFiat(form.amtFixed,effP))}
                      </span>
                    </span>],
                  ["Premium",
                    <span style={{fontWeight:800,color:prem===0?"var(--black-65)":
                      isSell?(prem>0?"var(--success)":"var(--error)"):(prem<0?"var(--success)":"var(--error)")}}>
                      {prem>0?"+":""}{prem.toFixed(1)}%
                    </span>],
                  ["Current effective price", `€${Math.round(effP).toLocaleString()}/BTC`],
                  ["Methods", offerMethods.join(", ")||"—"],
                  ["Currencies", offerCurrencies.join(", ")||"—"],
                  ...(form.instantMatch?[["Instant Match", "⚡ Enabled"]]:[]),
                  ...(form.noNewUsers?[["No new users", "On"]]:[]),
                  ...(form.minReputation?[["Min reputation", "4.5"]]:[]),
                  ...(form.instantMatchBadges.length>0?[["Badge filter", form.instantMatchBadges.map(b=>b==="fastTrader"?"Fast trader":"Super trader").join(", ")]]:[]),
                  ...(form.experienceLevel?[["Experience filter", form.experienceLevel==="newUsersOnly"?"New users only":"Experienced users only"]]:[]),
                  ...(multiEnabled?[["Copies", `×${multiCount}`]]:[]),
                ].map(([k,v])=>(
                  <div key={k} className="review-row">
                    <span className="rk">{k}</span>
                    <span className="rv">{v}</span>
                  </div>
                ))}
              </div>

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
                effP={effP}
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
                    Send exactly the amount below to activate your offer. It goes live on confirmation.
                  </div>
                  <label className="field-label" style={{marginBottom:6}}>Escrow address</label>
                  {escrowAddress ? (
                  <>
                  <div className="escrow-addr"
                    onClick={()=>{
                      navigator.clipboard.writeText(escrowAddress).catch(()=>{});
                      setCopiedAddr(true);setTimeout(()=>setCopiedAddr(false),2000);
                    }}>
                    {escrowAddress}
                  </div>
                  <div style={{fontSize:".7rem",fontWeight:700,color:"var(--success)",
                    minHeight:18,marginTop:4,marginBottom:20}}>
                    {copiedAddr?"✓ Copied to clipboard":"Click to copy"}
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
                      <div style={{display:"flex",justifyContent:"center"}}>
                        <button
                          disabled={fundMobileLoading || fundMobileRequested}
                          onClick={async () => {
                            setFundMobileError(null);
                            setFundMobileLoading(true);
                            try {
                              const res = await post(`/offer/${sellOfferId}/fundEscrowPendingAction`);
                              if (!res.ok) {
                                const err = await res.json().catch(() => null);
                                throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
                              }
                              setFundMobileRequested(true);
                            } catch (e) {
                              setFundMobileError("Failed to request funding: " + e.message);
                            } finally {
                              setFundMobileLoading(false);
                            }
                          }}
                          style={{
                            padding:"10px 24px",borderRadius:999,border:"none",
                            background: fundMobileRequested ? "var(--black-5)" : "var(--grad)",
                            color: fundMobileRequested ? "var(--black-65)" : "white",
                            fontFamily:"var(--font)",fontSize:".82rem",fontWeight:800,
                            cursor:(fundMobileLoading||fundMobileRequested)?"default":"pointer",
                            opacity: fundMobileLoading ? 0.6 : 1,
                          }}
                        >
                          {fundMobileLoading ? "Sending request…" : fundMobileRequested ? "Request sent — check your phone" : "Fund via mobile app"}
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
                  <label className="field-label" style={{marginBottom:6}}>Exact amount to send</label>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
                    <SatsAmount sats={form.amtFixed} fontSize="1.6rem"/>
                    <span style={{fontSize:".88rem",color:"var(--black-65)",fontWeight:600}}>
                      ≈ €{fmtEur(satsToFiat(form.amtFixed,effP))}
                    </span>
                  </div>
                  {/* ── Funding status indicator ──
                    WRONG_FUNDING_AMOUNT is handled by the top-level branch which
                    redirects to /trades — no case needed here. */}
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
                          Send the exact amount above to this address
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ):(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                  gap:20,paddingTop:32,textAlign:"center",animation:"stepFwd .4s ease both"}}>
                  <div className="success-icon">✓</div>
                  <div style={{fontSize:"1.4rem",fontWeight:800,color:"var(--success)"}}>
                    Offer is live!
                  </div>
                  <p style={{fontSize:".88rem",color:"var(--black-65)",lineHeight:1.65,maxWidth:340}}>
                    Your sell offer for <strong style={{color:"var(--black)"}}>
                      {fmt(form.amtFixed)} sats
                    </strong> is now visible in the market. We'll notify you when a buyer matches.
                  </p>
                  <div style={{display:"flex",gap:12}}>
                    <button onClick={() => navigate("/market")} style={{padding:"10px 28px",borderRadius:999,
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
          <LivePreview type={type} form={form} btcPrice={btcPrice}
            offerMethods={offerMethods} offerCurrencies={offerCurrencies}/>

          {(offerMethods.length>0||offerCurrencies.length>0||(parseFloat(form.premium)||0)!==0)&&(
            <div>
              <div className="preview-label">Details</div>
              <div className="info-box">
                {offerMethods.length>0&&(
                  <div className="ir">
                    <span className="ik">Methods</span>
                    <span className="iv" style={{fontSize:".7rem"}}>{offerMethods.join(", ")}</span>
                  </div>
                )}
                {offerCurrencies.length>0&&(
                  <div className="ir">
                    <span className="ik">Currencies</span>
                    <span className="iv" style={{fontSize:".7rem"}}>{offerCurrencies.join(", ")}</span>
                  </div>
                )}
                <div className="ir">
                  <span className="ik">Effective price</span>
                  <span className="iv">€{Math.round(effP).toLocaleString()}</span>
                </div>
                {form.instantMatch&&(
                  <div className="ir">
                    <span className="ik">Instant Match</span>
                    <span className="iv">⚡ On</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contextual tip */}
          <div style={{marginTop:"auto",padding:"12px 14px",borderRadius:12,
            background:"var(--surface)",border:"1px solid var(--black-10)",
            fontSize:".72rem",color:"var(--black-65)",fontWeight:500,lineHeight:1.6}}>
            {step===0&&!isSell&&"💡 Set all three sections, then tap Review."}
            {step===0&&isSell&&"💡 The fixed amount locks in escrow after publishing. Ensure your wallet is ready."}
            {step===1&&"✅ Amount and payment methods can't be changed after publishing."}
            {step===2&&"🔒 Send the exact amount. Over/underfunding delays activation."}
          </div>
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
