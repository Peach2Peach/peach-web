import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SideNav, getTopbarPeachId, PeachIcon, IconBurger } from "../components/Sidebar.jsx";

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconBack      = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,3 5,8 10,13"/></svg>;
const IconSend      = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="14" y1="2" x2="6" y2="10"/><polygon points="14,2 9,14 6,10 2,7" fill="currentColor" stroke="none"/></svg>;
const IconLock      = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="2" y="5.5" width="8" height="5.5" rx="1.5"/><path d="M4 5.5V3.5a2 2 0 0 1 4 0v2"/></svg>;
const IconCopy      = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M2 9.5V2.5a1 1 0 0 1 1-1h7"/></svg>;
const IconCheck     = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="2,7 5.5,10.5 12,4"/></svg>;
const IconAlert     = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2L1 12h12L7 2z"/><line x1="7" y1="6" x2="7" y2="9"/><circle cx="7" cy="11" r=".5" fill="currentColor"/></svg>;
const IconClock     = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="5"/><path d="M6.5 3.5v3l2 1.5"/></svg>;
const IconQR        = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="10" y="1" width="5" height="5" rx="1"/><rect x="1" y="10" width="5" height="5" rx="1"/><rect x="2.5" y="2.5" width="2" height="2" fill="currentColor" stroke="none"/><rect x="11.5" y="2.5" width="2" height="2" fill="currentColor" stroke="none"/><rect x="2.5" y="11.5" width="2" height="2" fill="currentColor" stroke="none"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="13" y1="10" x2="15" y2="10"/><line x1="10" y1="13" x2="10" y2="15"/><line x1="13" y1="13" x2="15" y2="15"/></svg>;
const IconThumbUp   = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l2-5c.5-1.5 2-1.5 2.5 0L11 7h3.5a1 1 0 0 1 1 1.2l-1 5a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-1V9z"/><path d="M6 9H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2"/></svg>;
const IconThumbDown = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9l-2 5c-.5 1.5-2 1.5-2.5 0L7 11H3.5a1 1 0 0 1-1-1.2l1-5a1 1 0 0 1 1-.8H11a1 1 0 0 1 1 1V9z"/><path d="M12 9h2a1 1 0 0 1 1-1V4a1 1 0 0 0-1-1h-2"/></svg>;
const IconDispute   = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><line x1="8" y1="5" x2="8" y2="8.5"/><circle cx="8" cy="11" r=".6" fill="currentColor" stroke="none"/></svg>;
const IconChevronDown = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,5 7,9 11,5"/></svg>;
const IconChevronUp   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,9 7,5 11,9"/></svg>;


const IcoBtc = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}>
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M22.2 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.1-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8.9l-.8 3.3c.1 0 .2 0 .3.1-.1 0-.2-.1-.3-.1L11.4 20c-.1.3-.4.7-1 .5 0 0-1.2-.3-1.2-.3l-.8 1.8 2 .5c.4.1.7.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.2 1.4.3l-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.03-3.2-1.5-3.9 1.1-.25 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.6.8 4.1 2.9zm.5-5.3c-.45 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.8.6 3.4 2.5z" fill="white"/>
  </svg>
);

function SatsAmount({ sats, size = "md" }) {
  const satsStr = sats.toLocaleString("fr-FR");
  const fs = size === "sm" ? ".82rem" : size === "lg" ? "1.2rem" : ".95rem";
  const ico = size === "sm" ? 13 : size === "lg" ? 18 : 15;
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

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const BTC_PRICE = 87432;
const SAT = 100_000_000;

function satsToFiat(sats, price = BTC_PRICE) {
  return ((sats / SAT) * price).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + "k";
  return String(n);
}
function relTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Trade lifecycle states in order
const LIFECYCLE = [
  { id:"matched",            label:"Matched",             desc:"Offers paired, awaiting escrow" },
  { id:"escrow_funded",      label:"Escrow Funded",       desc:"Bitcoin locked in escrow" },
  { id:"payment_in_transit", label:"Payment Sent",        desc:"Buyer marked fiat as sent — seller reviewing" },
  { id:"completed",          label:"Completed",           desc:"Bitcoin released, trade closed" },
];

const STATUS_CONFIG = {
  matched:             { label:"Matched",            bg:"#FEFCE5", color:"#9A7000" },
  escrow_funded:       { label:"Escrow Funded",      bg:"#FEFCE5", color:"#9A7000" },
  awaiting_payment:    { label:"Awaiting Payment",   bg:"#FEEDE5", color:"#C45104" },
  payment_in_transit:  { label:"Payment Sent",       bg:"#FEEDE5", color:"#C45104" },
  payment_confirmed:   { label:"Payment Confirmed",  bg:"#F2F9E7", color:"#65A519" },
  completed:           { label:"Completed",          bg:"#F2F9E7", color:"#65A519" },
  dispute:             { label:"Dispute",            bg:"#FFE6E1", color:"#DF321F" },
  cancellation_pending:{ label:"Cancellation Req.",  bg:"#FFE6E1", color:"#DF321F" },
  cancelled:           { label:"Cancelled",          bg:"#F4EEEB", color:"#7D675E" },
};

// Demo scenarios — switch between them to preview different states
const DEMO_SCENARIOS = [
  {
    id:"buyer_escrow_pending",
    label:"Buyer — Awaiting Escrow",
    role:"buyer",
    tradeStatus:"matched",
    lifecycleStep: 0,
    instantTrade: false,
    contract: {
      id:"CT-00152",
      direction:"buy",
      amount:85000,
      fiat:"74.32",
      currency:"EUR",
      premium:-1.2,
      method:"SEPA",
      creationDate: Date.now() - 12 * 60_000,
      paymentExpectedBy: null,
      escrow:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    },
    counterparty:{ initials:"ST", color:"#65A519", name:"Peer #2B90", rep:5.0, trades:541, badges:["supertrader"], online:true },
    paymentDetails:null,
  },
  {
    id:"seller_escrow_pending",
    label:"Seller — Fund Escrow",
    role:"seller",
    tradeStatus:"matched",
    lifecycleStep: 0,
    instantTrade: true,
    contract: {
      id:"CT-00152",
      direction:"sell",
      amount:85000,
      fiat:"74.32",
      currency:"EUR",
      premium:-1.2,
      method:"SEPA",
      creationDate: Date.now() - 12 * 60_000,
      paymentExpectedBy: null,
      escrow:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    },
    counterparty:{ initials:"ST", color:"#65A519", name:"Peer #2B90", rep:5.0, trades:541, badges:["supertrader"], online:true },
    paymentDetails:null,
  },
  {
    id:"buyer_awaiting",
    label:"Buyer — Awaiting Payment",
    role:"buyer",
    tradeStatus:"escrow_funded",
    lifecycleStep: 1,
    instantTrade: false,
    contract: {
      id:"CT-00148",
      direction:"buy",
      amount:85000,
      fiat:"74.32",
      currency:"EUR",
      premium:-1.2,
      method:"SEPA",
      creationDate: Date.now() - 4 * 3600_000,
      paymentExpectedBy: Date.now() + 8 * 3600_000,
      escrow:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    },
    counterparty:{ initials:"ST", color:"#65A519", name:"Peer #2B90", rep:5.0, trades:541, badges:["supertrader"], online:true },
    paymentDetails:{
      type:"SEPA",
      bank:"Deutsche Bank",
      iban:"DE89 3704 0044 0532 0130 00",
      bic:"COBADEFFXXX",
      name:"Stefan T.",
      reference:"PEACH-CT-00148",
    },
  },
  {
    id:"seller_awaiting",
    label:"Seller — Awaiting Payment",
    role:"seller",
    tradeStatus:"awaiting_payment",
    lifecycleStep: 1,
    instantTrade: false,
    contract: {
      id:"CT-00149",
      direction:"sell",
      amount:120000,
      fiat:"104.92",
      currency:"EUR",
      premium:0.5,
      method:"Revolut",
      creationDate: Date.now() - 1.5 * 3600_000,
      paymentExpectedBy: Date.now() + 10.5 * 3600_000,
      escrow:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    },
    counterparty:{ initials:"DV", color:"#9B5CFF", name:"Peer #A1F3", rep:4.6, trades:67, badges:[], online:true },
    paymentDetails:null,
  },
  {
    id:"payment_in_transit",
    label:"Seller — Confirm Payment",
    role:"seller",
    tradeStatus:"payment_in_transit",
    lifecycleStep: 2,
    instantTrade: false,
    contract: {
      id:"CT-00150",
      direction:"sell",
      amount:55000,
      fiat:"47.88",
      currency:"EUR",
      premium:-0.5,
      method:"SEPA",
      creationDate: Date.now() - 6 * 3600_000,
      paymentExpectedBy: null,
      escrow:"bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    },
    counterparty:{ initials:"NB", color:"#037DB5", name:"Peer #C73E", rep:4.8, trades:156, badges:["fast"], online:false },
    paymentDetails:null,
  },
  {
    id:"completed",
    label:"Completed — Rate Counterparty",
    role:"buyer",
    tradeStatus:"completed",
    lifecycleStep: 3,
    instantTrade: false,
    contract: {
      id:"CT-00145",
      direction:"buy",
      amount:100000,
      fiat:"87.43",
      currency:"EUR",
      premium:-1.5,
      method:"SEPA",
      creationDate: Date.now() - 26 * 3600_000,
      paymentExpectedBy: null,
      escrow:"bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    },
    counterparty:{ initials:"PW", color:"#FF7A50", name:"Peer #4E2A", rep:4.9, trades:312, badges:["supertrader"], online:false },
    paymentDetails:null,
  },
  {
    id:"dispute",
    label:"Dispute Open",
    role:"buyer",
    tradeStatus:"dispute",
    lifecycleStep: 2,
    instantTrade: false,
    contract: {
      id:"CT-00143",
      direction:"buy",
      amount:30000,
      fiat:"26.23",
      currency:"EUR",
      premium:-2.0,
      method:"Revolut",
      creationDate: Date.now() - 28 * 3600_000,
      paymentExpectedBy: null,
      escrow:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    },
    counterparty:{ initials:"FR", color:"#DF321F", name:"Peer #D8B1", rep:3.9, trades:9, badges:[], online:false },
    paymentDetails:null,
  },
];

// Mock chat messages per scenario
const MOCK_MESSAGES = {
  buyer_awaiting: [
    { id:1, from:"counterparty", text:"Hey, I'm ready. Please send the payment to the SEPA details above.", ts: Date.now() - 3 * 3600_000 + 5 * 60_000 },
    { id:2, from:"me",           text:"Got it, sending now. Will take a few minutes to process.", ts: Date.now() - 3 * 3600_000 + 8 * 60_000 },
    { id:3, from:"counterparty", text:"Perfect, let me know once it's done.", ts: Date.now() - 3 * 3600_000 + 10 * 60_000 },
    { id:4, from:"me",           text:"Payment is on its way! Should arrive within 2 hours.", ts: Date.now() - 2 * 3600_000 },
  ],
  seller_awaiting: [
    { id:1, from:"me",           text:"Hello! The escrow is funded. Please review the payment details and send when ready.", ts: Date.now() - 1 * 3600_000 },
    { id:2, from:"counterparty", text:"Hi, on it. My bank might take a little longer, is that ok?", ts: Date.now() - 55 * 60_000 },
    { id:3, from:"me",           text:"That's fine, you have plenty of time. Let me know if you need anything.", ts: Date.now() - 50 * 60_000 },
  ],
  payment_in_transit: [
    { id:1, from:"me",           text:"Escrow is set, waiting on your payment.", ts: Date.now() - 5 * 3600_000 },
    { id:2, from:"counterparty", text:"Just sent it via SEPA. Reference: PEACH-CT-00150", ts: Date.now() - 4 * 3600_000 },
    { id:3, from:"counterparty", text:"Please confirm once you see it arrive.", ts: Date.now() - 4 * 3600_000 + 2 * 60_000 },
    { id:4, from:"me",           text:"Checking my account now…", ts: Date.now() - 30 * 60_000 },
  ],
  payment_confirmed: [
    { id:1, from:"counterparty", text:"I've sent the payment. Check your Wise account.", ts: Date.now() - 7 * 3600_000 },
    { id:2, from:"me",           text:"Got it, payment received! Releasing the bitcoin now.", ts: Date.now() - 6 * 3600_000 },
    { id:3, from:"counterparty", text:"Great, thanks! Was a pleasure trading with you.", ts: Date.now() - 5 * 3600_000 },
    { id:4, from:"me",           text:"Same here 🤝 Bitcoin released!", ts: Date.now() - 4 * 3600_000 },
  ],
  completed: [
    { id:1, from:"counterparty", text:"Payment sent, please confirm.", ts: Date.now() - 25 * 3600_000 },
    { id:2, from:"me",           text:"Confirmed! Releasing now.", ts: Date.now() - 24 * 3600_000 },
    { id:3, from:"counterparty", text:"Bitcoin arrived, thank you!", ts: Date.now() - 23 * 3600_000 },
    { id:4, from:"me",           text:"Smooth trade, thanks!", ts: Date.now() - 23 * 3600_000 + 5 * 60_000 },
  ],
  dispute: [
    { id:1, from:"counterparty", text:"I sent the payment 2 days ago. Why haven't you released?", ts: Date.now() - 27 * 3600_000 },
    { id:2, from:"me",           text:"I never received any payment in my Revolut account.", ts: Date.now() - 26 * 3600_000 },
    { id:3, from:"counterparty", text:"Check again, I have the screenshot.", ts: Date.now() - 25 * 3600_000 },
    { id:4, from:"me",           text:"I've opened a dispute. A Peach mediator will assist us.", ts: Date.now() - 24 * 3600_000 },
  ],
};

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 36, online }) {
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      <div style={{
        width:size, height:size, borderRadius:"50%",
        background: color || "linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize: size * 0.36, fontWeight:700, color:"white", flexShrink:0,
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

// ─── STATUS CHIP ─────────────────────────────────────────────────────────────
function StatusChip({ status, large }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.matched;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      background:cfg.bg, color:cfg.color,
      borderRadius:999, padding: large ? "5px 14px" : "2px 10px",
      fontSize: large ? ".8rem" : ".72rem", fontWeight:700, whiteSpace:"nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

// ─── HORIZONTAL STEPPER (bottom bar) ─────────────────────────────────────────
function HorizontalStepper({ status }) {
  const stepMap = {
    matched:0, escrow_funded:1, awaiting_payment:1,
    payment_in_transit:2, payment_confirmed:2, completed:3,
    dispute:2, cancellation_pending:2, cancelled:2,
  };
  const activeStep = stepMap[status] ?? 0;
  const isAborted = status === "dispute" || status === "cancelled" || status === "cancellation_pending";

  return (
    <div className="h-stepper">
      {LIFECYCLE.map((s, i) => {
        const isDone   = i < activeStep;
        const isActive = i === activeStep && !isAborted;
        const isAbortedStep = isAborted && i === activeStep;
        const dotColor = isDone ? "#65A519" : isActive ? "#F56522" : isAbortedStep ? "#DF321F" : "#C4B5AE";
        const labelColor = isDone ? "#65A519" : isActive ? "#2B1911" : isAbortedStep ? "#DF321F" : "#C4B5AE";
        const lineColor = isDone ? "#65A519" : "#EAE3DF";

        return (
          <div key={s.id} className="h-step">
            {/* Left connector */}
            {i > 0 && (
              <div className="h-step-line" style={{ background: lineColor }}/>
            )}
            {/* Dot */}
            <div className="h-step-dot" style={{
              background: dotColor,
              border: (isActive || isAbortedStep || isDone) ? "none" : "2px solid #C4B5AE",
              boxShadow: isActive ? "0 0 0 3px #FEEDE5" : "none",
            }}>
              {isDone && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><polyline points="1,4 3,6 7,2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>}
            </div>
            {/* Label */}
            <div className="h-step-label" style={{ color: labelColor, fontWeight: isActive ? 700 : 500 }}>
              {s.label}
            </div>
          </div>
        );
      })}
      {isAborted && (
        <div className="h-stepper-alert">
          <IconAlert/>
          <span>
            {status === "dispute" ? "Dispute open — mediator assigned" :
             status === "cancellation_pending" ? "Cancellation requested" :
             "Cancelled"}
          </span>
        </div>
      )}
    </div>
  );
}



// ─── PAYMENT DETAILS CARD ────────────────────────────────────────────────────
function PaymentDetailsCard({ details }) {
  const [copied, setCopied] = useState(null);

  function copy(val, key) {
    navigator.clipboard?.writeText(val).catch(()=>{});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const rows = [
    { label:"Bank",      value:details.bank },
    { label:"IBAN",      value:details.iban },
    { label:"BIC",       value:details.bic },
    { label:"Name",      value:details.name },
    { label:"Reference", value:details.reference },
  ].filter(r => r.value);

  return (
    <div style={{
      background:"#FFF9F6", border:"1.5px solid #EAE3DF", borderRadius:12,
      overflow:"hidden", marginBottom:16,
    }}>
      <div style={{
        background:"#FEEDE5", padding:"8px 14px",
        display:"flex", alignItems:"center", gap:6,
        fontSize:".72rem", fontWeight:700, color:"#C45104",
        textTransform:"uppercase", letterSpacing:".05em",
      }}>
        <IconLock/> Payment Details — {details.type}
      </div>
      {rows.map(r => (
        <div key={r.label} style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"8px 14px", borderBottom:"1px solid #F4EEEB",
        }}>
          <div>
            <div style={{ fontSize:".68rem", color:"#7D675E", fontWeight:600, textTransform:"uppercase", letterSpacing:".04em" }}>{r.label}</div>
            <div style={{ fontSize:".85rem", fontWeight:600, color:"#2B1911", fontFamily: r.label === "IBAN" || r.label === "BIC" ? "monospace" : "inherit" }}>{r.value}</div>
          </div>
          <button
            style={{
              border:"none", background:"transparent", cursor:"pointer",
              color: copied === r.label ? "#65A519" : "#7D675E", padding:4, borderRadius:6,
              transition:"color .2s",
            }}
            onClick={() => copy(r.value, r.label)}
            title="Copy"
          >
            {copied === r.label ? <IconCheck/> : <IconCopy/>}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── ESCROW ADDRESS CARD ─────────────────────────────────────────────────────
function EscrowAddressCard({ address }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(address).catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Simple QR placeholder — real impl would use a QR library
  function MiniQR() {
    return (
      <div style={{
        width:64, height:64, background:"white", border:"1px solid #EAE3DF",
        borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center",
        flexShrink:0,
      }}>
        <svg width="44" height="44" viewBox="0 0 9 9">
          {/* Simplified QR pattern */}
          {[0,1,2,3,4,5,6,7,8].map(r =>
            [0,1,2,3,4,5,6,7,8].map(c => {
              const isCorner = (r<3&&c<3)||(r<3&&c>5)||(r>5&&c<3);
              const seed = (r * 9 + c) * 2654435761;
              const fill = isCorner ? 1 : (seed % 3 === 0 ? 1 : 0);
              return fill ? <rect key={`${r}${c}`} x={c} y={r} width={1} height={1} fill="#2B1911"/> : null;
            })
          )}
          {/* Corner squares */}
          {[[0,0],[0,6],[6,0]].map(([r,c]) => (
            <rect key={`f${r}${c}`} x={c+1} y={r+1} width={1} height={1} fill="#2B1911"/>
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div style={{
      background:"#F4EEEB", border:"1px solid #EAE3DF", borderRadius:12,
      padding:"12px 14px", marginBottom:16,
    }}>
      <div style={{ fontSize:".68rem", fontWeight:700, color:"#7D675E", textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>
        <IconQR/> Escrow Address
      </div>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <MiniQR/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontFamily:"monospace", fontSize:".72rem", color:"#2B1911",
            wordBreak:"break-all", lineHeight:1.5, marginBottom:6,
          }}>{address}</div>
          <button
            style={{
              display:"flex", alignItems:"center", gap:5,
              border:"1px solid #EAE3DF", background:"white", borderRadius:999,
              fontFamily:"Baloo 2, cursive", fontSize:".72rem", fontWeight:700,
              color: copied ? "#65A519" : "#7D675E",
              padding:"3px 10px", cursor:"pointer", transition:"color .2s",
            }}
            onClick={copy}
          >
            {copied ? <><IconCheck/> Copied!</> : <><IconCopy/> Copy address</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DISPUTE FLOW ────────────────────────────────────────────────────────────
const DISPUTE_REASONS = [
  "BITCOIN NOT RECEIVED",
  "SELLER UNRESPONSIVE",
  "ABUSIVE BEHAVIOUR",
  "SOMETHING ELSE",
];

function DisputeFlow({ tradeId, onClose }) {
  const [step, setStep] = useState(1); // 1=warning, 2=reason, 3=details
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canConfirm = email.trim().length > 0 && message.trim().length > 0;

  if (submitted) {
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:600,
        background:"rgba(43,25,17,.6)", display:"flex",
        alignItems:"center", justifyContent:"center", padding:20,
      }}>
        <div style={{
          background:"white", borderRadius:16, padding:"32px 24px",
          maxWidth:380, width:"100%", textAlign:"center",
          boxShadow:"0 20px 60px rgba(0,0,0,.25)",
          animation:"modalIn .18s ease",
        }}>
          <div style={{ fontSize:"2rem", marginBottom:12 }}>✓</div>
          <div style={{ fontWeight:800, fontSize:"1rem", marginBottom:8 }}>Dispute opened</div>
          <div style={{ fontSize:".88rem", color:"#7D675E", marginBottom:24, lineHeight:1.6 }}>
            A Peach mediator has been assigned to your case and will be in touch soon.
          </div>
          <button
            style={{
              width:"100%", border:"none", background:"#DF321F", borderRadius:999,
              fontFamily:"Baloo 2, cursive", fontWeight:800, fontSize:".9rem",
              color:"white", padding:"11px", cursor:"pointer",
            }}
            onClick={onClose}
          >Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:600,
      background:"rgba(43,25,17,.6)", display:"flex",
      alignItems:"center", justifyContent:"center", padding:20,
    }}>

      {/* ── Step 1: Warning ── */}
      {step === 1 && (
        <div style={{
          background:"white", borderRadius:20, maxWidth:400, width:"100%",
          boxShadow:"0 20px 60px rgba(0,0,0,.3)",
          animation:"modalIn .18s ease", overflow:"hidden",
        }}>
          <div style={{ padding:"24px 24px 20px" }}>
            <div style={{ fontWeight:800, fontSize:"1.15rem", marginBottom:16 }}>open dispute</div>
            <p style={{ fontSize:".9rem", color:"#2B1911", lineHeight:1.65, marginBottom:12 }}>
              This will request the intervention of a Peach employee to mediate between you and your counterpart.
            </p>
            <p style={{ fontSize:".9rem", color:"#2B1911", lineHeight:1.65, marginBottom:12 }}>
              Opening a dispute will reveal the chat and payment methods to Peach.
            </p>
            <p style={{ fontSize:".9rem", color:"#2B1911", lineHeight:1.65 }}>
              Please only use this as a last resort.
            </p>
          </div>
          <div style={{
            display:"flex", alignItems:"center",
            borderTop:"1px solid #EAE3DF",
            background:"#DF321F",
          }}>
            <button
              style={{
                flex:1, border:"none", background:"transparent",
                display:"flex", alignItems:"center", gap:8,
                fontFamily:"Baloo 2, cursive", fontWeight:700, fontSize:".9rem",
                color:"white", padding:"14px 20px", cursor:"pointer",
              }}
              onClick={() => setStep(2)}
            >
              <IconDispute/> open dispute
            </button>
            <div style={{ width:1, height:24, background:"rgba(255,255,255,.25)" }}/>
            <button
              style={{
                border:"none", background:"transparent",
                fontFamily:"Baloo 2, cursive", fontWeight:700, fontSize:".9rem",
                color:"white", padding:"14px 20px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:6,
              }}
              onClick={onClose}
            >
              close <span style={{
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                width:18, height:18, border:"1.5px solid rgba(255,255,255,.6)",
                borderRadius:4, fontSize:".7rem",
              }}>✕</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Reason ── */}
      {step === 2 && (
        <div style={{
          background:"#FFF9F6", borderRadius:20, maxWidth:400, width:"100%",
          boxShadow:"0 20px 60px rgba(0,0,0,.3)",
          animation:"modalIn .18s ease", padding:"40px 28px 32px",
        }}>
          <div style={{ fontWeight:800, fontSize:"1.2rem", marginBottom:24, textAlign:"center" }}>
            what's up?
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {DISPUTE_REASONS.map(r => (
              <button
                key={r}
                style={{
                  border: reason === r ? "2px solid #DF321F" : "1.5px solid #C4B5AE",
                  background: reason === r ? "#FFF0EE" : "white",
                  borderRadius:999, fontFamily:"Baloo 2, cursive",
                  fontWeight:700, fontSize:".82rem", letterSpacing:".04em",
                  color: reason === r ? "#DF321F" : "#624D44",
                  padding:"13px 20px", cursor:"pointer", transition:"all .15s",
                  textAlign:"center",
                }}
                onClick={() => { setReason(r); setStep(3); }}
              >{r}</button>
            ))}
          </div>
          <button
            style={{
              marginTop:20, background:"none", border:"none",
              fontFamily:"Baloo 2, cursive", fontSize:".82rem",
              color:"#7D675E", cursor:"pointer", display:"block", margin:"20px auto 0",
            }}
            onClick={() => setStep(1)}
          >← Back</button>
        </div>
      )}

      {/* ── Step 3: Details ── */}
      {step === 3 && (
        <div style={{
          background:"#FFF9F6", borderRadius:20, maxWidth:400, width:"100%",
          boxShadow:"0 20px 60px rgba(0,0,0,.3)",
          animation:"modalIn .18s ease", padding:"40px 28px 32px",
        }}>
          <div style={{ fontWeight:800, fontSize:"1.1rem", marginBottom:24, textAlign:"center" }}>
            dispute for trade {tradeId}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
            <input
              style={{
                border:"1.5px solid #C4B5AE", borderRadius:12, background:"white",
                fontFamily:"Baloo 2, cursive", fontSize:".9rem", color:"#2B1911",
                padding:"12px 16px", outline:"none",
              }}
              placeholder="user@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={e => e.target.style.borderColor="#DF321F"}
              onBlur={e => e.target.style.borderColor="#C4B5AE"}
            />
            <input
              style={{
                border:"1.5px solid #C4B5AE", borderRadius:12, background:"white",
                fontFamily:"Baloo 2, cursive", fontSize:".9rem", color:"#2B1911",
                padding:"12px 16px", outline:"none",
              }}
              value={reason.toLowerCase()}
              readOnly
            />
            <textarea
              style={{
                border:"1.5px solid #C4B5AE", borderRadius:12, background:"white",
                fontFamily:"Baloo 2, cursive", fontSize:".9rem", color:"#2B1911",
                padding:"12px 16px", outline:"none", resize:"none",
                minHeight:100, lineHeight:1.5,
              }}
              placeholder="your message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onFocus={e => e.target.style.borderColor="#DF321F"}
              onBlur={e => e.target.style.borderColor="#C4B5AE"}
            />
          </div>
          <button
            style={{
              width:"100%", border:"none", borderRadius:999,
              fontFamily:"Baloo 2, cursive", fontWeight:800, fontSize:".9rem",
              color:"white", padding:"13px",
              background: canConfirm ? "#DF321F" : "#F5C6BE",
              cursor: canConfirm ? "pointer" : "not-allowed",
              letterSpacing:".06em", transition:"background .2s",
            }}
            disabled={!canConfirm}
            onClick={() => { if (canConfirm) setSubmitted(true); }}
          >CONFIRM</button>
          <button
            style={{
              marginTop:14, background:"none", border:"none",
              fontFamily:"Baloo 2, cursive", fontSize:".82rem",
              color:"#7D675E", cursor:"pointer", display:"block", margin:"14px auto 0",
            }}
            onClick={() => setStep(2)}
          >← Back</button>
        </div>
      )}

    </div>
  );
}

// ─── TRADING RULES CARD ───────────────────────────────────────────────────────
function TradingRulesCard() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      borderBottom:"1px solid #EAE3DF",
      background:"#FEFCE5",
      flexShrink:0,
    }}>
      <button
        style={{
          width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
          border:"none", background:"transparent", fontFamily:"Baloo 2, cursive",
          fontWeight:700, fontSize:".82rem", color:"#624D44",
          padding:"10px 18px", cursor:"pointer",
        }}
        onClick={() => setOpen(o => !o)}
      >
        <span>📋 Trading Rules</span>
        {open ? <IconChevronUp/> : <IconChevronDown/>}
      </button>
      {open && (
        <div style={{
          padding:"0 18px 14px",
          fontSize:".82rem", color:"#624D44", lineHeight:1.7,
        }}>
          <p style={{ marginBottom:10 }}>
            <strong>For the Seller:</strong><br/>
            – do not release the escrow before receiving the money in your account, no matter what the buyer says
          </p>
          <p style={{ marginBottom:10 }}>
            <strong>For the Buyer:</strong><br/>
            – confirm "I made the payment" only after having done so<br/>
            – only pay the Seller to the details provided in the Contract Screen, after the escrow has been funded
          </p>
          <p>
            <strong>For all:</strong><br/>
            – the payment details used must match exactly<br/>
            – communications between the two parties must be conducted in this chat only.<br/>
            – if counterpart displays suspect behavior, start a dispute by pressing the top right icon on this screen
          </p>
        </div>
      )}
    </div>
  );
}

// ─── ESCROW FUNDING CARD (Seller) ────────────────────────────────────────────
function EscrowFundingCard({ address, sats, btcPrice }) {
  const [withAmount, setWithAmount] = useState(true);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedAmt, setCopiedAmt]   = useState(false);

  const btcAmount = (sats / 100_000_000).toFixed(8);
  // BIP21 URI: bitcoin:<address>?amount=<btc> when withAmount, else just address
  const qrContent = withAmount
    ? `bitcoin:${address}?amount=${btcAmount}`
    : address;

  function copy(val, setter) {
    navigator.clipboard?.writeText(val).catch(()=>{});
    setter(true);
    setTimeout(() => setter(false), 1500);
  }

  function QRCode({ size = 160 }) {
    const ref = useRef(null);
    useEffect(() => {
      if (!ref.current) return;
      ref.current.innerHTML = '';
      function render() {
        new window.QRCode(ref.current, {
          text: qrContent,
          width: size,
          height: size,
          colorDark: "#2B1911",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      }
      if (window.QRCode) {
        render();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = render;
        document.head.appendChild(script);
      }
    }, [qrContent, size]);
    return <div ref={ref} style={{ width:size, height:size, borderRadius:6, overflow:"hidden" }}/>;
  }

  return (
    <div style={{
      background:"white", border:"1.5px solid #EAE3DF", borderRadius:14,
      overflow:"hidden", marginBottom:16,
    }}>
      {/* Header */}
      <div style={{
        background:"#FEEDE5", padding:"10px 16px",
        fontSize:".72rem", fontWeight:700, color:"#C45104",
        textTransform:"uppercase", letterSpacing:".05em",
        display:"flex", alignItems:"center", gap:6,
      }}>
        <IconLock/> Fund the Escrow
      </div>

      {/* Amount highlight */}
      <div style={{
        padding:"14px 16px 12px",
        borderBottom:"1px solid #F4EEEB",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <div style={{ fontSize:".68rem", fontWeight:700, color:"#7D675E", textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>Amount to send</div>
          <SatsAmount sats={sats} size="lg"/>
          <div style={{ fontSize:".78rem", color:"#7D675E", marginTop:2 }}>= {btcAmount} BTC</div>
        </div>
        <button
          style={{
            display:"flex", alignItems:"center", gap:5,
            border:"1px solid #EAE3DF", background: copiedAmt ? "#F2F9E7" : "white",
            borderRadius:999, fontFamily:"Baloo 2, cursive",
            fontSize:".72rem", fontWeight:700,
            color: copiedAmt ? "#65A519" : "#7D675E",
            padding:"5px 12px", cursor:"pointer", transition:"all .2s",
          }}
          onClick={() => copy(btcAmount, setCopiedAmt)}
        >
          {copiedAmt ? <><IconCheck/> Copied!</> : <><IconCopy/> Copy BTC</>}
        </button>
      </div>

      {/* QR code */}
      <div style={{ padding:"16px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
        <div style={{
          padding:10, background:"white", border:"1px solid #EAE3DF",
          borderRadius:10, display:"inline-block",
        }}>
          <QRCode size={160}/>
        </div>

        {/* Toggle */}
        <div style={{
          display:"flex", alignItems:"center", gap:0,
          background:"#F4EEEB", borderRadius:999, padding:3,
          fontSize:".72rem", fontWeight:700,
        }}>
          <button
            style={{
              border:"none", borderRadius:999, padding:"4px 14px", cursor:"pointer",
              fontFamily:"Baloo 2, cursive", fontSize:".72rem", fontWeight:700,
              background: !withAmount ? "white" : "transparent",
              color: !withAmount ? "#2B1911" : "#7D675E",
              boxShadow: !withAmount ? "0 1px 3px rgba(0,0,0,.1)" : "none",
              transition:"all .15s",
            }}
            onClick={() => setWithAmount(false)}
          >Address only</button>
          <button
            style={{
              border:"none", borderRadius:999, padding:"4px 14px", cursor:"pointer",
              fontFamily:"Baloo 2, cursive", fontSize:".72rem", fontWeight:700,
              background: withAmount ? "white" : "transparent",
              color: withAmount ? "#2B1911" : "#7D675E",
              boxShadow: withAmount ? "0 1px 3px rgba(0,0,0,.1)" : "none",
              transition:"all .15s",
            }}
            onClick={() => setWithAmount(true)}
          >Address + amount</button>
        </div>

        <div style={{ fontSize:".68rem", color:"#7D675E", textAlign:"center", lineHeight:1.5 }}>
          {withAmount
            ? "QR includes amount — most wallets will fill it in automatically"
            : "QR contains address only — enter the amount manually in your wallet"}
        </div>
      </div>

      {/* Address */}
      <div style={{
        padding:"12px 16px 14px",
        borderTop:"1px solid #F4EEEB",
      }}>
        <div style={{ fontSize:".68rem", fontWeight:700, color:"#7D675E", textTransform:"uppercase", letterSpacing:".05em", marginBottom:6 }}>Escrow address</div>
        <div style={{
          fontFamily:"monospace", fontSize:".72rem", color:"#2B1911",
          wordBreak:"break-all", lineHeight:1.6, marginBottom:8,
        }}>{address}</div>
        <button
          style={{
            display:"flex", alignItems:"center", gap:5,
            border:"1px solid #EAE3DF", background: copiedAddr ? "#F2F9E7" : "white",
            borderRadius:999, fontFamily:"Baloo 2, cursive",
            fontSize:".72rem", fontWeight:700,
            color: copiedAddr ? "#65A519" : "#7D675E",
            padding:"4px 12px", cursor:"pointer", transition:"all .2s",
          }}
          onClick={() => copy(address, setCopiedAddr)}
        >
          {copiedAddr ? <><IconCheck/> Copied!</> : <><IconCopy/> Copy address</>}
        </button>
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ───────────────────────────────────────────────────────────
function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500,
      background:"rgba(43,25,17,.55)", display:"flex",
      alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <div style={{
        background:"white", borderRadius:16, padding:"28px 24px",
        maxWidth:380, width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,.25)",
        animation:"modalIn .18s ease",
      }}>
        <div style={{
          width:44, height:44, borderRadius:"50%",
          background:"#FFF0EE", display:"flex", alignItems:"center",
          justifyContent:"center", marginBottom:14,
        }}>
          <IconAlert/>
        </div>
        <div style={{ fontWeight:800, fontSize:"1.05rem", marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:".88rem", color:"#7D675E", lineHeight:1.6, marginBottom:24 }}>{body}</div>
        <div style={{ display:"flex", gap:10 }}>
          <button
            style={{
              flex:1, border:"1.5px solid #EAE3DF", background:"white",
              borderRadius:999, fontFamily:"Baloo 2, cursive",
              fontWeight:700, fontSize:".87rem", color:"#2B1911",
              padding:"10px", cursor:"pointer",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor="#F56522"}
            onMouseLeave={e => e.currentTarget.style.borderColor="#EAE3DF"}
            onClick={onCancel}
          >Cancel</button>
          <button
            style={{
              flex:1, border:"none",
              background:"#DF321F", borderRadius:999,
              fontFamily:"Baloo 2, cursive", fontWeight:800,
              fontSize:".87rem", color:"white",
              padding:"10px", cursor:"pointer",
              boxShadow:"0 2px 10px rgba(223,50,31,.3)",
              transition:"filter .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.filter="brightness(0.9)"}
            onMouseLeave={e => e.currentTarget.style.filter=""}
            onClick={onConfirm}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE TO CONFIRM ────────────────────────────────────────────────────────
function SlideToConfirm({ label, onConfirm, disabled = false, confirmedColor = "#65A519" }) {
  const [dragging, setDragging]   = useState(false);
  const [pos, setPos]             = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const trackRef  = useRef(null);
  const startXRef = useRef(0);
  const THUMB = 48;

  function getMax() {
    return (trackRef.current?.offsetWidth ?? 280) - THUMB - 4;
  }

  function onPointerDown(e) {
    if (disabled || confirmed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    startXRef.current = e.clientX - pos;
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const next = Math.max(0, Math.min(e.clientX - startXRef.current, getMax()));
    setPos(next);
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (pos >= getMax() * 0.88) {
      setPos(getMax());
      setConfirmed(true);
      onConfirm && onConfirm();
    } else {
      setPos(0);
    }
  }

  const progress = confirmed ? 1 : pos / Math.max(getMax(), 1);

  return (
    <div
      ref={trackRef}
      style={{
        position:"relative", height:52, borderRadius:999,
        background: confirmed
          ? confirmedColor
          : `linear-gradient(90deg, rgba(245,101,34,${0.12 + progress * 0.18}) ${progress * 100}%, #F4EEEB ${progress * 100}%)`,
        border:`1.5px solid ${confirmed ? confirmedColor : "#EAE3DF"}`,
        overflow:"hidden", userSelect:"none", touchAction:"none",
        cursor: disabled ? "not-allowed" : confirmed ? "default" : "grab",
        transition: dragging ? "none" : "background .3s, border-color .3s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Track label */}
      <div style={{
        position:"absolute", inset:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:".82rem", fontWeight:700,
        color: confirmed ? "white" : "#624D44",
        pointerEvents:"none",
        opacity: confirmed ? 1 : Math.max(0, 1 - progress * 2.5),
        transition:"opacity .2s",
      }}>
        {confirmed ? "✓  Done" : label}
      </div>

      {/* Thumb */}
      {!confirmed && (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position:"absolute", top:2, left:2 + pos,
            width:THUMB, height:THUMB - 4, borderRadius:999,
            background:"linear-gradient(135deg,#FF7A50,#FF4D42)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 8px rgba(245,101,34,.4)",
            cursor: disabled ? "not-allowed" : "grab",
            transition: dragging ? "none" : "left .25s cubic-bezier(.4,0,.2,1)",
            color:"white",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="6,5 12,9 6,13"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── ACTION BUTTONS ───────────────────────────────────────────────────────────
function ActionPanel({ scenario, onAction }) {
  const { tradeStatus: status, role } = scenario;
  const [showConfirm, setShowConfirm] = useState(false);

  const Btn = ({ label, bg, color, onClick }) => (
    <button
      className="action-btn"
      style={{ background:bg, color:color }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.filter="brightness(0.92)"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter=""; e.currentTarget.style.transform=""; }}
    >{label}</button>
  );

  const BtnGrad = ({ label, onClick }) => (
    <button className="action-btn-grad" onClick={onClick}>{label}</button>
  );

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          title="Confirm payment received?"
          body="This will immediately release the Bitcoin from escrow to the buyer. Only confirm if you have actually received the fiat payment in your account."
          confirmLabel="Yes, release Bitcoin"
          onConfirm={() => { setShowConfirm(false); onAction("release_bitcoin"); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="action-panel">
        {status === "matched" && role === "buyer" && (
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            gap:12, padding:"20px 0", textAlign:"center",
          }}>
            <div style={{
              width:48, height:48, borderRadius:"50%",
              background:"#FEFCE5", border:"2px solid #F5CE22",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1.4rem",
            }}>⏳</div>
            <div style={{ fontWeight:700, fontSize:".95rem" }}>Waiting for escrow</div>
            <div style={{ fontSize:".83rem", color:"#7D675E", lineHeight:1.6, maxWidth:280 }}>
              The seller is funding the escrow. Once the Bitcoin is locked in, the trade will begin and you'll be able to send payment.
            </div>
            <div style={{ fontSize:".85rem", fontWeight:700, color:"#7D675E" }}>No actions required for the moment.</div>
          </div>
        )}

        {status === "escrow_funded" && role === "buyer" && <>
          <SlideToConfirm
            label="I've sent the payment"
            onConfirm={() => onAction("payment_sent")}
          />
        </>}

        {status === "awaiting_payment" && role === "seller" && (() => {
          const deadline = scenario.contract.paymentExpectedBy;
          const hoursLeft = deadline ? Math.floor((deadline - Date.now()) / 3600_000) : null;
          const nearDeadline = hoursLeft !== null && hoursLeft < 3;
          return <>
            <div style={{
              display:"flex", alignItems:"center", gap:8,
              background:"#FEEDE5", border:"1px solid rgba(196,81,4,.15)",
              borderRadius:8, padding:"10px 12px",
              fontSize:".83rem", color:"#C45104", fontWeight:600, lineHeight:1.5,
            }}>
              <IconClock/>
              <span>
                Waiting for the buyer to send payment.
                {hoursLeft !== null && <span style={{ color: nearDeadline ? "#DF321F" : "#C45104" }}> {hoursLeft}h remaining.</span>}
              </span>
            </div>
            {nearDeadline && <Btn label="⏱  Extend Deadline (+12h)" bg="#D7F2FE" color="#037DB5" onClick={() => onAction("extend_time")}/>}
            {/* Greyed-out — seller cannot confirm payment yet */}
            <SlideToConfirm
              label="I've received the payment"
              disabled={true}
            />
          </>;
        })()}

        {/* Seller: confirm receipt → releases bitcoin */}
        {(status === "payment_in_transit" || status === "payment_confirmed") && role === "seller" && <>
          <div className="action-hint">The buyer has marked the payment as sent. Check your account and confirm once the funds have arrived.</div>
          <SlideToConfirm
            label="I've received the payment"
            onConfirm={() => setShowConfirm(true)}
          />
          <Btn label="Open Dispute" bg="#FFF0EE" color="#DF321F" onClick={() => onAction("dispute")}/>
        </>}

        {status === "payment_in_transit" && role === "buyer" && <>
          <div className="action-hint">You've sent payment. Waiting for the seller to confirm.</div>
          <Btn label="Open Dispute" bg="#FFF0EE" color="#DF321F" onClick={() => onAction("dispute")}/>
        </>}

        {status === "payment_confirmed" && role === "buyer" && (
          <div className="action-hint">Payment confirmed. Waiting for the seller to release the Bitcoin.</div>
        )}

        {status === "dispute" && (
          <div style={{
            background:"#FFF0EE", border:"1px solid rgba(223,50,31,.2)",
            borderRadius:10, padding:"10px 14px", fontSize:".82rem",
            color:"#DF321F", lineHeight:1.5,
          }}>
            <strong>Dispute open.</strong> A Peach mediator has been assigned. Provide evidence via the chat. Do not close this screen.
          </div>
        )}
      </div>
    </>
  );
}

// ─── RATING PANEL ────────────────────────────────────────────────────────────
function RatingPanel({ counterparty, onRate }) {
  const [rating, setRating] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div style={{
        textAlign:"center", padding:"20px 0",
        fontSize:".9rem", color:"#65A519", fontWeight:700,
      }}>
        <div style={{ fontSize:"1.5rem", marginBottom:8 }}>✓</div>
        Rating submitted. Thanks!
      </div>
    );
  }

  return (
    <div style={{
      background:"linear-gradient(135deg,#FFF9F6,#FEEDE5)",
      border:"1.5px solid rgba(245,101,34,.2)",
      borderRadius:14, padding:"20px", marginTop:8,
    }}>
      <div style={{ fontWeight:800, fontSize:"1rem", marginBottom:4 }}>Trade Complete! 🎉</div>
      <div style={{ fontSize:".85rem", color:"#7D675E", marginBottom:16 }}>
        How was trading with <strong>{counterparty.name}</strong>?
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <button
          className={`rating-btn${rating === 5 ? " rating-selected-good" : ""}`}
          onClick={() => setRating(5)}
        >
          <IconThumbUp/>
          <span>Positive</span>
        </button>
        <button
          className={`rating-btn${rating === 1 ? " rating-selected-bad" : ""}`}
          onClick={() => setRating(1)}
        >
          <IconThumbDown/>
          <span>Negative</span>
        </button>
      </div>
      <button
        className="action-btn-grad"
        disabled={!rating}
        style={{ opacity: rating ? 1 : 0.5, cursor: rating ? "pointer" : "not-allowed" }}
        onClick={() => { if (rating) { onRate(rating); setSubmitted(true); }}}
      >
        Submit Rating
      </button>
    </div>
  );
}

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ messages, tradeId, disabled, status }) {
  const disputeOpen = status === "dispute";
  const [text, setText] = useState("");
  const [localMsgs, setLocalMsgs] = useState(messages);
  const [showDispute, setShowDispute] = useState(false);
  const messagesRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { setLocalMsgs(messages); }, [messages]);
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [localMsgs]);

  function send() {
    if (!text.trim() || disabled) return;
    setLocalMsgs(prev => [...prev, { id:Date.now(), from:"me", text:text.trim(), ts:Date.now(), optimistic:true }]);
    setText("");
  }
  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="chat-panel" style={{ position:"relative" }}>
      {showDispute && <DisputeFlow tradeId={tradeId} onClose={() => setShowDispute(false)}/>}

      {/* Disabled overlay */}
      {disabled && (
        <div style={{
          position:"absolute", inset:0, zIndex:10,
          background:"rgba(244,238,235,0.82)",
          backdropFilter:"blur(2px)",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:10,
          pointerEvents:"all",
        }}>
          <div style={{
            width:40, height:40, borderRadius:"50%",
            background:"#EAE3DF",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <IconLock/>
          </div>
          <div style={{
            fontSize:".85rem", fontWeight:700, color:"#7D675E",
            textAlign:"center", maxWidth:240, lineHeight:1.5,
          }}>
            Chat disabled while waiting for seller to fund escrow
          </div>
        </div>
      )}

      <TradingRulesCard/>

      <div className="chat-enc-notice">
        <IconLock/> End-to-end encrypted
      </div>

      {/* Dispute button — fixed top-right of chat area */}
      <div style={{ position:"relative", flexShrink:0, height:0 }}>
        <button
          className={`chat-dispute-btn${disputeOpen ? " chat-dispute-btn-inactive" : ""}`}
          onClick={() => !disabled && !disputeOpen && setShowDispute(true)}
          onMouseEnter={e => { if (!disabled && !disputeOpen) e.currentTarget.style.background="#FFF0EE"; }}
          onMouseLeave={e => { e.currentTarget.style.background="white"; }}
          style={{
            position:"absolute", top:10, right:14,
            opacity: disabled ? 0.4 : 1,
            pointerEvents: (disabled || disputeOpen) ? "none" : "auto",
            background:"white",
            boxShadow:"0 2px 8px rgba(0,0,0,.12)",
            zIndex:5,
          }}
          title={disputeOpen ? "Dispute already open" : "Open dispute"}
        >
          <IconDispute/> <span>{disputeOpen ? "dispute open" : "open dispute"}</span>
        </button>
      </div>

      <div className="chat-messages" ref={messagesRef}>
        {localMsgs.map(msg => {
          const isMe = msg.from === "me";
          return (
            <div key={msg.id} className={`chat-bubble-row${isMe ? " chat-bubble-row-me" : ""}`}>
              <div className={`chat-bubble${isMe ? " chat-bubble-me" : " chat-bubble-them"}`}>
                <div className="chat-text">{msg.text}</div>
                <div className="chat-ts">
                  {relTime(msg.ts)}
                  {msg.optimistic && <span style={{ opacity:.6 }}> · sending…</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          placeholder="Send an encrypted message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          disabled={disabled}
        />
        <button className="chat-send-btn" onClick={send} disabled={!text.trim() || disabled}
          style={{ opacity: (text.trim() && !disabled) ? 1 : 0.45 }}>
          <IconSend/>
        </button>
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
    --surface:#FFFFFF;--bg:#FFF9F6;--font:'Baloo 2',cursive;--topbar:56px;--stepper-h:52px;
  }
  html{font-size:120%}
  body{font-family:var(--font);background:var(--bg);color:var(--black)}

  /* ── Topbar ── */
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
    background:transparent;cursor:pointer;color:var(--black-65);flex-shrink:0}
  .burger-btn:hover{background:var(--black-5)}
  @media(max-width:767px){.burger-btn{display:flex}.topbar-price{display:none}.sidenav-price-slot{display:block}}

  /* ── Sidenav ── */
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
  .sidenav-label{font-size:.57rem;font-weight:700;letter-spacing:.02em;text-transform:uppercase;
    white-space:nowrap;overflow:hidden;transition:opacity .15s,max-height .2s;max-height:20px;opacity:1}
  .sidenav-collapsed .sidenav-label{opacity:0;max-height:0;pointer-events:none}
  .sidenav-backdrop{display:none;position:fixed;inset:0;z-index:149;background:rgba(43,25,17,.4)}
  .sidenav-backdrop.open{display:block}
  @media(max-width:767px){
    .sidenav{transform:translateX(-100%);width:220px;transition:transform .2s}
    .sidenav-mobile-open{transform:translateX(0)}
    .sidenav-label{opacity:1;max-height:20px}
    .sidenav-item{flex-direction:row;justify-content:flex-start;padding:10px 16px;gap:12px}
  }

  /* ── Page layout ── */
  .page-wrap{margin-top:var(--topbar);margin-left:68px;height:calc(100vh - var(--topbar));
    display:flex;flex-direction:column;overflow:hidden}
  @media(max-width:767px){.page-wrap{margin-left:0}}

  /* ── Horizontal stepper (fixed bottom bar) ── */
  .h-stepper-wrap{
    position:fixed;bottom:0;left:68px;right:0;height:var(--stepper-h);
    background:var(--surface);border-top:1px solid var(--black-10);
    display:flex;align-items:center;justify-content:center;
    padding:0 24px;z-index:190;gap:0;
  }
  @media(max-width:767px){.h-stepper-wrap{left:0}}
  .h-stepper{display:flex;align-items:center;gap:0;width:100%;max-width:600px}
  .h-step{
    display:flex;flex-direction:column;align-items:center;
    position:relative;flex:1;
  }
  .h-step-line{
    position:absolute;top:8px;right:50%;
    width:100%;height:2px;
    transform:translateX(-50%);
    z-index:0;
  }
  .h-step-dot{
    width:16px;height:16px;border-radius:50%;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    position:relative;z-index:1;transition:background .3s,box-shadow .3s;
  }
  .h-step-label{
    font-size:.62rem;font-weight:500;text-align:center;
    margin-top:5px;white-space:nowrap;transition:color .3s;
  }
  .h-stepper-alert{
    display:flex;align-items:center;gap:6px;margin-left:16px;
    font-size:.72rem;font-weight:700;color:var(--error);white-space:nowrap;
    background:var(--error-bg);border-radius:999px;padding:3px 10px;flex-shrink:0;
  }

  /* ── Trade topbar (below main topbar) ── */
  .trade-topbar{
    display:flex;align-items:center;gap:12px;padding:0 24px;
    height:52px;background:var(--surface);border-bottom:1px solid var(--black-10);
    flex-shrink:0;
  }
  .trade-topbar-back{
    display:flex;align-items:center;justify-content:center;
    width:32px;height:32px;border-radius:8px;border:1.5px solid var(--black-10);
    background:transparent;cursor:pointer;color:var(--black-65);flex-shrink:0;transition:all .15s}
  .trade-topbar-back:hover{border-color:var(--primary);color:var(--primary-dark);background:var(--primary-mild)}
  .trade-topbar-id{font-family:monospace;font-size:.82rem;font-weight:700;color:var(--black-65)}
  .trade-topbar-sep{color:var(--black-10);font-size:1.2rem;flex-shrink:0}
  .trade-topbar-name{font-size:.9rem;font-weight:700}
  .trade-topbar-elapsed{font-size:.75rem;color:var(--black-65);display:flex;align-items:center;gap:4px}
  .trade-topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px}

  /* ── Demo switcher ── */
  .demo-bar{
    background:linear-gradient(90deg,#2B1911,#624D44);
    padding:7px 24px;display:flex;align-items:center;gap:12px;flex-shrink:0;flex-wrap:wrap}
  .demo-label{font-size:.68rem;font-weight:700;color:rgba(255,255,255,.5);
    text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
  .demo-btn{
    border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);
    border-radius:999px;font-family:var(--font);font-size:.72rem;font-weight:700;
    color:rgba(255,255,255,.7);padding:3px 12px;cursor:pointer;transition:all .15s;white-space:nowrap}
  .demo-btn:hover{background:rgba(255,255,255,.14);color:white}
  .demo-btn.demo-active{background:var(--primary);border-color:var(--primary);color:white}

  /* ── Split layout ── */
  .split-layout{display:flex;flex:1;overflow:hidden}
  .split-left{
    width:42%;min-width:320px;flex-shrink:0;
    overflow-y:auto;padding:24px 24px calc(24px + var(--stepper-h));
    border-right:1px solid var(--black-10);
  }
  .split-left-full{width:100%;border-right:none;max-width:600px;margin:0 auto}
  .split-right{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;padding-bottom:var(--stepper-h)}

  /* ── Mobile tabs ── */
  .mobile-tabs{display:none}
  @media(max-width:900px){
    .split-left{width:100%}
    .split-right{display:none}
    .split-right.mobile-active{display:flex}
    .split-left.mobile-hidden{display:none}
    .mobile-tabs{
      display:flex;gap:0;border-bottom:1px solid var(--black-10);
      flex-shrink:0;background:var(--surface)}
    .mobile-tab{
      flex:1;border:none;background:transparent;font-family:var(--font);
      font-size:.85rem;font-weight:600;color:var(--black-65);
      padding:12px 0;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}
    .mobile-tab.active{color:var(--primary-dark);border-bottom-color:var(--primary);font-weight:700}
  }

  /* ── Left panel sections ── */
  .panel-section{margin-bottom:24px}
  .panel-section-title{
    font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
    color:var(--black-65);margin-bottom:10px;display:flex;align-items:center;gap:6px}
  .panel-section-title::before{content:'';display:inline-block;width:3px;height:12px;
    background:var(--primary);border-radius:2px}

  /* ── Counterparty card ── */
  .counterparty-card{
    display:flex;align-items:center;gap:12px;
    background:var(--surface);border:1px solid var(--black-10);
    border-radius:12px;padding:12px 14px;margin-bottom:20px;
  }
  .cp-name{font-size:.9rem;font-weight:700}
  .cp-meta{font-size:.75rem;color:var(--black-65);display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px}

  /* ── Trade summary ── */
  .trade-summary{
    background:var(--surface);border:1px solid var(--black-10);border-radius:12px;
    padding:14px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .summary-item-label{font-size:.68rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.05em;color:var(--black-65);margin-bottom:2px}
  .summary-item-val{font-size:.9rem;font-weight:700}
  .summary-item-sub{font-size:.72rem;color:var(--black-65);margin-top:1px}

  /* ── Action panel ── */
  .action-panel{display:flex;flex-direction:column;gap:10px}
  .action-hint{font-size:.82rem;color:var(--black-65);line-height:1.5;padding:10px 12px;
    background:var(--black-5);border-radius:8px}
  .action-btn{
    border:none;border-radius:999px;font-family:var(--font);
    font-size:.85rem;font-weight:700;padding:10px 20px;cursor:pointer;
    transition:all .15s;text-align:center}
  .action-btn-large{padding:12px 24px;font-size:.9rem}
  .action-btn-danger:hover{background:var(--error)!important;color:white!important}
  .action-btn-grad{
    background:var(--grad);color:white;border:none;border-radius:999px;
    font-family:var(--font);font-size:.9rem;font-weight:800;
    padding:12px 24px;cursor:pointer;text-align:center;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .15s,box-shadow .15s}
  .action-btn-grad:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(245,101,34,.4)}
  .action-btn-grad:disabled{opacity:.5;cursor:not-allowed;transform:none}

  /* ── Rating ── */
  .rating-btn{
    flex:1;display:flex;align-items:center;justify-content:center;gap:8px;
    border:2px solid var(--black-10);background:var(--surface);border-radius:12px;
    font-family:var(--font);font-size:.9rem;font-weight:700;color:var(--black-75);
    padding:12px;cursor:pointer;transition:all .2s}
  .rating-btn:hover{border-color:var(--primary-mild)}
  .rating-selected-good{background:var(--success-bg)!important;border-color:var(--success)!important;color:var(--success)!important}
  .rating-selected-bad{background:var(--error-bg)!important;border-color:var(--error)!important;color:var(--error)!important}

  /* ── Chat ── */
  .chat-panel{display:flex;flex-direction:column;flex:1;overflow:hidden}
  .chat-enc-notice{
    display:flex;align-items:center;gap:6px;padding:7px 18px;
    background:#F4EEEB;border-bottom:1px solid var(--black-10);
    font-size:.7rem;font-weight:600;color:var(--black-65);flex-shrink:0;font-family:monospace}
  .chat-messages{flex:1;overflow-y:auto;padding:20px 18px;display:flex;flex-direction:column;gap:10px}
  .chat-bubble-row{display:flex}
  .chat-bubble-row-me{justify-content:flex-end}
  .chat-bubble{max-width:72%;border-radius:14px;padding:9px 13px;line-height:1.5}
  .chat-bubble-me{background:linear-gradient(135deg,#FF7A50,#F56522);color:white;border-bottom-right-radius:4px}
  .chat-bubble-them{background:var(--surface);border:1px solid var(--black-10);color:var(--black);border-bottom-left-radius:4px}
  .chat-text{font-size:.85rem}
  .chat-ts{font-size:.65rem;opacity:.65;margin-top:3px;text-align:right}
  .chat-bubble-them .chat-ts{text-align:left}
  .chat-input-row{
    display:flex;align-items:flex-end;gap:10px;
    padding:12px 18px;border-top:1px solid var(--black-10);
    background:var(--surface);flex-shrink:0}
  .chat-input{
    flex:1;resize:none;font-family:var(--font);font-size:.87rem;color:var(--black);
    background:var(--bg);border:1.5px solid var(--black-10);border-radius:12px;
    padding:9px 14px;outline:none;transition:border-color .15s;max-height:100px;line-height:1.5}
  .chat-input:focus{border-color:var(--primary)}
  .chat-send-btn{
    width:38px;height:38px;border-radius:50%;border:none;
    background:var(--grad);color:white;cursor:pointer;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
    transition:transform .15s,opacity .15s;box-shadow:0 2px 8px rgba(245,101,34,.3)}
  .chat-send-btn:hover:not(:disabled){transform:scale(1.07)}

  /* ── Direction badge ── */
  .dir-buy{background:#F2F9E7;color:#65A519;border-radius:999px;padding:2px 10px;font-size:.7rem;font-weight:800}
  .dir-sell{background:#FFF0EE;color:#DF321F;border-radius:999px;padding:2px 10px;font-size:.7rem;font-weight:800}

  /* ── Badge ── */
  .badge-supertrader{background:linear-gradient(90deg,#FF4D42,#FFA24C);color:white;border-radius:999px;padding:1px 7px;font-size:.68rem;font-weight:700}
  .badge-fast{background:#FEEDE5;color:#C45104;border-radius:999px;padding:1px 7px;font-size:.68rem;font-weight:700}
  .badge-role{background:#D7F2FE;color:#037DB5;border-radius:999px;padding:2px 10px;font-size:.7rem;font-weight:700}
  .tag-method{background:var(--black-5);color:var(--black-75);border-radius:999px;padding:2px 8px;font-size:.72rem;font-weight:600}
  .tag-currency{background:var(--primary-mild);color:var(--primary-dark);border-radius:999px;padding:2px 8px;font-size:.72rem;font-weight:600}

  .chat-dispute-btn{
    display:flex;align-items:center;gap:5px;flex-shrink:0;
    border:1.5px solid #DF321F;background:white;border-radius:999px;
    font-family:var(--font);font-size:.75rem;font-weight:700;color:#DF321F;
    padding:0 12px;height:34px;cursor:pointer;white-space:nowrap;transition:all .15s}
  .chat-dispute-btn-active:hover{background:#FFF0EE;border-color:#DF321F}
  .chat-dispute-btn-inactive{opacity:.5;cursor:default;border-style:dashed}

  /* scrollbar */
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-thumb{background:var(--black-10);border-radius:3px}
  @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TradeExecution() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const auth = window.__PEACH_AUTH__ ?? null;

  const [demoOpen, setDemoOpen] = useState(false);
  const [scenarioId, setScenarioId]   = useState("buyer_awaiting");
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [mobileTab, setMobileTab]     = useState("details");   // "details" | "chat"
  const [allPrices,           setAllPrices]           = useState({ EUR: BTC_PRICE });
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? BTC_PRICE);

  // ── AUTH STATE ──
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

  // ── LIVE CONTRACT DATA ──
  const [liveContract, setLiveContract] = useState(null);
  const [liveMessages, setLiveMessages] = useState(null);

  const demoScenario = DEMO_SCENARIOS.find(s => s.id === scenarioId) || DEMO_SCENARIOS[0];
  const demoMessages = MOCK_MESSAGES[scenarioId] || [];

  // Use live data if available, fall back to demo scenario
  const activeLive = !!liveContract;
  const scenario = activeLive ? liveContract : demoScenario;
  const messages = activeLive ? (liveMessages ?? []) : demoMessages;
  const { contract, counterparty, tradeStatus: status, role, paymentDetails } = scenario;

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

  // ── FETCH LIVE CONTRACT + CHAT ──
  useEffect(() => {
    if (!auth || !routeId) return;
    const base = auth.baseUrl;
    const hdrs = { Authorization: `Bearer ${auth.token}` };
    const peachId = auth.peachId;

    async function fetchContract() {
      try {
        const res = await fetch(`${base}/contract/${routeId}`, { headers: hdrs });
        if (!res.ok) return;
        const c = await res.json();
        const isBuyer = (c.buyer?.id ?? c.buyerId) === peachId;
        setLiveContract({
          id: c.id,
          role: isBuyer ? "buyer" : "seller",
          tradeStatus: c.status ?? "matched",
          instantTrade: c.instantTrade ?? false,
          contract: {
            id: c.id,
            direction: isBuyer ? "buy" : "sell",
            amount: c.amount ?? 0,
            fiat: c.price != null ? c.price.toFixed(2) : null,
            currency: c.currency ?? "EUR",
            premium: c.premium ?? 0,
            method: c.paymentMethod ?? "",
            creationDate: c.creationDate ?? Date.now(),
            paymentExpectedBy: c.paymentExpectedBy ?? null,
            escrow: c.escrow ?? null,
          },
          counterparty: null,
          paymentDetails: c.paymentData ?? null,
        });
      } catch {}
    }

    async function fetchChat() {
      try {
        const res = await fetch(`${base}/contract/${routeId}/chat?page=0`, { headers: hdrs });
        if (!res.ok) return;
        const data = await res.json();
        const msgs = Array.isArray(data) ? data : (data?.messages ?? []);
        setLiveMessages(msgs.map(m => ({
          id: m.id ?? Math.random(),
          from: m.from === peachId ? "me" : "them",
          text: m.message ?? m.text ?? "",
          time: m.date ? new Date(m.date).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "",
        })));
      } catch {}
    }

    fetchContract();
    fetchChat();
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const satsPerCur  = Math.round(SAT / btcPrice);

  // Elapsed time
  const elapsedMs = Date.now() - contract.creationDate;
  const elapsedH  = Math.floor(elapsedMs / 3600_000);
  const elapsedM  = Math.floor((elapsedMs % 3600_000) / 60_000);
  const elapsedStr = elapsedH > 0 ? `${elapsedH}h ${elapsedM}m` : `${elapsedM}m`;

  // Deadline countdown
  let deadlineStr = null;
  if (contract.paymentExpectedBy) {
    const left = contract.paymentExpectedBy - Date.now();
    const h = Math.floor(left / 3600_000);
    const m = Math.floor((left % 3600_000) / 60_000);
    deadlineStr = `${h}h ${m}m`;
  }

  // Premium color (perspective-aware)
  const premColor = role === "buyer"
    ? (contract.premium < 0 ? "#65A519" : "#DF321F")
    : (contract.premium > 0 ? "#65A519" : "#DF321F");

  const unreadCount = messages.filter(m => m.from !== "me").length;

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
            <div className="avatar-menu-wrap" style={{position:"relative"}}>
              <div className="avatar-peachid" onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(v => !v); }} style={{cursor:"pointer"}}>
                <span className="peach-id">{getTopbarPeachId()}</span>
                <div className="avatar">
                  N
                  <div className="avatar-badge">{unreadCount}</div>
                </div>
              </div>
              {showAvatarMenu && (
                <div style={{position:"absolute",top:"110%",right:0,background:"white",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,.12)",padding:6,minWidth:140,zIndex:300}}>
                  <button className="avatar-menu-item danger" onClick={handleLogout}
                    style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"10px 14px",border:"none",background:"none",borderRadius:8,cursor:"pointer",fontSize:".82rem",fontWeight:700,color:"#DF321F",fontFamily:"Baloo 2, cursive"}}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="avatar-login-btn" onClick={handleLogin} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:999,background:"linear-gradient(135deg,#F56522,#F5A522)",color:"white",fontWeight:800,fontSize:".78rem",fontFamily:"Baloo 2, cursive"}}>
              <span>Log in</span>
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

      <div className="page-wrap">

        {/* ── Demo scenario switcher ── */}
        <div style={{ position:"relative", flexShrink:0 }}>
          {/* Toggle bubble — always visible */}
          <button
            onClick={() => setDemoOpen(o => !o)}
            style={{
              position:"absolute", top:8, left:16, zIndex:10,
              display:"flex", alignItems:"center", gap:5,
              background:"#2B1911", border:"none", borderRadius:999,
              color:"rgba(255,255,255,.65)", fontFamily:"Baloo 2, cursive",
              fontSize:".68rem", fontWeight:700, padding:"4px 10px",
              cursor:"pointer", transition:"color .15s",
              boxShadow: demoOpen ? "none" : "0 2px 8px rgba(0,0,0,.25)",
            }}
            onMouseEnter={e => e.currentTarget.style.color="white"}
            onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,.65)"}
          >
            Preview
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ transform: demoOpen ? "rotate(180deg)" : "rotate(0)", transition:"transform .2s" }}>
              <polyline points="2,3 5,7 8,3"/>
            </svg>
          </button>

          {/* Expandable panel */}
          {demoOpen && (
            <div className="demo-bar" style={{ paddingLeft:90 }}>
              {DEMO_SCENARIOS.map(s => (
                <button
                  key={s.id}
                  className={`demo-btn${scenarioId === s.id ? " demo-active" : ""}`}
                  onClick={() => { setScenarioId(s.id); setMobileTab("details"); }}
                >{s.label}</button>
              ))}
            </div>
          )}

          {/* Collapsed spacer — just enough height for the bubble */}
          {!demoOpen && <div style={{ height:34 }}/>}
        </div>

        {/* ── Trade sub-topbar ── */}
        <div className="trade-topbar">
          <button className="trade-topbar-back" title="Back to Trades" onClick={() => navigate("/trades")}><IconBack/></button>
          <span className="trade-topbar-id">{contract.id}</span>
          <span className="trade-topbar-sep">·</span>
          <span className={role === "buyer" ? "dir-buy" : "dir-sell"}>{role === "buyer" ? "BUY" : "SELL"}</span>
          <span className="trade-topbar-sep">·</span>
          <StatusChip status={status} large/>
        </div>

        {/* ── Mobile tabs ── */}
        <div className="mobile-tabs">
          <button className={`mobile-tab${mobileTab === "details" ? " active" : ""}`} onClick={() => setMobileTab("details")}>
            Trade Details
          </button>
          <button className={`mobile-tab${mobileTab === "chat" ? " active" : ""}`} onClick={() => setMobileTab("chat")}>
            Chat {unreadCount > 0 && <span style={{ background:"#DF321F", color:"white", borderRadius:999, padding:"0 6px", fontSize:".65rem", fontWeight:800, marginLeft:4 }}>{unreadCount}</span>}
          </button>
        </div>

        {/* ── Split layout ── */}
        <div className="split-layout">

          {/* ── LEFT: Trade Details ── */}
          <div className={`split-left${mobileTab === "chat" ? " mobile-hidden" : ""}`}>

            {/* Counterparty */}
            <div className="counterparty-card">
              <Avatar initials={counterparty.initials} color={counterparty.color} size={44} online={counterparty.online}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="cp-name">{counterparty.name}</div>
                <div className="cp-meta">
                  <span>★ {counterparty.rep.toFixed(1)}</span>
                  <span>·</span>
                  <span>{counterparty.trades} trades</span>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                {counterparty.badges?.includes("supertrader") && <span className="badge-supertrader">🏆 Supertrader</span>}
                {counterparty.badges?.includes("fast") && <span className="badge-fast">⚡ Fast</span>}
              </div>
            </div>

            {/* Trade amounts — no deadline here anymore */}
            <div className="trade-summary">
              <div>
                <div className="summary-item-label">Amount</div>
                <div className="summary-item-val"><SatsAmount sats={contract.amount} size="lg"/></div>
                <div className="summary-item-sub">≈ €{satsToFiat(contract.amount)}</div>
              </div>
              <div>
                <div className="summary-item-label">You {role === "buyer" ? "pay" : "receive"}</div>
                <div className="summary-item-val">{contract.currency === "CHF" ? "₣" : "€"}{contract.fiat}</div>
                <div className="summary-item-sub">{contract.currency}</div>
              </div>
              <div>
                <div className="summary-item-label">Premium</div>
                <div className="summary-item-val" style={{ color:premColor }}>
                  {contract.premium > 0 ? "+" : ""}{contract.premium.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="summary-item-label">Method</div>
                <div className="summary-item-val" style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span className="tag-method">{contract.method}</span>
                </div>
              </div>
            </div>

            {/* Escrow link — just above Actions */}
            <div style={{ padding:"0 0 4px", textAlign:"right" }}>
              <a
                href={`https://mempool.space/address/${contract.escrow}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize:".72rem", fontWeight:600, color:"#7D675E",
                  textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4,
                }}
                onMouseEnter={e => e.currentTarget.style.color="#F56522"}
                onMouseLeave={e => e.currentTarget.style.color="#7D675E"}
              >
                View escrow on mempool.space
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9L9 2M9 2H5M9 2v4"/>
                </svg>
              </a>
            </div>

            {/* ── Actions (always first, includes deadline + escrow funding) ── */}
            <div className="panel-section">
              <div className="panel-section-title">Actions</div>

              {/* Payment deadline — inside actions */}
              {/* Payment deadline pill — not shown for seller awaiting payment (has its own merged bar) */}
              {deadlineStr && !(status === "awaiting_payment" && role === "seller") && (
                <div style={{
                  display:"flex", alignItems:"center", gap:12,
                  background:"#FEEDE5", border:"1.5px solid rgba(196,81,4,.2)",
                  borderRadius:12, padding:"12px 16px", marginBottom:12,
                }}>
                  <span style={{ fontSize:"1.5rem", flexShrink:0 }}>⏳</span>
                  <div>
                    <div style={{ fontSize:".72rem", fontWeight:700, color:"#C45104", textTransform:"uppercase", letterSpacing:".05em", marginBottom:1 }}>Payment deadline</div>
                    <div style={{ fontSize:"1.05rem", fontWeight:800, color:"#C45104" }}>{deadlineStr} remaining</div>
                  </div>
                </div>
              )}

              {/* Escrow funding card — inside actions for seller */}
              {role === "seller" && status === "matched" && (
                <EscrowFundingCard
                  address={contract.escrow}
                  sats={contract.amount}
                  btcPrice={btcPrice}
                />
              )}

              {/* Buyer awaiting escrow */}
              {status === "matched" && role === "buyer" && (
                <>
                  <div style={{
                    display:"flex", flexDirection:"column", alignItems:"center",
                    gap:12, padding:"20px 0", textAlign:"center",
                  }}>
                    <div style={{
                      width:48, height:48, borderRadius:"50%",
                      background:"#FEFCE5", border:"2px solid #F5CE22",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"1.4rem",
                    }}>⏳</div>
                    <div style={{ fontWeight:700, fontSize:".95rem" }}>Waiting for escrow</div>
                    <div style={{ fontSize:".83rem", color:"#7D675E", lineHeight:1.6, maxWidth:280 }}>
                      The seller is funding the escrow. Once the Bitcoin is locked in, the trade will begin and you'll be able to send payment.
                    </div>
                    <div style={{ fontSize:".85rem", fontWeight:700, color:"#7D675E" }}>No actions required for the moment.</div>
                  </div>
                </>
              )}

              {/* All other action states */}
              {status !== "completed" && status !== "matched" && (
                <ActionPanel scenario={scenario} onAction={(action) => console.log("action:", action)}/>
              )}
            </div>

            {/* Payment details (buyer sees seller's payment info) */}
            {paymentDetails && role === "buyer" && (
              <div className="panel-section">
                <div className="panel-section-title">Payment Details</div>
                {status === "escrow_funded" && (
                  <p style={{ fontSize:".83rem", color:"#7D675E", marginBottom:10 }}>
                    Send the exact fiat amount to the payment details below, then confirm using the slider.
                  </p>
                )}
                <p style={{ fontSize:".83rem", color:"#DF321F", fontWeight:600, marginBottom:10 }}>
                  Make sure to include the reference with your payment
                </p>
                <PaymentDetailsCard details={paymentDetails}/>
              </div>
            )}

            {/* Escrow address (seller, non-matched states — matched already shows full funding card above) */}
            {role === "seller" && status !== "matched" && (
              <div className="panel-section">
                <div className="panel-section-title">Escrow</div>
                <EscrowAddressCard address={contract.escrow}/>
              </div>
            )}

            {/* Rating panel (completed only) */}
            {status === "completed" && (
              <div className="panel-section">
                <RatingPanel counterparty={counterparty} onRate={(r) => console.log("rated:", r)}/>
              </div>
            )}
          </div>

          {/* ── RIGHT: Chat ── */}
          <div className={`split-right${mobileTab === "chat" ? " mobile-active" : ""}`}>
            <ChatPanel messages={messages} tradeId={contract.id} disabled={status === "matched"} status={status}/>
          </div>

        </div>
      </div>

      {/* ── HORIZONTAL STEPPER (fixed bottom) ── */}
      <div className="h-stepper-wrap">
        <HorizontalStepper status={status}/>
      </div>
    </>
  );
}
