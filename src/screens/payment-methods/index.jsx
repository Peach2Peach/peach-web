// ─── PAYMENT METHODS — MAIN COMPONENT ────────────────────────────────────────
// Split from peach-payment-methods.jsx.
// Sub-components in components.jsx, CSS in styles.js.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SideNav, Topbar } from "../../components/Navbars.jsx";
import { IcoBtc } from "../../components/BitcoinAmount.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { fetchWithSessionCheck } from "../../utils/sessionGuard.js";
import { useApi } from "../../hooks/useApi.js";
import { extractPMsFromProfile, isApiError } from "../../utils/pgp.js";
import { syncPMsToServer } from "../../utils/pmSync.js";
import { SAT, BTC_PRICE_FALLBACK as BTC_PRICE } from "../../utils/format.js";
import { CSS } from "./styles.js";
import { IconPlus, IconEdit, IconTrash, DeleteModal } from "./components.jsx";
import {
  AddPMFlow, CATEGORY_META, FALLBACK_METHODS, methodLabel,
} from "../../components/AddPMFlow.jsx";

export default function PeachPaymentMethods() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── AUTH STATE ──
  const { isLoggedIn, handleLogin, handleLogout, showAvatarMenu, setShowAvatarMenu } = useAuth();
  const { get, patch, auth } = useApi();
  useEffect(() => {
    if (!showAvatarMenu) return;
    const close = (e) => { if (!e.target.closest(".avatar-menu-wrap")) setShowAvatarMenu(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAvatarMenu]);

  // Live prices
  const [allPrices, setAllPrices]                   = useState({ EUR: BTC_PRICE });
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency, setSelectedCurrency]     = useState("EUR");
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? BTC_PRICE);
  const satsPerCur = Math.round(SAT / btcPrice);

  // Payment methods catalogue from API
  const [methodsCatalogue, setMethodsCatalogue] = useState(FALLBACK_METHODS);
  const [catalogueLoading, setCatalogueLoading] = useState(true);

  // User's saved PMs
  const [savedMethods, setSavedMethods] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [pmError, setPmError]           = useState(false);

  // Modal states
  const [showAddFlow, setShowAddFlow]   = useState(false);
  const [editPM, setEditPM]             = useState(null);
  const [deletePM, setDeletePM]         = useState(null);

  // Fetch live prices
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

  // Fetch payment methods catalogue
  useEffect(() => {
    async function fetchMethods() {
      try {
        const res = await get('/info/paymentMethods');
        const data = await res.json();
        if (data && typeof data === "object" && !Array.isArray(data)) {
          // Attempt to use API data — TODO: normalise shape when confirmed
        }
      } catch {
      } finally {
        setCatalogueLoading(false);
      }
    }
    fetchMethods();
  }, []);

  // Fetch user's saved payment methods (authenticated)
  useEffect(() => {
    if (!auth?.token) return;

    setSavedLoading(true);

    (async () => {
      try {
        const selfUserBase = auth.baseUrl.replace(/\/v1$/, '/v069');
        const res = await fetchWithSessionCheck(`${selfUserBase}/selfUser`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        console.log("[PaymentMethods] /v069/selfUser response keys:", Object.keys(data));

        const profile = data.user ?? data;

        if (isApiError(profile)) throw new Error(`API error: ${profile.error || profile.message}`);

        const pms = auth?.pgpPrivKey
          ? await extractPMsFromProfile(profile, auth.pgpPrivKey)
          : null;

        console.log("[PaymentMethods] Extracted PMs:", pms);
        if (Array.isArray(pms) && pms[0]) {
          console.log("[PaymentMethods] First PM keys:", Object.keys(pms[0]));
          console.log("[PaymentMethods] First PM raw:", JSON.stringify(pms[0], null, 2));
        }

        if (!pms) throw new Error("No PM data found in profile");

        const STRUCTURAL = new Set([
          "id", "methodId", "type", "name", "label", "currencies", "hashes",
          "details", "data", "country", "anonymous",
        ]);

        function shortMethodId(raw) {
          return raw.replace(/-\d+$/, "");
        }

        function sweepDetails(obj) {
          const explicit = obj?.details || obj?.data || null;
          if (explicit) return explicit;
          const swept = {};
          if (obj && typeof obj === "object") {
            for (const [k, v] of Object.entries(obj)) {
              if (!STRUCTURAL.has(k) && typeof v !== "object") swept[k] = v;
            }
          }
          return swept;
        }

        if (Array.isArray(pms)) {
          const normalised = pms.map((pm, i) => {
            const rawId = pm.methodId || pm.type || pm.id || "unknown";
            return {
              id:         pm.id        || `api-pm-${i}`,
              methodId:   shortMethodId(rawId),
              name:       pm.name      || pm.label || pm.type || "Payment Method",
              currencies: pm.currencies || [],
              details:    sweepDetails(pm),
            };
          });
          setSavedMethods(normalised);
        } else if (pms && typeof pms === "object") {
          const normalised = Object.entries(pms).map(([key, val]) => {
            return {
              id:         val?.id || key,
              methodId:   shortMethodId(key),
              name:       val?.name || val?.label || key,
              currencies: val?.currencies || [],
              details:    sweepDetails(val),
            };
          });
          setSavedMethods(normalised);
        }
      } catch (err) {
        console.warn("[PaymentMethods] Failed to fetch saved PMs:", err.message);
        setPmError(true);
      } finally {
        setSavedLoading(false);
      }
    })();
  }, []);

  // Save handler (add or edit)
  function handleSavePM(pm) {
    let nextMethods;
    setSavedMethods(prev => {
      const idx = prev.findIndex(p => p.id === pm.id);
      if (idx >= 0) {
        nextMethods = [...prev];
        nextMethods[idx] = pm;
      } else {
        nextMethods = [...prev, pm];
      }
      return nextMethods;
    });
    setShowAddFlow(false);
    setEditPM(null);
    if (auth && nextMethods) syncPMsToServer(nextMethods, auth);
  }

  // Delete handler
  function handleDeletePM() {
    if (deletePM) {
      let nextMethods;
      setSavedMethods(prev => {
        nextMethods = prev.filter(p => p.id !== deletePM.id);
        return nextMethods;
      });
      setDeletePM(null);
      if (auth && nextMethods) syncPMsToServer(nextMethods, auth);
    }
  }

  // Group saved methods by category
  const savedByCategory = {};
  savedMethods.forEach(pm => {
    const cat = methodsCatalogue[pm.methodId]?.category || "other";
    if (!savedByCategory[cat]) savedByCategory[cat] = [];
    savedByCategory[cat].push(pm);
  });

  return (
    <>
      <style>{CSS}</style>

      <Topbar
        onBurgerClick={() => setMobileOpen(o => !o)}
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
        active="payment-methods"
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
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
              <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="cur-select-inner">
                {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        }
      />

      {/* ── PAGE ── */}
      <main className="page-wrap">
        {/* Header */}
        <div className="page-header">
          <div>
            <div className="page-title">Payment Methods</div>
            <div className="page-subtitle">Manage the payment methods you use for trading</div>
          </div>
          <div className="header-right">
            <button className="btn-cta" onClick={() => setShowAddFlow(true)}>
              <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                <IconPlus/> Add method
              </span>
            </button>
          </div>
        </div>

        {/* Saved methods list */}
        {savedLoading ? (
          <div className="pm-empty-state">
            <div style={{ fontSize:"1.1rem", color:"var(--black-65)", fontWeight:600 }}>Loading your payment methods…</div>
          </div>
        ) : pmError ? (
          <div className="pm-empty-state">
            <div className="pm-card pm-card-error">Failed to load payment data</div>
          </div>
        ) : savedMethods.length === 0 ? (
          <div className="pm-empty-state">
            <div className="pm-empty-icon">💳</div>
            <div className="pm-empty-title">No payment methods yet</div>
            <div className="pm-empty-desc">
              Add your first payment method to start trading on Peach.
              Your details are encrypted and only shared with your trade counterparty.
            </div>
            <button className="btn-cta" onClick={() => setShowAddFlow(true)}>
              <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                <IconPlus/> Add your first method
              </span>
            </button>
          </div>
        ) : (
          <div className="pm-list">
            {Object.entries(savedByCategory).map(([catId, pms]) => {
              const catMeta = CATEGORY_META[catId] || { label: "Other" };
              return (
                <div key={catId} className="pm-group">
                  <div className="pm-group-header">
                    <span className="pm-group-label">{catMeta.label}</span>
                    <span className="pm-group-count">{pms.length}</span>
                  </div>
                  {pms.map(pm => (
                    <div key={pm.id} className="pm-card">
                      <div className="pm-card-left">
                        <div className="pm-card-name">{pm.name}</div>
                        <div className="pm-card-detail">{methodLabel(pm)}</div>
                        <div className="pm-card-currencies">
                          {pm.currencies.map(c => (
                            <span key={c} className="pm-card-curr-tag">{c}</span>
                          ))}
                        </div>
                      </div>
                      <div className="pm-card-actions">
                        <button className="pm-action-btn" title="Edit"
                          onClick={() => setEditPM(pm)}>
                          <IconEdit/>
                        </button>
                        <button className="pm-action-btn pm-action-delete" title="Delete"
                          onClick={() => setDeletePM(pm)}>
                          <IconTrash/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Info box */}
        <div className="pm-info-box">
          <span style={{ fontSize:"1rem", flexShrink:0 }}>🔒</span>
          <div>
            <div style={{ fontWeight:700, fontSize:".82rem", color:"var(--black)", marginBottom:2 }}>
              Your details are private
            </div>
            <div style={{ fontSize:".76rem", color:"var(--black-65)", lineHeight:1.55 }}>
              Payment details are only shared with your matched trade counterparty —  it's encrypted end-to-end and not visible by Peach, unless a dispute is opened during a trade.
            </div>
          </div>
        </div>
      </main>

      {/* ── MODALS ── */}
      {(showAddFlow || editPM) && (
        <AddPMFlow
          methods={methodsCatalogue}
          onSave={handleSavePM}
          onClose={() => { setShowAddFlow(false); setEditPM(null); }}
          editData={editPM}
        />
      )}
      {deletePM && (
        <DeleteModal pm={deletePM} onConfirm={handleDeletePM} onCancel={() => setDeletePM(null)}/>
      )}

      {/* ── AUTH POPUP (when logged out) ── */}
      {!isLoggedIn && (
        <div className="auth-screen-overlay">
          <div className="auth-popup">
            <div className="auth-popup-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><rect x="5" y="12" width="18" height="13" rx="3"/><path d="M9 12V9a5 5 0 0 1 10 0v3"/><circle cx="14" cy="19" r="1.5" fill="var(--primary)"/></svg>
            </div>
            <div className="auth-popup-title">Authentication required</div>
            <div className="auth-popup-sub">Please authenticate to manage your payment methods</div>
            <button className="auth-popup-btn" onClick={handleLogin}>Log in</button>
          </div>
        </div>
      )}
    </>
  );
}
