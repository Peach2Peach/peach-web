import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ─── TOPBAR PEACH ID (3 states: logged out / mock / regtest) ─────────────────
function getTopbarPeachId() {
  const auth = window.__PEACH_AUTH__;
  if (auth?.token) {
    const pub = auth.peachId || auth.profile?.publicKey || "";
    return "Regtest: PEACH" + pub.slice(0, 8).toUpperCase();
  }
  return "MOCK: PEACH08476D23";
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const PeachIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 352 353" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect y="0.38" width="352" height="352" rx="58.13" fill="#FFF9F6"/>
    <path d="M151.8 45.5c11.2-1.2 21.1 5.35 24.2 16.02.54 1.88.82 3.89.88 5.86.13 4.2.05 8.41.05 12.62 0 .39-.33.69-.72.7-3.07.11-6.08-.02-9.02-1-9.21-3.03-15.33-11.47-15.42-21.35-.04-4-.01-8.01 0-12.01" fill="#05A85A"/>
    <path d="M205.3 64.23c.99 8.75-5.26 16.21-13.69 16.46-4.77.14-9.15-3.93-7.14-8.26.95-2.06 2.42-3.88 4.47-5.44 2.3-1.76 4.93-2.69 7.82-2.74 2.83-.04 5.66 0 8.54 0" fill="#05A85A"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M276 155.69c0 49.73-43.64 96.87-97.47 96.87-19.52 0-37.71-6.2-52.95-16.48v49.48c0 12.29-9.96 22.26-22.26 22.26s-22.26-9.97-22.26-22.26V157.39h.02c-.01-.57-.02-1.13-.02-1.7 0-43.02 32.67-72.02 76.33-68.64 14.01 1.09 28.26 1.09 42.27 0 43.67-3.39 76.34 25.62 76.34 68.64zM125.61 163.8v-.39c.1-24.1 19.36-39.92 44.44-36.17 5.13.77 10.37.77 15.49 0 25.15-3.77 44.44 12.15 44.44 36.35 0 26.64-23.36 51.89-52.19 51.89-28.75 0-52.07-25.13-52.18-51.68z" fill="url(#pg_td)"/>
    <defs>
      <radialGradient id="pg_td" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(276 88) rotate(159) scale(220 130)">
        <stop stopColor="#FFA24C"/><stop offset=".5" stopColor="#FF7A50"/><stop offset="1" stopColor="#FF4D42"/>
      </radialGradient>
    </defs>
  </svg>
);

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconMarket   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,14 7,9 11,12 18,5"/><polyline points="13,5 18,5 18,10"/></svg>;
const IconTrades   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 7h10M13 4l3 3-3 3"/><path d="M15 13H5M7 10l-3 3 3 3"/></svg>;
const IconCreate   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>;
const IconSettings = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>;
const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="18" height="13" rx="2"/><line x1="1" y1="9" x2="19" y2="9"/><line x1="5" y1="14" x2="8" y2="14"/></svg>;
const IconChevLeft  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,2 4,7 9,12"/></svg>;
const IconChevRight = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="5,2 10,7 5,12"/></svg>;
const IconBurger    = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="4.5" x2="16" y2="4.5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13.5" x2="16" y2="13.5"/></svg>;
const IconSort      = ({ dir }) => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d={dir === "asc" ? "M2 8l4-5 4 5" : dir === "desc" ? "M2 4l4 5 4-5" : "M2 4.5l4-3 4 3M2 7.5l4 3 4-3"}/></svg>;
const IconChevDown  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,5 7,9 11,5"/></svg>;
const IconMsg       = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-3 2V10H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/></svg>;
const IconClock     = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="5"/><path d="M6.5 3.5v3l2 1.5"/></svg>;
const IconAlert     = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2L1 12h12L7 2z"/><line x1="7" y1="6" x2="7" y2="9"/><circle cx="7" cy="11" r=".5" fill="currentColor"/></svg>;
const IconEmpty     = () => <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#C4B5AE" strokeWidth="1.5" strokeLinecap="round"><rect x="8" y="12" width="32" height="28" rx="4"/><path d="M16 12V9a8 8 0 0 1 16 0v3"/><line x1="19" y1="24" x2="29" y2="24"/><line x1="19" y1="30" x2="25" y2="30"/></svg>;
const IcoBtc        = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}>
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M22.2 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.1-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8.9l-.8 3.3c.1 0 .2 0 .3.1-.1 0-.2-.1-.3-.1L11.4 20c-.1.3-.4.7-1 .5 0 0-1.2-.3-1.2-.3l-.8 1.8 2 .5c.4.1.7.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.2 1.4.3l-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.03-3.2-1.5-3.9 1.1-.25 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.6.8 4.1 2.9zm.5-5.3c-.45 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.8.6 3.4 2.5z" fill="white"/>
  </svg>
);

// Standardized sats display: ₿ icon · "0.00" grey · "36 074 Sats" black, same font size
function SatsAmount({ sats, size = "md" }) {
  const satsStr = sats.toLocaleString("fr-FR");
  const fs = size === "sm" ? ".82rem" : size === "lg" ? "1.05rem" : ".95rem";
  const ico = size === "sm" ? 13 : size === "lg" ? 17 : 15;
  if (sats >= 100_000_000) {
    const btc = (sats / 100_000_000).toFixed(2).replace(".", ",");
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:5, flexWrap:"nowrap", whiteSpace:"nowrap" }}>
        <IcoBtc size={ico}/>
        <span style={{ color:"var(--black)", fontWeight:800, fontSize:fs, whiteSpace:"nowrap" }}>{btc} BTC</span>
      </span>
    );
  }
  const digits = sats.toString().length;
  const leadingZeros = 8 - digits;
  const greyPart = "0," + "0".repeat(leadingZeros);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, flexWrap:"nowrap", whiteSpace:"nowrap" }}>
      <IcoBtc size={ico}/>
      <span style={{ color:"#C4B5AE", fontWeight:700, fontSize:fs, whiteSpace:"nowrap" }}>{greyPart}</span>
      <span style={{ color:"var(--black)", fontWeight:800, fontSize:fs, whiteSpace:"nowrap" }}>{satsStr} Sats</span>
    </span>
  );
}

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

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const BTC_PRICE = 87432;
const SAT = 100_000_000;

function satsToFiat(sats, price = BTC_PRICE) {
  return ((sats / SAT) * price).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

// Status config: label, chip color, text color, whether action is required
const STATUS_CONFIG = {
  open_offer:          { label: "Open Offer",          bg: "#F4EEEB", color: "#7D675E", action: false },
  pending_match:       { label: "Pending Match",       bg: "#D7F2FE", color: "#037DB5", action: false },
  matched:             { label: "Matched",             bg: "#FEFCE5", color: "#9A7000", action: true  },
  escrow_funded:       { label: "Escrow Funded",       bg: "#FEFCE5", color: "#9A7000", action: true  },
  payment_in_transit:  { label: "Payment Sent",        bg: "#FEEDE5", color: "#C45104", action: false },
  awaiting_payment:    { label: "Awaiting Payment",    bg: "#FEEDE5", color: "#C45104", action: true  },
  payment_confirmed:   { label: "Payment Confirmed",   bg: "#F2F9E7", color: "#65A519", action: true  },
  dispute:             { label: "Dispute",             bg: "#FFE6E1", color: "#DF321F", action: true  },
  cancellation_pending:{ label: "Cancellation Req.",  bg: "#FFE6E1", color: "#DF321F", action: true  },
  completed:           { label: "Completed",           bg: "#F2F9E7", color: "#65A519", action: false },
  cancelled:           { label: "Cancelled",           bg: "#F4EEEB", color: "#7D675E", action: false },
};

// Mock avatars by initials + color
const AVATARS = ["KL","MR","ST","DV","NB","FR","PW","JC","EH","OT"];
const AVATAR_COLORS = ["#FF7A50","#037DB5","#65A519","#F56522","#9B5CFF","#DF321F","#F5CE22","#05A85A"];

// Active trades mock — 6 buy, 6 sell
const MOCK_ACTIVE = [
  // ── BUY ──
  {
    id:"b1", kind:"open_offer", direction:"buy",
    amount:80000, premium:-0.5, methods:["SEPA"], currencies:["EUR"],
    createdAt: Date.now() - 45*60_000, expiresIn:"23h 15m",
    counterparty:null, unread:0,
  },
  {
    id:"b2", kind:"pending_match", direction:"buy",
    amount:85000, premium:-1.2, methods:["SEPA","Revolut"], currencies:["EUR"],
    matchedAt: Date.now() - 12*60_000,
    counterparty:{ initials:"KL", color:"#FF7A50", name:"Peer #4E2A", rep:4.9, trades:312, badges:["supertrader"] },
    unread:0,
  },
  {
    id:"b3", kind:"contract", tradeStatus:"awaiting_payment", direction:"buy",
    amount:85000, premium:-1.2, methods:["SEPA"], currencies:["EUR"],
    creationDate: Date.now() - 4*3600_000, paymentExpectedBy: Date.now() + 8*3600_000,
    counterparty:{ initials:"ST", color:"#65A519", name:"Peer #2B90", rep:5.0, trades:541, badges:["supertrader"] },
    unread:3, fiatAmount:"74.32",
  },
  {
    id:"b4", kind:"contract", tradeStatus:"not_paid_in_time", direction:"buy",
    amount:42000, premium:0.5, methods:["Wise"], currencies:["CHF"],
    creationDate: Date.now() - 26*3600_000,
    counterparty:{ initials:"MR", color:"#037DB5", name:"Peer #7F1C", rep:4.7, trades:88, badges:["fast"] },
    unread:2, fiatAmount:"38.14",
  },
  {
    id:"b5", kind:"contract", tradeStatus:"payment_confirmed", direction:"buy",
    amount:55000, premium:-0.8, methods:["SEPA"], currencies:["EUR"],
    creationDate: Date.now() - 6*3600_000,
    counterparty:{ initials:"NB", color:"#9B5CFF", name:"Peer #C73E", rep:4.8, trades:156, badges:[] },
    unread:0, fiatAmount:"47.88",
  },
  {
    id:"b6", kind:"contract", tradeStatus:"dispute", direction:"buy",
    amount:30000, premium:-2.0, methods:["Revolut"], currencies:["EUR"],
    creationDate: Date.now() - 28*3600_000,
    counterparty:{ initials:"FR", color:"#DF321F", name:"Peer #D8B1", rep:3.9, trades:9, badges:[] },
    unread:5, fiatAmount:"26.23",
  },
  // ── SELL ──
  {
    id:"s1", kind:"open_offer", direction:"sell",
    amount:73000, premium:0.8, methods:["SEPA","Wise"], currencies:["EUR","CHF"],
    createdAt: Date.now() - 2*3600_000, expiresIn:"22h",
    counterparty:null, unread:0,
  },
  {
    id:"s2", kind:"contract", tradeStatus:"matched", direction:"sell",
    amount:95000, premium:1.5, methods:["SEPA"], currencies:["EUR"],
    creationDate: Date.now() - 30*60_000,
    counterparty:{ initials:"DV", color:"#F56522", name:"Peer #A1F3", rep:4.6, trades:67, badges:[] },
    unread:1, fiatAmount:"82.79",
  },
  {
    id:"s3", kind:"contract", tradeStatus:"payment_in_transit", direction:"sell",
    amount:120000, premium:1.8, methods:["PayPal"], currencies:["EUR"],
    creationDate: Date.now() - 1.5*3600_000,
    counterparty:{ initials:"PW", color:"#05A85A", name:"Peer #F9C2", rep:4.3, trades:22, badges:[] },
    unread:1, fiatAmount:"102.18",
  },
  {
    id:"s4", kind:"contract", tradeStatus:"confirm_payment", direction:"sell",
    amount:50000, premium:0.3, methods:["Revolut"], currencies:["EUR"],
    creationDate: Date.now() - 10*60_000,
    counterparty:{ initials:"JC", color:"#9B5CFF", name:"Peer #B8D0", rep:5.0, trades:289, badges:["supertrader","fast"] },
    unread:0, fiatAmount:"43.25",
  },
  {
    id:"s5", kind:"contract", tradeStatus:"payment_confirmed", direction:"sell",
    amount:200000, premium:2.1, methods:["SEPA"], currencies:["EUR"],
    creationDate: Date.now() - 8*3600_000,
    counterparty:{ initials:"EH", color:"#037DB5", name:"Peer #3A7E", rep:4.5, trades:44, badges:["fast"] },
    unread:0, fiatAmount:"174.86",
  },
  {
    id:"s6", kind:"contract", tradeStatus:"dispute", direction:"sell",
    amount:65000, premium:1.0, methods:["Strike"], currencies:["EUR"],
    creationDate: Date.now() - 36*3600_000,
    counterparty:{ initials:"OT", color:"#F56522", name:"Peer #E52C", rep:2.1, trades:3, badges:[] },
    unread:4, fiatAmount:"56.73",
  },
];

// Trade history mock
const MOCK_HISTORY = [
  {
    id:"h1", direction:"buy", tradeStatus:"completed",
    amount:100000, fiatAmount:"87.43", currency:"EUR", premium:-1.5,
    method:"SEPA",
    counterparty:{ initials:"PW", color:"#FF7A50", name:"Peer #4E2A", rep:4.9 },
    completedAt: new Date(Date.now() - 2 * 86400_000),
    ratingGiven: 5,
    tradeId:"CT-00142",
  },
  {
    id:"h2", direction:"sell", tradeStatus:"completed",
    amount:50000, fiatAmount:"44.21", currency:"EUR", premium:0.8,
    method:"Revolut",
    counterparty:{ initials:"JC", color:"#037DB5", name:"Peer #F2E0", rep:4.7 },
    completedAt: new Date(Date.now() - 5 * 86400_000),
    ratingGiven: 5,
    tradeId:"CT-00138",
  },
  {
    id:"h3", direction:"buy", tradeStatus:"cancelled",
    amount:75000, fiatAmount:"65.57", currency:"EUR", premium:-0.5,
    method:"SEPA",
    counterparty:{ initials:"EH", color:"#65A519", name:"Peer #91CA", rep:4.2 },
    completedAt: new Date(Date.now() - 8 * 86400_000),
    ratingGiven: null,
    tradeId:"CT-00131",
  },
  {
    id:"h4", direction:"sell", tradeStatus:"completed",
    amount:200000, fiatAmount:"174.86", currency:"EUR", premium:1.2,
    method:"Wise",
    counterparty:{ initials:"OT", color:"#9B5CFF", name:"Peer #55D3", rep:5.0 },
    completedAt: new Date(Date.now() - 14 * 86400_000),
    ratingGiven: 5,
    tradeId:"CT-00122",
  },
  {
    id:"h5", direction:"buy", tradeStatus:"completed",
    amount:45000, fiatAmount:"39.34", currency:"CHF", premium:-2.1,
    method:"SEPA",
    counterparty:{ initials:"KL", color:"#F56522", name:"Peer #7B2F", rep:4.8 },
    completedAt: new Date(Date.now() - 21 * 86400_000),
    ratingGiven: 1,
    tradeId:"CT-00115",
  },
  {
    id:"h6", direction:"sell", tradeStatus:"completed",
    amount:350000, fiatAmount:"306.01", currency:"EUR", premium:0.3,
    method:"SEPA",
    counterparty:{ initials:"MR", color:"#05A85A", name:"Peer #CC88", rep:4.9 },
    completedAt: new Date(Date.now() - 30 * 86400_000),
    ratingGiven: 5,
    tradeId:"CT-00108",
  },
];

const ALL_METHODS = ["SEPA","Revolut","Wise","PayPal","Strike"];
const ALL_CURRENCIES = ["EUR","CHF","GBP"];
const ALL_STATUSES = Object.keys(STATUS_CONFIG).filter(s => !["completed","cancelled"].includes(s));

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function formatDate(date) {
  return date.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

// ─── DROPDOWN FILTER ─────────────────────────────────────────────────────────
function FilterDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const count = selected.length;
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button
        className={`filter-dropdown-btn${open ? " open" : ""}${count > 0 ? " active" : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{label}</span>
        {count > 0 && <span className="filter-count">{count}</span>}
        <IconChevDown/>
      </button>
      {open && (
        <div className="filter-panel">
          {options.map(opt => (
            <label key={opt} className="filter-option">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt])}
              />
              <span>{opt}</span>
            </label>
          ))}
          {count > 0 && (
            <button className="filter-clear" onClick={() => { onChange([]); setOpen(false); }}>
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── STATUS CHIP ─────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open_offer;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      background:cfg.bg, color:cfg.color,
      borderRadius:999, padding:"2px 10px",
      fontSize:".72rem", fontWeight:700, whiteSpace:"nowrap",
    }}>
      {cfg.action && <span style={{ width:6, height:6, borderRadius:"50%", background:cfg.color, display:"inline-block" }}/>}
      {cfg.label}
    </span>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 36, online }) {
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      <div style={{
        width:size, height:size, borderRadius:"50%",
        background: color || "var(--grad)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize: size * 0.36, fontWeight:700, color:"white",
        flexShrink:0,
      }}>{initials}</div>
      {online && (
        <div style={{
          position:"absolute", bottom:0, right:0,
          width:9, height:9, borderRadius:"50%",
          background:"#65A519", border:"2px solid white",
        }}/>
      )}
    </div>
  );
}

// ─── PILL CONFIG — maps every status to pill appearance + label ──────────────
const PILL_CONFIG = {
  open_offer:          { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Waiting for a match",   passive:true  },
  pending_match:       { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Waiting for seller",    passive:true  },
  payment_in_transit:  { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Payment sent · awaiting confirmation", passive:true },
  completed:           { bg:"#F2F9E7", color:"#65A519", label:"Completed",             passive:true  },
  cancelled:           { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Cancelled",             passive:true  },
  matched:             { bg:"var(--primary)", color:"white", label:"Fund Escrow",       passive:false },
  not_paid_in_time:    { bg:"#FEFCE5",        color:"#7A5C00", label:"Not paid in time!", passive:false },
  awaiting_payment:    { bg:"var(--primary)", color:"white", label:"Make Payment",     passive:false },
  payment_confirmed:   { bg:"#65A519",        color:"white", label:"Release Bitcoin",  passive:false },
  confirm_payment:     { bg:"var(--primary)", color:"white", label:"Confirm Payment",  passive:false },
  dispute:             { bg:"#DF321F",        color:"white", label:"View Dispute",     passive:false },
};

// ─── PEACH RATING — fills proportionally like a cup ──────────────────────────
function PeachRating({ rep, size = 16 }) {
  const pct = Math.max(0, Math.min(1, rep / 5));
  const id = `pr-${Math.round(rep * 10)}`;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
      {/* Peach icon with fill */}
      <svg width={size} height={size} viewBox="0 0 32 32" style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}>
        <defs>
          <clipPath id={`${id}-clip`}>
            {/* Fill from bottom: fill starts at (1-pct)*32 from top */}
            <rect x="0" y={32 * (1 - pct)} width="32" height={32 * pct}/>
          </clipPath>
        </defs>
        {/* Outline / empty peach in muted color */}
        <g opacity="0.25">
          <circle cx="16" cy="17" r="11" fill="#F56522"/>
          <path d="M14 8c1-3 5-4 6-1" stroke="#05A85A" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </g>
        {/* Filled peach clipped to rating level */}
        <g clipPath={`url(#${id}-clip)`}>
          <circle cx="16" cy="17" r="11" fill="#F56522"/>
          <path d="M14 8c1-3 5-4 6-1" stroke="#05A85A" strokeWidth="2" fill="none" strokeLinecap="round"/>
          {/* Bowl highlight */}
          <path d="M11 17 Q16 13 21 17" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
        </g>
      </svg>
      <span style={{ fontSize:".78rem", fontWeight:700, color:"var(--black-75)" }}>{rep.toFixed(1)}</span>
    </span>
  );
}

// ─── BADGE — sober outlined style ─────────────────────────────────────────────
function Badge({ label, icon }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      border:"1.5px solid var(--primary)", borderRadius:999,
      padding:"1px 8px", fontSize:".65rem", fontWeight:700,
      color:"var(--primary)", background:"transparent", whiteSpace:"nowrap",
    }}>
      {label} {icon && <span style={{ fontSize:".7rem" }}>{icon}</span>}
    </span>
  );
}

// ─── TRADE CARD — Variant C ───────────────────────────────────────────────────
function TradeCard({ trade, onSelect, layout = "grid" }) {
  const statusKey = trade.kind === "contract" ? trade.tradeStatus : trade.kind;
  const pill = PILL_CONFIG[statusKey] || PILL_CONFIG.open_offer;
  const isBuy = trade.direction === "buy";
  const hasSatsRange = Array.isArray(trade.amount);

  function fiatStr() {
    if (hasSatsRange) return `≈ €${satsToFiat(trade.amount[0])}–€${satsToFiat(trade.amount[1])}`;
    if (trade.fiatAmount) return `€${trade.fiatAmount}`;
    return `≈ €${satsToFiat(trade.amount)}`;
  }

  function timeStr() {
    if (trade.kind === "open_offer")    return `Expires in ${trade.expiresIn}`;
    if (trade.kind === "pending_match") return `Matched ${relativeTime(trade.matchedAt)}`;
    if (trade.paymentExpectedBy) {
      const left = trade.paymentExpectedBy - Date.now();
      const h = Math.floor(left / 3600_000);
      const m = Math.floor((left % 3600_000) / 60_000);
      return `${h}h ${m}m remaining`;
    }
    return relativeTime(trade.creationDate);
  }
  const isUrgentTime = trade.paymentExpectedBy && (trade.paymentExpectedBy - Date.now()) < 2 * 3600_000;

  // ── LIST LAYOUT ──
  if (layout === "list") {
    return (
      <div className="trade-row" onClick={() => onSelect && onSelect(trade.id)}>
        <span className={`direction-badge direction-${isBuy ? "buy" : "sell"}`}>
          {isBuy ? "BUY" : "SELL"}
        </span>
        <span className="trade-row-id">{trade.id.toUpperCase()}</span>
        <span className="trade-row-peer">
          {trade.counterparty ? trade.counterparty.name : "—"}
        </span>
        <span className="trade-row-amount">
          {hasSatsRange ? (
            <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
              <IcoBtc size={12}/>
              <span>{trade.amount[0].toLocaleString("fr-FR")}–{trade.amount[1].toLocaleString("fr-FR")}</span>
            </span>
          ) : (
            <SatsAmount sats={trade.amount}/>
          )}
        </span>
        <span className="trade-row-fiat">{fiatStr()}</span>
        <span className={`trade-row-time${isUrgentTime ? " urgent" : ""}`}>
          <IconClock/> {timeStr()}
        </span>
        {trade.unread > 0 ? (
          <div className="unread-badge">
            <span style={{ lineHeight:1 }}>{trade.unread}</span>
            <IconMsg/>
          </div>
        ) : (
          <span></span>
        )}
        <span className="trade-row-pill" style={{ background: pill.bg, color: pill.color }}>
          {pill.label}
        </span>
      </div>
    );
  }

  // ── GRID LAYOUT (default) ──
  return (
    <div className="trade-card-v3" onClick={() => onSelect && onSelect(trade.id)}>

      {/* ── ROW 1: direction badge · trade ID · date ··· unread ── */}
      <div className="v3c-top">
        <span className={`direction-badge direction-${isBuy ? "buy" : "sell"}`}>
          {isBuy ? "BUY" : "SELL"}
        </span>
        <span style={{ fontSize:".72rem", fontWeight:700, color:"var(--black-65)", fontFamily:"monospace" }}>
          {trade.id.toUpperCase()}
        </span>
        <span style={{ fontSize:".68rem", color:"var(--black-65)" }}>
          · {new Date(trade.creationDate || trade.createdAt || trade.matchedAt || Date.now()).toLocaleDateString("en-GB")}
        </span>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5 }}>
          {trade.unread > 0 && (
            <div className="unread-badge">
              <span style={{ lineHeight:1 }}>{trade.unread}</span>
              <IconMsg/>
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 2: counterparty (left) + sats/fiat/premium/time (right) ── */}
      <div className="v3c-peer-row">

        {/* Left: avatar + peer info */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:9, flex:1, minWidth:0 }}>
          {trade.counterparty ? (
            <>
              <Avatar initials={trade.counterparty.initials} color={trade.counterparty.color} size={32} online/>
              <div style={{ display:"flex", flexDirection:"column", gap:3, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                  <span style={{ fontSize:".85rem", fontWeight:700 }}>{trade.counterparty.name}</span>
                  <PeachRating rep={trade.counterparty.rep}/>
                </div>
                <span style={{ fontSize:".72rem", color:"var(--black-65)" }}>
                  {trade.counterparty.trades} trades
                </span>
                {(trade.counterparty.badges?.length > 0) && (
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:2 }}>
                    {trade.counterparty.badges.includes("supertrader") && <Badge label="supertrader" icon="☆"/>}
                    {trade.counterparty.badges.includes("fast") && <Badge label="fast" icon="⚡"/>}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span style={{ fontSize:".8rem", color:"var(--black-65)", fontStyle:"italic", paddingTop:4 }}>
              No counterparty yet
            </span>
          )}
        </div>

        {/* Right: sats + fiat + premium + time */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, flexShrink:0 }}>
          {hasSatsRange ? (
            <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
              <IcoBtc size={14}/>
              <span style={{ color:"#C4B5AE", fontWeight:700, fontSize:".88rem" }}>0.00</span>
              <span style={{ color:"var(--black)", fontWeight:800, fontSize:".88rem" }}>
                {trade.amount[0].toLocaleString("fr-FR")}–{trade.amount[1].toLocaleString("fr-FR")} Sats
              </span>
            </span>
          ) : (
            <SatsAmount sats={trade.amount}/>
          )}
          <span style={{ fontSize:".82rem", fontWeight:600, color:"var(--black-75)" }}>{fiatStr()}</span>
          {trade.premium !== undefined && (
            <span style={{ fontSize:".72rem", fontWeight:700,
              color: isBuy
                ? (trade.premium < 0 ? "#65A519" : "#DF321F")
                : (trade.premium > 0 ? "#65A519" : "#DF321F"),
            }}>
              {trade.premium > 0 ? "+" : ""}{trade.premium.toFixed(2)}%
            </span>
          )}
          <span style={{ fontSize:".68rem", color: isUrgentTime ? "#DF321F" : "var(--black-65)",
            display:"flex", alignItems:"center", gap:3, marginTop:1 }}>
            <IconClock/> {timeStr()}
          </span>
        </div>
      </div>

      {/* ── ROW 3: payment methods + currencies ── */}
      <div className="v3c-tags">
        {(trade.methods || []).map(m => <span key={m} className="tag tag-method">{m}</span>)}
        {(trade.currencies || []).map(c => <span key={c} className="tag tag-currency">{c}</span>)}
      </div>

      {/* ── ROW 4: status pill ── */}
      <button className={`v3c-pill${pill.passive ? " v3c-pill-passive" : ""}`}
        style={{ background: pill.bg, color: pill.color }}>
        {pill.label}
      </button>

    </div>
  );
}

// ─── HISTORY TABLE ────────────────────────────────────────────────────────────
function HistorySatsAmount({ sats }) {
  const satsStr = sats.toLocaleString("fr-FR");
  if (sats >= 100_000_000) {
    const btc = (sats / 100_000_000).toFixed(2).replace(".", ",");
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:4, flexWrap:"nowrap", whiteSpace:"nowrap" }}>
        <IcoBtc size={13}/>
        <span style={{ color:"var(--black)", fontWeight:800, fontSize:".78rem", whiteSpace:"nowrap" }}>{btc} BTC</span>
      </span>
    );
  }
  const digits = sats.toString().length;
  const leadingZeros = 8 - digits;
  const greyPart = "0," + "0".repeat(leadingZeros);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, flexWrap:"nowrap", whiteSpace:"nowrap" }}>
      <IcoBtc size={13}/>
      <span style={{ color:"#C4B5AE", fontWeight:700, fontSize:".78rem", whiteSpace:"nowrap" }}>{greyPart}</span>
      <span style={{ color:"var(--black)", fontWeight:800, fontSize:".78rem", whiteSpace:"nowrap" }}>{satsStr} Sats</span>
    </span>
  );
}

function HistoryTable({ rows }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState("completedAt");
  const [sortDir, setSortDir] = useState(-1);
  const [histSearch, setHistSearch] = useState("");

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(-1); }
  }

  const sorted = [...rows]
    .filter(r => {
      if (!histSearch.trim()) return true;
      const q = histSearch.toLowerCase();
      return r.tradeId.toLowerCase().includes(q) ||
        r.counterparty.name.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q) ||
        r.currency.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortKey === "completedAt") return (a.completedAt - b.completedAt) * sortDir;
      if (sortKey === "amount")      return (a.amount - b.amount) * sortDir;
      if (sortKey === "fiatAmount")  return (parseFloat(a.fiatAmount) - parseFloat(b.fiatAmount)) * sortDir;
      if (sortKey === "premium")     return (a.premium - b.premium) * sortDir;
      return 0;
    });

  function exportCSV() {
    const headers = ["Trade ID","Type","Counterparty","Amount (sats)","Fiat","Currency","Premium (%)","Method","Status","Rating","Date"];
    const rowsCSV = sorted.map(r => [
      r.tradeId, r.direction.toUpperCase(), r.counterparty.name,
      r.amount, r.fiatAmount, r.currency,
      r.premium.toFixed(2), r.method, r.tradeStatus,
      r.ratingGiven !== null ? (r.ratingGiven === 5 ? "positive" : "negative") : "",
      formatDate(r.completedAt),
    ]);
    const csv = [headers, ...rowsCSV].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "peach-trade-history.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function Th({ col, label, align = "left" }) {
    const active = sortKey === col;
    const dir = active ? (sortDir === 1 ? "asc" : "desc") : null;
    return (
      <th onClick={() => toggleSort(col)} style={{ cursor:"pointer", textAlign:align }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
          {label} <IconSort dir={dir}/>
        </span>
      </th>
    );
  }

  if (!rows.length) {
    return (
      <div className="empty-state">
        <IconEmpty/>
        <p>No trade history yet.</p>
      </div>
    );
  }

  const statusColor = { completed:"#65A519", cancelled:"#7D675E" };

  return (
    <div>
      {/* Search + Export row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <input
          className="hist-search"
          placeholder="Search by ID, counterparty, method…"
          value={histSearch}
          onChange={e => setHistSearch(e.target.value)}
        />
        <button onClick={exportCSV} className="hist-export-btn">
          ↓ Export CSV
        </button>
      </div>

      {/* ── Desktop table ── */}
      <div className="hist-table-wrap hist-desktop">
        <table className="hist-table">
          <thead>
            <tr>
              <th>Trade ID</th>
              <th>Type</th>
              <th>Counterparty</th>
              <Th col="amount" label="Amount"/>
              <Th col="fiatAmount" label="Fiat"/>
              <Th col="premium" label="Premium" align="right"/>
              <th>Method</th>
              <th>Status</th>
              <th>Rating</th>
              <Th col="completedAt" label="Date"/>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id} className="hist-row" style={{cursor:"pointer"}} onClick={() => navigate(`/trade/${r.id}`)}>
                <td><span style={{ fontFamily:"monospace", fontSize:".78rem", color:"var(--black-65)" }}>{r.tradeId}</span></td>
                <td>
                  <span className={`direction-badge direction-${r.direction}`}>{r.direction.toUpperCase()}</span>
                </td>
                <td>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Avatar initials={r.counterparty.initials} color={r.counterparty.color} size={26}/>
                    <span style={{ fontSize:".83rem" }}>{r.counterparty.name}</span>
                  </div>
                </td>
                <td><HistorySatsAmount sats={r.amount}/></td>
                <td style={{ fontWeight:600 }}>{r.currency === "CHF" ? "₣" : "€"}{r.fiatAmount}</td>
                <td style={{ textAlign:"right" }}>
                  <span style={{
                    fontWeight:700, fontSize:".82rem",
                    color: r.direction === "buy"
                      ? (r.premium < 0 ? "var(--success)" : "var(--error)")
                      : (r.premium > 0 ? "var(--success)" : "var(--error)"),
                  }}>
                    {r.premium > 0 ? "+" : ""}{r.premium.toFixed(2)}%
                  </span>
                </td>
                <td><span className="tag tag-method">{r.method}</span></td>
                <td><StatusChip status={r.tradeStatus}/></td>
                <td>
                  {r.ratingGiven !== null
                    ? <span style={{ fontSize:"1rem" }}>{r.ratingGiven === 5 ? "👍" : "👎"}</span>
                    : <span style={{ color:"var(--black-25)", fontSize:".78rem" }}>—</span>
                  }
                </td>
                <td style={{ color:"var(--black-65)", fontSize:".82rem", whiteSpace:"nowrap" }}>{formatDate(r.completedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile list ── */}
      <div className="hist-mobile">
        {sorted.map(r => (
          <div key={r.id} className="hist-mob-row" onClick={() => navigate(`/trade/${r.id}`)}>
            <div className="hist-mob-left">
              <span className="hist-mob-id">{r.tradeId}</span>
              <span className="hist-mob-date">{formatDate(r.completedAt)}</span>
              <span className="hist-mob-status" style={{
                color: r.direction === "buy" ? "#65A519" : "#DF321F"
              }}>
                {r.direction === "buy" ? "↓ bought" : "↑ sold"}
              </span>
            </div>
            <div className="hist-mob-right">
              <HistorySatsAmount sats={r.amount}/>
              <span className="hist-mob-fiat">{r.currency === "CHF" ? "₣" : "€"}{r.fiatAmount}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:12, fontSize:".78rem", color:"var(--black-65)" }}>
        {sorted.length} trade{sorted.length !== 1 ? "s" : ""}
        {histSearch && ` matching "${histSearch}"`}
      </div>
    </div>
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

  /* ── AVATAR DROPDOWN ── */
  .avatar-menu-wrap{position:relative}
  .avatar-menu{position:absolute;top:calc(100% + 6px);right:0;background:var(--surface);border:1px solid var(--black-10);border-radius:12px;box-shadow:0 8px 28px rgba(43,25,17,.12);min-width:160px;padding:6px;z-index:300;animation:fadeIn .12s ease}
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
    max-width:360px;width:90%;animation:popIn .2s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes popIn{from{opacity:0;transform:scale(.92) translateY(8px)}to{opacity:1;transform:none}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
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
  @media(max-width:767px){.burger-btn{display:flex}.topbar-price{display:none}.sidenav-price-slot{display:block}}

  /* Sidenav */
  .sidenav{
    position:fixed;top:var(--topbar);left:0;bottom:0;
    width:68px;background:var(--surface);border-right:1px solid var(--black-10);
    z-index:150;display:flex;flex-direction:column;align-items:center;
    padding:8px 0;gap:2px;
    transition:width .2s cubic-bezier(.4,0,.2,1);overflow:hidden}
  .sidenav-collapsed{width:44px}
  .sidenav-toggle{
    width:100%;height:32px;display:flex;align-items:center;justify-content:flex-end;
    padding-right:10px;border:none;background:transparent;cursor:pointer;
    color:var(--black-25);flex-shrink:0;transition:color .14s;margin-bottom:4px}
  .sidenav-toggle:hover{color:var(--black-65)}
  .sidenav-item{
    width:calc(100% - 16px);display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:3px;padding:8px 4px;border-radius:10px;
    border:none;background:transparent;cursor:pointer;color:var(--black-65);
    font-family:var(--font);transition:all .14s;flex-shrink:0}
  .sidenav-item:hover{background:var(--black-5);color:var(--black)}
  .sidenav-active{background:var(--primary-mild)!important;color:var(--primary-dark)!important}
  .sidenav-icon{display:flex;align-items:center;justify-content:center;height:22px;flex-shrink:0}
  .sidenav-label{
    font-size:.57rem;font-weight:700;letter-spacing:.02em;
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
  @media(max-width:767px){
    .page-wrap{margin-left:0;padding:20px 16px}
    .tabs-action-row{flex-wrap:wrap;gap:8px}
    .tabs-action-row .urgent-banner{flex:none;width:100%;order:3}
    .tabs-action-row .btn-cta{order:2}
  }

  /* Page header */
  .page-header{display:flex;align-items:flex-start;gap:16px;margin-bottom:28px;flex-wrap:wrap}
  .page-title{font-size:1.5rem;font-weight:800;letter-spacing:-.02em}
  .page-subtitle{font-size:.85rem;color:var(--black-65);margin-top:2px}
  .header-right{margin-left:auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap}

  /* Limit bars widget */
  .limit-bar-wrap{background:var(--surface);border:1px solid var(--black-10);border-radius:12px;
    padding:12px 16px;min-width:260px}
  .limit-bar-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
  .limit-bar-label{font-size:.68rem;font-weight:700;color:var(--black-65);text-transform:uppercase;
    letter-spacing:.05em;display:inline-flex;align-items:center;gap:5px}
  .limit-bar-val{font-size:.75rem;font-weight:700}
  .limit-bar-track{height:5px;background:var(--black-10);border-radius:3px;overflow:hidden}
  .limit-bar-fill{height:100%;background:var(--grad);border-radius:3px;transition:width .3s}
  .limit-bar-fill-anon{background:linear-gradient(90deg,#4A9ECC,#037DB5)}
  .limit-bar-fill-annual{background:linear-gradient(90deg,#9B5CFF,#7C3AED)}
  .limit-anon-dot{width:6px;height:6px;border-radius:50%;background:#037DB5;
    display:inline-block;flex-shrink:0}

  /* CTA button */
  .btn-cta{background:var(--grad);color:white;border:none;border-radius:999px;
    font-family:var(--font);font-size:.85rem;font-weight:800;
    padding:8px 20px;cursor:pointer;white-space:nowrap;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .15s,box-shadow .15s}
  .btn-cta:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(245,101,34,.4)}

  /* Tabs + banner + CTA row */
  .tabs-action-row{display:flex;align-items:center;gap:10px;margin-bottom:24px;flex-wrap:wrap}

  /* Main tabs */
  .main-tabs{display:flex;gap:4px;background:var(--black-5);border-radius:12px;padding:4px;
    margin-bottom:24px;width:fit-content}
  .main-tab{background:none;border:none;cursor:pointer;font-family:var(--font);
    font-size:.88rem;font-weight:600;color:var(--black-65);
    padding:7px 20px;border-radius:9px;transition:background .15s,color .15s}
  .main-tab:hover{color:var(--black)}
  .main-tab.active{background:var(--surface);color:var(--black);font-weight:700;
    box-shadow:0 1px 4px rgba(0,0,0,.08)}

  /* Sub-tabs (Buy/Sell) */
  .sub-tabs{display:flex;gap:8px;margin-bottom:16px;align-items:center}
  .sub-tab{background:none;border:1.5px solid var(--black-10);cursor:pointer;font-family:var(--font);
    font-size:.82rem;font-weight:700;color:var(--black-65);
    padding:5px 18px;border-radius:999px;transition:all .15s}
  .sub-tab:hover{border-color:var(--primary);color:var(--primary-dark)}
  .sub-tab.active.buy{background:#F2F9E7;border-color:#65A519;color:#65A519}
  .sub-tab.active.sell{background:#FFF0EE;border-color:#DF321F;color:#DF321F}
  .sub-tab-count{border-radius:999px;
    padding:1px 7px;font-size:.65rem;font-weight:800;margin-left:4px;
    background:var(--black-10);color:var(--black-65)}
  .sub-tab.active.buy .sub-tab-count{background:#65A519;color:white}
  .sub-tab.active.sell .sub-tab-count{background:#DF321F;color:white}

  /* Filter row */
  .filter-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;align-items:center}
  .filter-label{font-size:.72rem;font-weight:700;color:var(--black-65);text-transform:uppercase;letter-spacing:.05em}

  /* Filter dropdown */
  .filter-dropdown-btn{
    display:flex;align-items:center;gap:6px;
    background:var(--surface);border:1.5px solid var(--black-10);border-radius:999px;
    font-family:var(--font);font-size:.8rem;font-weight:600;color:var(--black-75);
    padding:5px 12px 5px 14px;cursor:pointer;transition:border-color .15s,color .15s;white-space:nowrap}
  .filter-dropdown-btn:hover,.filter-dropdown-btn.open{border-color:var(--primary);color:var(--primary-dark)}
  .filter-dropdown-btn.active{background:var(--primary-mild);border-color:var(--primary);color:var(--primary-dark)}
  .filter-count{background:var(--primary);color:white;border-radius:999px;
    padding:0 6px;font-size:.65rem;font-weight:800}
  .filter-panel{position:absolute;top:calc(100% + 6px);left:0;min-width:160px;
    background:var(--surface);border:1px solid var(--black-10);border-radius:12px;
    padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:100}
  .filter-option{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;
    cursor:pointer;font-size:.83rem;font-weight:500;color:var(--black-75);transition:background .1s}
  .filter-option:hover{background:var(--black-5)}
  .filter-option input{accent-color:var(--primary);cursor:pointer}
  .filter-clear{width:100%;background:none;border:none;border-top:1px solid var(--black-10);
    margin-top:6px;padding:6px 8px 2px;font-family:var(--font);font-size:.75rem;font-weight:700;
    color:var(--error);cursor:pointer;text-align:left}

  /* Cards grid */
  .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
  @media(max-width:640px){.cards-grid{grid-template-columns:1fr}}

  /* Trade card — Variant C */
  .trade-card-v3{
    background:var(--surface);border:1.5px solid var(--black-10);border-radius:16px;
    overflow:hidden;cursor:pointer;
    transition:box-shadow .18s,transform .12s;
    display:flex;flex-direction:column;
  }
  .trade-card-v3:hover{box-shadow:0 6px 24px rgba(0,0,0,.1);transform:translateY(-2px)}

  /* Row 1 — top bar */
  .v3c-top{
    padding:12px 15px 10px;
    display:flex;align-items:center;gap:7px;
  }

  /* Row 2 — peer + amounts side by side */
  .v3c-peer-row{
    padding:0 15px 10px;
    display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
  }

  /* Row 3 — tags */
  .v3c-tags{
    padding:0 15px 10px;display:flex;gap:5px;flex-wrap:wrap;
  }

  /* Row 4 — status pill */
  .v3c-pill{
    margin:0 10px 10px;border-radius:12px;
    padding:11px 14px;
    display:flex;align-items:center;justify-content:center;
    border:none;font-family:var(--font);font-size:.85rem;font-weight:800;
    cursor:pointer;width:calc(100% - 20px);transition:filter .15s;
  }
  .v3c-pill:hover{filter:brightness(1.05)}
  /* Passive pill: more padding + orange border */
  .v3c-pill-passive{
    border:1.5px solid var(--primary-mild);
    padding:13px 14px;
    font-weight:600;font-size:.82rem;
  }

  /* ── View mode toggle ── */
  .view-toggle{display:flex;gap:2px;background:var(--bg);border-radius:10px;padding:3px;margin-bottom:12px;align-self:flex-end;width:fit-content;margin-left:auto}
  .view-toggle-btn{
    width:32px;height:32px;border:none;border-radius:8px;background:none;
    cursor:pointer;display:flex;align-items:center;justify-content:center;
    color:var(--black-65);transition:all .15s;
  }
  .view-toggle-btn:hover{color:var(--black)}
  .view-toggle-btn.active{background:var(--surface);color:var(--primary);box-shadow:0 1px 4px rgba(0,0,0,.08)}

  /* ── List layout ── */
  .cards-list{display:flex;flex-direction:column;gap:0;border:1.5px solid var(--black-10);border-radius:14px;overflow:hidden;background:var(--surface)}
  .list-header{
    display:grid;grid-template-columns:54px 90px 1fr 160px 110px 130px 40px 120px;
    align-items:center;gap:10px;padding:10px 15px;
    font-size:.68rem;font-weight:700;color:var(--black-65);text-transform:uppercase;letter-spacing:.04em;
    background:var(--bg);border-bottom:1px solid var(--black-10);
  }
  .trade-row{
    display:grid;grid-template-columns:54px 90px 1fr 160px 110px 130px 40px 120px;
    align-items:center;gap:10px;padding:11px 15px;
    cursor:pointer;transition:background .12s;border-bottom:1px solid var(--black-5);
  }
  .trade-row:last-child{border-bottom:none}
  .trade-row:hover{background:var(--bg)}
  .trade-row-id{font-size:.72rem;font-weight:700;color:var(--black-65);font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .trade-row-peer{font-size:.82rem;font-weight:600;color:var(--black);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .trade-row-amount{font-size:.82rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .trade-row-fiat{font-size:.78rem;font-weight:600;color:var(--black-75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .trade-row-time{font-size:.7rem;color:var(--black-65);display:flex;align-items:center;gap:3px;white-space:nowrap}
  .trade-row-time.urgent{color:var(--error)}
  .trade-row-pill{
    font-size:.7rem;font-weight:800;font-family:var(--font);
    padding:5px 10px;border-radius:999px;text-align:center;white-space:nowrap;
  }
  @media(max-width:900px){
    .list-header{display:none}
    .trade-row{
      grid-template-columns:50px 1fr auto;gap:6px;padding:12px 14px;
    }
    .trade-row-id,.trade-row-fiat,.trade-row-time{display:none}
    .trade-row-peer{font-size:.78rem}
  }
  @media(max-width:640px){
    .view-toggle{margin-bottom:8px}
  }

  /* History export button */
  .hist-export-btn{
    background:var(--surface);border:1.5px solid var(--black-10);border-radius:999px;
    font-family:var(--font);font-size:.8rem;font-weight:700;color:var(--black-65);
    padding:6px 16px;cursor:pointer;white-space:nowrap;transition:border-color .15s,color .15s;
  }
  .hist-export-btn:hover{border-color:var(--primary);color:var(--primary-dark)}

  /* Desktop table shown, mobile list hidden by default */
  .hist-desktop{display:block}
  .hist-mobile{display:none}

  /* Mobile history list */
  .hist-mob-row{
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    padding:12px 4px;border-bottom:1px solid var(--black-10);cursor:pointer;
    transition:background .1s;
  }
  .hist-mob-row:last-child{border-bottom:none}
  .hist-mob-row:active{background:var(--black-5)}
  .hist-mob-left{display:flex;flex-direction:column;gap:2px;min-width:0}
  .hist-mob-id{font-family:monospace;font-size:.78rem;font-weight:700;color:var(--black);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .hist-mob-date{font-size:.68rem;color:var(--black-65)}
  .hist-mob-status{font-size:.68rem;font-weight:700;text-transform:capitalize}
  .hist-mob-right{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0}
  .hist-mob-fiat{font-size:.78rem;font-weight:600;color:var(--black-65)}

  @media(max-width:640px){
    .hist-desktop{display:none}
    .hist-mobile{display:block}
  }

  /* Direction badge — 40% bigger than before */
  .direction-badge{display:inline-flex;align-items:center;border-radius:999px;
    padding:3px 13px;font-size:.82rem;font-weight:800;letter-spacing:.04em;flex-shrink:0}
  .direction-buy{background:#F2F9E7;color:#65A519}
  .direction-sell{background:#FFF0EE;color:#DF321F}

  /* Unread badge — number + icon inline */
  .unread-badge{display:inline-flex;align-items:center;gap:4px;
    background:var(--error-bg);color:var(--error);
    border-radius:999px;padding:3px 9px;font-size:.75rem;font-weight:700;line-height:1}

  /* keep shared pieces */
  .card-counterparty{display:flex;align-items:center;gap:10px}
  .card-action-btn{
    border:none;border-radius:999px;font-family:var(--font);
    font-size:.75rem;font-weight:700;padding:5px 12px;cursor:pointer;transition:all .15s}

  /* Tags */
  .tag{display:inline-flex;align-items:center;border-radius:999px;
    padding:2px 8px;font-size:.7rem;font-weight:600;white-space:nowrap}
  .tag-method{background:var(--black-5);color:var(--black-75)}
  .tag-currency{background:var(--primary-mild);color:var(--primary-dark)}

  /* Empty state */
  .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:12px;padding:64px 24px;color:var(--black-65);text-align:center}
  .empty-state p{font-size:.9rem}
  .empty-actions{display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;justify-content:center}

  /* History table */
  .hist-search{
    width:100%;max-width:360px;
    background:var(--surface);border:1.5px solid var(--black-10);border-radius:999px;
    font-family:var(--font);font-size:.83rem;color:var(--black);
    padding:7px 16px;outline:none;transition:border-color .15s}
  .hist-search:focus{border-color:var(--primary)}
  .hist-table-wrap{overflow-x:auto;border:1px solid var(--black-10);border-radius:14px}
  .hist-table{width:100%;border-collapse:collapse;font-size:.83rem}
  .hist-table thead tr{background:var(--primary-mild)}
  .hist-table th{
    text-align:left;padding:10px 14px;
    font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
    color:var(--primary-dark);border-bottom:2px solid var(--black-10);white-space:nowrap;
    user-select:none}
  .hist-table th:hover{color:var(--primary)}
  .hist-table td{padding:11px 14px;border-bottom:1px solid var(--black-5);vertical-align:middle}
  .hist-row:last-child td{border-bottom:none}
  .hist-row:hover td{background:var(--black-5)}

  /* Urgent alert banner */
  .urgent-banner{
    background:linear-gradient(90deg,#FFF0EE,#FFF9F6);
    border:1px solid rgba(245,101,34,.25);border-radius:12px;
    padding:10px 16px;margin-bottom:20px;
    display:flex;align-items:center;gap:10px;font-size:.83rem;color:var(--primary-dark);font-weight:600;width:fit-content}
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TradesDashboard() {
  const navigate = useNavigate();
  const [mainTab, setMainTab]     = useState("active");   // "active" | "history"
  const [subTab, setSubTab]       = useState("buy");      // "buy" | "sell"
  const [filterMethods, setFilterMethods]     = useState([]);
  const [filterCurrencies, setFilterCurrencies] = useState([]);
  const [filterStatuses, setFilterStatuses]   = useState([]);
  const [viewMode, setViewMode]               = useState("grid"); // "grid" | "list"

  const [collapsed, setCollapsed]       = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);

  // ── AUTH ──
  const auth = window.__PEACH_AUTH__ ?? null;
  const [liveItems, setLiveItems] = useState(null);   // null = use mock
  const [liveLimit, setLiveLimit] = useState(null);   // null = use mock

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (window.__PEACH_AUTH__) return true;
    try { return localStorage.getItem("peach_logged_in") !== "false"; } catch { return true; }
  });
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const handleLogout = () => { window.__PEACH_AUTH__ = null; setIsLoggedIn(false); setShowAvatarMenu(false); try { localStorage.setItem("peach_logged_in", "false"); } catch {} };
  const handleLogin  = () => { setIsLoggedIn(true); try { localStorage.setItem("peach_logged_in", "true"); } catch {} };
  useEffect(() => {
    if (!showAvatarMenu) return;
    const close = (e) => { if (!e.target.closest(".avatar-menu-wrap")) setShowAvatarMenu(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAvatarMenu]);

  const [allPrices,           setAllPrices]           = useState({ EUR: BTC_PRICE });
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? BTC_PRICE);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/market/prices`);
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

  // ── LIVE TRADES + LIMITS ──
  useEffect(() => {
    if (!auth) return;
    const base = auth.baseUrl;
    const hdrs = { Authorization: `Bearer ${auth.token}` };
    const peachId = auth.peachId;

    function normalizeOffer(o) {
      const isBuy = o.type === "bid";
      const methods = o.meansOfPayment ? Object.keys(o.meansOfPayment) : [];
      const currencies = o.meansOfPayment
        ? [...new Set(Object.values(o.meansOfPayment).flat())]
        : [];
      return {
        id: o.id,
        kind: "open_offer",
        direction: isBuy ? "buy" : "sell",
        amount: Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0),
        premium: o.premium ?? 0,
        methods,
        currencies,
        createdAt: o.creationDate ?? Date.now(),
        expiresIn: null,
        counterparty: null,
        unread: 0,
      };
    }

    function normalizeContract(c) {
      const isBuyer = (c.buyer?.id ?? c.buyerId) === peachId;
      return {
        id: c.id,
        kind: "contract",
        direction: isBuyer ? "buy" : "sell",
        tradeStatus: c.status ?? "unknown",
        instantTrade: c.instantTrade ?? false,
        amount: c.amount ?? 0,
        premium: c.premium ?? 0,
        methods: c.paymentMethod ? [c.paymentMethod] : [],
        currencies: c.currency ? [c.currency] : [],
        createdAt: c.creationDate ?? Date.now(),
        counterparty: null,
        unread: 0,
      };
    }

    async function fetchTradesAndLimits() {
      try {
        const [offersRes, contractsRes, limitRes] = await Promise.all([
          fetch(`${base}/offers/summary`, { headers: hdrs }),
          fetch(`${base}/contracts/summary`, { headers: hdrs }),
          fetch(`${base}/user/tradingLimit`, { headers: hdrs }),
        ]);
        const [offersData, contractsData, limitData] = await Promise.all([
          offersRes.ok ? offersRes.json() : [],
          contractsRes.ok ? contractsRes.json() : [],
          limitRes.ok ? limitRes.json() : null,
        ]);
        const items = [
          ...(Array.isArray(offersData) ? offersData.map(normalizeOffer) : []),
          ...(Array.isArray(contractsData) ? contractsData.map(normalizeContract) : []),
        ];
        setLiveItems(items);
        if (limitData) setLiveLimit(limitData);
      } catch {}
    }
    fetchTradesAndLimits();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const trades = liveItems ?? MOCK_ACTIVE;

  const satsPerCur  = Math.round(SAT / btcPrice);

  // Trading limits — live if available, mock fallback
  const LIMIT_TOTAL  = liveLimit?.dailyAmount              ?? liveLimit?.daily?.amount              ?? 1000;
  const LIMIT_USED   = liveLimit?.dailyAmountTraded        ?? liveLimit?.daily?.amountTraded        ?? 340;
  const ANON_TOTAL   = liveLimit?.monthlyAnonymousAmount   ?? liveLimit?.monthlyAnon?.amount        ?? 1000;
  const ANON_USED    = liveLimit?.monthlyAnonymousTraded   ?? liveLimit?.monthlyAnon?.amountTraded  ?? 620;
  const ANNUAL_TOTAL = liveLimit?.yearlyAmount             ?? liveLimit?.yearly?.amount             ?? 100000;
  const ANNUAL_USED  = liveLimit?.yearlyAmountTraded       ?? liveLimit?.yearly?.amountTraded       ?? 8740;
  const limitPct  = Math.min(100, (LIMIT_USED  / LIMIT_TOTAL)  * 100);
  const anonPct   = Math.min(100, (ANON_USED   / ANON_TOTAL)   * 100);
  const annualPct = Math.min(100, (ANNUAL_USED / ANNUAL_TOTAL) * 100);

  // Filter active trades
  const filtered = trades.filter(t => {
    if (t.direction !== subTab) return false;

    if (filterMethods.length > 0) {
      const methods = t.methods || [];
      if (!filterMethods.some(m => methods.includes(m))) return false;
    }
    if (filterCurrencies.length > 0) {
      const currencies = t.currencies || [];
      if (!filterCurrencies.some(c => currencies.includes(c))) return false;
    }
    if (filterStatuses.length > 0) {
      const s = t.kind === "contract" ? t.tradeStatus : t.kind;
      if (!filterStatuses.includes(s)) return false;
    }
    return true;
  });

  // Sort: action-required first, then by time
  const sortedFiltered = [...filtered].sort((a, b) => {
    const aAction = (STATUS_CONFIG[a.kind === "contract" ? a.tradeStatus : a.kind] || {}).action ? 1 : 0;
    const bAction = (STATUS_CONFIG[b.kind === "contract" ? b.tradeStatus : b.kind] || {}).action ? 1 : 0;
    if (aAction !== bAction) return bAction - aAction;
    return 0;
  });

  // Count urgent items
  const urgentCount = trades.filter(t => {
    const cfg = STATUS_CONFIG[t.kind === "contract" ? t.tradeStatus : t.kind] || {};
    return cfg.action;
  }).length;

  // Count by sub-tab
  const buyCount  = trades.filter(t => t.direction === "buy").length;
  const sellCount = trades.filter(t => t.direction === "sell").length;

  const anyFilterActive = filterMethods.length + filterCurrencies.length + filterStatuses.length > 0;

  function clearAllFilters() {
    setFilterMethods([]);
    setFilterCurrencies([]);
    setFilterStatuses([]);
  }

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
                <span className="peach-id">{getTopbarPeachId()}</span>
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
        active="trades"
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
        {/* Page header */}
        {/* Title row */}
        <div style={{marginBottom:16}}>
          <div className="page-title">Your Trades</div>
          <div className="page-subtitle">Manage your active trades and review history</div>
        </div>

        {/* Limits card — left-aligned */}
        <div style={{marginBottom:20}}>
          <div className="limit-bar-wrap" style={{display:"inline-block",minWidth:260,maxWidth:380,width:"100%"}}>
            {/* Daily */}
            <div className="limit-bar-top">
              <span className="limit-bar-label">Daily Limit</span>
              <span className="limit-bar-val">€{LIMIT_USED} <span style={{ fontWeight:400, color:"var(--black-65)" }}>/ €{LIMIT_TOTAL}</span></span>
            </div>
            <div className="limit-bar-track">
              <div className="limit-bar-fill" style={{ width:`${limitPct}%` }}/>
            </div>
            {/* Anonymous methods — monthly */}
            <div className="limit-bar-top" style={{ marginTop:10 }}>
              <span className="limit-bar-label">
                <span className="limit-anon-dot"/>Anonymous · Monthly
              </span>
              <span className="limit-bar-val">€{ANON_USED} <span style={{ fontWeight:400, color:"var(--black-65)" }}>/ €{ANON_TOTAL}</span></span>
            </div>
            <div className="limit-bar-track">
              <div className="limit-bar-fill limit-bar-fill-anon" style={{ width:`${anonPct}%` }}/>
            </div>
            {/* Annual */}
            <div className="limit-bar-top" style={{ marginTop:10 }}>
              <span className="limit-bar-label">Annual Limit</span>
              <span className="limit-bar-val">€{ANNUAL_USED.toLocaleString()} <span style={{ fontWeight:400, color:"var(--black-65)" }}>/ €{ANNUAL_TOTAL.toLocaleString()}</span></span>
            </div>
            <div className="limit-bar-track">
              <div className="limit-bar-fill limit-bar-fill-annual" style={{ width:`${annualPct}%` }}/>
            </div>
          </div>
        </div>

        {/* Tabs + urgent banner + New Offer button — all one row */}
        <div className="tabs-action-row">
          <div className="main-tabs" style={{margin:0}}>
            <button className={`main-tab${mainTab === "active" ? " active" : ""}`} onClick={() => setMainTab("active")}>
              Active Trades {trades.length > 0 && <span style={{ background:"var(--primary)", color:"white", borderRadius:999, padding:"0 7px", fontSize:".7rem", fontWeight:800, marginLeft:6 }}>{trades.length}</span>}
            </button>
            <button className={`main-tab${mainTab === "history" ? " active" : ""}`} onClick={() => setMainTab("history")}>
              Trade History
            </button>
          </div>
          {urgentCount > 0 && (
            <div className="urgent-banner" style={{margin:0}}>
              <IconAlert/>
              <span>{urgentCount} trade{urgentCount > 1 ? "s" : ""} require{urgentCount === 1 ? "s" : ""} your attention</span>
            </div>
          )}
          <button className="btn-cta" style={{marginLeft:"auto",flexShrink:0}}>+ New Offer</button>
        </div>

        {/* ── ACTIVE TRADES ── */}
        {mainTab === "active" && (
          <>
            {/* Buy / Sell sub-tabs */}
            <div className="sub-tabs">
              <button className={`sub-tab buy${subTab === "buy" ? " active" : ""}`} onClick={() => setSubTab("buy")}>
                Buy
                <span className="sub-tab-count">{buyCount}</span>
              </button>
              <button className={`sub-tab sell${subTab === "sell" ? " active" : ""}`} onClick={() => setSubTab("sell")}>
                Sell
                <span className="sub-tab-count">{sellCount}</span>
              </button>
            </div>

            {/* Filter row */}
            <div className="filter-row">
              <span className="filter-label">Filter</span>
              <FilterDropdown
                label="Payment Method"
                options={ALL_METHODS}
                selected={filterMethods}
                onChange={setFilterMethods}
              />
              <FilterDropdown
                label="Currency"
                options={ALL_CURRENCIES}
                selected={filterCurrencies}
                onChange={setFilterCurrencies}
              />
              <FilterDropdown
                label="Status"
                options={ALL_STATUSES}
                selected={filterStatuses}
                onChange={v => setFilterStatuses(v)}
              />
              {anyFilterActive && (
                <button onClick={clearAllFilters} style={{
                  background:"none", border:"none", cursor:"pointer",
                  font:"inherit", fontSize:".78rem", fontWeight:700,
                  color:"var(--black-65)", padding:"4px 8px", borderRadius:999,
                  transition:"color .15s",
                }} onMouseEnter={e => e.target.style.color="var(--error)"}
                   onMouseLeave={e => e.target.style.color="var(--black-65)"}>
                  Clear all ✕
                </button>
              )}
            </div>

            {/* View mode toggle */}
            <div className="view-toggle">
              <button className={`view-toggle-btn${viewMode === "grid" ? " active" : ""}`}
                onClick={() => setViewMode("grid")} title="Grid view">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
              </button>
              <button className={`view-toggle-btn${viewMode === "list" ? " active" : ""}`}
                onClick={() => setViewMode("list")} title="List view">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="1" y1="3" x2="15" y2="3"/><line x1="1" y1="8" x2="15" y2="8"/><line x1="1" y1="13" x2="15" y2="13"/></svg>
              </button>
            </div>

            {/* Cards */}
            {sortedFiltered.length === 0 ? (
              <div className="empty-state">
                <IconEmpty/>
                <p>{anyFilterActive ? "No trades match the selected filters." : `No ${subTab} trades yet.`}</p>
                <div className="empty-actions">
                  {anyFilterActive
                    ? <button className="btn-cta" onClick={clearAllFilters}>Clear Filters</button>
                    : <button className="btn-cta">Browse Market</button>
                  }
                </div>
              </div>
            ) : viewMode === "list" ? (
              <div className="cards-list">
                <div className="list-header">
                  <span></span>
                  <span>ID</span>
                  <span>Counterparty</span>
                  <span>Amount</span>
                  <span>Fiat</span>
                  <span>Time</span>
                  <span>Chat</span>
                  <span>Status</span>
                </div>
                {sortedFiltered.map(t => <TradeCard key={t.id} trade={t} layout="list" onSelect={(id) => navigate(`/trade/${id}`)}/>)}
              </div>
            ) : (
              <div className="cards-grid">
                {sortedFiltered.map(t => <TradeCard key={t.id} trade={t} layout="grid" onSelect={(id) => navigate(`/trade/${id}`)}/>)}
              </div>
            )}
          </>
        )}

        {/* ── TRADE HISTORY ── */}
        {mainTab === "history" && (
          <HistoryTable rows={MOCK_HISTORY}/>
        )}
      </main>

      {/* ── AUTH POPUP (when logged out) ── */}
      {!isLoggedIn && (
        <div className="auth-screen-overlay">
          <div className="auth-popup">
            <div className="auth-popup-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><rect x="5" y="12" width="18" height="13" rx="3"/><path d="M9 12V9a5 5 0 0 1 10 0v3"/><circle cx="14" cy="19" r="1.5" fill="var(--primary)"/></svg>
            </div>
            <div className="auth-popup-title">Authentication required</div>
            <div className="auth-popup-sub">Please authenticate to view your trades and manage active orders</div>
            <button className="auth-popup-btn" onClick={handleLogin}>Log in</button>
          </div>
        </div>
      )}
    </>
  );
}
