import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SideNav, Topbar } from "../components/Navbars.jsx";
import { SatsAmount, IcoBtc } from "../components/BitcoinAmount.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useApi } from "../hooks/useApi.js";

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconSort      = ({ dir }) => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d={dir === "asc" ? "M2 8l4-5 4 5" : dir === "desc" ? "M2 4l4 5 4-5" : "M2 4.5l4-3 4 3M2 7.5l4 3 4-3"}/></svg>;
const IconChevDown  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,5 7,9 11,5"/></svg>;
const IconMsg       = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-3 2V10H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/></svg>;
const IconClock     = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="5"/><path d="M6.5 3.5v3l2 1.5"/></svg>;
const IconAlert     = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2L1 12h12L7 2z"/><line x1="7" y1="6" x2="7" y2="9"/><circle cx="7" cy="11" r=".5" fill="currentColor"/></svg>;
const IconEmpty     = () => <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#C4B5AE" strokeWidth="1.5" strokeLinecap="round"><rect x="8" y="12" width="32" height="28" rx="4"/><path d="M16 12V9a8 8 0 0 1 16 0v3"/><line x1="19" y1="24" x2="29" y2="24"/><line x1="19" y1="30" x2="25" y2="30"/></svg>;


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
  accept_trade_request:{ label: "Accept Trade Request", bg: "#F56522", color: "white",   action: true  },
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

// Mock match requesters — used by pending_match trades with incoming requests
const MOCK_MATCHES = [
  {
    offerId: "match-offer-1",
    user: { initials:"KL", color:"#FF7A50", name:"Peer #4E2A", rep:4.9, trades:312, badges:["supertrader","fast"] },
    amount: 85000,
    premium: -1.2,
    methods: ["SEPA","Revolut"],
    currencies: ["EUR"],
    requestedAt: Date.now() - 12*60_000,
  },
  {
    offerId: "match-offer-2",
    user: { initials:"DV", color:"#F56522", name:"Peer #A1F3", rep:4.6, trades:67, badges:[] },
    amount: 85000,
    premium: -0.8,
    methods: ["SEPA"],
    currencies: ["EUR"],
    requestedAt: Date.now() - 25*60_000,
  },
  {
    offerId: "match-offer-3",
    user: { initials:"FR", color:"#DF321F", name:"Peer #D8B1", rep:3.9, trades:9, badges:[] },
    amount: 85000,
    premium: -0.5,
    methods: ["SEPA"],
    currencies: ["EUR"],
    requestedAt: Date.now() - 45*60_000,
  },
];

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
    counterparty:null,
    matchCount:3, matches:MOCK_MATCHES,
    unread:3,
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
    id:"s1b", kind:"pending_match", direction:"sell",
    amount:95000, premium:1.5, methods:["SEPA"], currencies:["EUR"],
    matchedAt: Date.now() - 8*60_000,
    counterparty:null,
    matchCount:2, matches:MOCK_MATCHES.slice(0,2),
    unread:2,
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
  accept_trade_request:{ bg:"var(--primary)",    color:"white",              label:"Accept trade request",  passive:false },
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
  const hasMatches = trade.kind === "pending_match" && trade.matchCount > 0;
  const statusKey = hasMatches ? "accept_trade_request" : (trade.kind === "contract" ? trade.tradeStatus : trade.kind);
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
      <div className="trade-row" onClick={() => onSelect && onSelect(trade)}>
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
    <div className="trade-card-v3" onClick={() => onSelect && onSelect(trade)}>

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
            <span style={{ fontSize:".8rem", color: hasMatches ? "var(--primary-dark)" : "var(--black-65)", fontStyle:"italic", paddingTop:4, fontWeight: hasMatches ? 700 : 400 }}>
              {hasMatches ? `${trade.matchCount} trade request${trade.matchCount !== 1 ? "s" : ""}` : "No counterparty yet"}
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

  /* ── Matches popup ── */
  .matches-overlay{
    position:fixed;inset:0;z-index:600;
    background:rgba(43,25,17,.55);
    display:flex;align-items:center;justify-content:center;
    padding:20px;
    animation:matchesFadeIn .2s ease;
  }
  @keyframes matchesFadeIn{from{opacity:0}to{opacity:1}}
  .matches-popup{
    background:var(--surface);border-radius:20px;
    max-width:480px;width:100%;
    box-shadow:0 16px 48px rgba(43,25,17,.25);
    animation:matchesSlideUp .25s ease;
    max-height:85vh;overflow-y:auto;
  }
  @keyframes matchesSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .matches-header{
    display:flex;align-items:center;gap:10px;
    padding:18px 24px 12px;
    border-bottom:1px solid var(--black-10);
    position:sticky;top:0;background:var(--surface);border-radius:20px 20px 0 0;z-index:1;
  }
  .matches-close{
    margin-left:auto;background:none;border:none;cursor:pointer;
    font-size:1.1rem;color:var(--black-65);padding:4px 8px;border-radius:8px;
    transition:background .15s,color .15s;
  }
  .matches-close:hover{background:var(--black-5);color:var(--black)}
  .matches-back{
    background:none;border:none;cursor:pointer;padding:4px;border-radius:8px;
    display:flex;align-items:center;color:var(--black-65);transition:color .15s;
  }
  .matches-back:hover{color:var(--black)}
  .match-list{padding:0 12px 16px}
  .match-row{
    display:flex;align-items:center;gap:12px;
    padding:12px;border-radius:12px;
    cursor:pointer;transition:background .12s;
  }
  .match-row:hover{background:var(--black-5)}
  .match-detail-terms{
    background:var(--bg);border-radius:12px;padding:12px 16px;
    display:flex;flex-direction:column;gap:10px;
  }
  .match-detail-row{
    display:flex;align-items:center;justify-content:space-between;gap:8px;
  }
  .match-detail-label{
    font-size:.78rem;font-weight:600;color:var(--black-65);flex-shrink:0;
  }
  .match-btn-accept{
    flex:1;background:var(--grad);color:white;border:none;border-radius:999px;
    font-family:var(--font);font-size:.88rem;font-weight:800;
    padding:12px 20px;cursor:pointer;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .15s,box-shadow .15s;
  }
  .match-btn-accept:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(245,101,34,.4)}
  .match-btn-skip{
    flex:1;background:none;border:1.5px solid var(--black-10);border-radius:999px;
    font-family:var(--font);font-size:.88rem;font-weight:700;color:var(--black-65);
    padding:12px 20px;cursor:pointer;transition:border-color .15s,color .15s;
  }
  .match-btn-skip:hover{border-color:var(--primary);color:var(--primary-dark)}
  @media(max-width:500px){
    .matches-popup{max-width:100%;border-radius:16px}
  }
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

  // ── AUTH + API ──
  const { get, post, del, auth } = useApi();
  const [liveItems, setLiveItems] = useState(null);   // null = use mock
  const [liveLimit, setLiveLimit] = useState(null);   // null = use mock

  const { isLoggedIn, handleLogin, handleLogout, showAvatarMenu, setShowAvatarMenu } = useAuth();
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

  // ── LIVE TRADES + LIMITS ──
  useEffect(() => {
    if (!auth) return;
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
          get('/offers/summary'),
          get('/contracts/summary'),
          get('/user/tradingLimit'),
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

  const [acceptedTrades, setAcceptedTrades] = useState(new Set()); // trade ids accepted

  function resolveStatusKey(t) {
    if (t.kind === "pending_match" && t.matchCount > 0 && !acceptedTrades.has(t.id)) return "accept_trade_request";
    return t.kind === "contract" ? t.tradeStatus : t.kind;
  }

  // Sort: action-required first, then by time
  const sortedFiltered = [...filtered].sort((a, b) => {
    const aAction = (STATUS_CONFIG[resolveStatusKey(a)] || {}).action ? 1 : 0;
    const bAction = (STATUS_CONFIG[resolveStatusKey(b)] || {}).action ? 1 : 0;
    if (aAction !== bAction) return bAction - aAction;
    return 0;
  });

  // Count urgent items
  const urgentCount = trades.filter(t => {
    const cfg = STATUS_CONFIG[resolveStatusKey(t)] || {};
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

  // ── Matches popup state ──
  const [matchesPopup, setMatchesPopup]   = useState(null);   // trade object or null
  const [matchDetail, setMatchDetail]     = useState(null);   // selected match or null
  const [matchConfirm, setMatchConfirm]   = useState(null);   // match pending confirmation or null
  const [localMatches, setLocalMatches]   = useState({});      // tradeId → remaining matches
  const [matchError, setMatchError]       = useState(null);    // error message shown in popup

  function handleTradeSelect(trade) {
    const hasMatches = trade.kind === "pending_match" && trade.matchCount > 0;
    if (hasMatches && !acceptedTrades.has(trade.id)) {
      setMatchesPopup(trade);
      setMatchDetail(null);
      setMatchConfirm(null);
      setMatchError(null);
    } else {
      navigate(`/trade/${trade.id}`);
    }
  }

  function getMatchesForTrade(trade) {
    if (localMatches[trade.id]) return localMatches[trade.id];
    return trade.matches || [];
  }

  async function handleSkipMatch(trade, match) {
    setMatchError(null);
    // Save current state for rollback
    const previousMatches = getMatchesForTrade(trade);
    // Update UI immediately (optimistic)
    const remaining = previousMatches.filter(m => m.offerId !== match.offerId);
    setLocalMatches(prev => ({ ...prev, [trade.id]: remaining }));
    setMatchDetail(null);
    if (remaining.length === 0) {
      setMatchesPopup(null);
    }
    // Send rejection to API
    if (auth) {
      try {
        const res = await del('/offer/match', { matchOfferId: match.offerId });
        if (!res.ok) {
          // Rollback: restore the requester
          setLocalMatches(prev => ({ ...prev, [trade.id]: previousMatches }));
          setMatchesPopup(trade);
          setMatchError("Could not decline this request. Please try again.");
        }
      } catch {
        setLocalMatches(prev => ({ ...prev, [trade.id]: previousMatches }));
        setMatchesPopup(trade);
        setMatchError("Network error — could not decline this request.");
      }
    }
  }

  function handleAcceptMatch(trade, match) {
    setMatchError(null);
    setMatchConfirm(match);
  }

  async function handleConfirmAccept(trade, match) {
    setMatchError(null);
    if (!auth) {
      // Mock mode — just update UI
      setAcceptedTrades(prev => new Set([...prev, trade.id]));
      setMatchesPopup(null);
      setMatchDetail(null);
      setMatchConfirm(null);
      return;
    }
    try {
      const res = await post('/offer/match', { matchOfferId: match.offerId });
      if (res.ok) {
        setAcceptedTrades(prev => new Set([...prev, trade.id]));
        setMatchesPopup(null);
        setMatchDetail(null);
        setMatchConfirm(null);
      } else {
        setMatchConfirm(null);
        setMatchError("Could not accept this trade. Please try again.");
      }
    } catch {
      setMatchConfirm(null);
      setMatchError("Network error — could not accept this trade.");
    }
  }

  function closeMatchesPopup() {
    setMatchesPopup(null);
    setMatchDetail(null);
    setMatchConfirm(null);
    setMatchError(null);
  }

  return (
    <>
      <style>{CSS}</style>

      {/* ── TOPBAR ── */}
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
                {sortedFiltered.map(t => <TradeCard key={t.id} trade={t} layout="list" onSelect={handleTradeSelect}/>)}
              </div>
            ) : (
              <div className="cards-grid">
                {sortedFiltered.map(t => <TradeCard key={t.id} trade={t} layout="grid" onSelect={handleTradeSelect}/>)}
              </div>
            )}
          </>
        )}

        {/* ── TRADE HISTORY ── */}
        {mainTab === "history" && (
          <HistoryTable rows={MOCK_HISTORY}/>
        )}
      </main>

      {/* ── MATCHES POPUP ── */}
      {matchesPopup && (() => {
        const trade = matchesPopup;
        const matches = getMatchesForTrade(trade);
        const isBuy = trade.direction === "buy";

        // ── Confirmation dialog ──
        if (matchConfirm) {
          const m = matchConfirm;
          return (
            <div className="matches-overlay" onClick={closeMatchesPopup}>
              <div className="matches-popup" onClick={e => e.stopPropagation()}>
                <div className="matches-header">
                  <span style={{fontWeight:800,fontSize:"1.05rem"}}>Confirm trade</span>
                  <button className="matches-close" onClick={closeMatchesPopup}>✕</button>
                </div>
                <div style={{padding:"20px 24px",textAlign:"center"}}>
                  <Avatar initials={m.user.initials} color={m.user.color} size={56}/>
                  <div style={{fontWeight:800,fontSize:"1rem",marginTop:12}}>
                    Accept trade with {m.user.name}?
                  </div>
                  <div style={{fontSize:".82rem",color:"var(--black-65)",marginTop:6}}>
                    This will create a contract. Other requesters will be automatically declined.
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"center"}}>
                    <button className="match-btn-skip" onClick={() => setMatchConfirm(null)}>Cancel</button>
                    <button className="match-btn-accept" onClick={() => handleConfirmAccept(trade, m)}>Confirm</button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // ── Detail view ──
        if (matchDetail) {
          const m = matchDetail;
          const reqAgo = relativeTime(m.requestedAt);
          return (
            <div className="matches-overlay" onClick={closeMatchesPopup}>
              <div className="matches-popup" onClick={e => e.stopPropagation()}>
                <div className="matches-header">
                  <button className="matches-back" onClick={() => setMatchDetail(null)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,2 4,8 10,14"/></svg>
                  </button>
                  <span style={{fontWeight:800,fontSize:"1.05rem"}}>Review trader</span>
                  <button className="matches-close" onClick={closeMatchesPopup}>✕</button>
                </div>
                <div style={{padding:"16px 24px 24px"}}>
                  {/* Peer profile */}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:20}}>
                    <Avatar initials={m.user.initials} color={m.user.color} size={56}/>
                    <div style={{fontWeight:800,fontSize:"1rem"}}>{m.user.name}</div>
                    <PeachRating rep={m.user.rep} size={20}/>
                    <span style={{fontSize:".82rem",color:"var(--black-65)"}}>{m.user.trades} trades</span>
                    {m.user.badges.length > 0 && (
                      <div style={{display:"flex",gap:6}}>
                        {m.user.badges.includes("supertrader") && <Badge label="supertrader" icon="☆"/>}
                        {m.user.badges.includes("fast") && <Badge label="fast" icon="⚡"/>}
                      </div>
                    )}
                  </div>
                  {/* Trade terms */}
                  <div className="match-detail-terms">
                    <div className="match-detail-row">
                      <span className="match-detail-label">Amount</span>
                      <SatsAmount sats={m.amount}/>
                    </div>
                    <div className="match-detail-row">
                      <span className="match-detail-label">Fiat</span>
                      <span style={{fontWeight:700}}>≈ €{satsToFiat(m.amount)}</span>
                    </div>
                    <div className="match-detail-row">
                      <span className="match-detail-label">Premium</span>
                      <span style={{fontWeight:700,color:m.premium < 0 ? "#65A519" : m.premium > 0 ? "#DF321F" : "var(--black)"}}>
                        {m.premium > 0 ? "+" : ""}{m.premium.toFixed(2)}%
                      </span>
                    </div>
                    <div className="match-detail-row">
                      <span className="match-detail-label">Payment</span>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {m.methods.map(pm => <span key={pm} className="tag tag-method">{pm}</span>)}
                        {m.currencies.map(c => <span key={c} className="tag tag-currency">{c}</span>)}
                      </div>
                    </div>
                    <div className="match-detail-row">
                      <span className="match-detail-label">Requested</span>
                      <span style={{fontSize:".82rem",color:"var(--black-65)"}}>{reqAgo}</span>
                    </div>
                  </div>
                  {/* Error */}
                  {matchError && (
                    <div style={{background:"var(--error-bg)",color:"var(--error)",borderRadius:10,padding:"8px 14px",fontSize:".82rem",fontWeight:600,marginTop:12}}>
                      {matchError}
                    </div>
                  )}
                  {/* Actions */}
                  <div style={{display:"flex",gap:10,marginTop:12}}>
                    <button className="match-btn-skip" onClick={() => handleSkipMatch(trade, m)}>Skip</button>
                    <button className="match-btn-accept" onClick={() => handleAcceptMatch(trade, m)}>Accept trade</button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // ── List view ──
        return (
          <div className="matches-overlay" onClick={closeMatchesPopup}>
            <div className="matches-popup" onClick={e => e.stopPropagation()}>
              <div className="matches-header">
                <span style={{fontWeight:800,fontSize:"1.05rem"}}>Trade requests</span>
                <span style={{fontSize:".78rem",fontFamily:"monospace",color:"var(--black-65)"}}>{trade.id.toUpperCase()}</span>
                <button className="matches-close" onClick={closeMatchesPopup}>✕</button>
              </div>
              {/* Offer summary */}
              <div style={{padding:"8px 24px 12px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span className={`direction-badge direction-${isBuy ? "buy" : "sell"}`}>
                  {isBuy ? "BUY" : "SELL"}
                </span>
                <SatsAmount sats={trade.amount}/>
                {trade.premium !== undefined && (
                  <span style={{fontSize:".78rem",fontWeight:700,
                    color: isBuy
                      ? (trade.premium < 0 ? "#65A519" : "#DF321F")
                      : (trade.premium > 0 ? "#65A519" : "#DF321F"),
                  }}>
                    {trade.premium > 0 ? "+" : ""}{trade.premium.toFixed(2)}%
                  </span>
                )}
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {trade.methods.map(m => <span key={m} className="tag tag-method">{m}</span>)}
                </div>
              </div>
              {/* Count */}
              <div style={{padding:"0 24px 12px",fontSize:".85rem",fontWeight:600,color:"var(--black-75)"}}>
                {matches.length} trader{matches.length !== 1 ? "s" : ""} want{matches.length === 1 ? "s" : ""} to trade with you
              </div>
              {matchError && (
                <div style={{padding:"0 24px 12px"}}>
                  <div style={{background:"var(--error-bg)",color:"var(--error)",borderRadius:10,padding:"8px 14px",fontSize:".82rem",fontWeight:600}}>
                    {matchError}
                  </div>
                </div>
              )}
              {/* Match rows */}
              <div className="match-list">
                {matches.map(m => (
                  <div key={m.offerId} className="match-row" onClick={() => setMatchDetail(m)}>
                    <Avatar initials={m.user.initials} color={m.user.color} size={36}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:".88rem"}}>{m.user.name}</span>
                        <PeachRating rep={m.user.rep}/>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                        <span style={{fontSize:".72rem",color:"var(--black-65)"}}>{m.user.trades} trades</span>
                        {m.user.badges.includes("supertrader") && <Badge label="supertrader" icon="☆"/>}
                        {m.user.badges.includes("fast") && <Badge label="fast" icon="⚡"/>}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
                      <span style={{fontSize:".72rem",color:"var(--black-65)"}}>{relativeTime(m.requestedAt)}</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--black-65)" strokeWidth="2" strokeLinecap="round"><polyline points="5,2 10,7 5,12"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

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
