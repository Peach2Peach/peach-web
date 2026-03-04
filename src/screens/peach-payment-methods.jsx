import { useState, useEffect, useRef } from "react";
// ⚠️ react-router-dom removed for Claude.ai preview. Restore import for local dev.
import { useNavigate } from "react-router-dom";

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const PeachIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 352 353" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect y="0.38" width="352" height="352" rx="58.13" fill="#FFF9F6"/>
    <path d="M151.8 45.5c11.2-1.2 21.1 5.35 24.2 16.02.54 1.88.82 3.89.88 5.86.13 4.2.05 8.41.05 12.62 0 .39-.33.69-.72.7-3.07.11-6.08-.02-9.02-1-9.21-3.03-15.33-11.47-15.42-21.35-.04-4-.01-8.01 0-12.01" fill="#05A85A"/>
    <path d="M205.3 64.23c.99 8.75-5.26 16.21-13.69 16.46-4.77.14-9.15-3.93-7.14-8.26.95-2.06 2.42-3.88 4.47-5.44 2.3-1.76 4.93-2.69 7.82-2.74 2.83-.04 5.66 0 8.54 0" fill="#05A85A"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M276 155.69c0 49.73-43.64 96.87-97.47 96.87-19.52 0-37.71-6.2-52.95-16.48v49.48c0 12.29-9.96 22.26-22.26 22.26s-22.26-9.97-22.26-22.26V157.39h.02c-.01-.57-.02-1.13-.02-1.7 0-43.02 32.67-72.02 76.33-68.64 14.01 1.09 28.26 1.09 42.27 0 43.67-3.39 76.34 25.62 76.34 68.64zM125.61 163.8v-.39c.1-24.1 19.36-39.92 44.44-36.17 5.13.77 10.37.77 15.49 0 25.15-3.77 44.44 12.15 44.44 36.35 0 26.64-23.36 51.89-52.19 51.89-28.75 0-52.07-25.13-52.18-51.68z" fill="url(#pg_pm)"/>
    <defs>
      <radialGradient id="pg_pm" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(276 88) rotate(159) scale(220 130)">
        <stop stopColor="#FFA24C"/><stop offset=".5" stopColor="#FF7A50"/><stop offset="1" stopColor="#FF4D42"/>
      </radialGradient>
    </defs>
  </svg>
);

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconMarket     = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,14 7,9 11,12 18,5"/><polyline points="13,5 18,5 18,10"/></svg>;
const IconTrades     = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 7h10M13 4l3 3-3 3"/><path d="M15 13H5M7 10l-3 3 3 3"/></svg>;
const IconCreate     = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>;
const IconSettings   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>;
const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="18" height="13" rx="2"/><line x1="1" y1="9" x2="19" y2="9"/><line x1="5" y1="14" x2="8" y2="14"/></svg>;
const IconChevLeft   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,2 4,7 9,12"/></svg>;
const IconChevRight  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="5,2 10,7 5,12"/></svg>;
const IconBurger     = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="4.5" x2="16" y2="4.5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13.5" x2="16" y2="13.5"/></svg>;
const IconPlus       = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>;
const IconEdit       = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M8.5 2.5l3 3M2 9l6-6 3 3-6 6H2V9z"/></svg>;
const IconTrash      = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 4h8M5.5 4V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4 4l.5 8h5l.5-8"/></svg>;
const IconCheck      = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,7 6,10.5 11,4"/></svg>;
const IconBack       = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,3 5,8 10,13"/></svg>;

const IcoBtc = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}>
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M22.2 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.1-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8.9l-.8 3.3c.1 0 .2 0 .3.1-.1 0-.2-.1-.3-.1L11.4 20c-.1.3-.4.7-1 .5 0 0-1.2-.3-1.2-.3l-.8 1.8 2 .5c.4.1.7.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.2 1.4.3l-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.03-3.2-1.5-3.9 1.1-.25 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.6.8 4.1 2.9zm.5-5.3c-.45 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.8.6 3.4 2.5z" fill="white"/>
  </svg>
);

// ─── CATEGORY ICONS (inline SVGs for the 4 PM categories) ────────────────────
const IconBank = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg>;
const IconWallet = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5"/></svg>;
const IconGiftCard = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18"/><path d="M12 8c-2-3-6-3-6 0s4 0 6 0c2-3 6-3 6 0s-4 0-6 0"/></svg>;
const IconFlag = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"home",     label:"Home",     icon:()=><PeachIcon size={20}/> },
  { id:"market",   label:"Market",   icon:()=><IconMarket/> },
  { id:"trades",   label:"Trades",   icon:()=><IconTrades/> },
  { id:"create",   label:"Create",   icon:()=><IconCreate/> },
  { id:"payment-methods", label:"Payments", icon:()=><IconCreditCard/> },
  { id:"settings", label:"Settings", icon:()=><IconSettings/> },
];
const NAV_ROUTES = { home:"/home", market:"/market", trades:"/trades", create:"/offer/new", settings:"/settings", "payment-methods":"/payment-methods" };

function SideNav({ active, collapsed, onToggle, mobileOpen, onClose, onNavigate, mobilePriceSlot }) {
  return (
    <>
      <div className={`sidenav-backdrop${mobileOpen ? " open" : ""}`} onClick={onClose}/>
      <nav className={`sidenav${collapsed ? " sidenav-collapsed" : ""}${mobileOpen ? " sidenav-mobile-open" : ""}`}>
        <button className="sidenav-toggle" onClick={onToggle}>{collapsed ? <IconChevRight/> : <IconChevLeft/>}</button>
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button key={id} className={`sidenav-item${active === id ? " sidenav-active" : ""}`}
            onClick={() => { if (onNavigate && NAV_ROUTES[id]) onNavigate(NAV_ROUTES[id]); }}>
            <span className="sidenav-icon">{icon()}</span>
            <span className="sidenav-label">{label}</span>
          </button>
        ))}
        {mobilePriceSlot && (
          <div className="sidenav-price-slot">{mobilePriceSlot}</div>
        )}
      </nav>
    </>
  );
}

// ─── PAYMENT METHOD CATALOGUE ─────────────────────────────────────────────────
// This is the mock fallback. In production this comes from GET /info/paymentMethods.
// Structure: { [methodId]: { name, currencies[], category } }
// Categories: "bankTransfer", "onlineWallet", "giftCard", "national"

const CATEGORY_META = {
  bankTransfer:  { label: "Bank Transfer",       icon: IconBank,     description: "Traditional bank transfers" },
  onlineWallet:  { label: "Online Wallet",        icon: IconWallet,   description: "Digital payment apps" },
  giftCard:      { label: "Online Gift Card",     icon: IconGiftCard, description: "Prepaid gift cards" },
  national:      { label: "National Option",      icon: IconFlag,     description: "Country-specific methods" },
};

// Currency → region mapping for the currency picker tabs
const CURRENCY_REGIONS = {
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

const FALLBACK_METHODS = {
  // Bank transfers
  sepa:               { name: "SEPA",                  currencies: ["EUR","CHF"],                        category: "bankTransfer" },
  fasterPayments:     { name: "Faster Payments",       currencies: ["GBP"],                              category: "bankTransfer" },
  instantSepa:        { name: "SEPA Instant",          currencies: ["EUR"],                              category: "bankTransfer" },
  // Online wallets
  revolut:            { name: "Revolut",               currencies: ["EUR","CHF","GBP","USD","SEK","NOK","DKK","PLN","CZK","HUF"], category: "onlineWallet" },
  wise:               { name: "Wise",                  currencies: ["EUR","CHF","GBP","USD","SEK","NOK","DKK","PLN","CZK","HUF"], category: "onlineWallet" },
  paypal:             { name: "PayPal",                currencies: ["EUR","GBP","USD","CHF"],            category: "onlineWallet" },
  advcash:            { name: "Advcash",               currencies: ["EUR","USD"],                        category: "onlineWallet" },
  strike:             { name: "Strike",                currencies: ["USD"],                              category: "onlineWallet" },
  n26:                { name: "N26",                   currencies: ["EUR"],                              category: "onlineWallet" },
  // Gift cards
  amazonGiftCard:     { name: "Amazon Gift Card",      currencies: ["EUR","GBP","USD","CHF","SEK"],      category: "giftCard" },
  // Global / crypto-adjacent
  dollarOnChain:      { name: "Dollar On Chain (DOC)", currencies: ["DOC"],                              category: "onlineWallet" },
  lnurlBtcSwap:       { name: "LNURL BTC Swap",        currencies: ["LNURL"],                            category: "onlineWallet" },
  usdt:               { name: "USDT",                  currencies: ["USDT"],                             category: "onlineWallet" },
  usdc:               { name: "USDC",                  currencies: ["USDC"],                             category: "onlineWallet" },
  // National options
  bizum:              { name: "Bizum",                 currencies: ["EUR"],                              category: "national" },
  twint:              { name: "Twint",                 currencies: ["CHF"],                              category: "national" },
  swish:              { name: "Swish",                 currencies: ["SEK"],                              category: "national" },
  mobilePay:          { name: "MobilePay",             currencies: ["DKK","EUR"],                        category: "national" },
  vipps:              { name: "Vipps",                 currencies: ["NOK"],                              category: "national" },
  satispay:           { name: "Satispay",              currencies: ["EUR"],                              category: "national" },
  mbWay:              { name: "MB Way",                currencies: ["EUR"],                              category: "national" },
  iris:               { name: "IRIS",                  currencies: ["EUR"],                              category: "national" },
  paylib:             { name: "Paylib",                currencies: ["EUR"],                              category: "national" },
  verse:              { name: "Verse",                 currencies: ["EUR"],                              category: "national" },
  blik:               { name: "BLIK",                  currencies: ["PLN"],                              category: "national" },
};

// Fields to collect per method type
const METHOD_FIELDS = {
  sepa:           [{ key:"holder", label:"Account holder name", placeholder:"Full name" },
                   { key:"iban",   label:"IBAN",                placeholder:"DE89 3704 0044 0532 0130 00" },
                   { key:"bic",    label:"BIC",                 placeholder:"COBADEFFXXX", optional:true }],
  instantSepa:    [{ key:"holder", label:"Account holder name", placeholder:"Full name" },
                   { key:"iban",   label:"IBAN",                placeholder:"DE89 3704 0044 0532 0130 00" },
                   { key:"bic",    label:"BIC",                 placeholder:"COBADEFFXXX", optional:true }],
  fasterPayments: [{ key:"holder",    label:"Account holder name", placeholder:"Full name" },
                   { key:"sortCode",  label:"Sort code",           placeholder:"12-34-56" },
                   { key:"accountNo", label:"Account number",      placeholder:"12345678" }],
  revolut:        [{ key:"username", label:"Revolut username or phone", placeholder:"@username or +33..." }],
  wise:           [{ key:"email",    label:"Email or @handle",         placeholder:"you@example.com" }],
  paypal:         [{ key:"email",    label:"PayPal email",             placeholder:"you@example.com" }],
  advcash:        [{ key:"email",    label:"Advcash email",            placeholder:"you@example.com" }],
  strike:         [{ key:"username", label:"Strike username",          placeholder:"@username" }],
  n26:            [{ key:"email",    label:"N26 email or IBAN",        placeholder:"you@example.com" }],
  amazonGiftCard: [{ key:"email",    label:"Email for gift card code", placeholder:"you@example.com" }],
  dollarOnChain:  [{ key:"address",  label:"Wallet address",           placeholder:"0x... or RSK address" }],
  lnurlBtcSwap:   [{ key:"lnurl",    label:"LNURL or Lightning address", placeholder:"LNURL1... or user@domain.com" }],
  usdt:           [{ key:"address",  label:"Wallet address",           placeholder:"Network + address" },
                   { key:"network",  label:"Network",                  placeholder:"Ethereum, Tron, etc." }],
  usdc:           [{ key:"address",  label:"Wallet address",           placeholder:"Network + address" },
                   { key:"network",  label:"Network",                  placeholder:"Ethereum, Solana, etc." }],
  bizum:          [{ key:"phone",    label:"Phone number",             placeholder:"+34 612 345 678" }],
  twint:          [{ key:"phone",    label:"Phone number",             placeholder:"+41 79 123 45 67" }],
  swish:          [{ key:"phone",    label:"Phone number",             placeholder:"+46 70 123 45 67" }],
  mobilePay:      [{ key:"phone",    label:"Phone number",             placeholder:"+45 12 34 56 78" }],
  vipps:          [{ key:"phone",    label:"Phone number",             placeholder:"+47 912 34 567" }],
  satispay:       [{ key:"phone",    label:"Phone number",             placeholder:"+39 312 345 6789" }],
  mbWay:          [{ key:"phone",    label:"Phone number",             placeholder:"+351 912 345 678" }],
  iris:           [{ key:"phone",    label:"Phone number",             placeholder:"+30 691 234 5678" }],
  paylib:         [{ key:"phone",    label:"Phone number",             placeholder:"+33 6 12 34 56 78" }],
  verse:          [{ key:"phone",    label:"Phone number",             placeholder:"+34 612 345 678" }],
  blik:           [{ key:"phone",    label:"Phone number",             placeholder:"+48 512 345 678" }],
};

// Derive a display label for a saved PM (with masking)
function methodLabel(pm) {
  const d = pm.details || {};
  if (d.iban)      return d.iban.replace(/\s/g,"").replace(/^(.{4})(.*)(.{4})$/, "$1 •••• $3");
  if (d.email)     return d.email.replace(/(.{2})(.*)(@.*)/, "$1•••$3");
  if (d.username)  return d.username;
  if (d.phone)     return d.phone.replace(/(.{5})(.*)(.{3})/, "$1•••$3");
  if (d.holder)    return d.holder;
  if (d.sortCode)  return `${d.sortCode} / ${d.accountNo || ""}`;
  return "—";
}

// Mock saved PMs (would come from GET /user/me/paymentMethods)
const MOCK_SAVED = [
  { id:"pm1", methodId:"sepa",    name:"SEPA",    currencies:["EUR","CHF"], details:{ holder:"Peter Weber", iban:"DE89 3704 0044 0532 0130 00" }},
  { id:"pm2", methodId:"revolut", name:"Revolut",  currencies:["EUR","GBP"], details:{ username:"@peterweber" }},
  { id:"pm3", methodId:"twint",   name:"Twint",    currencies:["CHF"],       details:{ phone:"+41 79 123 45 67" }},
];

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
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

// ─── ADD PM MODAL ─────────────────────────────────────────────────────────────
function AddPMFlow({ methods, onSave, onClose, editData }) {
  const isEdit = !!editData;
  const [step, setStep] = useState(isEdit ? 3 : 0); // skip to details if editing

  // Step 0: Currency
  const [selCurrency, setSelCurrency] = useState(editData?.currencies?.[0] || "");

  // Step 1: Category
  const [selCategory, setSelCategory] = useState(editData ? (methods[editData.methodId]?.category || "") : "");

  // Step 2: Method
  const [selMethodId, setSelMethodId] = useState(editData?.methodId || "");

  // Step 3: Details
  const [details, setDetails] = useState(editData?.details || {});
  const [selCurrencies, setSelCurrencies] = useState(editData?.currencies || []);

  // Payment reference (shared across all methods)
  const [payRefType, setPayRefType] = useState(editData?.details?._payRefType || "custom");
  const [payRefCustom, setPayRefCustom] = useState(editData?.details?._payRefCustom || "");
  const [showPayRefPicker, setShowPayRefPicker] = useState(false);

  // Region tab for step 0
  const [selRegion, setSelRegion] = useState("Europe");

  // Derived: all unique currencies from the methods catalogue
  const allCurrencies = [...new Set(Object.values(methods).flatMap(m => m.currencies))].sort();

  // Currencies filtered by selected region
  const regionCurrencies = (CURRENCY_REGIONS[selRegion] || [])
    .filter(c => allCurrencies.includes(c))
    .sort();

  // Categories available for selected currency
  const catsForCurrency = selCurrency
    ? [...new Set(Object.values(methods).filter(m => m.currencies.includes(selCurrency)).map(m => m.category))]
    : [];

  // Methods available for selected currency + category
  const methodsForCatCurrency = Object.entries(methods)
    .filter(([, m]) => m.category === selCategory && m.currencies.includes(selCurrency))
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  // Selected method object
  const selMethod = methods[selMethodId] || null;
  const fields = METHOD_FIELDS[selMethodId] || [{ key:"details", label:"Account details", placeholder:"Enter your details" }];

  // Currencies available for the selected method
  const methodCurrencies = selMethod?.currencies || [];

  // Step validation
  const step0Ok = selCurrency !== "";
  const step1Ok = selCategory !== "";
  const step2Ok = selMethodId !== "";
  const step3Ok = fields.every(f => f.optional || (details[f.key] || "").trim().length > 0) && selCurrencies.length > 0;

  function handleSelectCurrency(c) {
    setSelCurrency(c);
    // Reset downstream selections
    setSelCategory("");
    setSelMethodId("");
    setDetails({});
    setSelCurrencies([]);
    setStep(1);
  }

  function handleSelectCategory(cat) {
    setSelCategory(cat);
    setSelMethodId("");
    setDetails({});
    setSelCurrencies([]);
    setStep(2);
  }

  function handleSelectMethod(id) {
    setSelMethodId(id);
    setDetails({});
    // Auto-select the currency we started with
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
    const pm = {
      id:         editData?.id || `pm_${Date.now()}`,
      methodId:   selMethodId,
      name:       selMethod?.name || selMethodId,
      currencies: selCurrencies,
      details:    { ...details, _payRefType: payRefType, _payRefCustom: payRefCustom },
    };
    onSave(pm);
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
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
          {/* ── STEP 0: Currency with region tabs ── */}
          {step === 0 && (
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
              {/* Method summary tag */}
              <div className="pm-detail-header">
                <span className="pm-detail-tag">{selMethod.name}</span>
                <span className="pm-detail-curr">{selCurrency}</span>
              </div>

              {/* Currencies multi-select (if method supports multiple) */}
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

              {/* Detail fields */}
              {fields.map(f => (
                <div key={f.key} style={{ marginBottom:14 }}>
                  <label className="field-label">
                    {f.label}
                    {f.optional && <span style={{ fontWeight:500, textTransform:"none",
                      letterSpacing:0, color:"var(--black-25)", marginLeft:4 }}>(optional)</span>}
                  </label>
                  <input className="modal-input"
                    placeholder={f.placeholder}
                    value={details[f.key] || ""}
                    onChange={e => setDetails(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}

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

              {/* Payment reference picker bottom sheet */}
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

              {/* Summary preview */}
              <div className="pm-summary-box">
                <div className="pm-summary-row">
                  <span className="pm-summary-label">Method</span>
                  <span className="pm-summary-value">{selMethod.name}</span>
                </div>
                <div className="pm-summary-row">
                  <span className="pm-summary-label">Currencies</span>
                  <span className="pm-summary-value">{selCurrencies.join(", ")}</span>
                </div>
                {fields.map(f => (
                  <div key={f.key} className="pm-summary-row">
                    <span className="pm-summary-label">{f.label}</span>
                    <span className="pm-summary-value">{details[f.key] || "—"}</span>
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

              {/* Save button */}
              <button className="btn-save-pm" disabled={!step3Ok} onClick={handleSave}>
                {isEdit ? "Save changes" : "Add payment method"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────────────────
function DeleteModal({ pm, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-card" style={{ maxWidth:380 }}>
        <div className="modal-header">
          <span className="modal-title">Delete payment method?</span>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize:".85rem", color:"var(--black-75)", lineHeight:1.6, marginBottom:6 }}>
            This will permanently remove your <strong>{pm.name}</strong> payment method
            ({pm.currencies.join(", ")}). Any active offers using this method may be affected.
          </div>
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button className="btn-cancel" onClick={onCancel}>Cancel</button>
            <button className="btn-delete" onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const SAT = 100_000_000;
const BTC_PRICE = 87432;

export default function PeachPaymentMethods() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── AUTH STATE (persisted via localStorage) ──
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try { return localStorage.getItem("peach_logged_in") !== "false"; } catch { return true; }
  });
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const handleLogout = () => { setIsLoggedIn(false); setShowAvatarMenu(false); try { localStorage.setItem("peach_logged_in", "false"); } catch {} };
  const handleLogin = () => { setIsLoggedIn(true); try { localStorage.setItem("peach_logged_in", "true"); } catch {} };
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
  const [savedMethods, setSavedMethods] = useState(MOCK_SAVED);

  // Modal states
  const [showAddFlow, setShowAddFlow]   = useState(false);
  const [editPM, setEditPM]             = useState(null);
  const [deletePM, setDeletePM]         = useState(null);

  // Fetch live prices
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('https://api.peachbitcoin.com/v1/market/prices');
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
        const res = await fetch('https://api.peachbitcoin.com/v1/info/paymentMethods');
        const data = await res.json();
        // The API may return a different shape — we normalise it here.
        // If the response is usable, merge with our category metadata.
        // For now fall back to FALLBACK_METHODS if the shape doesn't match.
        if (data && typeof data === "object" && !Array.isArray(data)) {
          // Attempt to use API data — TODO: normalise shape when confirmed
          // setMethodsCatalogue(normalised);
        }
      } catch {
        // Silently fall back to mock
      } finally {
        setCatalogueLoading(false);
      }
    }
    fetchMethods();
  }, []);

  // Save handler (add or edit)
  function handleSavePM(pm) {
    setSavedMethods(prev => {
      const idx = prev.findIndex(p => p.id === pm.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = pm;
        return next;
      }
      return [...prev, pm];
    });
    setShowAddFlow(false);
    setEditPM(null);
  }

  // Delete handler
  function handleDeletePM() {
    if (deletePM) {
      setSavedMethods(prev => prev.filter(p => p.id !== deletePM.id));
      setDeletePM(null);
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

      {/* ── TOPBAR ── */}
      <header className="topbar">
        <button className="burger-btn" onClick={() => setMobileOpen(o => !o)}><IconBurger/></button>
        <PeachIcon size={28}/>
        <span className="logo-wordmark">Peach</span>
        <div className="topbar-price">
          <IcoBtc size={18}/>
          <span className="topbar-price-main">{btcPrice.toLocaleString("fr-FR")} {selectedCurrency}</span>
          <span className="topbar-price-sats">{satsPerCur.toLocaleString()} sats / {selectedCurrency.toLowerCase()}</span>
          <div className="topbar-cur-select">
            <span className="cur-select-label">{selectedCurrency}</span>
            <svg className="cur-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:"none",flexShrink:0}}><polyline points="1,1 5,5 9,1"/></svg>
            <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="cur-select-inner">
              {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="topbar-right">
          {isLoggedIn ? (
            <div className="avatar-menu-wrap">
              <div className="avatar-peachid" onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(v => !v); }}>
                <span className="peach-id">PEACH08476D23</span>
                <div className="avatar">PW<div className="avatar-badge">2</div></div>
              </div>
              {showAvatarMenu && (
                <div className="avatar-menu">
                  <button className="avatar-menu-item danger" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2H3.5A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14H6"/><path d="M10.5 11.5L14 8l-3.5-3.5"/><path d="M14 8H6"/></svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="avatar-login-btn" onClick={handleLogin}>
              <div className="avatar" style={{background:"var(--black-10)",color:"var(--black-25)"}}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="5.5" r="3"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>
              </div>
              <span className="avatar-login-label">Log in</span>
            </div>
          )}
        </div>
      </header>

      <SideNav
        active="payment-methods"
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
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
        {savedMethods.length === 0 ? (
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
              Payment details are only shared with your matched trade counterparty — not visible by Peach, unless a dispute is opened during a trade. Data is encrypted end-to-end and stored locally.
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
            <button className="auth-popup-btn" onClick={() => navigate("/auth")}>Log in</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --primary:#F56522;--primary-dark:#C45104;--primary-mild:#FEEDE5;
    --grad:linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C);
    --success:#65A519;--success-bg:#F2F9E7;
    --error:#DF321F;--error-bg:#FFF0EE;
    --black:#2B1911;--black-75:#624D44;--black-65:#7D675E;
    --black-25:#C4B5AE;--black-10:#EAE3DF;--black-5:#F4EEEB;
    --surface:#FFFFFF;--bg:#FFF9F6;--font:'Baloo 2',cursive;--topbar:56px;
  }
  html{font-size:120%}
  body{font-family:var(--font);background:var(--bg);color:var(--black)}

  /* Topbar */
  .topbar{position:fixed;top:0;left:0;right:0;height:var(--topbar);background:var(--surface);
    border-bottom:1px solid var(--black-10);display:flex;align-items:center;
    padding:0 20px;gap:12px;z-index:200}
  .logo-wordmark{font-size:1.22rem;font-weight:800;letter-spacing:-.02em;
    background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .topbar-price{display:flex;align-items:center;gap:8px;background:linear-gradient(90deg,#FFBFA8,#FFD5BF);border-radius:999px;padding:5px 6px 5px 10px;font-size:.78rem;font-weight:600;color:var(--black);flex-shrink:0;margin-left:4px}
  .topbar-price-main{font-weight:800;color:var(--black);white-space:nowrap}
  .topbar-price-sats{font-weight:500;color:var(--black-65);white-space:nowrap}
  .topbar-cur-select{position:relative;display:flex;align-items:center;gap:4px;background:rgba(255,255,255,0.45);border-radius:999px;padding:2px 9px;cursor:pointer}
  .cur-select-inner{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:.78rem;width:100%}
  .cur-select-arrow{display:flex;align-items:center;pointer-events:none;color:var(--black-65);flex-shrink:0}
  .cur-select-label{font-size:.76rem;font-weight:800;color:var(--black);pointer-events:none}
  .topbar-right{margin-left:auto;display:flex;align-items:center;gap:12px}
  .avatar-peachid{display:flex;align-items:center;gap:8px}
  .sidenav-price-slot{display:none;margin-top:auto;padding:12px 8px 8px;width:100%;border-top:1px solid var(--black-10)}
  .mobile-price-pill{display:flex;align-items:center;gap:8px;background:linear-gradient(90deg,#FFBFA8,#FFD5BF);border-radius:12px;padding:10px 10px 10px 12px}
  .mobile-price-text{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0}
  .mobile-price-main{font-size:.82rem;font-weight:800;color:var(--black);white-space:nowrap}
  .mobile-price-sats{font-size:.68rem;font-weight:500;color:var(--black-65);white-space:nowrap}
  .mobile-cur-select{flex-shrink:0}
  .peach-id{font-size:.68rem;font-weight:600;color:var(--black-65);font-family:monospace;
    background:var(--black-5);border-radius:999px;padding:3px 10px;display:none}
  @media(min-width:900px){.peach-id{display:block}}
  .avatar{width:34px;height:34px;border-radius:50%;background:var(--grad);color:white;
    font-size:.8rem;font-weight:700;display:flex;align-items:center;justify-content:center;
    position:relative;cursor:pointer;flex-shrink:0}
  .avatar-badge{position:absolute;top:-3px;right:-3px;width:16px;height:16px;border-radius:50%;
    background:var(--error);color:white;font-size:.6rem;font-weight:800;
    display:flex;align-items:center;justify-content:center;border:2px solid white}
  .burger-btn{display:none;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:8px;border:none;
    background:transparent;cursor:pointer;color:var(--black-65);
    flex-shrink:0;transition:background .14s}
  .burger-btn:hover{background:var(--black-5)}
  @media(max-width:767px){.burger-btn{display:flex}.topbar-price{display:none}.sidenav-price-slot{display:block}}

  /* ── AVATAR DROPDOWN ── */
  .avatar-menu-wrap{position:relative}
  .avatar-menu{position:absolute;top:calc(100% + 6px);right:0;background:var(--surface);border:1px solid var(--black-10);border-radius:12px;box-shadow:0 8px 28px rgba(43,25,17,.12);min-width:160px;padding:6px;z-index:300;animation:amFadeIn .12s ease}
  @keyframes amFadeIn{from{opacity:0}to{opacity:1}}
  .avatar-menu-item{width:100%;display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:var(--font);font-size:.82rem;font-weight:600;color:var(--black);transition:background .1s}
  .avatar-menu-item:hover{background:var(--black-5)}
  .avatar-menu-item.danger{color:var(--error)}
  .avatar-menu-item.danger:hover{background:var(--error-bg)}
  .avatar-login-btn{display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 10px;border-radius:999px;transition:background .14s}
  .avatar-login-btn:hover{background:var(--black-5)}
  .avatar-login-label{font-size:.78rem;font-weight:700;color:var(--primary);white-space:nowrap}

  /* ── AUTH POPUP (protected screen — scoped to content area) ── */
  .auth-screen-overlay{
    position:fixed;top:var(--topbar);left:68px;right:0;bottom:0;z-index:100;
    display:flex;align-items:flex-start;justify-content:center;
    padding-top:20vh;
    background:rgba(255,249,246,.7);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  }
  @media(max-width:767px){.auth-screen-overlay{left:0}}
  .auth-popup{
    background:var(--surface);border:1px solid var(--black-10);border-radius:20px;
    box-shadow:0 12px 40px rgba(43,25,17,.15);
    padding:36px 40px;display:flex;flex-direction:column;align-items:center;gap:16px;
    max-width:360px;width:90%;animation:authPopIn .2s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes authPopIn{from{opacity:0;transform:scale(.92) translateY(8px)}to{opacity:1;transform:none}}
  .auth-popup-icon{width:56px;height:56px;border-radius:50%;background:var(--primary-mild);
    display:flex;align-items:center;justify-content:center}
  .auth-popup-title{font-size:1.1rem;font-weight:800;color:var(--black);text-align:center}
  .auth-popup-sub{font-size:.85rem;font-weight:500;color:var(--black-65);text-align:center;line-height:1.5}
  .auth-popup-btn{
    padding:10px 28px;border-radius:999px;background:var(--grad);color:white;
    font-family:var(--font);font-size:.88rem;font-weight:800;border:none;cursor:pointer;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .1s,box-shadow .1s;margin-top:4px;
  }
  .auth-popup-btn:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}

  /* Sidenav */
  .sidenav{position:fixed;top:var(--topbar);left:0;bottom:0;
    width:68px;background:var(--surface);border-right:1px solid var(--black-10);
    z-index:150;display:flex;flex-direction:column;align-items:center;
    padding:8px 0;gap:2px;transition:width .2s cubic-bezier(.4,0,.2,1);overflow:hidden}
  .sidenav-collapsed{width:44px}
  .sidenav-toggle{width:100%;height:32px;display:flex;align-items:center;justify-content:flex-end;
    padding-right:10px;border:none;background:transparent;cursor:pointer;
    color:var(--black-25);flex-shrink:0;transition:color .14s;margin-bottom:4px}
  .sidenav-toggle:hover{color:var(--black-65)}
  .sidenav-item{width:calc(100% - 16px);display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:3px;padding:8px 4px;border-radius:10px;
    border:none;background:transparent;cursor:pointer;color:var(--black-65);
    font-family:var(--font);transition:all .14s;flex-shrink:0}
  .sidenav-item:hover{background:var(--black-5);color:var(--black)}
  .sidenav-active{background:var(--primary-mild)!important;color:var(--primary-dark)!important}
  .sidenav-icon{display:flex;align-items:center;justify-content:center;height:22px;flex-shrink:0}
  .sidenav-label{font-size:.57rem;font-weight:700;letter-spacing:.02em;
    text-transform:uppercase;white-space:nowrap;overflow:hidden;
    transition:opacity .15s,max-height .2s;max-height:20px;opacity:1}
  .sidenav-collapsed .sidenav-label{opacity:0;max-height:0;pointer-events:none}
  .sidenav-backdrop{display:none;position:fixed;inset:0;z-index:149;
    background:rgba(43,25,17,.4);animation:fadeIn .2s ease}
  .sidenav-backdrop.open{display:block}
  @media(max-width:767px){
    .sidenav{transform:translateX(-100%);width:220px;transition:transform .2s}
    .sidenav-mobile-open{transform:translateX(0)}
    .sidenav-backdrop.open{display:block}
    .sidenav-label{opacity:1;max-height:20px}
    .sidenav-item{flex-direction:row;justify-content:flex-start;padding:10px 16px;gap:12px}
  }

  /* Page layout */
  .page-wrap{margin-top:var(--topbar);margin-left:68px;padding:32px 28px;min-height:calc(100vh - 56px)}
  @media(max-width:767px){.page-wrap{margin-left:0;padding:20px 16px}}

  .page-header{display:flex;align-items:flex-start;gap:16px;margin-bottom:28px;flex-wrap:wrap}
  .page-title{font-size:1.5rem;font-weight:800;letter-spacing:-.02em}
  .page-subtitle{font-size:.85rem;color:var(--black-65);margin-top:2px}
  .header-right{margin-left:auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap}

  .btn-cta{background:var(--grad);color:white;border:none;border-radius:999px;
    font-family:var(--font);font-size:.85rem;font-weight:800;
    padding:8px 20px;cursor:pointer;white-space:nowrap;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .15s,box-shadow .15s}
  .btn-cta:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(245,101,34,.4)}

  /* ── Empty state ── */
  .pm-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:60px 20px;gap:12px}
  .pm-empty-icon{font-size:3rem;opacity:.35}
  .pm-empty-title{font-size:1.1rem;font-weight:800;color:var(--black)}
  .pm-empty-desc{font-size:.82rem;color:var(--black-65);line-height:1.6;max-width:380px}

  /* ── Saved methods list ── */
  .pm-list{display:flex;flex-direction:column;gap:24px;max-width:680px}
  .pm-group{}
  .pm-group-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}
  .pm-group-label{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--black-65)}
  .pm-group-count{background:var(--black-10);color:var(--black-65);font-size:.62rem;font-weight:800;
    padding:1px 7px;border-radius:999px}

  .pm-card{display:flex;align-items:center;gap:14px;background:var(--surface);
    border:1.5px solid var(--black-10);border-radius:14px;padding:14px 16px;
    transition:border-color .15s,box-shadow .15s}
  .pm-card:hover{border-color:var(--primary);box-shadow:0 2px 12px rgba(245,101,34,.08)}
  .pm-card+.pm-card{margin-top:8px}
  .pm-card-left{flex:1;min-width:0}
  .pm-card-name{font-size:.92rem;font-weight:700;color:var(--black);margin-bottom:2px}
  .pm-card-detail{font-size:.78rem;color:var(--black-65);font-family:monospace;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:6px}
  .pm-card-currencies{display:flex;gap:4px;flex-wrap:wrap}
  .pm-card-curr-tag{padding:1px 7px;border-radius:5px;font-size:.62rem;font-weight:800;
    background:var(--primary-mild);color:var(--primary-dark)}

  .pm-card-actions{display:flex;gap:6px;flex-shrink:0}
  .pm-action-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--black-10);
    background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;
    color:var(--black-65);transition:all .15s}
  .pm-action-btn:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-mild)}
  .pm-action-delete:hover{border-color:var(--error);color:var(--error);background:var(--error-bg)}

  /* ── Info box ── */
  .pm-info-box{display:flex;gap:10px;align-items:flex-start;background:var(--surface);
    border:1px solid var(--black-10);border-radius:12px;padding:14px 16px;
    margin-top:28px;max-width:680px}

  /* ── Modal ── */
  .modal-overlay{position:fixed;inset:0;z-index:500;background:rgba(43,25,17,.45);
    display:flex;align-items:center;justify-content:center;padding:20px;
    animation:fadeIn .2s ease}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .modal-card{background:var(--surface);border-radius:20px;width:100%;max-width:480px;
    max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(43,25,17,.2);
    animation:slideUp .25s ease}
  @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
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

  /* ── Progress bar ── */
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

  /* ── Step 0: Currency grid ── */
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

  /* ── Step 1: Category list / Step 2: Method list ── */
  .pm-cat-list{display:flex;flex-direction:column;gap:8px;margin-top:8px}
  .pm-cat-card{display:flex;align-items:center;gap:14px;border:1.5px solid var(--black-10);
    border-radius:12px;padding:14px 16px;background:var(--surface);cursor:pointer;
    font-family:var(--font);transition:all .15s;text-align:left;width:100%}
  .pm-cat-card:hover{border-color:var(--primary);background:#FFFAF8}
  .pm-cat-card.selected{border-color:var(--primary);background:var(--primary-mild)}
  .pm-cat-icon{width:40px;height:40px;border-radius:10px;background:var(--primary-mild);
    display:flex;align-items:center;justify-content:center;color:var(--primary-dark);flex-shrink:0}
  .pm-cat-text{flex:1;min-width:0}
  .pm-cat-label{display:block;font-size:.88rem;font-weight:700;color:var(--black)}
  .pm-cat-desc{display:block;font-size:.72rem;font-weight:500;color:var(--black-65);margin-top:1px}
  .pm-cat-arrow{font-size:1rem;color:var(--black-25);flex-shrink:0;transition:color .15s}
  .pm-cat-card:hover .pm-cat-arrow{color:var(--primary)}

  .pm-empty-msg{text-align:center;padding:24px;font-size:.85rem;color:var(--black-65)}

  /* ── Step 3: Details ── */
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

  /* ── Delete modal ── */
  .btn-cancel{flex:1;background:var(--black-5);color:var(--black-75);border:none;border-radius:10px;
    font-family:var(--font);font-size:.85rem;font-weight:700;padding:10px;cursor:pointer;
    transition:background .14s}
  .btn-cancel:hover{background:var(--black-10)}
  .btn-delete{flex:1;background:var(--error);color:white;border:none;border-radius:10px;
    font-family:var(--font);font-size:.85rem;font-weight:700;padding:10px;cursor:pointer;
    transition:background .14s}
  .btn-delete:hover{background:#B01807}

  /* Animations */
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}

  /* ── Payment reference ── */
  .payref-row{display:flex;gap:8px;align-items:center}
  .payref-input{flex:1}
  .payref-type-btn{display:flex;align-items:center;gap:5px;background:var(--black-5);
    border:1.5px solid var(--black-10);border-radius:8px;padding:8px 12px;
    font-family:var(--font);font-size:.75rem;font-weight:700;color:var(--primary-dark);
    cursor:pointer;white-space:nowrap;flex-shrink:0;transition:border-color .15s}
  .payref-type-btn:hover{border-color:var(--primary)}

  .payref-picker-overlay{position:fixed;inset:0;z-index:600;background:rgba(43,25,17,.3);
    display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .15s ease}
  .payref-picker{background:var(--surface);border-radius:20px 20px 0 0;width:100%;max-width:480px;
    padding-bottom:env(safe-area-inset-bottom,12px);animation:slideUp .25s ease}
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
