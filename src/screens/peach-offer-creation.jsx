import { useState, useEffect } from "react";
// ⚠️ react-router-dom removed for Claude.ai preview. Restore import for local dev.
import { useNavigate } from "react-router-dom";

const BTC_PRICE_INIT = 87432;
const SAT = 100_000_000;

// Which currencies each method type supports
const METHOD_CURRENCIES = {
  SEPA:    ["EUR","CHF"],
  Revolut: ["EUR","CHF","GBP","USD","SEK","NOK"],
  Wise:    ["EUR","CHF","GBP","USD","SEK","NOK"],
  PayPal:  ["EUR","GBP","USD"],
  Strike:  ["USD"],
  Cash:    ["EUR","CHF","GBP","USD"],
};

// Fields to collect per method type
const METHOD_FIELDS = {
  SEPA:    [{key:"holder",  label:"Account holder name", placeholder:"Full name"},
            {key:"iban",    label:"IBAN",                placeholder:"DE89 3704 0044 0532 0130 00"}],
  Revolut: [{key:"username",label:"Revolut username",    placeholder:"@username"}],
  Wise:    [{key:"email",   label:"Email or @handle",    placeholder:"you@example.com"}],
  PayPal:  [{key:"email",   label:"PayPal email",        placeholder:"you@example.com"}],
  Strike:  [{key:"username",label:"Strike username",     placeholder:"@username"}],
  Cash:    [{key:"description",label:"Meeting details",  placeholder:"e.g. in-person, Berlin area"}],
};

// Derive a short display label for a saved PM
function methodLabel(pm) {
  const d = pm.details;
  const curr = (pm.currencies||[]).join("/");
  if(pm.type==="SEPA")    return `SEPA · ${curr} · ${d.iban?d.iban.replace(/\s/g,"").slice(0,6)+"…":"—"}`;
  if(pm.type==="Revolut") return `Revolut · ${curr} · ${d.username||"—"}`;
  if(pm.type==="Wise")    return `Wise · ${curr} · ${d.email||"—"}`;
  if(pm.type==="PayPal")  return `PayPal · ${curr} · ${d.email||"—"}`;
  if(pm.type==="Strike")  return `Strike · ${curr} · ${d.username||"—"}`;
  if(pm.type==="Cash")    return `Cash · ${curr}`;
  return pm.type;
}

// Mock pre-seeded saved PMs (would come from GET /user/me/paymentMethods)
const MOCK_SAVED = [
  {id:"pm1",type:"SEPA",    currencies:["EUR","CHF"],details:{holder:"Peter Weber",iban:"DE89370400440532013000"}},
  {id:"pm2",type:"Revolut", currencies:["EUR","GBP"],details:{username:"@peterweber"}},
];
const CHF_EUR = 0.96;           // mock CHF/EUR rate
const LIMIT_EUR = 1000 * CHF_EUR; // ≈ 960 EUR — daily trading limit
const MIN_SATS  = 20_000;
const maxSatsAtPrice = (price) => Math.floor((LIMIT_EUR / price) * SAT);

function satsToFiat(sats, p) { return (sats / SAT) * p; }
function fmt(n)    { return n>=1_000_000?(n/1_000_000).toFixed(2)+"M":n>=1000?(n/1000).toFixed(0)+"k":String(n); }
function fmtEur(n) { return n.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}); }

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const PeachIcon = ({size=28}) => (
  <svg width={size} height={size} viewBox="0 0 352 353" fill="none">
    <rect y=".38" width="352" height="352" rx="58.13" fill="#FFF9F6"/>
    <path d="M151.8 45.5c11.2-1.2 21.1 5.35 24.2 16.02.54 1.88.82 3.89.88 5.86.13 4.2.05 8.41.05 12.62 0 .39-.33.69-.72.7-3.07.11-6.08-.02-9.02-1-9.21-3.03-15.33-11.47-15.42-21.35-.04-4-.01-8.01 0-12.01" fill="#05A85A"/>
    <path d="M205.3 64.23c.99 8.75-5.26 16.21-13.69 16.46-4.77.14-9.15-3.93-7.14-8.26.95-2.06 2.42-3.88 4.47-5.44 2.3-1.76 4.93-2.69 7.82-2.74 2.83-.04 5.66 0 8.54 0" fill="#05A85A"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M276 155.69c0 49.73-43.64 96.87-97.47 96.87-19.52 0-37.71-6.2-52.95-16.48v49.48c0 12.29-9.96 22.26-22.26 22.26s-22.26-9.97-22.26-22.26V157.39h.02c-.01-.57-.02-1.13-.02-1.7 0-43.02 32.67-72.02 76.33-68.64 14.01 1.09 28.26 1.09 42.27 0 43.67-3.39 76.34 25.62 76.34 68.64zM125.61 163.8v-.39c.1-24.1 19.36-39.92 44.44-36.17 5.13.77 10.37.77 15.49 0 25.15-3.77 44.44 12.15 44.44 36.35 0 26.64-23.36 51.89-52.19 51.89-28.75 0-52.07-25.13-52.18-51.68z" fill="url(#pg_oc)"/>
    <defs>
      <radialGradient id="pg_oc" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(276 88) rotate(159) scale(220 130)">
        <stop stopColor="#FFA24C"/><stop offset=".5" stopColor="#FF7A50"/><stop offset="1" stopColor="#FF4D42"/>
      </radialGradient>
    </defs>
  </svg>
);

// ─── SIDENAV ─────────────────────────────────────────────────────────────────
const IconMarket   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,14 7,9 11,12 18,5"/><polyline points="13,5 18,5 18,10"/></svg>;
const IconTrades   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 7h10M13 4l3 3-3 3"/><path d="M15 13H5M7 10l-3 3 3 3"/></svg>;
const IconCreate   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>;
const IconSettings = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>;
const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="18" height="13" rx="2"/><line x1="1" y1="9" x2="19" y2="9"/><line x1="5" y1="14" x2="8" y2="14"/></svg>;

const IconChevronLeft  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,2 4,7 9,12"/></svg>;
const IconChevronRight = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="5,2 10,7 5,12"/></svg>;
const IconBurger       = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="4.5" x2="16" y2="4.5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13.5" x2="16" y2="13.5"/></svg>;

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
      <div className={`sidenav-backdrop${mobileOpen?" open":""}`} onClick={onClose}/>
      <nav className={`sidenav${collapsed?" sidenav-collapsed":""}${mobileOpen?" sidenav-mobile-open":""}`}>
        <button className="sidenav-toggle" onClick={onToggle} title={collapsed?"Expand sidebar":"Collapse sidebar"}>
          {collapsed ? <IconChevronRight/> : <IconChevronLeft/>}
        </button>
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button key={id} className={`sidenav-item${active===id?" sidenav-active":""}`}
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
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --primary:#F56522;--primary-dark:#C45104;--primary-mild:#FEEDE5;--primary-mild2:#FCCCB6;
    --grad:linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C);
    --success:#65A519;--success-bg:#F2F9E7;--success-mild:#DDEFC3;
    --error:#DF321F;--error-bg:#FFE6E1;
    --black:#2B1911;--black-75:#624D44;--black-65:#7D675E;
    --black-25:#C4B5AE;--black-10:#EAE3DF;--black-5:#F4EEEB;
    --surface:#fff;--bg:#FFF9F6;--font:'Baloo 2',cursive;--topbar:56px;
  }
  html{font-size:120%}
  body{font-family:var(--font);background:var(--bg);color:var(--black);min-height:100vh}

  /* Topbar */
  .topbar{position:fixed;top:0;left:0;right:0;height:var(--topbar);background:var(--surface);
    border-bottom:1px solid var(--black-10);display:flex;align-items:center;
    padding:0 20px;gap:12px;z-index:200}
  .logo-text{font-size:1.22rem;font-weight:800;letter-spacing:-.02em;
    background:var(--grad);-webkit-background-clip:text;
    -webkit-text-fill-color:transparent;background-clip:text}
  .price-pill,.topbar-price{display:flex;align-items:center;gap:8px;background:linear-gradient(90deg,#FFBFA8,#FFD5BF);border-radius:999px;padding:5px 6px 5px 10px;font-size:.78rem;font-weight:600;color:var(--black);flex-shrink:0}
  .topbar-price-main{font-weight:800;color:var(--black);white-space:nowrap}
  .topbar-price-sats{font-weight:500;color:var(--black-65);white-space:nowrap}
  .topbar-cur-select{position:relative;display:flex;align-items:center;gap:4px;background:rgba(255,255,255,0.45);border-radius:999px;padding:2px 9px;cursor:pointer}
  .cur-select-inner{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:.78rem;width:100%}
  .cur-select-arrow{display:flex;align-items:center;pointer-events:none;color:var(--black-65);flex-shrink:0}
  .cur-select-label{font-size:.76rem;font-weight:800;color:var(--black);pointer-events:none}
  .sidenav-price-slot{display:none;margin-top:auto;padding:12px 8px 8px;width:100%;border-top:1px solid var(--black-10)}
  .mobile-price-pill{display:flex;align-items:center;gap:8px;background:linear-gradient(90deg,#FFBFA8,#FFD5BF);border-radius:12px;padding:10px 10px 10px 12px}
  .mobile-price-text{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0}
  .mobile-price-main{font-size:.82rem;font-weight:800;color:var(--black);white-space:nowrap}
  .mobile-price-sats{font-size:.68rem;font-weight:500;color:var(--black-65);white-space:nowrap}
  .mobile-cur-select{flex-shrink:0}

  /* Creating offer badge — the prominent label */
  .creating-badge{
    display:flex;align-items:center;gap:8px;
    padding:5px 16px 5px 6px;
    border-radius:999px;
    font-size:.82rem;font-weight:800;letter-spacing:.01em;
    color:white;
    background:var(--grad);
    box-shadow:0 2px 10px rgba(245,101,34,.3);
  }
  .creating-badge-dot{width:8px;height:8px;border-radius:50%;
    background:rgba(255,255,255,.6);animation:blink 1.4s ease-in-out infinite}
  @keyframes blink{0%,100%{opacity:.5}50%{opacity:1}}
  .creating-badge.sell-badge{
    background:linear-gradient(90deg,#B01807,#DF321F);
    box-shadow:0 2px 10px rgba(223,50,31,.3);
  }
  .creating-badge.buy-badge{
    background:linear-gradient(90deg,#4F910C,#65A519);
    box-shadow:0 2px 10px rgba(101,165,25,.3);
  }

  .back-btn{display:flex;align-items:center;gap:6px;font-size:.82rem;font-weight:700;
    color:var(--black-65);cursor:pointer;padding:6px 12px;border-radius:8px;
    border:none;background:none;font-family:var(--font);transition:all .12s}
  .back-btn:hover{background:var(--black-5);color:var(--black)}
  .topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px}

  /* Sidenav */
  .sidenav{
    position:fixed;top:var(--topbar);left:0;bottom:0;
    width:68px;background:var(--surface);border-right:1px solid var(--black-10);
    z-index:150;display:flex;flex-direction:column;align-items:center;
    padding:8px 0;gap:2px;
    transition:width .2s cubic-bezier(.4,0,.2,1);
    overflow:hidden;
  }
  .sidenav-collapsed{width:44px}
  .sidenav-toggle{
    width:100%;height:32px;display:flex;align-items:center;justify-content:flex-end;
    padding-right:10px;border:none;background:transparent;cursor:pointer;
    color:var(--black-25);flex-shrink:0;transition:color .14s;margin-bottom:4px;
  }
  .sidenav-toggle:hover{color:var(--black-65)}
  .sidenav-toggle svg{transition:transform .2s}
  .sidenav-item{
    width:calc(100% - 16px);display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:3px;padding:8px 4px;border-radius:10px;
    border:none;background:transparent;cursor:pointer;color:var(--black-65);
    font-family:var(--font);transition:all .14s;flex-shrink:0;
  }
  .sidenav-item:hover{background:var(--black-5);color:var(--black)}
  .sidenav-active{background:var(--primary-mild)!important;color:var(--primary-dark)!important}
  .sidenav-icon{display:flex;align-items:center;justify-content:center;height:22px;flex-shrink:0}
  .sidenav-label{
    font-size:.57rem;font-weight:700;letter-spacing:.02em;
    text-transform:uppercase;white-space:nowrap;overflow:hidden;
    transition:opacity .15s, max-height .2s;
    max-height:20px;opacity:1;
  }
  .sidenav-collapsed .sidenav-label{opacity:0;max-height:0;pointer-events:none}
  .sidenav-backdrop{
    display:none;position:fixed;inset:0;z-index:149;
    background:rgba(43,25,17,.4);
    animation:fadeIn .2s ease;
  }
  .sidenav-backdrop.open{display:block}
  .burger-btn{
    display:none;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:8px;border:none;
    background:transparent;cursor:pointer;color:var(--black-65);
    flex-shrink:0;transition:background .14s;
  }
  .burger-btn:hover{background:var(--black-5)}
  .avatar{width:32px;height:32px;border-radius:50%;background:var(--grad);display:flex;
    align-items:center;justify-content:center;font-size:.72rem;font-weight:800;color:white;
    cursor:pointer;position:relative}
  .avatar-badge{position:absolute;top:-3px;right:-3px;background:var(--error);color:white;
    font-size:.55rem;font-weight:800;width:14px;height:14px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;border:2px solid var(--surface)}

  /* Layout */
  .layout{display:grid;grid-template-columns:1fr 340px;
    min-height:calc(100vh - var(--topbar));margin-top:var(--topbar)}
  .wizard{display:flex;flex-direction:column;padding:36px 48px;
    border-right:1px solid var(--black-10);min-width:0;gap:0}

  /* Wizard header */
  .wizard-header{display:flex;align-items:center;justify-content:space-between;
    margin-bottom:28px;flex-wrap:wrap;gap:12px}
  .wizard-title{font-size:1.5rem;font-weight:800;letter-spacing:-.025em;color:var(--black)}

  /* Type toggle */
  .type-toggle{display:flex;gap:2px;background:var(--black-5);
    padding:3px;border-radius:10px}
  .type-btn{padding:7px 22px;border-radius:8px;font-size:.85rem;font-weight:800;
    cursor:pointer;border:none;background:transparent;color:var(--black-65);
    transition:all .14s;font-family:var(--font)}
  .type-btn.buy-on{background:var(--surface);color:var(--success);box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .type-btn.sell-on{background:var(--surface);color:var(--error);box-shadow:0 1px 4px rgba(0,0,0,.08)}

  /* Step indicator (simplified: Configure → Review → Escrow) */
  .step-bar{display:flex;align-items:flex-start;margin-bottom:28px;gap:0}
  .sb-item{display:flex;flex-direction:column;align-items:center;gap:5px}
  .sb-dot{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-size:.68rem;font-weight:800;transition:all .22s;flex-shrink:0}
  .sb-dot.done{background:var(--grad);color:white}
  .sb-dot.active{background:var(--black);color:white;box-shadow:0 0 0 4px rgba(43,25,17,.1)}
  .sb-dot.todo{background:var(--black-5);color:var(--black-25);border:1.5px solid var(--black-10)}
  .sb-label{font-size:.62rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.07em;white-space:nowrap;transition:color .2s}
  .sb-label.done{color:var(--primary-dark)}.sb-label.active{color:var(--black)}.sb-label.todo{color:var(--black-25)}
  .sb-line{height:2px;flex:1;margin:13px 4px 0;min-width:16px;transition:background .22s}
  .sb-line.done{background:var(--primary)}.sb-line.todo{background:var(--black-10)}

  /* Config card */
  .config-card{background:var(--surface);border:1px solid var(--black-10);
    border-radius:18px;overflow:hidden;box-shadow:0 2px 16px rgba(43,25,17,.06)}

  /* Section inside card */
  .card-section{padding:22px 24px;border-bottom:1px solid var(--black-5)}
  .card-section:last-child{border-bottom:none}
  .section-header{display:flex;align-items:center;gap:10px;margin-bottom:16px}
  .section-num{width:22px;height:22px;border-radius:50%;background:var(--black-5);
    border:1.5px solid var(--black-10);display:flex;align-items:center;
    justify-content:center;font-size:.65rem;font-weight:800;color:var(--black-65);flex-shrink:0}
  .section-num.filled{background:var(--primary-mild);border-color:var(--primary-mild2);
    color:var(--primary-dark)}
  .section-title{font-size:.88rem;font-weight:800;color:var(--black)}
  .section-done{font-size:.7rem;font-weight:700;color:var(--success);
    background:var(--success-bg);padding:2px 8px;border-radius:999px;margin-left:auto}

  /* Inputs */
  .field-label{font-size:.7rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.07em;color:var(--black-65);margin-bottom:6px;display:block}
  .field-input{width:100%;font-family:var(--font);font-size:.95rem;font-weight:700;
    padding:10px 14px;border:2px solid var(--black-10);border-radius:10px;
    background:var(--bg);color:var(--black);outline:none;transition:border-color .15s}
  .field-input:focus{border-color:var(--primary)}
  .field-input.err{border-color:var(--error)}
  .fiat-hint{font-size:.7rem;color:var(--black-65);font-weight:500;margin-top:4px;min-height:16px}
  .fiat-hint.warn{color:var(--error)}
  .row-2{display:flex;gap:12px}
  .row-2>*{flex:1}

  /* Chips */
  .chip-grid{display:flex;flex-wrap:wrap;gap:7px}
  .method-chip{padding:6px 14px;border-radius:999px;font-size:.8rem;font-weight:700;
    cursor:pointer;border:2px solid var(--black-10);background:var(--surface);
    color:var(--black-65);transition:all .12s;font-family:var(--font)}
  .method-chip:hover{border-color:var(--primary);color:var(--primary-dark)}
  .method-chip.sel{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}
  .curr-chip{padding:4px 11px;border-radius:6px;font-size:.73rem;font-weight:800;
    cursor:pointer;border:2px solid var(--black-10);background:var(--surface);
    color:var(--black-65);transition:all .12s;letter-spacing:.04em;font-family:var(--font)}
  .curr-chip:hover{border-color:var(--primary);color:var(--primary-dark)}
  .curr-chip.sel{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}

  /* Amount slider */
  .amt-slider-wrap{position:relative;height:28px;display:flex;align-items:center;margin:8px 0 2px}
  .amt-slider-track{position:absolute;left:0;right:0;height:6px;border-radius:3px;
    background:var(--black-10);pointer-events:none}
  .amt-slider-fill{position:absolute;height:6px;border-radius:3px;
    background:var(--primary);pointer-events:none}
  .amt-slider{-webkit-appearance:none;appearance:none;position:absolute;
    width:100%;height:6px;background:transparent;outline:none;
    cursor:pointer;pointer-events:all}
  .amt-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;
    border-radius:50%;background:white;border:2.5px solid var(--primary);
    box-shadow:0 2px 8px rgba(245,101,34,.35);cursor:grab;transition:transform .1s}
  .amt-slider::-webkit-slider-thumb:hover{transform:scale(1.15)}
  .amt-slider::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.1)}
  .amt-slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;
    background:white;border:2.5px solid var(--primary);cursor:grab;
    box-shadow:0 2px 8px rgba(245,101,34,.35)}
  .amt-labels{display:flex;justify-content:space-between;font-size:.65rem;
    color:var(--black-65);font-weight:600;margin-bottom:12px}
  .amt-display{display:flex;align-items:baseline;gap:8px;margin-bottom:10px;flex-wrap:wrap}
  .amt-display-val{font-size:1.6rem;font-weight:800;letter-spacing:-.03em;color:var(--black)}
  .amt-display-fiat{font-size:.82rem;color:var(--black-65);font-weight:600}
  .amt-sep{font-size:1.1rem;color:var(--black-25);font-weight:500}

  /* Limit warning */
  .limit-warn{display:flex;gap:9px;align-items:flex-start;background:#FFFBEB;
    border:1px solid #F5CE22;border-radius:10px;padding:10px 12px;
    font-size:.76rem;font-weight:600;color:#7A5F00;line-height:1.55;margin-top:10px}

  /* Limit bar */
  .limit-bar-wrap{margin-top:10px}
  .limit-bar-label{display:flex;justify-content:space-between;
    font-size:.65rem;font-weight:600;color:var(--black-65);margin-bottom:4px}
  .limit-bar-track{height:5px;border-radius:999px;background:var(--black-10);overflow:hidden}
  .limit-bar-fill{height:100%;border-radius:999px;transition:width .3s,background .3s}


  /* Payment method chips (saved) */
  .pm-chip{display:flex;align-items:center;gap:8px;padding:8px 14px;
    border-radius:12px;font-size:.8rem;font-weight:700;cursor:pointer;
    border:2px solid var(--black-10);background:var(--surface);
    color:var(--black-65);transition:all .12s;font-family:var(--font);
    text-align:left;width:100%}
  .pm-chip:hover{border-color:var(--primary);color:var(--primary-dark)}
  .pm-chip.sel{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}
  .pm-chip-type{font-size:.65rem;font-weight:800;text-transform:uppercase;
    letter-spacing:.06em;background:var(--black-5);border-radius:4px;
    padding:2px 6px;color:var(--black-65);flex-shrink:0}
  .pm-chip.sel .pm-chip-type{background:rgba(245,101,34,.15);color:var(--primary-dark)}
  .pm-chip-check{margin-left:auto;font-size:.75rem;flex-shrink:0;
    color:var(--primary-dark);opacity:0;transition:opacity .1s}
  .pm-chip.sel .pm-chip-check{opacity:1}

  /* Empty state */
  .pm-empty{display:flex;flex-direction:column;align-items:center;gap:10px;
    padding:28px 16px;text-align:center;border:2px dashed var(--black-10);
    border-radius:14px;color:var(--black-25)}

  /* Edit PM button */
  .btn-edit-pm{padding:3px 9px;border-radius:6px;border:1.5px solid var(--black-10);
    background:transparent;color:var(--black-65);font-family:var(--font);
    font-size:.68rem;font-weight:700;cursor:pointer;transition:all .12s;
    flex-shrink:0;white-space:nowrap}
  .btn-edit-pm:hover{border-color:var(--primary);color:var(--primary-dark);
    background:var(--primary-mild)}

  /* Currency checkboxes in modal */
  .curr-check-grid{display:flex;flex-wrap:wrap;gap:6px}
  .curr-check-btn{padding:5px 12px;border-radius:7px;font-size:.76rem;font-weight:800;
    cursor:pointer;border:2px solid var(--black-10);background:var(--surface);
    color:var(--black-65);transition:all .12s;letter-spacing:.04em;font-family:var(--font)}
  .curr-check-btn:hover{border-color:var(--primary);color:var(--primary-dark)}
  .curr-check-btn.on{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}

  /* Summary box in modal */
  .modal-summary{background:var(--black-5);border-radius:12px;
    border:1px solid var(--black-10);overflow:hidden}
  .modal-summary-row{display:flex;justify-content:space-between;align-items:center;
    padding:9px 14px;border-bottom:1px solid var(--black-10);font-size:.82rem}
  .modal-summary-row:last-child{border-bottom:none}
  .msk{font-weight:600;color:var(--black-65)}
  .msv{font-weight:800;color:var(--black);text-align:right;max-width:60%;word-break:break-all}

  /* Add button (section header) */
  .btn-add-pm{display:flex;align-items:center;gap:5px;padding:4px 12px;
    border-radius:999px;border:1.5px solid var(--primary);background:var(--primary-mild);
    color:var(--primary-dark);font-family:var(--font);font-size:.76rem;font-weight:800;
    cursor:pointer;margin-left:auto;transition:all .12s;flex-shrink:0}
  .btn-add-pm:hover{background:var(--primary);color:white}

  /* Modal overlay */
  .modal-overlay{position:fixed;inset:0;background:rgba(43,25,17,.45);
    backdrop-filter:blur(3px);z-index:400;display:flex;align-items:center;
    justify-content:center;padding:20px;animation:fadeIn .15s ease}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .modal-card{background:var(--surface);border-radius:20px;width:100%;max-width:460px;
    box-shadow:0 24px 64px rgba(43,25,17,.22);overflow:hidden;
    animation:slideUp .2s cubic-bezier(.16,1,.3,1)}
  @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
  .modal-header{display:flex;align-items:center;justify-content:space-between;
    padding:20px 22px 0}
  .modal-title{font-size:1.05rem;font-weight:800;color:var(--black)}
  .modal-close{width:30px;height:30px;border-radius:50%;border:none;background:var(--black-5);
    cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;
    color:var(--black-65);transition:all .12s;font-family:var(--font)}
  .modal-close:hover{background:var(--black-10);color:var(--black)}
  .modal-body{padding:18px 22px 22px;display:flex;flex-direction:column;gap:14px}
  .modal-select{width:100%;font-family:var(--font);font-size:.9rem;font-weight:600;
    padding:10px 12px;border:2px solid var(--black-10);border-radius:10px;
    background:var(--bg);color:var(--black);outline:none;transition:border-color .15s;
    appearance:none;cursor:pointer}
  .modal-select:focus{border-color:var(--primary)}
  .select-wrap{position:relative}
  .select-wrap::after{content:"▾";position:absolute;right:12px;top:50%;
    transform:translateY(-50%);pointer-events:none;color:var(--black-65);font-size:.8rem}
  .modal-steps{display:flex;gap:6px;margin-bottom:4px}
  .modal-step-dot{height:3px;border-radius:999px;flex:1;transition:background .2s}
  .modal-foot{display:flex;gap:8px;padding:0 22px 22px}
  .modal-btn-back{flex:1;padding:10px;border-radius:999px;border:1.5px solid var(--black-10);
    background:transparent;color:var(--black-65);font-family:var(--font);
    font-size:.88rem;font-weight:700;cursor:pointer;transition:all .12s}
  .modal-btn-back:hover{border-color:var(--black-25);color:var(--black)}
  .modal-btn-next{flex:2;padding:10px;border-radius:999px;background:var(--grad);color:white;
    font-family:var(--font);font-size:.88rem;font-weight:800;border:none;
    cursor:pointer;box-shadow:0 2px 10px rgba(245,101,34,.3);transition:all .12s}
  .modal-btn-next:disabled{background:var(--black-10);color:var(--black-25);
    box-shadow:none;cursor:not-allowed}
  .modal-btn-next:not(:disabled):hover{transform:translateY(-1px);
    box-shadow:0 4px 16px rgba(245,101,34,.4)}

  .prem-slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;
    border-radius:3px;outline:none;cursor:pointer}
  .prem-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;
    border-radius:50%;background:white;border:2.5px solid var(--primary);
    box-shadow:0 2px 8px rgba(245,101,34,.3);cursor:pointer;transition:transform .1s}
  .prem-slider::-webkit-slider-thumb:hover{transform:scale(1.15)}
  .slider-labels{display:flex;justify-content:space-between;font-size:.68rem;
    color:var(--black-65);font-weight:600;margin-top:5px}
  .slider-val{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;
    text-align:center;margin-bottom:6px;transition:color .2s}

  /* Sub-row for slider + type input */
  .prem-row{display:flex;gap:16px;align-items:flex-start}
  .prem-slider-wrap{flex:1;padding-top:4px}
  .prem-input-wrap{width:90px;flex-shrink:0}
  .prem-input{width:100%;font-family:var(--font);font-size:.95rem;font-weight:800;
    padding:10px 10px;border:2px solid var(--black-10);border-radius:10px;
    background:var(--bg);color:var(--black);outline:none;text-align:center;
    transition:border-color .15s}
  .prem-input:focus{border-color:var(--primary)}

  /* Escrow callout */
  .callout{border-radius:12px;padding:12px 14px;
    display:flex;gap:10px;align-items:flex-start;font-size:.78rem;
    font-weight:600;line-height:1.55}
  .callout-orange{background:var(--primary-mild);border:1px solid var(--primary-mild2);
    color:var(--primary-dark)}
  .callout-info{background:var(--black-5);border:1px solid var(--black-10);
    color:var(--black-65)}

  /* Instant match row */
  .check-row{display:flex;align-items:center;gap:10px;cursor:pointer;
    padding:8px 0;user-select:none}
  .check-box{width:20px;height:20px;border-radius:5px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    font-size:.68rem;font-weight:800;color:var(--primary-dark);transition:all .12s}

  /* Nav */
  .oc-nav{display:flex;justify-content:space-between;align-items:center;
    padding-top:24px;margin-top:24px;border-top:1px solid var(--black-5)}
  .btn-back-nav{padding:10px 22px;border-radius:999px;border:1.5px solid var(--black-10);
    background:transparent;color:var(--black-65);font-family:var(--font);
    font-size:.88rem;font-weight:700;cursor:pointer;transition:all .12s}
  .btn-back-nav:hover{border-color:var(--black-25);color:var(--black)}
  .btn-next{padding:10px 28px;border-radius:999px;background:var(--grad);color:white;
    font-family:var(--font);font-size:.88rem;font-weight:800;border:none;
    cursor:pointer;box-shadow:0 2px 12px rgba(245,101,34,.3);
    transition:all .12s;letter-spacing:.01em}
  .btn-next:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}
  .btn-next:disabled{background:var(--black-10);color:var(--black-25);
    box-shadow:none;cursor:not-allowed;transform:none}
  .btn-publish-buy{background:linear-gradient(90deg,#4F910C,#65A519);
    box-shadow:0 2px 12px rgba(101,165,25,.3)}
  .btn-publish-sell{background:linear-gradient(90deg,#B01807,#DF321F);
    box-shadow:0 2px 12px rgba(223,50,31,.3)}

  /* Review */
  .review-card{background:var(--surface);border:1px solid var(--black-10);
    border-radius:14px;padding:16px 20px;max-width:480px;margin-left:auto;margin-right:auto}
  .review-row{display:flex;justify-content:space-between;align-items:center;
    padding:10px 0;border-bottom:1px solid var(--black-5)}
  .review-row:last-child{border-bottom:none}
  .rk{font-size:.78rem;font-weight:600;color:var(--black-65)}
  .rv{font-size:.86rem;font-weight:800;color:var(--black);text-align:right;max-width:60%}

  /* Escrow */
  .escrow-addr{font-family:monospace;font-size:.76rem;background:var(--black-5);
    border:1px solid var(--black-10);border-radius:10px;padding:11px 13px;
    word-break:break-all;color:var(--black-75);line-height:1.6;
    cursor:pointer;transition:background .12s;user-select:all}
  .escrow-addr:hover{background:var(--primary-mild)}
  .escrow-amt{font-size:1.9rem;font-weight:800;letter-spacing:-.03em;
    background:var(--grad);-webkit-background-clip:text;
    -webkit-text-fill-color:transparent;background-clip:text}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes dots{0%{content:''}33%{content:'.'}66%{content:'..'}100%{content:'...'}}
  .wait-dot::after{content:'';animation:dots 1.4s infinite}

  /* Preview panel */
  .preview-panel{background:var(--black-5);padding:28px 22px;
    display:flex;flex-direction:column;gap:16px;
    position:sticky;top:var(--topbar);height:calc(100vh - var(--topbar));overflow-y:auto}
  .preview-label{font-size:.64rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.1em;color:var(--black-65);margin-bottom:4px}
  .prev-card{background:var(--surface);border-radius:14px;
    border:1px solid var(--black-10);padding:14px 16px;
    box-shadow:0 2px 12px rgba(43,25,17,.06)}
  .prev-card.buy-top{border-top:3px solid var(--success)}
  .prev-card.sell-top{border-top:3px solid var(--error)}
  .prev-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
  .prev-avatar{width:32px;height:32px;border-radius:50%;background:var(--grad);
    display:flex;align-items:center;justify-content:center;font-size:.68rem;
    font-weight:800;color:white;position:relative;flex-shrink:0}
  .prev-dot{position:absolute;bottom:0;right:0;width:8px;height:8px;
    border-radius:50%;background:var(--success);border:2px solid var(--surface)}
  .pt{padding:2px 7px;border-radius:999px;font-size:.63rem;font-weight:700;
    border:1.5px solid currentColor}
  .pt-m{color:var(--black-65);border-color:var(--black-10);background:var(--black-5)}
  .pt-c{background:var(--primary-mild);color:var(--primary-dark);
    border-color:transparent;border-radius:4px;letter-spacing:.04em}
  .pt-g{color:var(--success);border-color:var(--success-mild);background:var(--success-bg)}
  .pt-r{color:var(--error);border-color:#FFD1CA;background:var(--error-bg)}
  .pt-n{color:var(--black-65);border-color:var(--black-10);background:var(--black-5)}
  .info-box{background:var(--surface);border-radius:12px;
    border:1px solid var(--black-10);padding:11px 13px}
  .ir{display:flex;justify-content:space-between;padding:6px 0;
    border-bottom:1px solid var(--black-5)}
  .ir:last-child{border-bottom:none}
  .ik{font-size:.7rem;font-weight:600;color:var(--black-65)}
  .iv{font-size:.76rem;font-weight:800;color:var(--black)}
  .placeholder{display:flex;flex-direction:column;align-items:center;gap:8px;
    padding:24px 16px;text-align:center;border:2px dashed var(--black-10);
    border-radius:14px;color:var(--black-25)}

  /* Success */
  @keyframes stepFwd{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @keyframes successPop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
  .success-icon{width:76px;height:76px;border-radius:50%;background:var(--success);
    display:flex;align-items:center;justify-content:center;font-size:2rem;
    color:white;box-shadow:0 8px 32px rgba(101,165,25,.3);
    animation:successPop .5s cubic-bezier(.175,.885,.32,1.275) both}
  .step-anim{animation:stepFwd .22s ease both}

  /* Divider */
  .divider{height:1px;background:var(--black-5);margin:16px 0}

  @media(max-width:900px){
    .layout{grid-template-columns:1fr}
    .preview-panel{display:none}
    .wizard{padding:20px 16px}
  }
  @media(max-width:767px){
    .sidenav{
      width:220px;left:0;
      transform:translateX(-100%);
      transition:transform .25s cubic-bezier(.4,0,.2,1);
      z-index:500;
      align-items:flex-start;
      box-shadow:none;
    }
    .sidenav-collapsed{width:220px}
    .sidenav.sidenav-mobile-open{
      transform:translateX(0);
      box-shadow:6px 0 28px rgba(43,25,17,.16);
    }
    .sidenav-item{
      width:calc(100% - 16px);flex-direction:row;justify-content:flex-start;
      gap:12px;padding:10px 14px;
    }
    .sidenav-collapsed .sidenav-item{width:calc(100% - 16px)}
    .sidenav-label,.sidenav-collapsed .sidenav-label{
      opacity:1!important;max-height:none!important;
      font-size:.8rem;text-transform:none;font-weight:600;letter-spacing:0;
    }
    .sidenav-toggle{display:none}
    .burger-btn{display:flex}
    .topbar-price{display:none}
    .price-pill{display:none}
    .sidenav-price-slot{display:block}
    .layout{margin-left:0!important}
  }
`;

const MOCK_ESCROW = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

// Steps: 0 = Configure, 1 = Review, 2 = Escrow (sell only)
function getSteps(type) {
  return type === "sell" ? ["Configure","Review","Escrow"] : ["Configure","Review"];
}

// ─── LIVE PREVIEW ─────────────────────────────────────────────────────────────
function LivePreview({ type, form, btcPrice, offerMethods, offerCurrencies }) {
  const isBuy = type==="buy";
  const prem  = parseFloat(form.premium)||0;
  const effP  = btcPrice*(1+prem/100);
  const hasAmt  = isBuy?form.amtFixed>0:form.amtFixed>0;
  const hasPay  = offerMethods.length>0;
  const hasPrem = form.premium!=="";
  const empty   = !hasAmt&&!hasPay&&!hasPrem;

  let satStr="—", fiatStr="—";
  if(hasAmt){
    satStr=`${fmt(form.amtFixed)} sats`;
    fiatStr=`≈ €${fmtEur(satsToFiat(form.amtFixed,effP))}`;
  }
  let premCls="pt-n";
  const p=parseFloat(form.premium)||0;
  if(p!==0) premCls=isBuy?(p<0?"pt-g":"pt-r"):(p>0?"pt-g":"pt-r");

  return (
    <div>
      <div className="preview-label">Market preview</div>
      {empty?(
        <div className="placeholder">
          <div style={{fontSize:"1.8rem",opacity:.3}}>🍑</div>
          <div style={{fontSize:".72rem",fontWeight:600}}>Fill in the form to preview<br/>your offer</div>
        </div>
      ):(
        <div className={`prev-card ${isBuy?"buy-top":"sell-top"}`}>
          <div className="prev-top">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div className="prev-avatar">PW<div className="prev-dot"/></div>
              <div>
                <div style={{fontSize:".76rem",fontWeight:700,display:"flex",alignItems:"center",gap:3}}>
                  <span style={{color:"#F7931A"}}>★</span>4.7
                  <span style={{fontSize:".65rem",color:"var(--black-65)",fontWeight:500,marginLeft:2}}>(23)</span>
                </div>
                <div style={{fontSize:".58rem",fontWeight:800,color:"var(--primary-dark)",
                  background:"var(--primary-mild)",borderRadius:999,padding:"1px 6px",
                  marginTop:2,display:"inline-block"}}>Your offer</div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:".9rem",fontWeight:800,color:"var(--black)"}}>{satStr}</div>
              <div style={{fontSize:".68rem",color:"var(--black-65)",fontWeight:500}}>{fiatStr}</div>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:6}}>
            {hasPrem&&<span className={`pt ${premCls}`}>{p===0?"0%":(p>0?"+":"")+p.toFixed(2)+"%"}</span>}
            {offerMethods.slice(0,3).map(m=><span key={m} className="pt pt-m">{m}</span>)}
            {offerCurrencies.slice(0,3).map(c=><span key={c} className="pt pt-c">{c}</span>)}
            {form.instantMatch&&<span style={{
              padding:"2px 7px",borderRadius:999,fontSize:".6rem",fontWeight:800,
              background:"var(--grad)",color:"white",border:"none"}}>⚡ Instant Match</span>}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
            <button style={{padding:"5px 16px",borderRadius:999,border:"none",
              fontFamily:"var(--font)",fontSize:".76rem",fontWeight:800,cursor:"default",
              background:isBuy?"var(--error-bg)":"var(--success-bg)",
              color:isBuy?"var(--error)":"var(--success)"}}>
              {isBuy?"Sell":"Buy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BUY AMOUNT SLIDER (single) ─────────────────────────────────────────────
function BuyAmountSlider({ form, setF, btcPrice }) {
  const maxSats = maxSatsAtPrice(btcPrice);
  const val = form.amtFixed || MIN_SATS;
  const pct = ((val - MIN_SATS) / (maxSats - MIN_SATS)) * 100;

  const snap = (v) => Math.round(v / 1000) * 1000;
  const currentFiat = satsToFiat(val, btcPrice);
  const pctOfLimit  = currentFiat / LIMIT_EUR;
  const nearLimit   = pctOfLimit >= 0.9;

  const pctRiseToLimit = nearLimit
    ? ((LIMIT_EUR / currentFiat) - 1) * 100
    : null;

  const barColor = pctOfLimit < 0.9 ? "var(--success)" : "#E6A000";

  return (
    <>
      {/* Display */}
      <div className="amt-display">
        <span className="amt-display-val">{fmt(val)}</span>
        <span style={{fontSize:".72rem",color:"var(--black-65)",fontWeight:500}}>sats</span>
        <span className="amt-display-fiat">≈ €{fmtEur(currentFiat)}</span>
      </div>

      {/* Slider */}
      <div className="amt-slider-wrap">
        <div className="amt-slider-track"/>
        <div className="amt-slider-fill" style={{left:0,right:`${100-pct}%`}}/>
        <input type="range" className="amt-slider"
          min={MIN_SATS} max={maxSats} step={1000}
          value={val}
          onChange={e=>setF("amtFixed",snap(+e.target.value))}/>
      </div>

      {/* Labels */}
      <div className="amt-labels">
        <span>{fmt(MIN_SATS)} sats</span>
        <span style={{color:"var(--black-25)"}}>≤ 1 000 CHF limit</span>
        <span>{fmt(maxSats)} sats</span>
      </div>

      {/* Limit bar */}
      <div className="limit-bar-wrap">
        <div className="limit-bar-label">
          <span>Daily limit usage</span>
          <span style={{color:pctOfLimit>=0.9?"#7A5F00":"var(--black-65)"}}>
            €{fmtEur(currentFiat)} / €{fmtEur(LIMIT_EUR)}
          </span>
        </div>
        <div className="limit-bar-track">
          <div className="limit-bar-fill" style={{
            width:`${Math.min(pctOfLimit*100,100)}%`,
            background:barColor
          }}/>
        </div>
      </div>

      {/* Near-limit warning */}
      {nearLimit && (
        <div className="limit-warn">
          <span style={{fontSize:"1rem",flexShrink:0}}>⚠️</span>
          <span>
            Careful — this offer will be withdrawn from the market if the Bitcoin price rises by{" "}
            <strong>{pctRiseToLimit.toFixed(1)}%</strong>.
          </span>
        </div>
      )}
    </>
  );
}

// ─── SELL AMOUNT SLIDER (single) ──────────────────────────────────────────────
function SellAmountSlider({ form, setF, btcPrice }) {
  const maxSats = maxSatsAtPrice(btcPrice);
  const val = form.amtFixed || MIN_SATS;
  const pct = ((val - MIN_SATS) / (maxSats - MIN_SATS)) * 100;

  const snap = (v) => Math.round(v / 1000) * 1000;
  const currentFiat = satsToFiat(val, btcPrice);
  const pctOfLimit  = currentFiat / LIMIT_EUR;   // 0–1
  const nearLimit   = pctOfLimit >= 0.9;

  // % BTC would need to rise for fiat value to hit the limit
  const pctRiseToLimit = nearLimit
    ? ((LIMIT_EUR / currentFiat) - 1) * 100
    : null;

  // bar colour — stays green until warning threshold
  const barColor = pctOfLimit < 0.9 ? "var(--success)" : "#E6A000";

  return (
    <>
      {/* Display */}
      <div className="amt-display">
        <span className="amt-display-val">{fmt(val)}</span>
        <span style={{fontSize:".72rem",color:"var(--black-65)",fontWeight:500}}>sats</span>
        <span className="amt-display-fiat">≈ €{fmtEur(currentFiat)}</span>
      </div>

      {/* Slider */}
      <div className="amt-slider-wrap">
        <div className="amt-slider-track"/>
        <div className="amt-slider-fill" style={{left:0,right:`${100-pct}%`}}/>
        <input type="range" className="amt-slider"
          min={MIN_SATS} max={maxSats} step={1000}
          value={val}
          onChange={e=>setF("amtFixed",snap(+e.target.value))}/>
      </div>

      {/* Labels */}
      <div className="amt-labels">
        <span>{fmt(MIN_SATS)} sats</span>
        <span style={{color:"var(--black-25)"}}>≤ 1 000 CHF limit</span>
        <span>{fmt(maxSats)} sats</span>
      </div>

      {/* Limit bar */}
      <div className="limit-bar-wrap">
        <div className="limit-bar-label">
          <span>Daily limit usage</span>
          <span style={{color:pctOfLimit>=0.9?"#7A5F00":"var(--black-65)"}}>
            €{fmtEur(currentFiat)} / €{fmtEur(LIMIT_EUR)}
          </span>
        </div>
        <div className="limit-bar-track">
          <div className="limit-bar-fill" style={{
            width:`${Math.min(pctOfLimit*100,100)}%`,
            background:barColor
          }}/>
        </div>
      </div>

      {/* Near-limit warning */}
      {nearLimit && (
        <div className="limit-warn">
          <span style={{fontSize:"1rem",flexShrink:0}}>⚠️</span>
          <span>
            Careful — this offer will be withdrawn from the market if the Bitcoin price rises by{" "}
            <strong>{pctRiseToLimit.toFixed(1)}%</strong>.
          </span>
        </div>
      )}
    </>
  );
}

// ─── PM MODAL (add + edit) ────────────────────────────────────────────────────
function PMModal({ onSave, onClose, initialData }) {
  const isEdit = !!initialData;

  const [modalStep, setModalStep] = useState(0); // 0=type+currencies, 1=details, 2=summary
  const [selType,   setSelType]   = useState(initialData?.type || "SEPA");
  const [selCurrs,  setSelCurrs]  = useState(initialData?.currencies || ["EUR"]);
  const [details,   setDetails]   = useState(initialData?.details || {});

  function handleTypeChange(t) {
    setSelType(t);
    // Keep only currencies valid for the new type
    const valid = METHOD_CURRENCIES[t] || [];
    setSelCurrs(prev => {
      const kept = prev.filter(c => valid.includes(c));
      return kept.length > 0 ? kept : [valid[0]];
    });
    if(!isEdit) setDetails({});
  }

  function toggleCurr(c) {
    setSelCurrs(prev =>
      prev.includes(c)
        ? prev.length > 1 ? prev.filter(x=>x!==c) : prev  // can't deselect last
        : [...prev, c]
    );
  }

  const fields   = METHOD_FIELDS[selType] || [];
  const step1Ok  = selType && selCurrs.length > 0;
  const step2Ok  = fields.every(f => (details[f.key]||"").trim().length > 0);

  function handleSave() {
    const pm = {
      id:         initialData?.id || `pm_${Date.now()}`,
      type:       selType,
      currencies: selCurrs,
      details:    { ...details },
    };
    onSave(pm);
  }

  function handleBackdrop(e) {
    if(e.target === e.currentTarget) onClose();
  }

  // Summary data for step 2
  const summaryRows = [
    ["Type",       selType],
    ["Currencies", selCurrs.join(", ")],
    ...fields.map(f => [f.label, details[f.key]||"—"]),
  ];

  return (
    <div className="modal-overlay" onClick={handleBackdrop}>
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-title">
            {isEdit ? `Edit ${initialData.type}` :
              modalStep === 0 ? "Add payment method" :
              modalStep === 1 ? `${selType} · details` : "Confirm & save"}
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* 3-dot progress */}
        <div style={{padding:"10px 22px 0"}}>
          <div className="modal-steps">
            {[0,1,2].map(i=>(
              <div key={i} className="modal-step-dot"
                style={{background:modalStep>=i?"var(--primary)":"var(--black-10)"}}/>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {/* ── STEP 0: type + currencies ── */}
          {modalStep===0&&(
            <>
              <div>
                <label className="field-label">Method type</label>
                <div className="select-wrap">
                  <select className="modal-select" value={selType}
                    onChange={e=>handleTypeChange(e.target.value)}>
                    {Object.keys(METHOD_FIELDS).map(t=>(
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label" style={{marginBottom:8}}>
                  Currencies <span style={{fontWeight:500,textTransform:"none",
                    letterSpacing:0,color:"var(--black-25)"}}>— select all that apply</span>
                </label>
                <div className="curr-check-grid">
                  {(METHOD_CURRENCIES[selType]||[]).map(c=>(
                    <button key={c} className={`curr-check-btn${selCurrs.includes(c)?" on":""}`}
                      onClick={()=>toggleCurr(c)}>
                      {selCurrs.includes(c)&&"✓ "}{c}
                    </button>
                  ))}
                </div>
                {selCurrs.length===1&&(
                  <div style={{fontSize:".68rem",color:"var(--black-25)",fontWeight:500,marginTop:6}}>
                    At least one currency required
                  </div>
                )}
              </div>
              <div style={{fontSize:".72rem",color:"var(--black-65)",fontWeight:500,
                lineHeight:1.55,background:"var(--black-5)",borderRadius:8,padding:"8px 10px"}}>
                You'll enter your account details on the next step.
              </div>
            </>
          )}

          {/* ── STEP 1: details ── */}
          {modalStep===1&&(
            <>
              {fields.map(f=>(
                <div key={f.key}>
                  <label className="field-label">{f.label}</label>
                  <input className="field-input" type="text"
                    placeholder={f.placeholder}
                    value={details[f.key]||""}
                    onChange={e=>setDetails(d=>({...d,[f.key]:e.target.value}))}/>
                </div>
              ))}
              <div style={{fontSize:".72rem",color:"var(--black-65)",fontWeight:500,lineHeight:1.55}}>
                🔒 Your payment details are encrypted and only shared with your matched counterparty.
              </div>
            </>
          )}

          {/* ── STEP 2: summary ── */}
          {modalStep===2&&(
            <>
              <div style={{fontSize:".78rem",color:"var(--black-65)",fontWeight:500,
                lineHeight:1.5,marginBottom:2}}>
                Review your PM before saving.
              </div>
              <div className="modal-summary">
                {summaryRows.map(([k,v])=>(
                  <div key={k} className="modal-summary-row">
                    <span className="msk">{k}</span>
                    <span className="msv">{v}</span>
                  </div>
                ))}
              </div>
              <div style={{fontSize:".72rem",color:"var(--black-65)",fontWeight:500,lineHeight:1.55}}>
                🔒 Your payment details are encrypted and only shared with your matched counterparty.
              </div>
            </>
          )}
        </div>

        <div className="modal-foot">
          {modalStep===0&&(
            <>
              <button className="modal-btn-back" onClick={onClose}>Cancel</button>
              <button className="modal-btn-next" disabled={!step1Ok}
                onClick={()=>setModalStep(1)}>Continue →</button>
            </>
          )}
          {modalStep===1&&(
            <>
              <button className="modal-btn-back" onClick={()=>setModalStep(0)}>← Back</button>
              <button className="modal-btn-next" disabled={!step2Ok}
                onClick={()=>setModalStep(2)}>Review →</button>
            </>
          )}
          {modalStep===2&&(
            <>
              <button className="modal-btn-back" onClick={()=>setModalStep(1)}>← Back</button>
              <button className="modal-btn-next" onClick={handleSave}>
                {isEdit?"Save changes":"Save PM"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const IcoBtc = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}>
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M22.2 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.1-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8.9l-.8 3.3c.1 0 .2 0 .3.1-.1 0-.2-.1-.3-.1L11.4 20c-.1.3-.4.7-1 .5 0 0-1.2-.3-1.2-.3l-.8 1.8 2 .5c.4.1.7.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.2 1.4.3l-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.03-3.2-1.5-3.9 1.1-.25 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.6.8 4.1 2.9zm.5-5.3c-.45 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.8.6 3.4 2.5z" fill="white"/>
  </svg>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
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
  const [escrowFunded, setEscrowFunded] = useState(false);
  const [savedMethods, setSavedMethods] = useState(MOCK_SAVED);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPM,    setEditingPM]    = useState(null); // PM object being edited
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const initForm = ()=>({amtFixed:MIN_SATS,
    selectedMethodIds:[],premium:"0",instantMatch:false,noNewUsers:false});
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

  function setF(k,v){ setForm(f=>({...f,[k]:v})); }
  function reset(){
    setStep(0);setDone(false);setEscrowFunded(false);setForm(initForm());
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

  function handleNext(){
    if(step===0){ setStep(1); return; }
    if(step===1){
      if(!isSell){ setDone(true); return; }
      setStep(2); return;
    }
  }
  function handleBack(){ setStep(s=>s-1); }

  const sliderBg=`linear-gradient(to right,var(--primary) 0%,var(--primary) ${((prem+21)/42)*100}%,var(--black-10) ${((prem+21)/42)*100}%,var(--black-10) 100%)`;

  // ── BUY SUCCESS ────────────────────────────────────────────────────────────
  if(done&&!isSell) return (
    <>
      <style>{CSS}</style>
      <header className="topbar">
        <button className="burger-btn" onClick={() => setSidebarMobileOpen(o => !o)}><IconBurger/></button>
        <PeachIcon size={28}/>
        <span className="logo-text">Peach</span>
        <div className="topbar-right">
          <div className="avatar">PW<div className="avatar-badge">2</div></div>
        </div>
      </header>
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
      <header className="topbar">
        <button className="burger-btn" onClick={() => setSidebarMobileOpen(o => !o)}><IconBurger/></button>
        <PeachIcon size={28}/>
        <span className="logo-text">Peach</span>
        <div className="topbar-price">
          <IcoBtc size={18}/>
          <span className="topbar-price-main">{btcPrice.toLocaleString("fr-FR")} {selectedCurrency}</span>
          <span className="topbar-price-sats">{Math.round(SAT/btcPrice).toLocaleString()} sats / {selectedCurrency.toLowerCase()}</span>
          <div className="topbar-cur-select">
            <span className="cur-select-label">{selectedCurrency}</span>
            <svg className="cur-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:"none",flexShrink:0}}><polyline points="1,1 5,5 9,1"/></svg>
            <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="cur-select-inner">
              {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {/* ← THE "CREATING OFFER" BADGE IN THE TOPBAR */}
        <div className={`creating-badge ${isSell?"sell-badge":"buy-badge"}`}>
          <span className="creating-badge-dot"/>
          Creating {isSell?"sell":"buy"} offer
        </div>
        <div className="topbar-right">
          <div className="avatar">PW<div className="avatar-badge">2</div></div>
        </div>
      </header>

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
                {step===0?"Configure your offer":step===1?"Review & publish":"Fund escrow"}
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

                {!isSell?(
                  <BuyAmountSlider form={form} setF={setF} btcPrice={btcPrice}/>
                ):(
                  <SellAmountSlider form={form} setF={setF} btcPrice={btcPrice}/>
                )}
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

                {savedMethods.length === 0 ? (
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
                            style={{flex:1}}
                            onClick={()=>toggleMethod(pm.id)}>
                            <span className="pm-chip-type">{pm.type}</span>
                            <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",
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

                {!isSell&&(
                  <div className="check-row" style={{marginTop:12}}
                    onClick={()=>setF("instantMatch",!form.instantMatch)}>
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

                {/* No new users — visible for both buy and sell; buy: requires Instant Match on */}
                <div className="check-row" style={{
                    marginTop:10,
                    opacity: (!isSell && !form.instantMatch) ? 0.4 : 1,
                    pointerEvents: (!isSell && !form.instantMatch) ? "none" : "auto",
                    cursor: (!isSell && !form.instantMatch) ? "not-allowed" : "pointer",
                  }}
                  onClick={()=>setF("noNewUsers",!form.noNewUsers)}>
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

          {/* ── STEP 1: REVIEW ── */}
          {step===1&&(
            <div className="step-anim">
              <div style={{marginBottom:16,fontSize:".84rem",color:"var(--black-65)",
                fontWeight:500,lineHeight:1.6}}>
                Check everything carefully — amount and payment methods can't be changed after publishing.
                {isSell&&" You'll fund the escrow in the next step."}
              </div>
              <div className="review-card">
                {[
                  ["Type",
                    <span style={{color:isSell?"var(--error)":"var(--success)",fontWeight:800}}>
                      {isSell?"Sell BTC":"Buy BTC"}
                    </span>],
                  ["Amount", isSell
                    ? `${fmt(form.amtFixed)} sats ≈ €${fmtEur(satsToFiat(form.amtFixed,effP))}`
                    : `${fmt(form.amtFixed)} sats ≈ €${fmtEur(satsToFiat(form.amtFixed,effP))}`],
                  ["Premium",
                    <span style={{fontWeight:800,color:prem===0?"var(--black-65)":
                      isSell?(prem>0?"var(--success)":"var(--error)"):(prem<0?"var(--success)":"var(--error)")}}>
                      {prem>0?"+":""}{prem.toFixed(2)}%
                    </span>],
                  ["Effective price", `€${Math.round(effP).toLocaleString()}/BTC`],
                  ["Methods", offerMethods.join(", ")||"—"],
                  ["Currencies", offerCurrencies.join(", ")||"—"],
                  ...(!isSell?[["Instant Match", form.instantMatch?"⚡ Enabled":"Off"]]:[] ),
                  ...(form.noNewUsers?[["No new users", "On"]]:[] ),
                ].map(([k,v])=>(
                  <div key={k} className="review-row">
                    <span className="rk">{k}</span>
                    <span className="rv">{v}</span>
                  </div>
                ))}
              </div>
              {isSell&&(
                <div className="callout callout-orange" style={{marginTop:14}}>
                  <span style={{fontSize:"1rem",flexShrink:0}}>🔒</span>
                  <span>After publishing you'll receive an escrow address. Fund it with exactly <strong>
                    {fmt(form.amtFixed)} sats</strong> to activate your offer.</span>
                </div>
              )}
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
                  <div className="escrow-addr"
                    onClick={()=>{setCopiedAddr(true);setTimeout(()=>setCopiedAddr(false),2000);}}>
                    {MOCK_ESCROW}
                  </div>
                  <div style={{fontSize:".7rem",fontWeight:700,color:"var(--success)",
                    minHeight:18,marginTop:4,marginBottom:20}}>
                    {copiedAddr?"✓ Copied to clipboard":"Click to copy"}
                  </div>
                  <label className="field-label" style={{marginBottom:6}}>Exact amount to send</label>
                  <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:22}}>
                    <span className="escrow-amt">{fmt(form.amtFixed)} sats</span>
                    <span style={{fontSize:".88rem",color:"var(--black-65)",fontWeight:600}}>
                      ≈ €{fmtEur(satsToFiat(form.amtFixed,effP))}
                    </span>
                  </div>
                  <div style={{background:"var(--black-5)",borderRadius:12,
                    border:"1px solid var(--black-10)",padding:"14px 16px",
                    display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
                    <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
                      border:"3px solid var(--black-10)",borderTopColor:"var(--primary)",
                      animation:"spin .9s linear infinite"}}/>
                    <div>
                      <div style={{fontSize:".8rem",fontWeight:700,marginBottom:2}}>
                        Waiting for confirmation<span className="wait-dot"/>
                      </div>
                      <div style={{fontSize:".7rem",color:"var(--black-65)",fontWeight:500}}>
                        Typically 1–3 confirmations (~10–30 min)
                      </div>
                    </div>
                  </div>
                  <button onClick={()=>setEscrowFunded(true)} style={{
                    width:"100%",padding:"10px",borderRadius:999,
                    border:"1.5px solid var(--black-10)",background:"transparent",
                    color:"var(--black-65)",fontFamily:"var(--font)",fontSize:".8rem",
                    fontWeight:700,cursor:"pointer"}}>
                    ⚡ Simulate funding (demo)
                  </button>
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
                  Review offer →
                </button>
              )}
              {step===1&&(
                <button className={`btn-next btn-publish-${type}`} onClick={handleNext}>
                  {isSell?"Publish & get escrow →":"Publish offer →"}
                </button>
              )}
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
                {!isSell&&form.instantMatch&&(
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
    </>
  );
}
