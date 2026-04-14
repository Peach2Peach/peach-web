// ─── SHARED ADD PAYMENT METHOD FLOW ──────────────────────────────────────────
// Full 4-step Add-PM modal (region → category → method → details) used by
// both the Payment Methods screen and the Offer Creation screen.
// Produces PMs in the canonical shape:
//   { id, methodId, name, currencies, details:{..., _payRefType, _payRefCustom} }
// CSS is injected via <style> inside the component so the modal is fully
// self-contained — screens just import and render it.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { validateIBAN, validatePhone, validateHolder, makeBlurHandler } from "../peach-validators.js";
import {
  PHONE_PREFIX_MAP, getFieldMeta, getTabLabel, fieldsForTab, parseSections,
  normalizeApiPaymentMethods,
} from "../data/paymentMethodMeta.js";

// Re-export the API normalizer so screens can `import { normalizeApiPaymentMethods } from AddPMFlow`.
export { normalizeApiPaymentMethods };

// ── Icons ────────────────────────────────────────────────────────────────────

const IconCheck = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,7 6,10.5 11,4"/></svg>;
const IconBack  = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,3 5,8 10,13"/></svg>;

const IconBank     = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg>;
const IconWallet   = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5"/></svg>;
const IconGiftCard = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18"/><path d="M12 8c-2-3-6-3-6 0s4 0 6 0c2-3 6-3 6 0s-4 0-6 0"/></svg>;
const IconFlag     = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;

// ── FieldError ───────────────────────────────────────────────────────────────

export const FieldError = ({ error }) => error
  ? <div style={{ fontSize:".72rem", fontWeight:600, color:"var(--error)", marginTop:4 }}>{error}</div>
  : null;

// ── Constants ────────────────────────────────────────────────────────────────

export const CATEGORY_META = {
  bankTransfer:  { label: "Bank Transfer",       icon: IconBank,     description: "Traditional bank transfers" },
  onlineWallet:  { label: "Online Wallet",        icon: IconWallet,   description: "Digital payment apps" },
  giftCard:      { label: "Online Gift Card",     icon: IconGiftCard, description: "Prepaid gift cards" },
  national:      { label: "National Option",      icon: IconFlag,     description: "Country-specific methods" },
};

export const CURRENCY_REGIONS = {
  Europe:        ["EUR","CHF","GBP","SEK","NOK","DKK","PLN","CZK","HUF","ISK","RON","BGN","HRK"],
  Global:        ["USD","DOC","LNURL","USDT","USDC"],
  Africa:        ["NGN","KES","ZAR","GHS","TZS","UGX","XOF","XAF","EGP","MAD"],
  Asia:          ["INR","JPY","KRW","THB","IDR","MYR","PHP","VND","SGD","HKD","TWD","BDT","PKR","LKR"],
  "Latin America":["BRL","ARS","CLP","COP","MXN","PEN","UYU","VES","CRC","DOP","GTQ"],
  "Middle East": ["TRY","ILS","AED","SAR","QAR","KWD","BHD","OMR","JOD"],
  "North America":["USD","CAD"],
  Oceania:       ["AUD","NZD","FJD"],
};
const ALL_REGIONS = Object.keys(CURRENCY_REGIONS);

// Re-export PHONE_PREFIX_MAP from the meta module so existing imports in
// other screens (if any) keep working.
export { PHONE_PREFIX_MAP } from "../data/paymentMethodMeta.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

// Derive a short display label for a saved PM (used by both screens in PM lists)
export function methodLabel(pm) {
  const d = pm.details || {};
  if (d.iban)        return d.iban.replace(/\s/g,"").replace(/^(.{4})(.*)(.{4})$/, "$1 •••• $3");
  if (d.userName)    return d.userName;
  if (d.email)       return d.email.replace(/(.{2})(.*)(@.*)/, "$1•••$3");
  if (d.phone)       return d.phone.replace(/(.{5})(.*)(.{3})/, "$1•••$3");
  if (d.beneficiary) return d.beneficiary;
  if (d.ukSortCode)  return `${d.ukSortCode} / ${d.bankAccountNumber || ""}`;
  return "—";
}

// ── ProgressBar ──────────────────────────────────────────────────────────────

const STEP_LABELS = ["Currency", "Category", "Method", "Details"];

function ProgressBar({ step, total = 4 }) {
  return (
    <div className="pm-progress">
      <div className="pm-progress-track">
        <div className="pm-progress-fill" style={{ width: `${((step + 1) / total) * 100}%` }}/>
      </div>
      <div className="pm-progress-labels">
        {STEP_LABELS.map((label, i) => (
          <span key={i} className={`pm-progress-label${i <= step ? " active" : ""}${i === step ? " current" : ""}`}>
            {i < step ? <IconCheck/> : <span className="pm-step-num">{i + 1}</span>}
            <span className="pm-step-text">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── AddPMFlow ────────────────────────────────────────────────────────────────

export function AddPMFlow({ methods, onSave, onClose, editData, error, onRetry }) {
  const isEdit = !!editData;
  const [step, setStep] = useState(isEdit ? 3 : 0);

  const [selCurrency, setSelCurrency] = useState(editData?.currencies?.[0] || "");
  const [selCategory, setSelCategory] = useState(editData ? (methods[editData.methodId]?.category || "") : "");
  const [selMethodId, setSelMethodId] = useState(editData?.methodId || "");
  const [details, setDetails] = useState(editData?.details || {});
  const [selCurrencies, setSelCurrencies] = useState(editData?.currencies || []);
  const [payRefType, setPayRefType] = useState(editData?.details?._payRefType || "custom");
  const [payRefCustom, setPayRefCustom] = useState(editData?.details?._payRefCustom || "");
  const [showPayRefPicker, setShowPayRefPicker] = useState(false);
  const [errors, setErrors] = useState({});
  const handleBlur = makeBlurHandler(setErrors);
  const [selRegion, setSelRegion] = useState("Europe");

  // Per-section active-alternative index for methods whose fields.mandatory has
  // tabbed sections (e.g. Revolut: username | phone | m-pesa, or Bulgaria NT:
  // IBAN | account number). Keyed by outer section index. Restored from edit
  // data when present, with legacy `_variant` and field-overlap fallbacks.
  const [variantIndices, setVariantIndices] = useState(() => {
    if (!isEdit) return {};
    const saved = editData?.details?._variants;
    if (saved && typeof saved === "object") {
      const out = {};
      for (const [k, v] of Object.entries(saved)) {
        const n = Number(v);
        if (Number.isInteger(n) && n >= 0) out[k] = n;
      }
      return out;
    }
    // Legacy single-tab save: map _variant → section 0.
    const legacy = Number(editData?.details?._variant);
    if (Number.isInteger(legacy) && legacy >= 0) return { 0: legacy };
    // Heuristic: for each tabbed section, pick the alt whose fields overlap
    // the saved detail keys.
    const m = methods[editData?.methodId];
    const out = {};
    const secs = parseSections(m?.fields?.mandatory);
    for (const s of secs) {
      if (s.alternatives.length <= 1) continue;
      let pick = 0;
      for (let i = 0; i < s.altFields.length; i++) {
        if (s.altFields[i].some((k) => editData.details && k in editData.details)) {
          pick = i;
          break;
        }
      }
      out[s.sectionIdx] = pick;
    }
    return out;
  });

  const allCurrencies = [...new Set(Object.values(methods).flatMap(m => m.currencies))].sort();
  const regionCurrencies = (CURRENCY_REGIONS[selRegion] || [])
    .filter(c => allCurrencies.includes(c))
    .sort();

  const catsForCurrency = selCurrency
    ? [...new Set(Object.values(methods).filter(m => m.currencies.includes(selCurrency)).map(m => m.category))]
    : [];

  const methodsForCatCurrency = Object.entries(methods)
    .filter(([, m]) => m.category === selCategory && m.currencies.includes(selCurrency))
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  const selMethod = methods[selMethodId] || null;
  const methodCurrencies = selMethod?.currencies || [];

  // Walk the API schema into sections. Each section either renders inline
  // (single alternative) or as a tab strip (multiple alternatives). Mandatory
  // fields = union of every section's active alternative fields.
  const sections = parseSections(selMethod?.fields?.mandatory);
  const resolvedSections = sections.map((s) => {
    const rawIdx = variantIndices[s.sectionIdx] ?? 0;
    const activeAltIdx = Math.min(rawIdx, Math.max(s.alternatives.length - 1, 0));
    const activeFields = s.altFields[activeAltIdx] || [];
    return { ...s, activeAltIdx, activeFields };
  });
  const hasAnyTabs = resolvedSections.some((s) => s.alternatives.length > 1);
  const mandatoryFields = [...new Set(resolvedSections.flatMap((s) => s.activeFields))];
  // Hide the raw `reference` optional field — the web's "Payment reference"
  // widget below owns that concept and mirrors its value into details.reference
  // on save (see handleSave).
  const methodHasReference = (selMethod?.fields?.optional || []).includes("reference");
  const optionalFields = (selMethod?.fields?.optional || [])
    .filter((f) => !mandatoryFields.includes(f) && f !== "reference");

  const step3Ok = mandatoryFields.every((k) => (details[k] || "").trim().length > 0)
    && selCurrencies.length > 0
    && !Object.values(errors).some((e) => e);

  function handleSelectCurrency(c) {
    setSelCurrency(c);
    setSelCategory("");
    setSelMethodId("");
    setDetails({});
    setSelCurrencies([]);
    setErrors({});
    setStep(1);
  }

  function handleSelectCategory(cat) {
    setSelCategory(cat);
    setSelMethodId("");
    setDetails({});
    setSelCurrencies([]);
    setErrors({});
    setStep(2);
  }

  function handleSelectMethod(id) {
    setSelMethodId(id);
    setDetails({});
    setErrors({});
    const m = methods[id];
    if (m) {
      setSelCurrencies(m.currencies.includes(selCurrency) ? [selCurrency] : [m.currencies[0]]);
    }
    setStep(3);
  }

  function toggleCurrency(c) {
    setSelCurrencies(prev =>
      prev.includes(c)
        ? prev.length > 1 ? prev.filter(x => x !== c) : prev
        : [...prev, c]
    );
  }

  function handleSave() {
    const newErrors = {};
    const phonePrefix = PHONE_PREFIX_MAP[selMethodId];
    for (const fid of mandatoryFields) {
      const val = (details[fid] || "").trim();
      if (!val) {
        newErrors[fid] = "Required";
        continue;
      }
      if (fid === "iban") {
        const r = validateIBAN(val);
        if (!r.valid) newErrors[fid] = r.error;
      } else if (fid === "phone" || fid === "phoneNumber") {
        const r = validatePhone(val, phonePrefix);
        if (!r.valid) newErrors[fid] = r.error;
      } else if (fid === "beneficiary" || fid === "accountHolder" || fid === "holder") {
        const r = validateHolder(val);
        if (!r.valid) newErrors[fid] = r.error;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    // Only persist fields that belong to the active tab or the optional set,
    // plus the payment-reference metadata and the variant index.
    const allowedKeys = new Set([...mandatoryFields, ...optionalFields]);
    const cleanDetails = {};
    for (const [k, v] of Object.entries(details)) {
      if (allowedKeys.has(k)) cleanDetails[k] = v;
    }
    // Mirror the payment-reference widget's custom value into details.reference
    // for methods that list `reference` as an API-optional field, so the wire
    // format matches what mobile writes. peachID/tradeID modes are auto-filled
    // downstream and do not populate details.reference at save time.
    if (methodHasReference && payRefType === "custom" && payRefCustom.trim()) {
      cleanDetails.reference = payRefCustom.trim();
    }
    cleanDetails._payRefType = payRefType;
    cleanDetails._payRefCustom = payRefCustom;
    if (hasAnyTabs) {
      const variants = {};
      for (const s of resolvedSections) {
        if (s.alternatives.length > 1) variants[s.sectionIdx] = s.activeAltIdx;
      }
      cleanDetails._variants = variants;
    }

    const pm = {
      id:         editData?.id || `${selMethodId}-${Date.now()}`,
      methodId:   selMethodId,
      name:       selMethod?.name || selMethodId,
      currencies: selCurrencies,
      details:    cleanDetails,
    };
    onSave(pm);
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <>
      <style>{ADD_PM_CSS}</style>
      <div className="modal-overlay" onClick={handleBackdrop}>
        <div className="modal-card">
          {/* Header */}
          <div className="modal-header">
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {step > 0 && !isEdit && (
                <button className="modal-back" onClick={() => setStep(s => s - 1)}>
                  <IconBack/>
                </button>
              )}
              <span className="modal-title">
                {isEdit ? `Edit ${editData.name}` :
                 step === 0 ? "Select currency" :
                 step === 1 ? "Select category" :
                 step === 2 ? "Select method" : "Enter details"}
              </span>
            </div>
            <button className="modal-close" onClick={onClose}>
              {isEdit && <span className="modal-cancel-text">cancel</span>}✕
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ padding:"12px 22px 0" }}>
            <ProgressBar step={step}/>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Catalog loading / error states (shown in place of the picker) */}
            {!isEdit && Object.keys(methods).length === 0 && !error && (
              <div className="pm-empty-msg">Loading payment methods…</div>
            )}
            {!isEdit && error && (
              <div className="pm-empty-msg" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                <span>Couldn't load payment methods.</span>
                {onRetry && <button className="btn-save-pm" style={{ maxWidth:200 }} onClick={onRetry}>Retry</button>}
              </div>
            )}
            {/* ── STEP 0: Currency with region tabs ── */}
            {step === 0 && Object.keys(methods).length > 0 && !error && (
              <>
                <div className="region-tabs">
                  {ALL_REGIONS.map(r => {
                    const count = (CURRENCY_REGIONS[r] || []).filter(c => allCurrencies.includes(c)).length;
                    if (count === 0) return null;
                    return (
                      <button key={r}
                        className={`region-tab${selRegion === r ? " active" : ""}`}
                        onClick={() => setSelRegion(r)}>
                        {r}
                      </button>
                    );
                  })}
                </div>
                <div className="pm-grid">
                  {regionCurrencies.map(c => (
                    <button key={c}
                      className={`pm-option-card${selCurrency === c ? " selected" : ""}`}
                      onClick={() => handleSelectCurrency(c)}>
                      <span className="pm-option-name">{c}</span>
                    </button>
                  ))}
                  {regionCurrencies.length === 0 && (
                    <div className="pm-empty-msg" style={{ gridColumn:"1/-1" }}>
                      No payment methods available for this region yet
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 1: Category ── */}
            {step === 1 && (
              <div className="pm-cat-list">
                {catsForCurrency.map(catId => {
                  const cat = CATEGORY_META[catId];
                  if (!cat) return null;
                  const CatIcon = cat.icon;
                  const count = Object.values(methods)
                    .filter(m => m.category === catId && m.currencies.includes(selCurrency)).length;
                  return (
                    <button key={catId}
                      className={`pm-cat-card${selCategory === catId ? " selected" : ""}`}
                      onClick={() => handleSelectCategory(catId)}>
                      <span className="pm-cat-icon"><CatIcon/></span>
                      <div className="pm-cat-text">
                        <span className="pm-cat-label">{cat.label}</span>
                        <span className="pm-cat-desc">{count} method{count !== 1 ? "s" : ""} available</span>
                      </div>
                      <span className="pm-cat-arrow">→</span>
                    </button>
                  );
                })}
                {catsForCurrency.length === 0 && (
                  <div className="pm-empty-msg">No payment methods available for {selCurrency}</div>
                )}
              </div>
            )}

            {/* ── STEP 2: Method ── */}
            {step === 2 && (
              <div className="pm-cat-list">
                {methodsForCatCurrency.map(([id, m]) => (
                  <button key={id}
                    className={`pm-cat-card${selMethodId === id ? " selected" : ""}`}
                    onClick={() => handleSelectMethod(id)}>
                    <div className="pm-cat-text" style={{ flex:1 }}>
                      <span className="pm-cat-label">{m.name}</span>
                      <span className="pm-cat-desc">{m.currencies.join(", ")}</span>
                    </div>
                    <span className="pm-cat-arrow">→</span>
                  </button>
                ))}
                {methodsForCatCurrency.length === 0 && (
                  <div className="pm-empty-msg">No methods in this category for {selCurrency}</div>
                )}
              </div>
            )}

            {/* ── STEP 3: Details ── */}
            {step === 3 && selMethod && (
              <>
                <div className="pm-detail-header">
                  <span className="pm-detail-tag">{selMethod.name}</span>
                  <span className="pm-detail-curr">{selCurrency}</span>
                </div>

                {methodCurrencies.length > 1 && (
                  <div style={{ marginBottom:16 }}>
                    <label className="field-label" style={{ marginBottom:8 }}>
                      Currencies <span style={{ fontWeight:500, textTransform:"none",
                        letterSpacing:0, color:"var(--black-25)" }}>— select all that apply</span>
                    </label>
                    <div className="curr-check-grid">
                      {methodCurrencies.map(c => (
                        <button key={c} className={`curr-check-btn${selCurrencies.includes(c) ? " on" : ""}`}
                          onClick={() => toggleCurrency(c)}>
                          {selCurrencies.includes(c) && "✓ "}{c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(() => {
                  const renderField = (fid, isOptional) => {
                    const meta = getFieldMeta(fid);
                    const isIBAN = fid === "iban";
                    const isPhone = fid === "phone" || fid === "phoneNumber";
                    const isHolder = fid === "beneficiary" || fid === "accountHolder" || fid === "holder";
                    const phonePrefix = isPhone ? PHONE_PREFIX_MAP[selMethodId] : null;

                    function handleFieldBlur() {
                      const val = (details[fid] || "").trim();
                      if (!val && isOptional) { setErrors((p) => ({ ...p, [fid]: null })); return; }
                      if (isIBAN) handleBlur(fid, details[fid], validateIBAN);
                      else if (isPhone) handleBlur(fid, details[fid], validatePhone, phonePrefix);
                      else if (isHolder) handleBlur(fid, details[fid], validateHolder);
                    }

                    return (
                      <div key={fid} style={{ marginBottom:14 }}>
                        <label className="field-label">
                          {meta.label}
                          {isOptional && <span style={{ fontWeight:500, textTransform:"none",
                            letterSpacing:0, color:"var(--black-25)", marginLeft:4 }}>(optional)</span>}
                        </label>
                        <input className="modal-input"
                          placeholder={meta.placeholder}
                          value={details[fid] || ""}
                          onChange={(e) => { setDetails((prev) => ({ ...prev, [fid]: e.target.value })); if (errors[fid]) setErrors((p) => ({ ...p, [fid]: null })); }}
                          onBlur={(isIBAN || isPhone || isHolder) ? handleFieldBlur : undefined}
                          style={errors[fid] ? { borderColor:"var(--error)" } : {}}
                        />
                        <FieldError error={errors[fid]}/>
                      </div>
                    );
                  };

                  return (
                    <>
                      {resolvedSections.map((s) => {
                        const sectionHasTabs = s.alternatives.length > 1;
                        return (
                          <div key={s.sectionIdx}>
                            {sectionHasTabs && (
                              <div className="pm-variant-tabs">
                                {s.alternatives.map((alt, i) => (
                                  <button key={i}
                                    className={`pm-variant-tab${i === s.activeAltIdx ? " active" : ""}`}
                                    onClick={() => {
                                      // Clear errors + stale values from the previously active alternative.
                                      setErrors({});
                                      setDetails((prev) => {
                                        const stale = new Set(s.altFields[s.activeAltIdx] || []);
                                        const kept = {};
                                        for (const [k, v] of Object.entries(prev)) {
                                          if (!stale.has(k)) kept[k] = v;
                                        }
                                        return kept;
                                      });
                                      setVariantIndices((prev) => ({ ...prev, [s.sectionIdx]: i }));
                                    }}>
                                    {getTabLabel(alt)}
                                  </button>
                                ))}
                              </div>
                            )}
                            {s.activeFields.map((fid) => renderField(fid, false))}
                          </div>
                        );
                      })}
                      {optionalFields.map((fid) => renderField(fid, true))}
                    </>
                  );
                })()}

                {/* Payment reference */}
                <div style={{ marginBottom:14 }}>
                  <label className="field-label">Payment reference</label>
                  <div className="payref-row">
                    <input className="modal-input payref-input"
                      placeholder={payRefType === "custom" ? "don't mention peach or bitcoin !" : ""}
                      value={
                        payRefType === "custom" ? payRefCustom :
                        payRefType === "peachID" ? "eg: 02v6764d" :
                        "eg: PC-F4D-1245"
                      }
                      disabled={payRefType !== "custom"}
                      onChange={e => setPayRefCustom(e.target.value)}
                      style={payRefType !== "custom" ? { background:"var(--black-5)", color:"var(--black-25)", cursor:"not-allowed" } : {}}
                    />
                    <button className="payref-type-btn" onClick={() => setShowPayRefPicker(true)}>
                      {payRefType === "custom" ? "custom" : payRefType === "peachID" ? "buyer peach ID" : "trade ID"}
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="1,1 5,5 9,1"/></svg>
                    </button>
                  </div>
                  {payRefType === "custom" && (
                    <div style={{ fontSize:".66rem", color:"var(--black-25)", fontWeight:500, marginTop:4 }}>(optional)</div>
                  )}
                  {payRefType !== "custom" && (
                    <div style={{ fontSize:".66rem", color:"var(--black-65)", fontWeight:500, marginTop:4 }}>
                      Auto-filled by Peach at trade time — cannot be edited
                    </div>
                  )}
                </div>

                {showPayRefPicker && (
                  <div className="payref-picker-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPayRefPicker(false); }}>
                    <div className="payref-picker">
                      <div className="payref-picker-header">
                        <span className="payref-picker-title">Payment reference</span>
                        <button className="modal-close" onClick={() => setShowPayRefPicker(false)}>✕</button>
                      </div>
                      {[
                        { id:"custom",  label:"custom (can be empty)" },
                        { id:"peachID", label:"buyers' peachID (eg: 02v6764d)" },
                        { id:"tradeID", label:"trade ID (eg: PC-F4D-1245)" },
                      ].map(opt => (
                        <button key={opt.id}
                          className={`payref-option${payRefType === opt.id ? " selected" : ""}`}
                          onClick={() => { setPayRefType(opt.id); setShowPayRefPicker(false); }}>
                          <span className="payref-option-label">{opt.label}</span>
                          <span className={`payref-radio${payRefType === opt.id ? " on" : ""}`}>
                            {payRefType === opt.id && <span className="payref-radio-dot"/>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pm-summary-box">
                  <div className="pm-summary-row">
                    <span className="pm-summary-label">Method</span>
                    <span className="pm-summary-value">{selMethod.name}</span>
                  </div>
                  <div className="pm-summary-row">
                    <span className="pm-summary-label">Currencies</span>
                    <span className="pm-summary-value">{selCurrencies.join(", ")}</span>
                  </div>
                  {[...mandatoryFields, ...optionalFields].map((fid) => (
                    <div key={fid} className="pm-summary-row">
                      <span className="pm-summary-label">{getFieldMeta(fid).label}</span>
                      <span className="pm-summary-value">{details[fid] || "—"}</span>
                    </div>
                  ))}
                  <div className="pm-summary-row">
                    <span className="pm-summary-label">Payment reference</span>
                    <span className="pm-summary-value">
                      {payRefType === "custom" ? (payRefCustom || "empty (custom)") :
                       payRefType === "peachID" ? "Buyer's Peach ID" : "Trade ID"}
                    </span>
                  </div>
                </div>

                <button className="btn-save-pm" disabled={!step3Ok} onClick={handleSave}>
                  {isEdit ? "Save changes" : "Add payment method"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── CSS ──────────────────────────────────────────────────────────────────────
// Self-contained so the modal works wherever it is rendered. Screens do not
// need to add anything to their own stylesheets.

const ADD_PM_CSS = `
  .modal-overlay{position:fixed;inset:0;z-index:500;background:rgba(43,25,17,.45);
    display:flex;align-items:center;justify-content:center;padding:20px;
    animation:addpm-fadeIn .2s ease}
  @keyframes addpm-fadeIn{from{opacity:0}to{opacity:1}}
  .modal-card{background:var(--surface);border-radius:20px;width:100%;max-width:480px;
    max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(43,25,17,.2);
    animation:addpm-slideUp .25s ease}
  @keyframes addpm-slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  .modal-header{display:flex;align-items:center;justify-content:space-between;
    padding:18px 22px 0}
  .modal-title{font-size:1.05rem;font-weight:800;color:var(--black)}
  .modal-close{min-width:30px;height:30px;border-radius:8px;border:none;background:var(--black-5);
    cursor:pointer;font-size:.95rem;color:var(--black-65);display:flex;align-items:center;
    justify-content:center;transition:background .14s;padding:0 8px;gap:0}
  .modal-close:hover{background:var(--black-10)}
  .modal-cancel-text{font-size:.78rem;font-weight:600;color:var(--black-65);margin-right:6px}
  .modal-back{width:30px;height:30px;border-radius:8px;border:none;background:var(--black-5);
    cursor:pointer;color:var(--black-65);display:flex;align-items:center;
    justify-content:center;transition:background .14s;flex-shrink:0}
  .modal-back:hover{background:var(--black-10)}
  .modal-body{padding:16px 22px 22px}

  /* Progress bar */
  .pm-progress{margin-bottom:8px}
  .pm-progress-track{height:4px;background:var(--black-10);border-radius:3px;overflow:hidden;margin-bottom:10px}
  .pm-progress-fill{height:100%;background:var(--grad);border-radius:3px;transition:width .3s ease}
  .pm-progress-labels{display:flex;justify-content:space-between}
  .pm-progress-label{display:flex;align-items:center;gap:4px;font-size:.62rem;font-weight:700;
    color:var(--black-25);text-transform:uppercase;letter-spacing:.03em;transition:color .2s}
  .pm-progress-label.active{color:var(--primary-dark)}
  .pm-progress-label.current{color:var(--primary)}
  .pm-step-num{width:16px;height:16px;border-radius:50%;background:var(--black-10);
    display:flex;align-items:center;justify-content:center;font-size:.56rem;font-weight:800;
    color:var(--black-65);transition:all .2s}
  .pm-progress-label.active .pm-step-num{background:var(--primary);color:white}
  .pm-progress-label.current .pm-step-num{background:var(--primary);color:white;
    box-shadow:0 0 0 3px rgba(245,101,34,.2)}
  .pm-step-text{display:none}
  @media(min-width:420px){.pm-step-text{display:inline}}

  /* Step 0: Currency grid */
  .region-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;margin-top:4px}
  .region-tab{background:none;border:1.5px solid var(--black-10);border-radius:999px;
    padding:4px 12px;font-family:var(--font);font-size:.72rem;font-weight:700;
    color:var(--black-65);cursor:pointer;transition:all .15s;white-space:nowrap}
  .region-tab:hover{border-color:var(--primary);color:var(--primary-dark)}
  .region-tab.active{background:var(--primary-mild);border-color:var(--primary);color:var(--primary-dark)}

  .pm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:8px;margin-top:8px}
  .pm-option-card{border:1.5px solid var(--black-10);border-radius:10px;padding:12px 8px;
    background:var(--surface);cursor:pointer;text-align:center;font-family:var(--font);
    transition:all .15s}
  .pm-option-card:hover{border-color:var(--primary);background:var(--primary-mild)}
  .pm-option-card.selected{border-color:var(--primary);background:var(--primary-mild);
    box-shadow:0 0 0 2px rgba(245,101,34,.15)}
  .pm-option-name{font-size:.88rem;font-weight:800;color:var(--black)}

  /* Step 1/2: Category/method list */
  .pm-cat-list{display:flex;flex-direction:column;gap:8px;margin-top:8px}
  .pm-cat-card{display:flex;align-items:center;gap:14px;border:1.5px solid var(--black-10);
    border-radius:12px;padding:14px 16px;background:var(--surface);cursor:pointer;
    font-family:var(--font);transition:all .15s;text-align:left;width:100%}
  .pm-cat-card:hover{border-color:var(--primary);background:var(--error-bg)}
  .pm-cat-card.selected{border-color:var(--primary);background:var(--primary-mild)}
  .pm-cat-icon{width:40px;height:40px;border-radius:10px;background:var(--primary-mild);
    display:flex;align-items:center;justify-content:center;color:var(--primary-dark);flex-shrink:0}
  .pm-cat-text{flex:1;min-width:0}
  .pm-cat-label{display:block;font-size:.88rem;font-weight:700;color:var(--black)}
  .pm-cat-desc{display:block;font-size:.72rem;font-weight:500;color:var(--black-65);margin-top:1px}
  .pm-cat-arrow{font-size:1rem;color:var(--black-25);flex-shrink:0;transition:color .15s}
  .pm-cat-card:hover .pm-cat-arrow{color:var(--primary)}

  .pm-empty-msg{text-align:center;padding:24px;font-size:.85rem;color:var(--black-65)}

  /* Step 3: Details */
  /* Variant tabs (alternative field groups within a method) */
  .pm-variant-tabs{display:flex;gap:4px;border-bottom:1.5px solid var(--black-10);
    margin-bottom:16px;overflow-x:auto;scrollbar-width:none}
  .pm-variant-tabs::-webkit-scrollbar{display:none}
  .pm-variant-tab{background:none;border:none;border-bottom:2px solid transparent;
    padding:8px 14px;font-family:var(--font);font-size:.82rem;font-weight:700;
    color:var(--black-65);cursor:pointer;white-space:nowrap;transition:color .15s,border-color .15s;
    text-transform:lowercase;margin-bottom:-1.5px}
  .pm-variant-tab:hover{color:var(--primary-dark)}
  .pm-variant-tab.active{color:var(--primary);border-bottom-color:var(--primary)}

  .pm-detail-header{display:flex;align-items:center;gap:8px;margin-bottom:16px}
  .pm-detail-tag{background:var(--primary-mild);color:var(--primary-dark);font-size:.78rem;
    font-weight:700;padding:3px 12px;border-radius:999px}
  .pm-detail-curr{background:var(--black-5);color:var(--black-65);font-size:.72rem;
    font-weight:700;padding:3px 10px;border-radius:999px}

  .field-label{display:block;font-size:.7rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.04em;color:var(--black-65);margin-bottom:6px}
  .modal-input{width:100%;border:1.5px solid var(--black-10);border-radius:10px;padding:10px 14px;
    font-family:var(--font);font-size:.88rem;font-weight:500;color:var(--black);
    background:var(--surface);transition:border-color .15s;outline:none}
  .modal-input:focus{border-color:var(--primary)}
  .modal-input::placeholder{color:var(--black-25)}

  .curr-check-grid{display:flex;gap:6px;flex-wrap:wrap}
  .curr-check-btn{border:1.5px solid var(--black-10);border-radius:8px;padding:6px 14px;
    font-family:var(--font);font-size:.78rem;font-weight:700;color:var(--black-65);
    background:var(--surface);cursor:pointer;transition:all .15s}
  .curr-check-btn:hover{border-color:var(--primary);color:var(--primary-dark)}
  .curr-check-btn.on{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}

  .pm-summary-box{background:var(--black-5);border-radius:12px;padding:12px 14px;margin-top:10px;margin-bottom:16px}
  .pm-summary-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0}
  .pm-summary-row+.pm-summary-row{border-top:1px solid var(--black-10)}
  .pm-summary-label{font-size:.72rem;font-weight:600;color:var(--black-65)}
  .pm-summary-value{font-size:.78rem;font-weight:700;color:var(--black);text-align:right;
    max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  .btn-save-pm{width:100%;background:var(--grad);color:white;border:none;border-radius:12px;
    font-family:var(--font);font-size:.92rem;font-weight:800;padding:12px;cursor:pointer;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .15s,box-shadow .15s,opacity .15s}
  .btn-save-pm:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(245,101,34,.4)}
  .btn-save-pm:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}

  /* Payment reference */
  .payref-row{display:flex;gap:8px;align-items:center}
  .payref-input{flex:1}
  .payref-type-btn{display:flex;align-items:center;gap:5px;background:var(--black-5);
    border:1.5px solid var(--black-10);border-radius:8px;padding:8px 12px;
    font-family:var(--font);font-size:.75rem;font-weight:700;color:var(--primary-dark);
    cursor:pointer;white-space:nowrap;flex-shrink:0;transition:border-color .15s}
  .payref-type-btn:hover{border-color:var(--primary)}

  .payref-picker-overlay{position:fixed;inset:0;z-index:600;background:rgba(43,25,17,.3);
    display:flex;align-items:flex-end;justify-content:center;animation:addpm-fadeIn .15s ease}
  .payref-picker{background:var(--surface);border-radius:20px 20px 0 0;width:100%;max-width:480px;
    padding-bottom:env(safe-area-inset-bottom,12px);animation:addpm-slideUp .25s ease}
  .payref-picker-header{display:flex;align-items:center;justify-content:space-between;
    padding:18px 22px 12px}
  .payref-picker-title{font-size:1.05rem;font-weight:800;color:var(--black)}
  .payref-option{display:flex;align-items:center;justify-content:space-between;width:100%;
    padding:14px 22px;border:none;background:none;cursor:pointer;font-family:var(--font);
    font-size:.88rem;font-weight:600;color:var(--black-75);transition:background .12s;text-align:left}
  .payref-option:hover{background:var(--black-5)}
  .payref-option.selected{color:var(--primary)}
  .payref-option-label{flex:1}
  .payref-radio{width:22px;height:22px;border-radius:50%;border:2px solid var(--black-10);
    display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:border-color .15s}
  .payref-radio.on{border-color:var(--primary)}
  .payref-radio-dot{width:12px;height:12px;border-radius:50%;background:var(--primary)}
`;
