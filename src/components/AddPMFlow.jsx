// ─── SHARED ADD PAYMENT METHOD FLOW ──────────────────────────────────────────
// Full 4-step Add-PM modal (region → category → method → details) used by
// both the Payment Methods screen and the Offer Creation screen.
// Produces PMs in the canonical shape:
//   { id, methodId, name, currencies, details:{..., reference} }
// CSS is injected via <style> inside the component so the modal is fully
// self-contained — screens just import and render it.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { validatePhone, validatePaymentReference, isPhoneAllowed, makeBlurHandler } from "../peach-validators.js";
import {
  PHONE_PREFIX_MAP, getFieldMeta, getTabLabel, fieldsForTab, parseSections,
  normalizeApiPaymentMethods,
} from "../data/paymentMethodMeta.js";
import { getPaymentLogo } from "../assets/logos/index.ts";

// Re-export the API normalizer so screens can `import { normalizeApiPaymentMethods } from AddPMFlow`.
export { normalizeApiPaymentMethods };

// ── Icons ────────────────────────────────────────────────────────────────────

const IconCheck = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,7 6,10.5 11,4"/></svg>;
const IconBack  = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,3 5,8 10,13"/></svg>;

const IconBank     = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg>;
const IconWallet   = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5"/></svg>;
const IconGiftCard = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18"/><path d="M12 8c-2-3-6-3-6 0s4 0 6 0c2-3 6-3 6 0s-4 0-6 0"/></svg>;
const IconFlag     = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const IconMeetup   = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconExtLink  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;

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
  cash:          { label: "Cash & Meetups",        icon: IconMeetup,   description: "In-person cash trades at Bitcoin meetups" },
};

// Cash/meetup methods carry ids like "cash.be.antwerp.belgian-btc-embassy".
// The trailing dot distinguishes them from unrelated ids beginning with "cash".
export const isCashId = (id) => typeof id === "string" && id.startsWith("cash.");

// Resolve a human country name from an ISO-3166 alpha-2 code, falling back to
// the (EUR-scoped) COUNTRY_NAMES map and finally the raw code.
let _regionNames;
try { _regionNames = new Intl.DisplayNames(["en"], { type: "region" }); } catch { _regionNames = null; }
function countryName(code) {
  try {
    return (_regionNames && _regionNames.of(code)) || COUNTRY_NAMES[code] || code;
  } catch {
    return COUNTRY_NAMES[code] || code;
  }
}

// Country → method list, mirroring mobile's NATIONALOPTIONS
// (peach-app/src/views/addPaymentMethod/SelectPaymentMethod.tsx).
export const NATIONAL_OPTIONS = {
  EUR: {
    BE: ["wero"],
    LU: ["wero"],
    IT: ["satispay", "postePay"],
    PT: ["mbWay"],
    ES: ["bizum", "rebellion"],
    FI: ["mobilePay"],
    HR: ["keksPay"],
    FR: ["wero", "lydia", "satispay"],
    DE: ["satispay", "wero"],
    GR: ["iris"],
    DK: ["mobilePay"],
  },
};

const COUNTRY_NAMES = {
  BE: "Belgium", LU: "Luxembourg", IT: "Italy", PT: "Portugal",
  ES: "Spain",   FI: "Finland",    HR: "Croatia", FR: "France",
  DE: "Germany", GR: "Greece",     DK: "Denmark",
};

// ISO-3166-1 alpha-2 → flag emoji via regional indicator codepoints.
function countryFlag(code) {
  return code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(0x1F1A5 + c.charCodeAt(0))
  );
}

// Currently only EUR has a national-options country group; returns null
// otherwise so the wizard transparently skips the country step.
function nationalGroupFor(currency) {
  return currency === "EUR" ? "EUR" : null;
}

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

// African currency → origin country (region label for the shared CFA francs).
// Drives the small subtext under the currency code in the "Select currency" step.
const AFRICA_CURRENCY_COUNTRY = {
  NGN: "Nigeria", KES: "Kenya",    ZAR: "South Africa", GHS: "Ghana",
  TZS: "Tanzania", UGX: "Uganda",  XOF: "West Africa",  XAF: "Central Africa",
  EGP: "Egypt",   MAD: "Morocco",
};

// Re-export PHONE_PREFIX_MAP from the meta module so existing imports in
// other screens (if any) keep working.
export { PHONE_PREFIX_MAP } from "../data/paymentMethodMeta.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

// Derive a short display label for a saved PM (used by both screens in PM lists)
export function methodLabel(pm) {
  const d = pm.details || {};
  if (isCashId(pm.methodId) && d.country) return countryName(d.country);
  if (d.iban)        return d.iban.replace(/\s/g,"").replace(/^(.{4})(.*)(.{4})$/, "$1 •••• $3");
  if (d.userName)    return d.userName;
  if (d.email)       return d.email.replace(/(.{2})(.*)(@.*)/, "$1•••$3");
  if (d.phone)       return d.phone.replace(/(.{5})(.*)(.{3})/, "$1•••$3");
  if (d.mpesa_phone) return d.mpesa_phone.replace(/(.{5})(.*)(.{3})/, "$1•••$3");
  if (d.mpesa_name)  return d.mpesa_name;
  if (d.beneficiary) return d.beneficiary;
  if (d.ukSortCode)  return `${d.ukSortCode} / ${d.bankAccountNumber || ""}`;
  return "—";
}

// ── ProgressBar ──────────────────────────────────────────────────────────────

const STEP_LABELS_FULL = ["Currency", "Category", "Country", "Method", "Details"];

function ProgressBar({ step, showCountryStep, meetupMode, skipCategoryStep }) {
  // Hidden source-step indices: Category (1) when skipCategoryStep, Country (2)
  // when showCountryStep is false. We filter both labels and the current-step
  // index against the same set so the bar stays consistent at 3, 4, or 5 steps.
  const baseLabels = meetupMode
    ? STEP_LABELS_FULL.map((l, i) => (i === 3 ? "Meetup" : l))
    : STEP_LABELS_FULL;
  const hidden = new Set();
  if (skipCategoryStep) hidden.add(1);
  if (!showCountryStep) hidden.add(2);
  const visibleLabels = baseLabels.filter((_, i) => !hidden.has(i));
  // Visible index = number of non-hidden indices at or before `step`, minus 1.
  const visibleStep = baseLabels
    .slice(0, step + 1)
    .filter((_, i) => !hidden.has(i)).length - 1;
  const total = visibleLabels.length;
  return (
    <div className="pm-progress">
      <div className="pm-progress-track">
        <div className="pm-progress-fill" style={{ width: `${((visibleStep + 1) / total) * 100}%` }}/>
      </div>
      <div className="pm-progress-labels">
        {visibleLabels.map((label, i) => (
          <span key={i} className={`pm-progress-label${i <= visibleStep ? " active" : ""}${i === visibleStep ? " current" : ""}`}>
            {i < visibleStep ? <IconCheck/> : <span className="pm-step-num">{i + 1}</span>}
            <span className="pm-step-text">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── AddPMFlow ────────────────────────────────────────────────────────────────

export function AddPMFlow({ methods, meetupEvents = [], onSave, onClose, editData, error, onRetry }) {
  const isEdit = !!editData;
  const [step, setStep] = useState(isEdit ? 4 : 0);

  const [selCurrency, setSelCurrency] = useState(editData?.currencies?.[0] || "");
  const [selCategory, setSelCategory] = useState(editData ? (methods[editData.methodId]?.category || "") : "");
  const [selCountry, setSelCountry] = useState("");
  const [selMethodId, setSelMethodId] = useState(editData?.methodId || "");
  const [details, setDetails] = useState(editData?.details || {});
  const [selCurrencies, setSelCurrencies] = useState(editData?.currencies || []);
  // User-editable nickname ("label"). Optional; stored empty when blank.
  const [pmLabel, setPmLabel] = useState(editData?.label || "");
  const [payRefCustom, setPayRefCustom] = useState(editData?.details?.reference ?? "");
  const [errors, setErrors] = useState({});
  const handleBlur = makeBlurHandler(setErrors);
  const [selRegion, setSelRegion] = useState("Europe");
  // The meetup event chosen on the cash flow's method step (step 3).
  const [pickedEvent, setPickedEvent] = useState(null);
  // Free-text search shown on the category step; matches across all methods
  // for the selected currency and skips the category/country drill-down.
  const [searchQuery, setSearchQuery] = useState("");

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
  // When a currency has only one applicable category, the Category step is
  // a one-click dead end — collapse it out of the flow in both directions.
  const skipCategoryStep = !!selCurrency && catsForCurrency.length === 1;

  const isCash = selCategory === "cash";
  const showCountryStep = isCash || (selCategory === "national" && !!nationalGroupFor(selCurrency));
  const countryGroup = nationalGroupFor(selCurrency);
  const countryMap = !isCash && showCountryStep ? NATIONAL_OPTIONS[countryGroup] : null;

  // ── Cash/meetup derivations ──────────────────────────────────────────────
  // Source meetups from the events feed: only live events, whose currencies
  // include the selected one, and that exist as an offerable cash method in the
  // catalogue. Grouped by country for the country step.
  const cashEvents = isCash
    ? (meetupEvents || []).filter((e) =>
        e && e.live && Array.isArray(e.currencies) &&
        e.currencies.includes(selCurrency) && methods[`cash.${e.id}`]
      )
    : [];
  const cashByCountry = (() => {
    if (!isCash) return {};
    const out = {};
    for (const e of cashEvents) (out[e.country] ||= []).push(e);
    return out;
  })();
  const meetupsForCountry = isCash && selCountry
    ? (cashByCountry[selCountry] || []).slice().sort(
        (a, b) => (Number(b.featured) - Number(a.featured)) ||
                  (a.city || "").localeCompare(b.city || "")
      )
    : [];
  // The selected meetup event: freshly picked one if it still matches, else
  // resolved from the catalogue id (covers the edit path).
  const selEvent = isCash
    ? ((pickedEvent && `cash.${pickedEvent.id}` === selMethodId)
        ? pickedEvent
        : (meetupEvents || []).find((e) => `cash.${e.id}` === selMethodId) || null)
    : null;
  const eventCurrencies = Array.isArray(selEvent?.currencies) ? selEvent.currencies : [];
  const cashNeedsCurrencyPick = eventCurrencies.length > 1;
  const cashSaveOk = !!selEvent && (!cashNeedsCurrencyPick || selCurrencies.length > 0);

  const methodsForStep = (() => {
    const allowed = showCountryStep && selCountry && countryMap
      ? new Set(countryMap[selCountry] || [])
      : null;
    return Object.entries(methods)
      .filter(([id, m]) =>
        m.category === selCategory &&
        m.currencies.includes(selCurrency) &&
        (!allowed || allowed.has(id))
      )
      .sort((a, b) => a[1].name.localeCompare(b[1].name));
  })();

  // ── Step-1 search results ───────────────────────────────────────────────
  // Flat list across all categories for the active currency. Matches are
  // substring + case-insensitive against the method name (plus country/city
  // for the national + meetup variants). National methods are expanded so a
  // method available in N countries yields N result rows. Meetups produce
  // one row per live event for selCurrency. Capped at 30 to keep the
  // dropdown manageable.
  const SEARCH_RESULT_CAP = 30;
  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || step !== 1 || !selCurrency) return [];

    const standard = [];
    const national = [];
    const meetups = [];

    // 1. Standard methods (not national, not cash)
    for (const [id, m] of Object.entries(methods)) {
      if (m.category === "cash" || m.category === "national") continue;
      if (!m.currencies.includes(selCurrency)) continue;
      if (!m.name.toLowerCase().includes(q)) continue;
      standard.push({
        key: `m:${id}`,
        label: m.name,
        sublabel: CATEGORY_META[m.category]?.label || m.category,
        logoSrc: getPaymentLogo(id),
        onPick: () => pickSearchMethod(id, ""),
      });
    }

    // 2. National-option methods, one row per (method, country) variant
    const ng = nationalGroupFor(selCurrency);
    if (ng && NATIONAL_OPTIONS[ng]) {
      for (const [code, methodIds] of Object.entries(NATIONAL_OPTIONS[ng])) {
        const cName = COUNTRY_NAMES[code] || code;
        for (const id of methodIds) {
          const m = methods[id];
          if (!m) continue;
          if (!m.currencies.includes(selCurrency)) continue;
          const nameMatch = m.name.toLowerCase().includes(q);
          const countryMatch = cName.toLowerCase().includes(q);
          if (!nameMatch && !countryMatch) continue;
          national.push({
            key: `n:${id}:${code}`,
            label: `${m.name} — ${cName}`,
            sublabel: CATEGORY_META.national.label,
            logoSrc: getPaymentLogo(id),
            onPick: () => pickSearchMethod(id, code),
          });
        }
      }
    }

    // 3. Cash meetup events for the active currency
    for (const e of meetupEvents || []) {
      if (!e || !e.live) continue;
      if (!Array.isArray(e.currencies) || !e.currencies.includes(selCurrency)) continue;
      if (!methods[`cash.${e.id}`]) continue;
      const label = e.longName || e.shortName || "";
      const city = e.city || "";
      const cName = countryName(e.country);
      const hay = `${label} ${city} ${cName}`.toLowerCase();
      if (!hay.includes(q)) continue;
      meetups.push({
        key: `c:${e.id}`,
        label,
        sublabel: city ? `${city}, ${cName}` : cName,
        logoSrc: e.logoUrl || null,
        flagCode: e.logoUrl ? null : e.country,
        onPick: () => pickSearchMeetup(e),
      });
    }

    standard.sort((a, b) => a.label.localeCompare(b.label));
    national.sort((a, b) => a.label.localeCompare(b.label));
    meetups.sort((a, b) => a.label.localeCompare(b.label));

    return [...standard, ...national, ...meetups].slice(0, SEARCH_RESULT_CAP);
  })();

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
  // The m-pesa alternative (used by Revolut/Wise) is identified by any field
  // id prefixed `mpesa_` in the active alternative. When it's on, the per-PM
  // currency picker is hidden and `selCurrencies` is forced to every currency
  // the method accepts.
  const isMpesaActive = resolvedSections.some((s) =>
    s.activeFields.some((f) => f.startsWith("mpesa_"))
  );
  // Hide the raw `reference` optional field — the web's "Payment reference"
  // widget below owns that concept and mirrors its value into details.reference
  // on save (see handleSave).
  const methodHasReference = (selMethod?.fields?.optional || []).includes("reference");
  const optionalFields = (selMethod?.fields?.optional || [])
    .filter((f) => !mandatoryFields.includes(f) && f !== "reference");

  const step3Ok = mandatoryFields.every((k) => (details[k] || "").trim().length > 0)
    && (isMpesaActive || selCurrencies.length > 0)
    && !Object.values(errors).some((e) => e);

  function handleSelectCurrency(c) {
    setSelCurrency(c);
    setSelCountry("");
    setSelMethodId("");
    setDetails({});
    setSelCurrencies([]);
    setErrors({});
    setSearchQuery("");
    // Compute categories inline — `catsForCurrency` reflects the previous
    // selCurrency until the next render.
    const cats = [...new Set(
      Object.values(methods)
        .filter(m => m.currencies.includes(c))
        .map(m => m.category)
    )];
    if (cats.length === 1) {
      const cat = cats[0];
      setSelCategory(cat);
      const goCountry = cat === "cash" || (cat === "national" && !!nationalGroupFor(c));
      setStep(goCountry ? 2 : 3);
    } else {
      setSelCategory("");
      setStep(1);
    }
  }

  function handleSelectCategory(cat) {
    setSelCategory(cat);
    setSelCountry("");
    setSelMethodId("");
    setDetails({});
    setSelCurrencies([]);
    setErrors({});
    setPickedEvent(null);
    const goCountry = cat === "cash" || (cat === "national" && !!nationalGroupFor(selCurrency));
    setStep(goCountry ? 2 : 3);
  }

  // Cash flow: pick a meetup on step 3 → straight to the info-only detail step.
  function handleSelectMeetup(event) {
    setPickedEvent(event);
    setSelMethodId(`cash.${event.id}`);
    setDetails({ country: event.country });
    setErrors({});
    const evCurr = Array.isArray(event.currencies) ? event.currencies : [];
    if (evCurr.length <= 1) setSelCurrencies(evCurr);
    else setSelCurrencies(evCurr.includes(selCurrency) ? [selCurrency] : [evCurr[0]]);
    setStep(4);
  }

  function handleSelectCountry(code) {
    setSelCountry(code);
    setSelMethodId("");
    setDetails({});
    setErrors({});
    setStep(3);
  }

  function handleSelectMethod(id) {
    setSelMethodId(id);
    setDetails({});
    setErrors({});
    const m = methods[id];
    if (m) {
      setSelCurrencies(m.currencies.includes(selCurrency) ? [selCurrency] : [m.currencies[0]]);
    }
    setStep(4);
  }

  // Jump from a search-result row straight to the details form. National
  // variants pre-set the country so the (skipped) country step is consistent
  // if the user navigates back. Meetup rows route through handleSelectMeetup.
  function pickSearchMethod(id, countryCode) {
    const m = methods[id];
    if (!m) return;
    setSelCategory(m.category);
    setSelCountry(countryCode || "");
    setSelMethodId(id);
    setDetails({});
    setSelCurrencies(m.currencies.includes(selCurrency) ? [selCurrency] : [m.currencies[0]]);
    setErrors({});
    setPickedEvent(null);
    setSearchQuery("");
    setStep(4);
  }

  function pickSearchMeetup(event) {
    // handleSelectMeetup expects to be called from inside the cash flow
    // (where selCategory === "cash" is already set), since the step-4 cash
    // branch is gated on isCash. Pre-set category + country before jumping.
    setSelCategory("cash");
    setSelCountry(event.country);
    setSearchQuery("");
    handleSelectMeetup(event);
  }

  // Back-button routing: skip the country step on non-national flows, and skip
  // the category step when the chosen currency has only one applicable category.
  function prevStep(s) {
    if (s === 4) return 3;
    if (s === 3) {
      if (showCountryStep) return 2;
      return skipCategoryStep ? 0 : 1;
    }
    if (s === 2) return skipCategoryStep ? 0 : 1;
    if (s === 1) return 0;
    return 0;
  }

  function toggleCurrency(c) {
    setSelCurrencies(prev =>
      prev.includes(c)
        ? prev.length > 1 ? prev.filter(x => x !== c) : prev
        : [...prev, c]
    );
  }

  // Cash/meetup PMs have no input fields — the only state is the chosen meetup
  // and (for multi-currency events) the selected currencies. Country rides
  // along in details so existing serialization picks it up unchanged.
  function handleSaveCash() {
    if (!selEvent) return;
    const currencies = cashNeedsCurrencyPick ? selCurrencies : eventCurrencies;
    if (currencies.length === 0) return;
    const methodId = `cash.${selEvent.id}`;
    const name = selEvent.shortName || selEvent.longName || methodId;
    onSave({
      id:         editData?.id || `${methodId}-${Date.now()}`,
      methodId,
      name,
      label:      name,
      currencies,
      details:    { country: selEvent.country },
    });
  }

  function handleSave() {
    if (isCash) { handleSaveCash(); return; }
    const newErrors = {};
    const phonePrefix = PHONE_PREFIX_MAP[selMethodId];
    // Mandatory fields: must be non-empty + pass per-field validator from meta.
    for (const fid of mandatoryFields) {
      const val = (details[fid] || "").trim();
      if (!val) {
        newErrors[fid] = "Required";
        continue;
      }
      const meta = getFieldMeta(fid);
      const r = meta.validatorWithPrefix
        ? validatePhone(val, phonePrefix)
        : meta.validator
          ? meta.validator(val)
          : { valid: true };
      if (!r.valid) { newErrors[fid] = r.error; continue; }
      if (meta.requireAllowedCountry) {
        const r2 = isPhoneAllowed(val);
        if (!r2.valid) newErrors[fid] = r2.error;
      }
    }
    // Optional fields: only validate if non-empty.
    for (const fid of optionalFields) {
      const val = (details[fid] || "").trim();
      if (!val) continue;
      const meta = getFieldMeta(fid);
      const r = meta.validatorWithPrefix
        ? validatePhone(val, phonePrefix)
        : meta.validator
          ? meta.validator(val)
          : { valid: true };
      if (!r.valid) { newErrors[fid] = r.error; continue; }
      if (meta.requireAllowedCountry) {
        const r2 = isPhoneAllowed(val);
        if (!r2.valid) newErrors[fid] = r2.error;
      }
    }
    // Payment reference: forbidden-words check (empty is allowed).
    if (payRefCustom.trim()) {
      const r = validatePaymentReference(payRefCustom);
      if (!r.valid) newErrors.reference = r.error;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    // Only persist fields that belong to the active tab or the optional set,
    // plus the payment-reference value and the variant index.
    const allowedKeys = new Set([...mandatoryFields, ...optionalFields]);
    const cleanDetails = {};
    for (const [k, v] of Object.entries(details)) {
      if (allowedKeys.has(k)) cleanDetails[k] = v;
    }
    // Wire the payment-reference widget's value into details.reference for
    // methods that list `reference` as an API-optional field — same shape mobile uses.
    if (methodHasReference && payRefCustom.trim()) {
      cleanDetails.reference = payRefCustom.trim();
    }
    if (hasAnyTabs) {
      const variants = {};
      for (const s of resolvedSections) {
        if (s.alternatives.length > 1) variants[s.sectionIdx] = s.activeAltIdx;
      }
      cleanDetails._variants = variants;
    }
    // M-Pesa flag + country auto-derivation (matches mobile's PaymentData shape).
    // `country` from IBAN's first 2 chars lets a SEPA counterparty see the country
    // before accepting the trade request. `isMpesa` rides alongside hashes so the
    // counterparty knows to treat the encrypted fields as M-Pesa-shaped.
    if (isMpesaActive) cleanDetails.isMpesa = true;
    if (cleanDetails.iban && !cleanDetails.country) {
      const code = cleanDetails.iban.replace(/\s+/g, "").slice(0, 2).toUpperCase();
      if (/^[A-Z]{2}$/.test(code)) cleanDetails.country = code;
    }

    const methodName = selMethod?.name || selMethodId;
    const pm = {
      id:         editData?.id || `${selMethodId}-${Date.now()}`,
      methodId:   selMethodId,
      name:       methodName,
      label:      (pmLabel || "").trim(),
      currencies: isMpesaActive ? [...methodCurrencies] : selCurrencies,
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
                <button className="modal-back" onClick={() => setStep(prevStep(step))}>
                  <IconBack/>
                </button>
              )}
              <span className="modal-title">
                {isEdit ? `Edit ${editData.name}` :
                 step === 0 ? "Select currency" :
                 step === 1 ? "Select category" :
                 step === 2 ? "Select country" :
                 step === 3 ? (isCash ? "Select meetup" : "Select method") :
                 isCash ? (selEvent?.shortName || "Meetup") : "Enter details"}
              </span>
            </div>
            <button className="modal-close" onClick={onClose}>
              {isEdit && <span className="modal-cancel-text">cancel</span>}✕
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ padding:"12px 22px 0" }}>
            <ProgressBar step={step} showCountryStep={showCountryStep} meetupMode={isCash} skipCategoryStep={skipCategoryStep && step > 0}/>
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
                      {AFRICA_CURRENCY_COUNTRY[c] && (
                        <span className="pm-option-country">{AFRICA_CURRENCY_COUNTRY[c]}</span>
                      )}
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

            {/* ── STEP 1: Category (+ search across all methods) ── */}
            {step === 1 && (
              <>
                <input
                  type="text"
                  className="pm-search-input"
                  placeholder="Search payment methods…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery.trim() === "" ? (
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
                ) : (
                  <div className="pm-cat-list">
                    {searchResults.map(r => (
                      <button key={r.key} className="pm-cat-card" onClick={r.onPick}>
                        {r.logoSrc
                          ? <img className="pm-method-logo" src={r.logoSrc} alt=""
                              onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}/>
                          : r.flagCode
                            ? <span className="pm-country-flag">{countryFlag(r.flagCode)}</span>
                            : <span className="pm-method-logo"/>}
                        <div className="pm-cat-text">
                          <span className="pm-cat-label">{r.label}</span>
                          <span className="pm-cat-desc">{r.sublabel}</span>
                        </div>
                        <span className="pm-cat-arrow">→</span>
                      </button>
                    ))}
                    {searchResults.length === 0 && (
                      <div className="pm-empty-msg">No methods match “{searchQuery}”</div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── STEP 2: Country (national options) ── */}
            {step === 2 && !isCash && countryMap && (
              <div className="pm-cat-list">
                {Object.keys(countryMap)
                  .sort((a, b) => (COUNTRY_NAMES[a] || a).localeCompare(COUNTRY_NAMES[b] || b))
                  .map(code => {
                    const methodCount = countryMap[code].length;
                    return (
                      <button key={code}
                        className={`pm-cat-card${selCountry === code ? " selected" : ""}`}
                        onClick={() => handleSelectCountry(code)}>
                        <span className="pm-country-flag">{countryFlag(code)}</span>
                        <div className="pm-cat-text">
                          <span className="pm-cat-label">{COUNTRY_NAMES[code] || code}</span>
                          <span className="pm-cat-desc">
                            {methodCount} method{methodCount !== 1 ? "s" : ""} available
                          </span>
                        </div>
                        <span className="pm-cat-arrow">→</span>
                      </button>
                    );
                  })}
              </div>
            )}

            {/* ── STEP 2: Country (cash & meetups) ── */}
            {step === 2 && isCash && (
              <div className="pm-cat-list">
                {Object.keys(cashByCountry)
                  .sort((a, b) => countryName(a).localeCompare(countryName(b)))
                  .map(code => {
                    const n = cashByCountry[code].length;
                    return (
                      <button key={code}
                        className={`pm-cat-card${selCountry === code ? " selected" : ""}`}
                        onClick={() => handleSelectCountry(code)}>
                        <span className="pm-country-flag">{countryFlag(code)}</span>
                        <div className="pm-cat-text">
                          <span className="pm-cat-label">{countryName(code)}</span>
                          <span className="pm-cat-desc">
                            {n} meetup{n !== 1 ? "s" : ""} available
                          </span>
                        </div>
                        <span className="pm-cat-arrow">→</span>
                      </button>
                    );
                  })}
                {Object.keys(cashByCountry).length === 0 && (
                  <div className="pm-empty-msg">No meetups available for {selCurrency}</div>
                )}
              </div>
            )}

            {/* ── STEP 3: Meetup (cash & meetups) ── */}
            {step === 3 && isCash && (
              <div className="pm-cat-list">
                {meetupsForCountry.map(ev => (
                  <button key={ev.id}
                    className={`pm-cat-card${selMethodId === `cash.${ev.id}` ? " selected" : ""}`}
                    onClick={() => handleSelectMeetup(ev)}>
                    {ev.logoUrl
                      ? <img className="pm-method-logo" src={ev.logoUrl} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}/>
                      : <span className="pm-country-flag">{countryFlag(ev.country)}</span>}
                    <div className="pm-cat-text" style={{ flex:1 }}>
                      <span className="pm-cat-label">{ev.longName || ev.shortName}{ev.featured ? " ★" : ""}</span>
                      <span className="pm-cat-desc">{ev.city || countryName(ev.country)}</span>
                    </div>
                    <span className="pm-cat-arrow">→</span>
                  </button>
                ))}
                {meetupsForCountry.length === 0 && (
                  <div className="pm-empty-msg">No meetups in this country for {selCurrency}</div>
                )}
              </div>
            )}

            {/* ── STEP 3: Method ── */}
            {step === 3 && !isCash && (
              <div className="pm-cat-list">
                {methodsForStep.map(([id, m]) => (
                  <button key={id}
                    className={`pm-cat-card${selMethodId === id ? " selected" : ""}`}
                    onClick={() => handleSelectMethod(id)}>
                    <img className="pm-method-logo" src={getPaymentLogo(id)} alt=""/>
                    <div className="pm-cat-text" style={{ flex:1 }}>
                      <span className="pm-cat-label">{m.name}</span>
                      <span className="pm-cat-desc">{m.currencies.join(", ")}</span>
                    </div>
                    <span className="pm-cat-arrow">→</span>
                  </button>
                ))}
                {methodsForStep.length === 0 && (
                  <div className="pm-empty-msg">No methods in this category for {selCurrency}</div>
                )}
              </div>
            )}

            {/* ── STEP 4: Meetup details (cash & meetups, info only) ── */}
            {step === 4 && isCash && selEvent && (
              <>
                {selEvent.logoUrl && (
                  <div className="pm-meetup-logo-wrap">
                    <img className="pm-meetup-logo" src={selEvent.logoUrl} alt=""
                      onError={(e) => { e.currentTarget.parentNode.style.display = "none"; }}/>
                  </div>
                )}

                <p className="pm-meetup-desc">
                  You can use cash to trade with your fellow bitcoiners at {selEvent.longName}!
                </p>

                {selEvent.frequency && (
                  <p className="pm-meetup-line">
                    Meetup date: <strong>{selEvent.frequency}</strong>
                  </p>
                )}

                {selEvent.address && (
                  <p className="pm-meetup-addr">{selEvent.address}</p>
                )}

                <div className="pm-meetup-links">
                  {selEvent.address && (
                    <a className="pm-meetup-link"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selEvent.address)}`}
                      target="_blank" rel="noopener noreferrer">
                      VIEW ON MAPS <IconExtLink/>
                    </a>
                  )}
                  {selEvent.url && (
                    <a className="pm-meetup-link"
                      href={selEvent.url} target="_blank" rel="noopener noreferrer">
                      MEETUP LINK <IconExtLink/>
                    </a>
                  )}
                </div>

                {cashNeedsCurrencyPick && (
                  <div style={{ marginTop:18 }}>
                    <label className="field-label" style={{ marginBottom:8 }}>
                      Currencies <span style={{ fontWeight:500, textTransform:"none",
                        letterSpacing:0, color:"var(--black-25)" }}>— select all that apply</span>
                    </label>
                    <div className="curr-check-grid">
                      {eventCurrencies.map(c => (
                        <button key={c} className={`curr-check-btn${selCurrencies.includes(c) ? " on" : ""}`}
                          onClick={() => toggleCurrency(c)}>
                          {selCurrencies.includes(c) && "✓ "}{c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button className="btn-save-pm" style={{ marginTop:20 }} disabled={!cashSaveOk} onClick={handleSave}>
                  {isEdit ? "Save changes" : "Add payment method"}
                </button>
              </>
            )}

            {/* ── STEP 4: Details ── */}
            {step === 4 && !isCash && selMethod && (
              <>
                <div className="pm-detail-header">
                  <span className="pm-detail-tag">{selMethod.name}</span>
                  {selCurrencies.length <= 1 && (
                    <span className="pm-detail-curr">{selCurrencies[0] || selCurrency}</span>
                  )}
                </div>

                {methodCurrencies.length > 1 && !isMpesaActive && (
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

                <div style={{ marginBottom:14 }}>
                  <label className="field-label">
                    Label
                    <span style={{ fontWeight:500, textTransform:"none",
                      letterSpacing:0, color:"var(--black-25)", marginLeft:4 }}>(optional)</span>
                  </label>
                  <input className="modal-input"
                    placeholder={selMethod?.name || "e.g. My main account"}
                    value={pmLabel}
                    onChange={(e) => setPmLabel(e.target.value)}
                  />
                </div>

                {(() => {
                  const renderField = (fid, isOptional) => {
                    const meta = getFieldMeta(fid);
                    const phonePrefix = meta.validatorWithPrefix ? PHONE_PREFIX_MAP[selMethodId] : null;
                    const hasValidator = !!meta.validator || !!meta.validatorWithPrefix;

                    function handleFieldBlur() {
                      const val = (details[fid] || "").trim();
                      if (!val && isOptional) { setErrors((p) => ({ ...p, [fid]: null })); return; }
                      let primaryOk = true;
                      if (meta.validatorWithPrefix) primaryOk = handleBlur(fid, details[fid], validatePhone, phonePrefix);
                      else if (meta.validator) primaryOk = handleBlur(fid, details[fid], meta.validator);
                      if (primaryOk && meta.requireAllowedCountry) {
                        handleBlur(fid, details[fid], isPhoneAllowed);
                      }
                    }

                    if (meta.type === "single-select") {
                      const opts = meta.options || [];
                      const current = details[fid] || "";
                      return (
                        <div key={fid} style={{ marginBottom:14 }}>
                          <label className="field-label" style={{ marginBottom:8 }}>
                            {meta.label}
                            {isOptional && <span style={{ fontWeight:500, textTransform:"none",
                              letterSpacing:0, color:"var(--black-25)", marginLeft:4 }}>(optional)</span>}
                          </label>
                          <div className="curr-check-grid">
                            {opts.map((opt) => (
                              <button key={opt}
                                className={`curr-check-btn${current === opt ? " on" : ""}`}
                                onClick={() => {
                                  setDetails((prev) => ({ ...prev, [fid]: opt }));
                                  if (errors[fid]) setErrors((p) => ({ ...p, [fid]: null }));
                                }}>
                                {current === opt && "✓ "}{opt}
                              </button>
                            ))}
                          </div>
                          <FieldError error={errors[fid]}/>
                        </div>
                      );
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
                          onBlur={hasValidator ? handleFieldBlur : undefined}
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
                  <input className="modal-input"
                    placeholder="don't mention peach or bitcoin !"
                    value={payRefCustom}
                    onChange={e => {
                      setPayRefCustom(e.target.value);
                      if (errors.reference) setErrors(p => ({ ...p, reference: null }));
                    }}
                    onBlur={() => handleBlur("reference", payRefCustom, validatePaymentReference)}
                    style={errors.reference ? { borderColor:"var(--error)" } : undefined}
                  />
                  <FieldError error={errors.reference}/>
                  {!errors.reference && (
                    <div style={{ fontSize:".66rem", color:"var(--black-25)", fontWeight:500, marginTop:4 }}>(optional)</div>
                  )}
                </div>

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
                      {payRefCustom || "empty"}
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
  .pm-option-country{display:block;font-size:.62rem;font-weight:500;
    color:var(--black-65);margin-top:2px}

  /* Step 1: Search bar (filters across all methods for selected currency) */
  .pm-search-input{width:100%;box-sizing:border-box;border:1.5px solid var(--black-10);
    border-radius:10px;padding:10px 14px;font-family:var(--font);font-size:.88rem;
    font-weight:500;color:var(--black);background:var(--surface);outline:none;
    transition:border-color .15s;margin-top:8px;margin-bottom:4px}
  .pm-search-input:focus{border-color:var(--primary)}
  .pm-search-input::placeholder{color:var(--black-25)}

  /* Step 1/2: Category/method list */
  .pm-cat-list{display:flex;flex-direction:column;gap:8px;margin-top:8px}
  .pm-cat-card{display:flex;align-items:center;gap:14px;border:1.5px solid var(--black-10);
    border-radius:12px;padding:14px 16px;background:var(--surface);cursor:pointer;
    font-family:var(--font);transition:all .15s;text-align:left;width:100%}
  .pm-cat-card:hover{border-color:var(--primary);background:var(--error-bg)}
  .pm-cat-card.selected{border-color:var(--primary);background:var(--primary-mild)}
  .pm-cat-icon{width:40px;height:40px;border-radius:10px;background:var(--primary-mild);
    display:flex;align-items:center;justify-content:center;color:var(--primary-dark);flex-shrink:0}
  .pm-method-logo{width:40px;height:40px;border-radius:10px;background:var(--black-5);
    padding:5px;object-fit:contain;flex-shrink:0}
  .pm-country-flag{width:40px;height:40px;border-radius:10px;background:var(--black-5);
    display:flex;align-items:center;justify-content:center;font-size:1.5rem;line-height:1;
    flex-shrink:0}
  .pm-cat-text{flex:1;min-width:0}
  .pm-cat-label{display:block;font-size:.88rem;font-weight:700;color:var(--black)}
  .pm-cat-desc{display:block;font-size:.72rem;font-weight:500;color:var(--black-65);margin-top:1px}
  .pm-cat-arrow{font-size:1rem;color:var(--black-25);flex-shrink:0;transition:color .15s}
  .pm-cat-card:hover .pm-cat-arrow{color:var(--primary)}

  .pm-empty-msg{text-align:center;padding:24px;font-size:.85rem;color:var(--black-65)}

  /* Step 4: Meetup details (info only) */
  .pm-meetup-logo-wrap{display:flex;justify-content:center;margin:4px 0 18px}
  .pm-meetup-logo{max-width:120px;max-height:120px;border-radius:16px;object-fit:contain;
    background:var(--black-5);padding:6px}
  .pm-meetup-desc{font-size:.92rem;font-weight:500;color:var(--black);line-height:1.5;margin:0 0 16px}
  .pm-meetup-line{font-size:.92rem;font-weight:500;color:var(--black);margin:0 0 14px}
  .pm-meetup-line strong{color:var(--primary);font-weight:800}
  .pm-meetup-addr{font-size:.92rem;font-weight:500;color:var(--black);line-height:1.45;
    margin:0 0 16px;white-space:pre-line}
  .pm-meetup-links{display:flex;flex-direction:column;gap:12px;align-items:flex-start}
  .pm-meetup-link{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;font-weight:700;
    text-transform:uppercase;letter-spacing:.03em;color:var(--black-65);text-decoration:underline;
    text-underline-offset:2px}
  .pm-meetup-link svg{color:var(--primary)}
  .pm-meetup-link:hover{color:var(--primary-dark)}

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
    transition:transform .15s,opacity .15s}
  .btn-save-pm:hover{transform:translateY(-1px)}
  .btn-save-pm:disabled{opacity:.4;cursor:not-allowed;transform:none}

`;
