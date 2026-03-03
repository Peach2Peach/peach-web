import { useState, useEffect } from "react";
// ⚠️ react-router-dom removed for Claude.ai preview. Restore import for local dev.
import { useNavigate } from "react-router-dom";

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const PeachIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 352 353" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect y="0.38" width="352" height="352" rx="58.13" fill="#FFF9F6"/>
    <path d="M151.8 45.5c11.2-1.2 21.1 5.35 24.2 16.02.54 1.88.82 3.89.88 5.86.13 4.2.05 8.41.05 12.62 0 .39-.33.69-.72.7-3.07.11-6.08-.02-9.02-1-9.21-3.03-15.33-11.47-15.42-21.35-.04-4-.01-8.01 0-12.01" fill="#05A85A"/>
    <path d="M205.3 64.23c.99 8.75-5.26 16.21-13.69 16.46-4.77.14-9.15-3.93-7.14-8.26.95-2.06 2.42-3.88 4.47-5.44 2.3-1.76 4.93-2.69 7.82-2.74 2.83-.04 5.66 0 8.54 0" fill="#05A85A"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M276 155.69c0 49.73-43.64 96.87-97.47 96.87-19.52 0-37.71-6.2-52.95-16.48v49.48c0 12.29-9.96 22.26-22.26 22.26s-22.26-9.97-22.26-22.26V157.39h.02c-.01-.57-.02-1.13-.02-1.7 0-43.02 32.67-72.02 76.33-68.64 14.01 1.09 28.26 1.09 42.27 0 43.67-3.39 76.34 25.62 76.34 68.64zM125.61 163.8v-.39c.1-24.1 19.36-39.92 44.44-36.17 5.13.77 10.37.77 15.49 0 25.15-3.77 44.44 12.15 44.44 36.35 0 26.64-23.36 51.89-52.19 51.89-28.75 0-52.07-25.13-52.18-51.68z" fill="url(#pg)"/>
    <defs>
      <radialGradient id="pg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(276 88) rotate(159) scale(220 130)">
        <stop stopColor="#FFA24C"/>
        <stop offset=".5" stopColor="#FF7A50"/>
        <stop offset="1" stopColor="#FF4D42"/>
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


const IcoBtc = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}>
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M22.2 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.1-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8.9l-.8 3.3c.1 0 .2 0 .3.1-.1 0-.2-.1-.3-.1L11.4 20c-.1.3-.4.7-1 .5 0 0-1.2-.3-1.2-.3l-.8 1.8 2 .5c.4.1.7.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.2 1.4.3l-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.03-3.2-1.5-3.9 1.1-.25 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.6.8 4.1 2.9zm.5-5.3c-.45 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.8.6 3.4 2.5z" fill="white"/>
  </svg>
);
// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const BTC_PRICE = 87432;


const MOCK_STATS = {
  dailyVolume:    { sats: 4_280_000, eur: 3741 },
  dailyTrades:    14,
  activeOffers:   { buy: 6, sell: 8 },
  avgPremiumBuy:  -0.32,
  avgPremiumSell: 0.18,
  topMethods:     [
    { name:"SEPA",    volume:62, count:9  },
    { name:"Revolut", volume:21, count:4  },
    { name:"Wise",    volume:11, count:3  },
    { name:"PayPal",  volume:6,  count:2  },
  ],
  topCurrencies:  [
    { name:"EUR", volume:68, count:12 },
    { name:"CHF", volume:18, count:4  },
    { name:"GBP", volume:14, count:2  },
  ],
};

const MOCK_USER = {
  peachId:          "PEACH08476D23",
  memberSince:      "March 2023",
  trades:           23,
  disputesTotal:    0,
  rating:           4.7,
  badges:           ["fast"],
  preferredMethods: ["SEPA", "Wise"],
  preferredCurrencies: ["EUR", "CHF"],
  totalVolumeBtc:   1.24,
  lastTradeDaysAgo: 3,
  blockedByCount:   0,
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatSats(n) {
  if (n >= 1_000_000) return (n/1_000_000).toFixed(2)+"M";
  if (n >= 1_000)     return (n/1_000).toFixed(0)+"k";
  return n.toString();
}
function fmtPct(v, showPlus = true) {
  const n = parseFloat(v);
  const plus = showPlus && n > 0 ? "+" : "";
  return `${plus}${n.toFixed(2)}%`;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --primary:#F56522;--primary-dark:#C45104;
    --primary-bg:#FFF9F6;--primary-mild:#FEEDE5;
    --grad:linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C);
    --success:#65A519;--success-bg:#F2F9E7;
    --error:#DF321F;--error-bg:#FFF0EE;
    --black:#2B1911;--black-75:#624D44;--black-65:#7D675E;
    --black-25:#C4B5AE;--black-10:#EAE3DF;--black-5:#F4EEEB;
    --surface:#FFFFFF;--font:'Baloo 2',cursive;--topbar:56px;
    --btc:#F7931A;
  }
  html{font-size:120%}
  body{font-family:var(--font);background:var(--primary-bg);color:var(--black)}
  .app{display:flex;flex-direction:column;min-height:100vh}

  /* ── TOPBAR ── */
  .topbar{position:fixed;top:0;left:0;right:0;height:var(--topbar);background:var(--surface);
    border-bottom:1px solid var(--black-10);display:flex;align-items:center;
    padding:0 20px;gap:12px;z-index:200}
  .logo-wordmark{font-size:1.22rem;font-weight:800;letter-spacing:-0.02em;
    background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  /* ── PRICE PILL (gradient) ── */
  .topbar-price{
    display:flex;align-items:center;gap:8px;
    background:linear-gradient(90deg,#FFBFA8,#FFD5BF);border-radius:999px;
    padding:5px 6px 5px 10px;
    font-size:0.78rem;font-weight:600;color:var(--black);
    flex-shrink:0;
  }
  .topbar-price-main{font-weight:800;color:var(--black);white-space:nowrap}
  .topbar-price-sats{font-weight:500;color:var(--black-65);white-space:nowrap}
  .topbar-cur-select{
    position:relative;display:flex;align-items:center;gap:4px;
    background:rgba(255,255,255,0.45);border-radius:999px;
    padding:2px 9px;cursor:pointer;
  }
  .cur-select-inner{
    position:absolute;inset:0;opacity:0;cursor:pointer;
    font-size:.78rem;width:100%;
  }
  .cur-select-arrow{display:flex;align-items:center;pointer-events:none;color:var(--black-65);flex-shrink:0}
  .cur-select-label{font-size:.76rem;font-weight:800;color:var(--black);pointer-events:none}
  .topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
  .avatar-peachid{display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 10px;border-radius:999px;transition:background .14s}
  .avatar-peachid:hover{background:var(--black-5)}
  .sidenav-price-slot{display:none;margin-top:auto;padding:12px 8px 8px;width:100%;border-top:1px solid var(--black-10)}
  .mobile-price-pill{display:flex;align-items:center;gap:8px;background:linear-gradient(90deg,#FFBFA8,#FFD5BF);border-radius:12px;padding:10px 10px 10px 12px;}
  .mobile-price-text{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0}
  .mobile-price-main{font-size:.82rem;font-weight:800;color:var(--black);white-space:nowrap}
  .mobile-price-sats{font-size:.68rem;font-weight:500;color:var(--black-65);white-space:nowrap}
  .mobile-cur-select{flex-shrink:0}
  .avatar{width:34px;height:34px;border-radius:50%;background:var(--grad);display:flex;
    align-items:center;justify-content:center;font-size:.72rem;font-weight:800;color:white;
    cursor:pointer;position:relative;flex-shrink:0}
  .avatar-badge{position:absolute;top:-3px;right:-3px;background:var(--error);color:white;
    font-size:.55rem;font-weight:800;width:14px;height:14px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;border:2px solid var(--surface)}
  .peach-id{font-size:.72rem;font-weight:800;letter-spacing:.06em;color:var(--black-75);font-family:var(--font);white-space:nowrap}

  /* ── SIDENAV ── */
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
    transition:opacity .15s,max-height .2s;
    max-height:20px;opacity:1;
  }
  .sidenav-collapsed .sidenav-label{opacity:0;max-height:0;pointer-events:none}
  .sidenav-backdrop{
    display:none;position:fixed;inset:0;z-index:149;
    background:rgba(43,25,17,.4);animation:fadeIn .2s ease;
  }
  .sidenav-backdrop.open{display:block}
  .burger-btn{
    display:none;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:8px;border:none;
    background:transparent;cursor:pointer;color:var(--black-65);
    flex-shrink:0;transition:background .14s;
  }
  .burger-btn:hover{background:var(--black-5)}

  /* ── PAGE LAYOUT ── */
  .page-wrap{display:flex;flex-direction:column;flex:1}
  .content{padding:28px 28px 60px;display:flex;flex-direction:column;gap:28px;max-width:1200px;margin:0 auto;width:100%}

  /* ── WELCOME HEADER ── */
  .welcome-row{display:flex;align-items:center;gap:14px}
  .welcome-avatar{width:44px;height:44px;border-radius:50%;background:var(--grad);
    display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:800;
    color:white;flex-shrink:0}
  .welcome-text h1{font-size:1.35rem;font-weight:800;color:var(--black);line-height:1.2}
  .welcome-text p{font-size:.82rem;font-weight:500;color:var(--black-65);margin-top:2px}
  .welcome-actions{margin-left:auto;display:flex;gap:10px}

  /* ── GRID ── */
  .dashboard-grid{display:grid;grid-template-columns:auto auto;gap:18px;justify-content:start}
  .span-2{flex:0 0 auto}
  .span-4{flex:0 0 auto}

  /* ── CARD ── */
  .card{background:var(--surface);border-radius:16px;border:1px solid var(--black-10);
    padding:20px;display:inline-flex;flex-direction:column;gap:14px;width:fit-content;max-width:100%}
  .card-header{display:flex;align-items:center;justify-content:space-between}
  .card-title{font-size:1.15rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--black-65)}
  .card-link{font-size:.75rem;font-weight:700;color:var(--primary);cursor:pointer;text-decoration:none}
  .card-link:hover{color:var(--primary-dark)}

  /* ── STAT CARDS ── */
  .stat-big{font-size:2rem;font-weight:800;color:var(--black);line-height:1;letter-spacing:-.02em}
  .stat-sub{font-size:.78rem;font-weight:500;color:var(--black-65);margin-top:4px}
  .stat-change{display:inline-flex;align-items:center;gap:3px;font-size:.72rem;font-weight:700;
    padding:2px 8px;border-radius:999px;margin-top:8px}
  .stat-change.pos{background:var(--success-bg);color:var(--success)}
  .stat-change.neg{background:var(--error-bg);color:var(--error)}
  .stat-change.neu{background:var(--black-5);color:var(--black-65)}
  .stat-icon{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;
    justify-content:center;font-size:1.1rem;flex-shrink:0}

  /* ── OFFER BOOK ── */
  .offerbook-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .ob-col-title{display:flex;align-items:center;gap:6px;font-size:.78rem;font-weight:800;
    padding-bottom:8px;border-bottom:2px solid;margin-bottom:2px}
  .ob-buy-title{color:var(--success);border-color:var(--success)}
  .ob-sell-title{color:var(--error);border-color:var(--error)}
  .ob-dot-buy{width:8px;height:8px;border-radius:50%;background:var(--success);flex-shrink:0}
  .ob-dot-sell{width:8px;height:8px;border-radius:50%;background:var(--error);flex-shrink:0}
  .ob-count{margin-left:auto;font-size:.67rem;font-weight:600;color:var(--black-65)}

  .ob-row{display:flex;align-items:center;gap:10px;padding:8px 0;
    border-bottom:1px solid var(--black-5);cursor:pointer;transition:background .1s;
    border-radius:6px;padding:7px 8px;margin:0 -8px}
  .ob-row:hover{background:var(--black-5)}
  .ob-row:last-child{border-bottom:none}
  .ob-avatar{width:28px;height:28px;border-radius:50%;background:var(--grad);
    display:flex;align-items:center;justify-content:center;font-size:.58rem;
    font-weight:800;color:white;flex-shrink:0;position:relative}
  .ob-avatar .online-dot{position:absolute;bottom:0;right:0;width:7px;height:7px;
    border-radius:50%;background:var(--success);border:1.5px solid var(--surface)}
  .ob-info{flex:1;min-width:0}
  .ob-amount{font-size:.85rem;font-weight:800;color:var(--black);line-height:1.2}
  .ob-fiat{font-size:.68rem;font-weight:500;color:var(--black-65)}
  .ob-methods{display:flex;gap:3px;flex-wrap:wrap;margin-top:2px}
  .ob-method{font-size:.6rem;font-weight:600;padding:1px 5px;border-radius:999px;
    background:var(--black-5);color:var(--black-65);border:1px solid var(--black-10)}
  .ob-prem{font-size:.82rem;font-weight:800;white-space:nowrap}
  .ob-prem.pos{color:var(--error)}   /* buy perspective: positive = bad */
  .ob-prem.neg{color:var(--success)} /* buy perspective: negative = good */
  .ob-prem-sell.pos{color:var(--success)} /* sell perspective: positive = good */
  .ob-prem-sell.neg{color:var(--error)}   /* sell perspective: negative = bad */
  .ob-prem-sell{font-size:.82rem;font-weight:800;white-space:nowrap}
  .ob-filter-sel{
    appearance:none;border:1.5px solid var(--black-10);border-radius:8px;
    padding:4px 24px 4px 9px;font-family:var(--font);font-size:.72rem;font-weight:600;
    color:var(--black);background:var(--surface);cursor:pointer;outline:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237D675E'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 7px center;
    transition:border-color .14s
  }
  .ob-filter-sel:focus{border-color:var(--primary)}
  .ob-auto{display:inline-flex;align-items:center;gap:2px;font-size:.58rem;font-weight:800;
    padding:1px 5px;border-radius:999px;background:var(--grad);color:white;white-space:nowrap}

  /* ── PAYMENT METHODS BAR ── */
  .methods-list{display:flex;flex-direction:column;gap:8px}
  .method-row{display:flex;align-items:center;gap:10px}
  .method-name{font-size:.82rem;font-weight:700;color:var(--black);min-width:68px}
  .method-bar-wrap{flex:1;height:8px;background:var(--black-5);border-radius:999px;overflow:hidden}
  .method-bar{height:100%;border-radius:999px;background:var(--grad)}
  .method-pct{font-size:.72rem;font-weight:600;color:var(--black-65);min-width:30px;text-align:right}
  .method-count{font-size:.68rem;font-weight:500;color:var(--black-25);min-width:40px;text-align:right}

  /* ── PROFILE CARD ── */
  .profile-top{display:flex;align-items:center;gap:14px}
  .profile-avatar{width:52px;height:52px;border-radius:50%;background:var(--grad);
    display:flex;align-items:center;justify-content:center;font-size:.95rem;
    font-weight:800;color:white;flex-shrink:0}
  .profile-name{font-size:1rem;font-weight:800;color:var(--black);letter-spacing:.04em}
  .profile-since{font-size:.72rem;font-weight:500;color:var(--black-65);margin-top:2px}
  .profile-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .profile-stat{background:var(--black-5);border-radius:10px;padding:10px;text-align:center}
  .profile-stat-val{font-size:1.2rem;font-weight:800;color:var(--black);line-height:1}
  .profile-stat-lbl{font-size:.62rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--black-65);margin-top:3px}
  .profile-row{display:flex;flex-direction:column;gap:5px}
  .profile-row-label{font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--black-25)}
  .profile-badges{display:flex;gap:5px;flex-wrap:wrap}
  .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;
    font-size:.65rem;font-weight:700;white-space:nowrap}
  .badge-super{background:linear-gradient(90deg,#FF4D42,#FFA24C);color:white}
  .badge-fast{background:var(--primary-mild);color:var(--primary-dark)}
  .profile-methods{display:flex;gap:5px;flex-wrap:wrap}
  .pref-chip{padding:3px 9px;border-radius:999px;font-size:.72rem;font-weight:600;
    background:var(--black-5);color:var(--black-75);border:1px solid var(--black-10)}
  .disputes-none{display:flex;align-items:center;gap:5px;font-size:.78rem;font-weight:600;color:var(--success)}
  .disputes-val{font-size:.78rem;font-weight:700;color:var(--error)}

  /* ── QUICK ACTIONS ── */
  .action-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .action-card{background:var(--surface);border-radius:14px;border:1px solid var(--black-10);
    padding:18px 16px;display:flex;flex-direction:column;align-items:flex-start;gap:10px;
    cursor:pointer;transition:all .15s}
  .action-card:hover{border-color:var(--primary);box-shadow:0 4px 18px rgba(245,101,34,.14);
    transform:translateY(-2px)}
  .action-card-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;
    justify-content:center;flex-shrink:0}
  .action-card-icon.green{background:var(--success-bg);color:var(--success)}
  .action-card-icon.orange{background:var(--primary-mild);color:var(--primary)}
  .action-card-icon.blue{background:#E8F4FA;color:#037DB5}
  .action-card h3{font-size:.9rem;font-weight:800;color:var(--black);line-height:1.2}
  .action-card p{font-size:.75rem;font-weight:500;color:var(--black-65);line-height:1.4}

  /* ── BUTTONS ── */
  .btn-grad{padding:8px 22px;border-radius:999px;background:var(--grad);color:white;
    font-family:var(--font);font-size:.85rem;font-weight:800;border:none;cursor:pointer;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .1s,box-shadow .1s;white-space:nowrap}
  .btn-grad:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}
  .btn-ghost{padding:8px 18px;border-radius:999px;background:var(--surface);color:var(--black);
    font-family:var(--font);font-size:.85rem;font-weight:700;
    border:1.5px solid var(--black-10);cursor:pointer;transition:border-color .14s,color .14s;white-space:nowrap}
  .btn-ghost:hover{border-color:var(--primary);color:var(--primary-dark)}

  /* ── DIVIDER ── */
  .divider{height:1px;background:var(--black-5)}

  /* ── ANIMATIONS ── */
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .content > *{animation:slideUp .22s ease both}
  .content > *:nth-child(1){animation-delay:.03s}
  .content > *:nth-child(2){animation-delay:.07s}
  .content > *:nth-child(3){animation-delay:.11s}
  .content > *:nth-child(4){animation-delay:.15s}
  .content > *:nth-child(5){animation-delay:.19s}

  /* ── RESPONSIVE ── */
  @media(max-width:767px){
    .burger-btn{display:flex}
    .topbar-price{display:none}
    .sidenav-price-slot{display:block}
    .sidenav{
      width:220px;transform:translateX(-100%);
      transition:transform .25s cubic-bezier(.4,0,.2,1);
      z-index:500;align-items:flex-start;box-shadow:none;
    }
    .sidenav-collapsed{width:220px}
    .sidenav.sidenav-mobile-open{transform:translateX(0);box-shadow:6px 0 28px rgba(43,25,17,.16)}
    .sidenav-item{width:calc(100% - 16px);flex-direction:row;justify-content:flex-start;gap:12px;padding:10px 14px}
    .sidenav-collapsed .sidenav-item{width:calc(100% - 16px)}
    .sidenav-label,.sidenav-collapsed .sidenav-label{opacity:1!important;max-height:none!important;font-size:.8rem;text-transform:none;font-weight:600;letter-spacing:0}
    .sidenav-toggle{display:none}
    .sidenav-backdrop.open{display:block}
    .dashboard-grid{grid-template-columns:1fr}
    .dashboard-grid .card{width:100%!important;max-width:100%!important}
    .offerbook-cols{grid-template-columns:1fr}
    .action-cards{grid-template-columns:1fr}
    .welcome-actions{display:none}
    .content{padding:18px 14px 48px;max-width:100%}
    .profile-stats{grid-template-columns:repeat(3,1fr)}
    .card{width:100%!important;max-width:100%!important;min-width:0!important}
    .cards-row{flex-direction:column!important}
  }
`;

// ─── OFFER BOOK ROWS ──────────────────────────────────────────────────────────
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PeachHome() {
  const navigate = useNavigate();
  const [allPrices,           setAllPrices]           = useState({ EUR: BTC_PRICE });
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? BTC_PRICE);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const satsPerCur  = Math.round(100_000_000 / btcPrice);

  const navWidth = isMobile ? 0 : (sidebarCollapsed ? 44 : 68);

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* ── TOPBAR ── */}
        <header className="topbar">
          <button className="burger-btn" onClick={() => setSidebarMobileOpen(o => !o)}><IconBurger/></button>
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
            <div className="avatar-peachid">
              <span className="peach-id">{MOCK_USER.peachId}</span>
              <div className="avatar">PW<div className="avatar-badge">2</div></div>
            </div>
          </div>
        </header>

        <SideNav
          active="home"
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

        <div className="page-wrap" style={{ marginTop:"var(--topbar)", marginLeft: navWidth, flex:1 }}>
          <div className="content">

            {/* ── WELCOME ROW ── */}
            <div className="welcome-row">
              <div className="welcome-avatar">PW</div>
              <div className="welcome-text">
                <h1>Welcome back 👋</h1>
                <p>{MOCK_USER.peachId} · {MOCK_USER.trades} trades completed</p>
              </div>
              <div className="welcome-actions">
                <button className="btn-ghost" onClick={() => navigate("/trades")}>View Trades</button>
                <button className="btn-grad" onClick={() => navigate("/offer/new")}>+ Create Offer</button>
              </div>
            </div>

            {/* ── ATTENTION ALERT ── */}
            <div style={{background:"#FEFCE5",border:"1.5px solid #F5CE22",borderRadius:12,
              padding:"12px 18px",display:"inline-flex",alignItems:"center",gap:12,width:"fit-content"}}>
              <span style={{fontSize:"1.1rem"}}>⚠️</span>
              <span style={{fontSize:".88rem",fontWeight:700,color:"#2B1911"}}>
                3 trades need your attention
              </span>
              <span style={{fontSize:".78rem",fontWeight:700,color:"var(--primary)",cursor:"pointer",paddingLeft:42}} onClick={() => navigate("/trades")}>View →</span>
            </div>

            {/* ── NEWS CARD ── */}
            <div className="card" style={{width:"100%",marginBottom:4}}>
              <div className="card-header">
                <span className="card-title">Latest from Peach</span>
                <span className="card-link" style={{color:"var(--black-25)",cursor:"default"}} title="Coming soon">See all →</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {[
                  { date:"26 Feb 2026", headline:"Peach now supports Strike payments across all EU markets" },
                  { date:"18 Feb 2026", headline:"New trading limits: anonymous trades up to €1 000/month" },
                  { date:"05 Feb 2026", headline:"Web app beta is live — trade from any browser, no install needed" },
                ].map((item, i, arr) => (
                  <div key={i} style={{
                    display:"flex",alignItems:"center",gap:16,
                    padding:"11px 0",
                    borderBottom: i < arr.length-1 ? "1px solid #F4EEEB" : "none",
                  }}>
                    <span style={{fontSize:".7rem",fontWeight:600,color:"#C4B5AE",whiteSpace:"nowrap",minWidth:80}}>{item.date}</span>
                    <span style={{fontSize:".85rem",fontWeight:600,color:"#2B1911",flex:1}}>{item.headline}</span>
                    <span style={{fontSize:".78rem",fontWeight:700,color:"#C4B5AE",whiteSpace:"nowrap",paddingLeft:42}} title="Coming soon">Read →</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PROFILE + PEACH STATS ROW ── */}
            <div className="cards-row" style={{display:"flex",gap:18,alignItems:"flex-start",flexWrap:"wrap"}}>

              {/* Profile Card — left */}
              <div className="card" style={{flexShrink:0,minWidth:260}}>
                <div className="card-header">
                  <span className="card-title">My Profile</span>
                  <span className="card-link" onClick={() => navigate("/settings")}>Edit →</span>
                </div>

                {/* Avatar + name */}
                <div className="profile-top">
                  <div className="profile-avatar">PW</div>
                  <div>
                    <div className="profile-name">{MOCK_USER.peachId}</div>
                    <div className="profile-since">Member since {MOCK_USER.memberSince}</div>
                  </div>
                </div>

                {/* Badges */}
                <div className="profile-row">
                  <span className="profile-row-label">Badges</span>
                  <div className="profile-badges">
                    {MOCK_USER.badges.includes("supertrader") && <span className="badge badge-super">🏆 Supertrader</span>}
                    {MOCK_USER.badges.includes("fast") && <span className="badge badge-fast">⚡ Fast</span>}
                    {MOCK_USER.badges.length === 0 && <span style={{fontSize:".78rem",color:"var(--black-65)"}}>No badges yet</span>}
                  </div>
                </div>

                {/* Row 1: Rating · Disputes · Blocked by */}
                <div className="profile-stats">
                  <div className="profile-stat">
                    <div className="profile-stat-val">⭐ {MOCK_USER.rating}</div>
                    <div className="profile-stat-lbl">Rating</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-val" style={{color: MOCK_USER.disputesTotal > 0 ? "var(--error)" : "var(--success)"}}>
                      {MOCK_USER.disputesTotal}
                    </div>
                    <div className="profile-stat-lbl">Disputes</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-val" style={{color: MOCK_USER.blockedByCount > 0 ? "var(--error)" : "var(--black-65)"}}>
                      {MOCK_USER.blockedByCount}
                    </div>
                    <div className="profile-stat-lbl">Blocked by</div>
                  </div>
                </div>

                {/* Row 2: Trades · Total Volume · Last Trade */}
                <div className="profile-stats">
                  <div className="profile-stat">
                    <div className="profile-stat-val">{MOCK_USER.trades}</div>
                    <div className="profile-stat-lbl">Trades</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-val">{MOCK_USER.totalVolumeBtc} BTC</div>
                    <div className="profile-stat-lbl">Total Volume</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-val">{MOCK_USER.lastTradeDaysAgo}d ago</div>
                    <div className="profile-stat-lbl">Last Trade</div>
                  </div>
                </div>
              </div>

              {/* Right column: PM+Currencies side by side, then Peach Stats */}
              <div style={{display:"flex",flexDirection:"column",gap:18,flex:"1 1 0",minWidth:0}}>
              <div className="cards-row" style={{display:"flex",gap:18,flexWrap:"wrap"}}>
                <div className="card" style={{flex:"1 1 280px",minWidth:260,width:"auto"}}>
                  <div className="card-header">
                    <span className="card-title">Top Payment Methods</span>
                    <span className="card-link" onClick={() => navigate("/payment-methods")}>See all →</span>
                  </div>
                  <div className="methods-list">
                    {MOCK_STATS.topMethods.map(m => (
                      <div key={m.name} className="method-row">
                        <span className="method-name">{m.name}</span>
                        <div className="method-bar-wrap">
                          <div className="method-bar" style={{width:`${m.volume}%`}}/>
                        </div>
                        <span className="method-pct">{m.volume}%</span>
                        <span className="method-count">{m.count} offers</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{flex:"1 1 220px",minWidth:200,width:"auto"}}>
                  <div className="card-header">
                    <span className="card-title">Top Currencies</span>
                  </div>
                  <div className="methods-list">
                    {MOCK_STATS.topCurrencies.map(c => (
                      <div key={c.name} className="method-row">
                        <span className="method-name">{c.name}</span>
                        <div className="method-bar-wrap">
                          <div className="method-bar" style={{width:`${c.volume}%`,background:"linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)"}}/>
                        </div>
                        <span className="method-pct">{c.volume}%</span>
                        <span className="method-count">{c.count} offers</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Peach Stats — 24h Volume, Trades Today, Active Offers */}
              <div className="card" style={{width:"100%"}}>
                <div className="card-header">
                  <span className="card-title">Peach Stats</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>

                  {/* 24h Volume */}
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <span style={{fontSize:".72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"var(--black-65)"}}>24h Volume</span>
                    <div className="stat-big">{formatSats(MOCK_STATS.dailyVolume.sats)} <span style={{fontSize:".6em",fontWeight:600,color:"#C4B5AE"}}>sats</span></div>
                    <div className="stat-sub">≈ €{MOCK_STATS.dailyVolume.eur.toLocaleString()} · today</div>
                    <span className="stat-change pos">↑ +12% vs yesterday</span>
                  </div>

                  {/* Trades Today */}
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <span style={{fontSize:".72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"var(--black-65)"}}>Trades Today</span>
                    <div className="stat-big">{MOCK_STATS.dailyTrades}</div>
                    <div className="stat-sub">completed trades · today</div>
                    <span className="stat-change neu">→ Same as yesterday</span>
                  </div>

                  {/* Active Offers */}
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <span style={{fontSize:".72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"var(--black-65)"}}>Active Offers</span>
                    <div className="stat-big">{MOCK_STATS.activeOffers.buy + MOCK_STATS.activeOffers.sell}</div>
                    <div className="stat-sub">
                      <span style={{color:"var(--success)",fontWeight:700}}>{MOCK_STATS.activeOffers.buy} buy</span>
                      {" · "}
                      <span style={{color:"var(--error)",fontWeight:700}}>{MOCK_STATS.activeOffers.sell} sell</span>
                    </div>
                    <div style={{display:"flex",gap:6,marginTop:2}}>
                      <span className="stat-change neg">Buy avg {fmtPct(MOCK_STATS.avgPremiumBuy)}</span>
                      <span className="stat-change pos">Sell avg {fmtPct(MOCK_STATS.avgPremiumSell)}</span>
                    </div>
                  </div>

                </div>
              </div>

              </div>{/* end right column */}

            </div>{/* end outer flex */}
          </div>
        </div>
      </div>
    </>
  );
}
