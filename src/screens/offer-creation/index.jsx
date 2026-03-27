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
import { extractPMsFromProfile, isApiError, hashPaymentFields, encryptForPublicKey, encryptPGPMessage, signPGPMessage } from "../../utils/pgp.js";
import { deriveEscrowPubKey, deriveReturnAddress } from "../../utils/escrow.js";
import { QRCodeSVG } from "qrcode.react";
import { SAT, BTC_PRICE_FALLBACK as BTC_PRICE_INIT, fmt, satsToFiatRaw as satsToFiat, fmtFiat as fmtEur } from "../../utils/format.js";
import { CSS } from "./styles.js";
import {
  METHOD_CURRENCIES, METHOD_FIELDS, methodLabel,
  MIN_SATS, maxSatsAtPrice,
  getSteps, LivePreview, AmountSlider, PMModal,
} from "./components.jsx";


// ─── MAIN ───────────────────────────────────────────────────────────────────
export default function OfferCreation({ initialType="buy" }) {
  const navigate = useNavigate();
  const [type,         setType]         = useState(initialType);
  const [step,         setStep]         = useState(0);
  const [allPrices,           setAllPrices]           = useState({ EUR: BTC_PRICE_INIT });
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? BTC_PRICE_INIT);
  const [done,         setDone]         = useState(false);
  const [copiedAddr,   setCopiedAddr]   = useState(false);
  const [escrowFunded,  setEscrowFunded]  = useState(false);
  const [fundingStatus, setFundingStatus] = useState(null); // null → "MEMPOOL" → "FUNDED" | "WRONG_FUNDING_AMOUNT"
  const [fundingAmounts, setFundingAmounts] = useState(null); // amounts array from API (for wrong-amount case)
  const [savedMethods, setSavedMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPM,    setEditingPM]    = useState(null); // PM object being edited
  const [pmError,      setPmError]      = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [escrowAddress, setEscrowAddress] = useState(null);
  const [sellOfferId,   setSellOfferId]   = useState(null);

  // ── FETCH LIVE SAVED PMs ──
  useEffect(() => {
    if (!auth) return;
    // On regtest, clear mock data while we fetch
    setSavedMethods([]);
    const selfUserBase = auth.baseUrl.replace(/\/v1$/, '/v069');
    fetch(`${selfUserBase}/selfUser`, {
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
          setSavedMethods(pms.map(pm => ({
            id: pm.id,
            type: shortId(pm.type ?? pm.id),
            currencies: pm.currencies ?? [],
            details: sweepFields(pm),
          })));
        } else if (pms && typeof pms === "object") {
          setSavedMethods(Object.entries(pms).map(([key, val]) => ({
            id: val?.id || key,
            type: shortId(key),
            currencies: val?.currencies ?? [],
            details: sweepFields(val || {}),
          })));
        }
      })
      .catch((err) => {
        console.warn("[OfferCreation] PM fetch failed:", err.message);
        setPmError(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    selectedMethodIds:[],premium:"0",instantMatch:false,noNewUsers:false,experienceLevel:""});
  const [form, setForm] = useState(initForm());

  const isSell = type==="sell";
  const STEPS  = getSteps(type);
  const prem   = parseFloat(form.premium)||0;
  const effP   = btcPrice*(1+prem/100);

  // Derive method types and currencies from selected saved PMs
  const selectedSaved    = savedMethods.filter(m=>form.selectedMethodIds.includes(m.id));
  const offerMethods     = [...new Set(selectedSaved.map(m=>m.type))];
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

  // ── POLL ESCROW FUNDING STATUS ──
  useEffect(() => {
    if (step !== 2 || !sellOfferId || !auth || escrowFunded) return;
    let cancelled = false;
    async function check() {
      try {
        const res = await get('/offer/' + sellOfferId + '/escrow');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const s = data?.funding?.status;
        if (s === "MEMPOOL") {
          setFundingStatus("MEMPOOL");
        } else if (s === "FUNDED") {
          setFundingStatus("FUNDED");
          setTimeout(() => { if (!cancelled) setEscrowFunded(true); }, 1500);
        } else if (s === "WRONG_FUNDING_AMOUNT") {
          setFundingStatus("WRONG_FUNDING_AMOUNT");
          setFundingAmounts(data.funding.amounts ?? []);
        }
      } catch (err) {
        console.warn("[OfferCreation] Escrow poll error:", err.message);
      }
    }
    check(); // immediate first check
    const iv = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [step, sellOfferId, auth, escrowFunded]); // eslint-disable-line react-hooks/exhaustive-deps

  function setF(k,v){ setForm(f=>({...f,[k]:v})); }
  function reset(){
    setStep(0);setDone(false);setEscrowFunded(false);setFundingStatus(null);setFundingAmounts(null);setPublishError(null);setEscrowAddress(null);setSellOfferId(null);setForm(initForm());
  }
  function switchType(t){ setType(t); reset(); }

  function handleSavePM(pm) {
    if(editingPM) {
      // Update existing PM in place
      setSavedMethods(prev=>prev.map(m=>m.id===pm.id?pm:m));
      setEditingPM(null);
    } else {
      // Add new PM and auto-select it
      setSavedMethods(prev=>[...prev,pm]);
      setF("selectedMethodIds",[...form.selectedMethodIds, pm.id]);
      setShowAddModal(false);
    }
  }


  function openEditPM(pm, e) {
    e.stopPropagation(); // don't toggle selection
    setEditingPM(pm);
  }

  function toggleMethod(id) {
    const sel = form.selectedMethodIds;
    setF("selectedMethodIds", sel.includes(id) ? sel.filter(x=>x!==id) : [...sel,id]);
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
      const methodType = (pm.type||"").toLowerCase();
      for(const cur of (pm.currencies||[])){
        if(!meansOfPayment[cur]) meansOfPayment[cur] = [];
        if(!meansOfPayment[cur].includes(methodType)) meansOfPayment[cur].push(methodType);
      }
    }
    const paymentData = {};
    for(const pm of selectedSaved){
      const methodType = (pm.type||"").toLowerCase();
      if(paymentData[methodType]) continue;
      const details = pm.details || {};
      const hashed = await hashPaymentFields(methodType, details, details.country);
      Object.assign(paymentData, hashed);

      const cleanData = cleanPMData(pm);

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
        if(!auth){ setStep(2); return; } // mock mode when logged out

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

          // 1. Derive return address from multisigXpub at m/84'/{coin}'/1/{index}
          // Index = total sell offers ever created (active + historical). Monotonically increasing.
          const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
          const hdrs = { Authorization: `Bearer ${auth.token}` };
          const [ownOffersRes, historySellRes] = await Promise.all([
            fetch(`${v069Base}/user/${auth.peachId}/offers`, { headers: hdrs }),
            get('/offers/summary'),
          ]);
          const ownOffersData = await ownOffersRes.json().catch(() => ({}));
          const historySell = await historySellRes.json().catch(()=>[]);
          // Own sell offers from /v069/user/{id}/offers
          const activeSell = ownOffersData?.sellOffers ?? [];
          const activeCount = activeSell.length;
          const historyCount = Array.isArray(historySell) ? historySell.filter(o => o.type === "ask").length : 0;
          const addrIdx = activeCount + historyCount;
          const returnAddress = deriveReturnAddress(auth.xpub, addrIdx);

          // 2. POST /v1/offer — create sell offer
          const sellPayload = {
            type: "ask",
            amount: form.amtFixed,
            premium: parseFloat(form.premium) || 0,
            meansOfPayment,
            paymentData,
            returnAddress,
            ...(form.instantMatch ? { instantTradeCriteria: { minReputation: form.noNewUsers ? 0.5 : -1, minTrades: form.noNewUsers ? 4 : 0, badges: [] } } : {}),
            ...(form.experienceLevel ? { experienceLevelCriteria: form.experienceLevel } : {}),
          };
          const offerRes = await post('/offer', sellPayload);
          const offerData = await offerRes.json().catch(()=>null);
          if(!offerRes.ok){
            throw new Error(offerData?.error || offerData?.message || `Server error ${offerRes.status}`);
          }

          const newOfferId = offerData.offerId || offerData.id;

          // 2. Derive escrow public key (non-hardened: /3/{offerId})
          const pubKeyHex = deriveEscrowPubKey(auth.multisigXpub, Number(newOfferId));

          // 3. POST /v1/offer/:id/escrow — register key, get escrow address
          const escrowRes = await post(`/offer/${newOfferId}/escrow`, {
            publicKey: pubKeyHex,
            derivationPathVersion: 2,
          });
          const escrowData = await escrowRes.json().catch(()=>null);
          if(!escrowRes.ok){
            throw new Error(escrowData?.error || escrowData?.message || `Escrow creation failed ${escrowRes.status}`);
          }

          setSellOfferId(newOfferId);
          setEscrowAddress(escrowData.escrow);
          setStep(2);
        }catch(err){
          console.error("[OfferCreation] Sell offer failed:", err);
          setPublishError(err.message || "Failed to publish sell offer");
        }finally{
          setPublishing(false);
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
        const res = await fetch(`${v069Base}/buyOffer`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: form.amtFixed,
            meansOfPayment,
            paymentData,
            premium: parseFloat(form.premium) || 0,
            ...(form.noNewUsers ? { minReputation: 0.5 } : {}),
            ...(form.instantMatch ? { instantTradeCriteria: { minReputation: form.noNewUsers ? 0.5 : -1, minTrades: form.noNewUsers ? 4 : 0, badges: [] } } : {}),
          }),
        });

        const data = await res.json().catch(()=>null);

        if(!res.ok){
          const msg = data?.error || data?.message || `Server error ${res.status}`;
          throw new Error(msg);
        }

        setDone(true);
      }catch(err){
        console.error("[OfferCreation] Buy offer failed:", err);
        setPublishError(err.message || "Failed to publish offer");
      }finally{
        setPublishing(false);
      }
      return;
    }
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
        selectedCurrency={selectedCurrency}
        availableCurrencies={availableCurrencies}
        onCurrencyChange={c => setSelectedCurrency(c)}
        showPrice={false}
      />
      <SideNav
        active="create"
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
              <span className="mobile-price-sats">{Math.round(SAT/btcPrice).toLocaleString()} sats / {selectedCurrency.toLowerCase()}</span>
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
        marginLeft: sidebarCollapsed ? 44 : 68,
        textAlign:"center",animation:"stepFwd .4s ease both"}}>
        <div className="success-icon">✓</div>
        <div style={{fontSize:"1.45rem",fontWeight:800,color:"var(--success)"}}>Offer published!</div>
        <p style={{fontSize:".88rem",color:"var(--black-65)",lineHeight:1.65,maxWidth:360}}>
          Your buy offer for <strong style={{color:"var(--black)"}}>
            {fmt(form.amtFixed)} sats
          </strong> is live in the market. You'll be notified when a seller matches.
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
        <PMModal onSave={handleSavePM} onClose={()=>setShowAddModal(false)}/>
      )}
      {editingPM&&(
        <PMModal initialData={editingPM} onSave={handleSavePM}
          onClose={()=>setEditingPM(null)}/>
      )}
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
        active="create"
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
              <span className="mobile-price-sats">{Math.round(SAT/btcPrice).toLocaleString()} sats / {selectedCurrency.toLowerCase()}</span>
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

      <div className="layout" style={{marginLeft: sidebarCollapsed ? 44 : 68}}>
        {/* ── WIZARD ── */}
        <div className="wizard">

          <button className="back-btn" style={{alignSelf:"flex-start",marginBottom:12}} onClick={() => navigate("/market")}>← Market</button>

          {/* Header row: title + type toggle */}
          <div className="wizard-header">
            <div>
              <div style={{fontSize:".72rem",fontWeight:700,textTransform:"uppercase",
                letterSpacing:".08em",color:"var(--black-65)",marginBottom:4}}>
                New offer
              </div>
              <div className="wizard-title">
                {step===0?"Create your offer":step===1?"Review & publish":"Fund escrow"}
              </div>
            </div>
            <div className="type-toggle" style={step===1?{opacity:0.45,pointerEvents:"none"}:{}}>
              <button className={`type-btn${!isSell?" buy-on":""}`}
                onClick={()=>switchType("buy")}>Buy BTC</button>
              <button className={`type-btn${isSell?" sell-on":""}`}
                onClick={()=>switchType("sell")}>Sell BTC</button>
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
                    {isSell?"Amount to sell":"Amount"}
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
                      return (
                        <div key={pm.id} style={{display:"flex",alignItems:"center",gap:6}}>
                          <button className={`pm-chip${sel?" sel":""}`}
                            onClick={()=>toggleMethod(pm.id)}>
                            <span className="pm-chip-type">{pm.type}</span>
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
                      {prem>0?"+":""}{prem.toFixed(2)}%
                    </span>
                  )}
                </div>

                <div className="slider-val" style={{color:prem===0?"var(--black-65)":
                  isSell?(prem>0?"var(--success)":"var(--error)"):(prem<0?"var(--success)":"var(--error)")}}>
                  {prem>0?"+":""}{prem.toFixed(2)}%
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
                    <div style={{fontSize:".88rem",fontWeight:800}}>€{btcPrice.toLocaleString()}</div>
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

                {(
                  <div className="check-row" style={{marginTop:12}}
                    onClick={()=>{ setForm(f => ({ ...f, instantMatch: !f.instantMatch, ...(f.instantMatch ? {noNewUsers: false} : {}) })); }}>
                    <div className="check-box" style={{
                      border:`2px solid ${form.instantMatch?"var(--primary)":"var(--black-10)"}`,
                      background:form.instantMatch?"var(--primary-mild)":"var(--surface)"}}>
                      {form.instantMatch&&"✓"}
                    </div>
                    <div>
                      <div style={{fontSize:".8rem",fontWeight:700}}>⚡ Enable Instant Match</div>
                      <div style={{fontSize:".7rem",color:"var(--black-65)",fontWeight:500}}>
                        Auto-accept any qualifying sell offer
                      </div>
                    </div>
                  </div>
                )}

                {/* No new users — visible for both buy and sell; requires Instant Match on */}
                <div className="check-row" style={{
                    marginTop:10,
                    opacity: !form.instantMatch ? 0.4 : 1,
                    pointerEvents: !form.instantMatch ? "none" : "auto",
                    cursor: !form.instantMatch ? "not-allowed" : "pointer",
                  }}
                  onClick={()=>setForm(f=>({...f, noNewUsers:!f.noNewUsers, ...((!f.noNewUsers && f.experienceLevel==="newUsersOnly") ? {experienceLevel:""} : {})}))}>
                  <div className="check-box" style={{
                    border:`2px solid ${form.noNewUsers?"var(--primary)":"var(--black-10)"}`,
                    background:form.noNewUsers?"var(--primary-mild)":"var(--surface)"}}>
                    {form.noNewUsers&&"✓"}
                  </div>
                  <div>
                    <div style={{fontSize:".8rem",fontWeight:700}}>No new users</div>
                    <div style={{fontSize:".7rem",color:"var(--black-65)",fontWeight:500}}>
                      Only match with traders who have completed at least 1 trade
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── EXPERIENCE LEVEL FILTER (sell only) ── */}
          {step===0&&isSell&&(
            <div className="card" style={{marginBottom:16}}>
              <div className="check-row"
                onClick={()=>setForm(f=>({...f, experienceLevel: f.experienceLevel ? "" : "experiencedUsersOnly"}))}>
                <div className="check-box" style={{
                  border:`2px solid ${form.experienceLevel?"var(--primary)":"var(--black-10)"}`,
                  background:form.experienceLevel?"var(--primary-mild)":"var(--surface)"}}>
                  {form.experienceLevel&&"✓"}
                </div>
                <div>
                  <div style={{fontSize:".8rem",fontWeight:700}}>Filter by experience level</div>
                  <div style={{fontSize:".7rem",color:"var(--black-65)",fontWeight:500}}>
                    Only accept trades from buyers matching your criteria
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
                        {form.experienceLevel===val&&<div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>}
                      </div>
                      <span style={{fontSize:".78rem",fontWeight:600}}>{label}</span>
                    </div>
                  ))}
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
                        ≈ €{fmtEur(satsToFiat(form.amtFixed,effP))}
                      </span>
                    </span>],
                  ["Premium",
                    <span style={{fontWeight:800,color:prem===0?"var(--black-65)":
                      isSell?(prem>0?"var(--success)":"var(--error)"):(prem<0?"var(--success)":"var(--error)")}}>
                      {prem>0?"+":""}{prem.toFixed(2)}%
                    </span>],
                  ["Current effective price", `€${Math.round(effP).toLocaleString()}/BTC`],
                  ["Methods", offerMethods.join(", ")||"—"],
                  ["Currencies", offerCurrencies.join(", ")||"—"],
                  ...(form.instantMatch?[["Instant Match", "⚡ Enabled"]]:[]),
                  ...(form.noNewUsers?[["No new users", "On"]]:[] ),
                  ...(form.experienceLevel?[["Experience filter", form.experienceLevel==="newUsersOnly"?"New users only":"Experienced users only"]]:[] ),
                ].map(([k,v])=>(
                  <div key={k} className="review-row">
                    <span className="rk">{k}</span>
                    <span className="rv">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: ESCROW (sell only) ── */}
          {step===2&&(
            <div className="step-anim">
              {!escrowFunded?(
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
                  {/* QR code */}
                  <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
                    <div style={{padding:12,background:"white",borderRadius:12,
                      border:"1px solid var(--black-10)",display:"inline-block"}}>
                      <QRCodeSVG
                        value={`bitcoin:${escrowAddress}?amount=${(form.amtFixed / 1e8).toFixed(8)}`}
                        size={140} level="L" bgColor="white" fgColor="#2B1911"
                      />
                    </div>
                  </div>
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
                  {/* ── Funding status indicator ── */}
                  {fundingStatus === "WRONG_FUNDING_AMOUNT" ? (
                    <div style={{background:"var(--error-bg)",borderRadius:12,
                      border:"1px solid var(--error)",padding:"14px 16px",marginBottom:18}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <span style={{fontSize:"1.1rem"}}>⚠</span>
                        <span style={{fontSize:".8rem",fontWeight:700,color:"var(--error)"}}>
                          Wrong amount funded
                        </span>
                      </div>
                      <div style={{fontSize:".75rem",color:"var(--black-65)",fontWeight:500,marginBottom:12,lineHeight:1.5}}>
                        Expected <strong>{fmt(form.amtFixed)}</strong> sats — received{" "}
                        <strong>{fmt(fundingAmounts ? fundingAmounts.reduce((a,b)=>a+b,0) : 0)}</strong> sats
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={async()=>{
                          try {
                            const res = await post('/offer/'+sellOfferId+'/escrow/confirm');
                            if(res.ok){ setFundingStatus("FUNDED"); setTimeout(()=>setEscrowFunded(true),1500); }
                            else { const d=await res.json().catch(()=>null); setPublishError(d?.error||"Failed to confirm escrow"); }
                          } catch(e){ setPublishError(e.message); }
                        }} style={{flex:1,padding:"8px 14px",borderRadius:999,background:"var(--grad)",
                          color:"white",border:"none",cursor:"pointer",fontFamily:"var(--font)",
                          fontSize:".78rem",fontWeight:700}}>
                          Accept anyway
                        </button>
                      </div>
                    </div>
                  ) : fundingStatus === "FUNDED" ? (
                    <div style={{background:"#E8F5E9",borderRadius:12,
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
                    <div style={{background:"#E8F5E9",borderRadius:12,
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
                  {!auth&&(
                    <button onClick={()=>setEscrowFunded(true)} style={{
                      width:"100%",padding:"10px",borderRadius:999,
                      border:"1.5px solid var(--black-10)",background:"transparent",
                      color:"var(--black-65)",fontFamily:"var(--font)",fontSize:".8rem",
                      fontWeight:700,cursor:"pointer"}}>
                      Simulate funding (demo)
                    </button>
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
          {!(step===2&&escrowFunded)&&(
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
                  {publishing ? "Publishing…" : isSell?"Publish & get escrow →":"Publish offer →"}
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
