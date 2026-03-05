import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SideNav, getTopbarPeachId, PeachIcon, IconBurger } from "../components/Sidebar.jsx";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_OFFERS = [
  { id:"a_me", type:"ask", amount:73000, premium:0.8, methods:["SEPA","Wise"], currencies:["EUR","CHF"], rep:4.7, trades:23, badges:["fast"], auto:false, online:true, isOwn:true },
  { id:"b_me", type:"bid", amount:120000,  premium:-0.5, methods:["SEPA"],           currencies:["EUR"],       rep:4.7, trades:23,  badges:["fast"],               auto:false, online:true, isOwn:true },
  { id:"a1", type:"ask", amount:85000,   premium:-1.2, methods:["SEPA","Revolut"], currencies:["EUR","CHF"], rep:4.9, trades:312, badges:["supertrader","fast"], auto:true,  online:true  },
  { id:"a2", type:"ask", amount:42000,   premium:0.5,  methods:["SEPA"],           currencies:["EUR"],       rep:4.7, trades:88,  badges:["fast"],              auto:false, online:true,  requested:true },
  { id:"a3", type:"ask", amount:250000,  premium:1.0,  methods:["SEPA","PayPal"],  currencies:["EUR","GBP"], rep:5.0, trades:541, badges:["supertrader"],       auto:false, online:false },
  { id:"a4", type:"ask", amount:18000,   premium:2.1,  methods:["Revolut"],        currencies:["EUR"],       rep:4.3, trades:21,  badges:[],                    auto:false, online:true  },
  { id:"a5", type:"ask", amount:55000,   premium:-0.5, methods:["SEPA","Wise"],    currencies:["EUR","CHF"], rep:4.8, trades:156, badges:["fast"],              auto:true,  online:true  },
  { id:"a6", type:"ask", amount:120000,  premium:1.8,  methods:["PayPal"],         currencies:["EUR"],       rep:4.6, trades:67,  badges:[],                    auto:false, online:true  },
  { id:"a7", type:"ask", amount:9000,    premium:3.2,  methods:["Revolut","SEPA"], currencies:["EUR","CHF","GBP"], rep:3.9, trades:9, badges:[],               auto:false, online:false },
  { id:"b1", type:"bid", amount:80000,   premium:-2.0, methods:["SEPA"],           currencies:["EUR"],       rep:4.5, trades:44,  badges:["fast"],              auto:true,  online:true  },
  { id:"b2", type:"bid", amount:30000,   premium:-0.8, methods:["SEPA","Revolut"], currencies:["EUR","CHF"], rep:4.9, trades:201, badges:["supertrader"],       auto:false, online:true  },
  { id:"b3", type:"bid", amount:150000,  premium:0.3,  methods:["PayPal"],         currencies:["EUR"],       rep:4.2, trades:33,  badges:[],                    auto:false, online:true  },
  { id:"b4", type:"bid", amount:60000,   premium:-1.5, methods:["Wise","SEPA"],    currencies:["EUR","GBP"], rep:4.7, trades:119, badges:["fast"],              auto:false, online:false, requested:true },
  { id:"b5", type:"bid", amount:300000,  premium:1.2,  methods:["SEPA"],           currencies:["EUR","CHF"], rep:5.0, trades:489, badges:["supertrader","fast"],auto:true,  online:true  },
];

// Mock user's saved payment methods (would come from GET /user/me/paymentMethods)
const USER_PMS = [
  { id:"pm1", type:"SEPA",    currencies:["EUR","CHF"], details:{ holder:"Peter Weber", iban:"DE89370400440532013000" }},
  { id:"pm2", type:"Revolut", currencies:["EUR","GBP"], details:{ username:"@peterweber" }},
];

const BTC_PRICE      = 87432;
const ALL_CURRENCIES = ["EUR","CHF","GBP"];
const ALL_METHODS    = [...new Set(MOCK_OFFERS.flatMap(o => o.methods))].sort();

// ─── BTC AMOUNT DISPLAY ──────────────────────────────────────────────────────
const IcoBtc = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}>
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M22.2 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.1-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8.9l-.8 3.3c.1 0 .2 0 .3.1-.1 0-.2-.1-.3-.1L11.4 20c-.1.3-.4.7-1 .5 0 0-1.2-.3-1.2-.3l-.8 1.8 2 .5c.4.1.7.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.2 1.4.3l-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.03-3.2-1.5-3.9 1.1-.25 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.6.8 4.1 2.9zm.5-5.3c-.45 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.8.6 3.4 2.5z" fill="white"/>
  </svg>
);

function SatsAmount({ sats }) {
  const satsStr = sats.toLocaleString("fr-FR");

  // ≥ 1 BTC — show full BTC amount
  if (sats >= 100_000_000) {
    const btc = (sats / 100_000_000).toFixed(2).replace(".", ",");
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
        <IcoBtc size={15}/>
        <span style={{ color:"var(--black)", fontWeight:800, fontSize:".9rem" }}>{btc} BTC</span>
      </span>
    );
  }

  // < 1 BTC — grey leading zeros + black sats
  const digits       = sats.toString().length;          // e.g. 85000 → 5
  const leadingZeros = 8 - digits;                      // e.g. 8-5 = 3
  const greyPart     = "0," + "0".repeat(leadingZeros); // e.g. "0,000"

  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
      <IcoBtc size={15}/>
      <span style={{ color:"#C4B5AE", fontWeight:700, fontSize:".9rem" }}>{greyPart}</span>
      <span style={{ color:"var(--black)", fontWeight:800, fontSize:".9rem" }}>{satsStr} Sats</span>
    </span>
  );
}
function premiumStats(offers) {
  if (!offers.length) return { avg: null, best: null };
  const vals = offers.map(o => o.premium);
  const avg  = (vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(2);
  const min  = Math.min(...vals).toFixed(2);
  const max  = Math.max(...vals).toFixed(2);
  return { avg, min, max };
}
function fmtPct(v) {
  const n = parseFloat(v);
  return (n > 0 ? "+" : "") + n.toFixed(2) + "%";
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
  /* ── NEW PRICE PILL (gradient) ── */
  .topbar-price{
    display:flex;align-items:center;gap:8px;
    background:linear-gradient(90deg,#FFBFA8,#FFD5BF);border-radius:999px;
    padding:5px 6px 5px 10px;
    font-size:0.78rem;font-weight:600;color:var(--black);
    flex-shrink:0;
  }
  .topbar-price-main{font-weight:800;color:var(--black);white-space:nowrap}
  .topbar-price-sats{font-weight:500;color:var(--black-65);white-space:nowrap}
  /* currency select inside pill */
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
  /* Mobile price in sidenav */
  .sidenav-price-slot{display:none;margin-top:auto;padding:12px 8px 8px;width:100%;border-top:1px solid var(--black-10)}
  .mobile-price-pill{
    display:flex;align-items:center;gap:8px;
    background:linear-gradient(90deg,#FFBFA8,#FFD5BF);border-radius:12px;
    padding:10px 10px 10px 12px;
  }
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
  /* ── LOGGED-OUT DISABLED STATES ── */
  .cta-btn-disabled{margin-left:auto;padding:7px 20px;border-radius:999px;background:var(--black-10);
    color:var(--black-25);font-family:var(--font);font-size:.85rem;font-weight:800;border:none;
    cursor:not-allowed;letter-spacing:.02em;white-space:nowrap;box-shadow:none}
  .action-btn-disabled{padding:5px 14px;border-radius:999px;font-size:.78rem;font-weight:800;
    font-family:var(--font);border:1.5px solid var(--black-10);background:var(--black-5);
    color:var(--black-25);cursor:not-allowed;white-space:nowrap}
  .my-offers-btn-disabled{opacity:.4;cursor:not-allowed;pointer-events:none}

  /* ── SUBHEADER ── */
  .subheader{display:flex;align-items:center;gap:10px;flex-wrap:wrap;
    padding:12px 24px;background:var(--surface);border-bottom:1px solid var(--black-10);
    position:sticky;top:var(--topbar);z-index:100}

  /* ── TABS ── */
  .tabs{display:flex;gap:2px;background:var(--black-5);padding:3px;border-radius:10px}
  .tab{padding:6px 20px;border-radius:7px;font-size:.85rem;font-weight:700;cursor:pointer;
    border:none;background:transparent;color:var(--black-65);transition:all .14s;
    letter-spacing:.02em;font-family:var(--font)}
  .tab.active-buy{background:var(--surface);color:var(--success);box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .tab.active-sell{background:var(--surface);color:var(--error);box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .tab:hover:not(.active-buy):not(.active-sell){background:var(--black-10);color:var(--black)}

  /* ── STAT PILLS ── */
  .stat-pill{display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;
    font-size:.76rem;font-weight:600;background:var(--black-5);color:var(--black-65);
    white-space:nowrap}
  .stat-pill strong{color:var(--black)}
  .stat-sep{color:var(--black-25);margin:0 2px}

  /* ── MULTI-SELECT DROPDOWN ── */
  .ms-wrap{position:relative}
  .ms-trigger{
    display:flex;align-items:center;gap:6px;
    border:1.5px solid var(--black-10);border-radius:8px;
    padding:5px 10px;font-family:var(--font);font-size:.8rem;font-weight:600;
    color:var(--black);background:var(--surface);cursor:pointer;
    transition:border-color .14s;white-space:nowrap;user-select:none;min-width:110px
  }
  .ms-trigger:hover,.ms-trigger.open{border-color:var(--primary)}
  .ms-trigger-label{flex:1}
  .ms-count{background:var(--primary);color:white;font-size:.62rem;font-weight:800;
    padding:1px 5px;border-radius:999px;line-height:1.4}
  .ms-arrow{font-size:.6rem;color:var(--black-65);transition:transform .14s}
  .ms-arrow.open{transform:rotate(180deg)}
  .ms-panel{
    position:absolute;top:calc(100% + 4px);left:0;z-index:300;
    background:var(--surface);border:1.5px solid var(--black-10);border-radius:10px;
    box-shadow:0 4px 20px rgba(43,25,17,.12);min-width:160px;overflow:hidden;
    animation:dropIn .12s ease
  }
  @keyframes dropIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
  .ms-option{
    display:flex;align-items:center;gap:9px;padding:8px 12px;
    font-size:.82rem;font-weight:600;cursor:pointer;
    transition:background .1s;color:var(--black)
  }
  .ms-option:hover{background:var(--black-5)}
  .ms-option.selected{color:var(--primary-dark)}
  .ms-checkbox{
    width:15px;height:15px;border-radius:4px;flex-shrink:0;
    border:1.5px solid var(--black-25);background:var(--surface);
    display:flex;align-items:center;justify-content:center;
    font-size:.65rem;font-weight:800;color:var(--primary-dark);
    transition:all .1s
  }
  .ms-checkbox.checked{background:var(--primary-mild);border-color:var(--primary)}
  .ms-clear{
    display:flex;align-items:center;justify-content:center;
    padding:6px 12px;font-size:.73rem;font-weight:700;color:var(--black-65);
    cursor:pointer;border-top:1px solid var(--black-5);
    transition:color .1s
  }
  .ms-clear:hover{color:var(--error)}

  /* ── REPUTATION DROPDOWN (single select, native-style) ── */
  .filter-select{appearance:none;border:1.5px solid var(--black-10);border-radius:8px;
    padding:5px 28px 5px 10px;font-family:var(--font);font-size:.8rem;font-weight:600;
    color:var(--black);background:var(--surface);cursor:pointer;outline:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237D675E'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 9px center;
    transition:border-color .14s}
  .filter-select:focus{border-color:var(--primary)}

  /* ── CTA ── */
  .cta-btn{margin-left:auto;padding:7px 20px;border-radius:999px;background:var(--grad);
    color:white;font-family:var(--font);font-size:.85rem;font-weight:800;border:none;
    cursor:pointer;letter-spacing:.02em;box-shadow:0 2px 12px rgba(245,101,34,.3);
    transition:transform .1s,box-shadow .1s;white-space:nowrap}
  .cta-btn:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}

  /* ── TABLE ── */
  .table-wrap{padding:12px 20px 110px;flex:1;overflow-x:auto}
  .offer-table{width:100%;border-collapse:separate;border-spacing:0 5px;min-width:720px}
  .offer-table thead tr{border-bottom:none}
  .offer-table th{text-align:left;padding:4px 12px 8px;font-size:.67rem;font-weight:700;
    text-transform:uppercase;letter-spacing:.09em;color:var(--black-65);
    white-space:nowrap;cursor:pointer;user-select:none}
  .offer-table th:hover{color:var(--primary)}
  .th-sort{display:inline-flex;align-items:center;gap:4px}
  .sort-arrow{font-size:.58rem;opacity:.45}
  .sort-arrow.active{opacity:1;color:var(--primary)}
  .offer-table tbody tr{transition:box-shadow .1s}
  .offer-table tbody tr:hover td{background:var(--black-5)}
  .offer-table tbody tr:hover{box-shadow:0 2px 12px rgba(43,25,17,.09)}
  .offer-table td{
    padding:12px 12px;vertical-align:middle;font-size:.875rem;
    background:var(--surface);
    border-top:1px solid var(--black-10);border-bottom:1px solid var(--black-10);
  }
  .offer-table td:first-child{border-left:1px solid var(--black-10);border-radius:10px 0 0 10px}
  .offer-table td:last-child{border-right:1px solid var(--black-10);border-radius:0 10px 10px 0}

  /* ── REP ── */
  .rep-cell{display:flex;align-items:center;gap:8px}
  .rep-avatar{width:34px;height:34px;border-radius:50%;flex-shrink:0;background:var(--grad);
    display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;color:white;
    position:relative}
  .rep-avatar .online-dot{position:absolute;bottom:0px;right:0px;width:9px;height:9px;
    border-radius:50%;background:var(--success);border:2px solid var(--surface)}
  .rep-info{display:flex;flex-direction:column;gap:2px}
  .rep-row{display:flex;align-items:center;gap:4px}
  .rep-stars{font-size:.78rem;font-weight:700;color:var(--black);display:flex;align-items:center;gap:2px}
  .rep-stars .star{color:#F7931A}
  .rep-trades{font-size:.67rem;color:var(--black-65);font-weight:500}
  .badges-row{display:flex;gap:3px;flex-wrap:wrap}
  .badge{display:inline-flex;align-items:center;padding:1px 6px;border-radius:999px;
    font-size:.62rem;font-weight:700;white-space:nowrap}
  .badge-super{background:linear-gradient(90deg,#FF4D42,#FFA24C);color:white}
  .badge-fast{background:var(--primary-mild);color:var(--primary-dark)}

  /* ── AUTO BADGE ── */
  .auto-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;
    border-radius:999px;background:var(--grad);color:white;font-size:.68rem;font-weight:800;
    white-space:nowrap;box-shadow:0 1px 6px rgba(245,101,34,.28)}

  .offer-table tbody tr.own-row td{background:rgba(245,101,34,.05)}
  .offer-table tbody tr.own-row td:first-child{border-left:3px solid var(--primary)}
  .offer-table tbody tr.own-row:hover td{background:rgba(245,101,34,.09)}
  .own-label{font-size:.62rem;font-weight:800;color:var(--primary-dark);
    background:var(--primary-mild);border:1px solid rgba(245,101,34,.25);
    padding:1px 7px;border-radius:999px;white-space:nowrap;letter-spacing:.03em}
  /* mobile own card */
  .offer-card.own-card{border-left:3px solid var(--primary);background:linear-gradient(135deg,rgba(245,101,34,.04),var(--surface))}
  .my-offers-btn{padding:7px 16px;border-radius:999px;background:var(--surface);
    color:var(--black);font-family:var(--font);font-size:.85rem;font-weight:700;
    border:1.5px solid var(--black-10);cursor:pointer;letter-spacing:.02em;
    transition:border-color .14s,color .14s;white-space:nowrap}
  .my-offers-btn:hover{border-color:var(--primary);color:var(--primary-dark)}

  /* ── AMOUNT ── */
  .amount-cell{display:flex;flex-direction:column;gap:4px}
  .amount-sats{font-size:1rem;font-weight:800;color:var(--black)}
  .amount-fiat{font-size:.78rem;font-weight:500;color:var(--black-65)}

  /* ── PRICE CELL ── */
  .price-cell{display:flex;flex-direction:column;gap:2px}
  .price-eur{font-size:.9rem;font-weight:700;color:var(--black)}
  .price-rate{font-size:.9rem;font-weight:700;color:var(--black);white-space:nowrap}

  /* ── INFO SENTENCE ── */
  .info-sentence{
    display:inline-block;
    font-size:.8rem;font-weight:500;color:var(--black-65);
    background:var(--primary-mild);border:1px solid rgba(245,101,34,.18);
    border-radius:8px;padding:7px 14px;
    margin:0 20px 4px;
  }

  /* ── PREMIUM — colors depend on perspective ── */
  /* buy tab: negative = good (green), positive = bad (red) */
  .prem-good{color:var(--success);font-weight:700}
  .prem-bad {color:var(--error);  font-weight:700}
  .prem-zero{color:var(--black-65);font-weight:600}

  /* ── METHODS ── */
  .methods{display:flex;gap:4px;flex-wrap:wrap}
  .method-chip{padding:2px 7px;border-radius:999px;font-size:.69rem;font-weight:600;
    background:var(--black-5);color:var(--black-65);border:1px solid var(--black-10)}

  /* ── CURRENCIES ── */
  .currencies{display:flex;gap:3px;flex-wrap:wrap}
  .currency-chip{padding:2px 7px;border-radius:4px;font-size:.69rem;font-weight:700;
    background:var(--primary-mild);color:var(--primary-dark);letter-spacing:.04em}

  /* ── ACTION ── */
  .action-cell{display:flex;align-items:center;gap:8px;justify-content:flex-end}
  .action-btn{padding:6px 18px;border-radius:999px;font-family:var(--font);font-size:.8rem;
    font-weight:800;border:none;cursor:pointer;letter-spacing:.02em;transition:all .12s;white-space:nowrap}
  .action-buy{background:var(--success-bg);color:var(--success)}
  .action-sell{background:var(--error-bg);color:var(--error)}
  .action-buy:hover{background:var(--success);color:white;transform:translateY(-1px)}
  .action-sell:hover{background:var(--error);color:white;transform:translateY(-1px)}
  .edit-btn{background:var(--primary-mild);color:var(--primary-dark)}
  .edit-btn:hover{background:var(--primary);color:white;transform:translateY(-1px)}

  /* ── EMPTY ── */
  .empty{text-align:center;padding:60px 20px;color:var(--black-65)}
  .empty-icon{font-size:2.2rem;margin-bottom:12px}
  .empty-title{font-size:1rem;font-weight:700;margin-bottom:6px;color:var(--black)}
  .empty-sub{font-size:.85rem}

  /* ── MOBILE CARDS ── */
  .cards{display:none;flex-direction:column;gap:10px;padding:14px 14px 110px}
  .offer-card{background:var(--surface);border-radius:14px;border:1px solid var(--black-10);
    padding:14px 16px;display:flex;flex-direction:column;gap:10px}
  .card-top{display:flex;align-items:flex-start;gap:10px}
  .offer-card .action-cell{margin-top:2px}
  .offer-card .amount-cell{align-items:flex-end}
  .offer-card .amount-sats{font-size:1.15rem}
  .offer-card .amount-fiat{font-size:.82rem}

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
    transition:opacity .15s, max-height .2s;
    max-height:20px;opacity:1;
  }
  .sidenav-collapsed .sidenav-label{opacity:0;max-height:0;pointer-events:none}
  /* Backdrop (mobile overlay) */
  .sidenav-backdrop{
    display:none;position:fixed;inset:0;z-index:149;
    background:rgba(43,25,17,.4);
    animation:fadeIn .2s ease;
  }
  .sidenav-backdrop.open{display:block}
  /* Burger (mobile topbar) */
  .burger-btn{
    display:none;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:8px;border:none;
    background:transparent;cursor:pointer;color:var(--black-65);
    flex-shrink:0;transition:background .14s;
  }
  .burger-btn:hover{background:var(--black-5)}

  /* ── SEARCH ── */
  .search-inp{width:180px;border:1.5px solid var(--black-10);border-radius:8px;padding:5px 12px;font-family:var(--font);font-size:.8rem;font-weight:600;color:var(--black);background:var(--surface);outline:none;transition:border-color .14s}
  .search-inp:focus{border-color:var(--primary)}
  .search-inp::placeholder{color:var(--black-25);font-weight:500}

  /* ── CTA WRAP ── */
  .cta-wrap{display:flex;flex-direction:column;align-items:center;gap:3px;margin-left:auto}
  .how-to-start{font-size:.67rem;font-weight:600;color:var(--primary);cursor:pointer;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}
  .how-to-start:hover{color:var(--primary-dark)}

  /* ── REQUESTED ── */
  .requested-tag{font-size:.62rem;font-weight:800;color:#2D8048;background:#E6F5EA;border:1px solid #B6DEC1;padding:1px 7px;border-radius:999px;white-space:nowrap;letter-spacing:.03em}
  .offer-table tbody tr.requested-row td{background:rgba(101,165,25,.06)}
  .offer-table tbody tr.requested-row td:first-child{border-left:3px solid #65A519}
  .offer-table tbody tr.requested-row:hover td{background:rgba(101,165,25,.11)}
  .offer-card.requested-card{border-color:#B6DEC1;background:linear-gradient(135deg,rgba(101,165,25,.06),var(--surface))}

  @media(max-width:768px){
    .subheader{padding:10px 14px;gap:8px}
    .table-wrap{display:none}
    .cards{display:flex}
    .topbar-price{display:none}          /* hidden from topbar on mobile — shown inside sidenav instead */
    .sidenav-price-slot{display:block}   /* visible inside sidenav on mobile only */
    .cta-btn{padding:6px 14px;font-size:.78rem}
    .stat-pill.hide-mobile{display:none}
    .peach-id{display:none}
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
    .page-wrap{margin-left:0!important}
  }

  /* ── POPUP OVERLAY ── */
  .popup-overlay{
    position:fixed;inset:0;z-index:600;
    background:rgba(43,25,17,.55);
    display:flex;align-items:center;justify-content:center;
    padding:20px;
    animation:fadeIn .15s ease;
  }
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .popup-card{
    background:var(--surface);border-radius:20px;
    max-width:420px;width:100%;
    box-shadow:0 20px 60px rgba(43,25,17,.3);
    animation:popupSlide .2s cubic-bezier(.34,1.56,.64,1);
    max-height:calc(100vh - 40px);overflow-y:auto;
  }
  @keyframes popupSlide{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
  .popup-anim-card{display:flex;align-items:center;justify-content:center;min-height:220px}
  .popup-header{
    display:flex;align-items:center;justify-content:space-between;
    padding:18px 22px 0;
  }
  .popup-title{font-weight:800;font-size:1rem;color:var(--black)}
  .popup-close{
    width:30px;height:30px;border-radius:8px;border:none;background:var(--black-5);
    font-size:.9rem;cursor:pointer;color:var(--black-65);
    display:flex;align-items:center;justify-content:center;
    font-family:var(--font);transition:all .12s;
  }
  .popup-close:hover{background:var(--black-10);color:var(--black)}
  .popup-body{padding:16px 22px 8px}
  .popup-peer-row{display:flex;align-items:center;gap:12px;margin-bottom:16px}

  /* Summary rows */
  .popup-summary{
    display:flex;flex-direction:column;gap:0;
    border:1px solid var(--black-10);border-radius:12px;overflow:hidden;
  }
  .popup-row{
    display:flex;align-items:center;justify-content:space-between;
    padding:10px 14px;
    border-bottom:1px solid var(--black-5);
  }
  .popup-row:last-child{border-bottom:none}
  .popup-label{font-size:.76rem;font-weight:600;color:var(--black-65);white-space:nowrap}
  .popup-value{font-size:.82rem;font-weight:700;color:var(--black)}

  /* PM selector */
  .popup-section-label{
    font-size:.72rem;font-weight:800;text-transform:uppercase;
    letter-spacing:.07em;color:var(--black-65);margin:18px 0 10px;
  }
  .popup-pm-list{display:flex;flex-direction:column;gap:6px}
  .popup-pm-option{
    display:flex;align-items:center;gap:10px;
    padding:10px 14px;border-radius:10px;
    border:2px solid var(--black-10);background:var(--surface);
    cursor:pointer;font-family:var(--font);text-align:left;
    transition:all .12s;
  }
  .popup-pm-option:hover{border-color:var(--primary);background:rgba(245,101,34,.02)}
  .popup-pm-option.selected{border-color:var(--primary);background:var(--primary-mild)}
  .popup-pm-radio{
    width:18px;height:18px;border-radius:50%;flex-shrink:0;
    border:2px solid var(--black-25);background:var(--surface);
    display:flex;align-items:center;justify-content:center;
    transition:all .12s;
  }
  .popup-pm-radio.checked{border-color:var(--primary)}
  .popup-pm-radio-dot{
    width:10px;height:10px;border-radius:50%;
    background:var(--primary);
    animation:radioPop .15s ease;
  }
  @keyframes radioPop{from{transform:scale(0)}to{transform:scale(1)}}

  /* PM warning */
  .popup-pm-warning{
    display:flex;align-items:flex-start;gap:10px;
    padding:14px;border-radius:10px;
    background:#FFF8E1;border:1px solid #FFE082;
  }
  .popup-pm-link{
    display:inline-block;margin-top:6px;
    font-family:var(--font);font-size:.76rem;font-weight:700;
    color:var(--primary);background:none;border:none;
    cursor:pointer;text-decoration:underline;text-underline-offset:2px;
    padding:0;
  }
  .popup-pm-link:hover{color:var(--primary-dark)}

  /* Currency pills */
  .popup-currency-pills{display:flex;gap:6px;flex-wrap:wrap}
  .popup-cur-pill{
    padding:6px 16px;border-radius:8px;
    border:2px solid var(--black-10);background:var(--surface);
    font-family:var(--font);font-size:.8rem;font-weight:800;
    color:var(--black-65);cursor:pointer;
    letter-spacing:.04em;transition:all .12s;
  }
  .popup-cur-pill:hover{border-color:var(--primary);color:var(--primary-dark)}
  .popup-cur-pill.selected{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}

  /* Requested state */
  .popup-requested-state{
    margin-top:16px;padding:16px;border-radius:10px;
    background:var(--success-bg);text-align:center;
  }
  .popup-requested-badge{
    font-size:.88rem;font-weight:800;color:var(--success);
  }

  /* Footer */
  .popup-footer{
    padding:12px 22px 18px;
    display:flex;gap:8px;
  }
  .popup-btn{
    flex:1;padding:12px;border-radius:999px;border:none;
    font-family:var(--font);font-size:.88rem;font-weight:800;
    cursor:pointer;letter-spacing:.02em;transition:all .14s;
  }
  .popup-btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important}
  .popup-btn-request{
    background:var(--success-bg);color:var(--success);
  }
  .popup-btn-request:not(:disabled):hover{background:var(--success);color:white;transform:translateY(-1px)}
  .popup-btn-instant{
    background:var(--grad);color:white;
    box-shadow:0 2px 12px rgba(245,101,34,.3);
  }
  .popup-btn-instant:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}
  .popup-btn-undo{
    background:var(--black-5);color:var(--black-65);
  }
  .popup-btn-undo:hover{background:var(--black-10);color:var(--black)}
  .popup-btn-chat{
    background:var(--primary-mild);color:var(--primary-dark);
  }
  .popup-btn-chat:hover{background:var(--primary);color:white}
  .popup-btn-edit{
    background:var(--primary-mild);color:var(--primary-dark);
  }
  .popup-btn-edit:hover{background:var(--primary);color:white}
  .popup-btn-withdraw{
    background:var(--error-bg);color:var(--error);
  }
  .popup-btn-withdraw:hover{background:var(--error);color:white}

  /* Success animation */
  .popup-success-anim{text-align:center;padding:30px 20px}
  .popup-success-circle{
    width:64px;height:64px;border-radius:50%;
    background:var(--success);
    display:inline-flex;align-items:center;justify-content:center;
    animation:successPop .35s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes successPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
  .popup-check-path{
    stroke-dasharray:40;stroke-dashoffset:40;
    animation:drawCheck .4s ease .2s forwards;
  }
  @keyframes drawCheck{to{stroke-dashoffset:0}}

  /* Undo toast */
  .undo-toast{
    position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
    z-index:650;
    background:var(--black);color:white;
    padding:10px 22px;border-radius:999px;
    font-size:.82rem;font-weight:700;
    box-shadow:0 4px 20px rgba(43,25,17,.3);
    animation:toastIn .25s ease,toastOut .3s ease .9s forwards;
  }
  @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%)}}
  @keyframes toastOut{to{opacity:0;transform:translateX(-50%) translateY(-6px)}}

  /* Undo row/card flash */
  .offer-table tbody tr.undo-row td{
    animation:undoFlash 1.2s ease;
  }
  .offer-card.undo-card{
    animation:undoFlash 1.2s ease;
  }
  @keyframes undoFlash{
    0%{background:rgba(101,165,25,.15)}
    50%{background:rgba(101,165,25,.08)}
    100%{background:var(--surface)}
  }
`;

// ─── MULTI-SELECT DROPDOWN ────────────────────────────────────────────────────
function MultiSelect({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(opt) {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else onChange([...value, opt]);
  }

  const allSelected = value.length === 0;
  const displayLabel = allSelected
    ? label
    : value.length === 1
      ? value[0]
      : `${value[0]} +${value.length - 1}`;

  return (
    <div className="ms-wrap" ref={ref}>
      <div
        className={`ms-trigger${open ? " open" : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="ms-trigger-label">{displayLabel}</span>
        {!allSelected && <span className="ms-count">{value.length}</span>}
        <span className={`ms-arrow${open ? " open" : ""}`}>▼</span>
      </div>
      {open && (
        <div className="ms-panel">
          {options.map(opt => {
            const checked = value.includes(opt);
            return (
              <div
                key={opt}
                className={`ms-option${checked ? " selected" : ""}`}
                onClick={() => toggle(opt)}
              >
                <div className={`ms-checkbox${checked ? " checked" : ""}`}>
                  {checked && "✓"}
                </div>
                {opt}
              </div>
            );
          })}
          {value.length > 0 && (
            <div className="ms-clear" onClick={() => { onChange([]); setOpen(false); }}>
              Clear selection
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// isSellTab: when true, seller perspective → high premium is GOOD
function PremiumCell({ p, isSellTab }) {
  let cls;
  if (p === 0)       cls = "prem-zero";
  else if (isSellTab) cls = p > 0 ? "prem-good" : "prem-bad";
  else                cls = p < 0 ? "prem-good" : "prem-bad";
  return <span className={cls}>{p > 0 ? "+" : ""}{p.toFixed(2)}%</span>;
}

function RepCell({ offer }) {
  const initials = offer.id.toUpperCase().slice(0, 2);
  return (
    <div className="rep-cell">
      <div className="rep-avatar">
        {initials}
        {offer.online && <span className="online-dot"/>}
      </div>
      <div className="rep-info">
        <div className="rep-row">
          <span className="rep-stars"><span className="star">★</span>{offer.rep.toFixed(1)}</span>
          <span className="rep-trades">({offer.trades})</span>
        </div>
        {offer.badges.length > 0 && (
          <div className="badges-row">
            {offer.badges.includes("supertrader") && <span className="badge badge-super">🏆 Super</span>}
            {offer.badges.includes("fast")        && <span className="badge badge-fast">⚡ Fast</span>}
          </div>
        )}
      </div>
    </div>
  );
}

const CURRENCY_SYMBOL = { EUR:"€", GBP:"£", USD:"$", CHF:"CHF", JPY:"¥", SEK:"kr", NOK:"kr", DKK:"kr" };
function currSym(c) { return CURRENCY_SYMBOL[c] || c; }
function fmtFiat(n) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AmountCell({ offer, btcPrice, currency }) {
  const rate = btcPrice * (1 + offer.premium / 100);
  const fiat = (offer.amount / 100_000_000) * rate;
  const sym  = currSym(currency);
  return (
    <div className="amount-cell">
      <SatsAmount sats={offer.amount} />
      <span className="amount-fiat">{sym}{fmtFiat(fiat)}</span>
    </div>
  );
}

function PriceCell({ offer, btcPrice, currency }) {
  const rate = Math.round(btcPrice * (1 + offer.premium / 100));
  const sym  = currSym(currency);
  return (
    <div className="price-cell">
      <span className="price-rate">{rate.toLocaleString("fr-FR")} {sym}</span>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function PeachMarket() {
  const navigate = useNavigate();
  const [tab,            setTab]            = useState("buy");
  const [sortKey,        setSortKey]        = useState("premium");
  const [sortDir,        setSortDir]        = useState(1);
  const [selCurrencies,    setSelCurrencies]    = useState([]);   // [] = all
  const [selMethods,       setSelMethods]       = useState([]);   // [] = all
  const [selPaymentTypes,  setSelPaymentTypes]  = useState([]);   // [] = all
  const [searchQuery,      setSearchQuery]      = useState("");
  const [filterMinRep,     setFilterMinRep]     = useState("0");
  const [myOffersOnly,        setMyOffersOnly]        = useState(false);
  const [allPrices,           setAllPrices]           = useState({ EUR: BTC_PRICE });
  const [availableCurrencies, setAvailableCurrencies] = useState(ALL_CURRENCIES);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // ── AUTH ──
  const auth = window.__PEACH_AUTH__ ?? null;
  const [liveOffers,   setLiveOffers]   = useState(null); // null = use mock
  const [liveUserPMs,  setLiveUserPMs]  = useState(null); // null = use mock

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

  // ── Popup state ──
  const [popupOffer,     setPopupOffer]     = useState(null);   // offer object or null
  const [selectedPM,     setSelectedPM]     = useState(null);   // PM id for trade popup
  const [popupCurrency,  setPopupCurrency]  = useState(null);   // currency for trade popup
  const [requestAnim,    setRequestAnim]    = useState(false);  // "Trade requested" animation
  const [undoAnim,       setUndoAnim]       = useState(null);   // offer id being undone
  const [localRequested, setLocalRequested] = useState(() => new Set()); // track requested state locally

  const isSellTab = tab === "sell";

  // Derive current BTC price in selected currency
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? BTC_PRICE);

  // ── Popup helpers ──
  function openPopup(offer) {
    setSelectedPM(null);
    setPopupCurrency(offer.currencies.length === 1 ? offer.currencies[0] : null);
    setPopupOffer(offer);
  }
  function closePopup() {
    setPopupOffer(null);
    setSelectedPM(null);
    setPopupCurrency(null);
    setRequestAnim(false);
  }

  // Find which of the user's PMs match the offer's methods
  function matchingUserPMs(offer) {
    return userPMs.filter(pm => offer.methods.includes(pm.type));
  }

  function handleRequestTrade(offer) {
    // Show "trade requested" animation inside popup
    setRequestAnim(true);
    setTimeout(() => {
      // Mark as requested and close popup
      setLocalRequested(prev => new Set([...prev, offer.id]));
      closePopup();
    }, 1600);
  }

  function handleInstantTrade(offer) {
    // Navigate to trade execution
    navigate(`/trade/${offer.id}`);
    closePopup();
  }

  function handleUndoRequest(offer) {
    closePopup();
    setUndoAnim(offer.id);
    setTimeout(() => {
      setLocalRequested(prev => { const s = new Set(prev); s.delete(offer.id); return s; });
      setUndoAnim(null);
    }, 1200);
  }

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/market/prices`);
        const data = await res.json();
        if (data && typeof data === "object") {
          setAllPrices(data);
          setAvailableCurrencies(Object.keys(data).sort());
        }
      } catch {
        // keep existing prices on failure
      }
    }
    fetchPrices();
    const iv = setInterval(fetchPrices, 30000);
    return () => clearInterval(iv);
  }, []);

  // ── LIVE MARKET OFFERS + USER PMs ──
  useEffect(() => {
    const base = auth?.baseUrl ?? 'https://api.peachbitcoin.com/v1';
    const peachId = auth?.peachId ?? null;

    function normalizeOffer(o) {
      const methods = o.meansOfPayment ? Object.keys(o.meansOfPayment) : [];
      const currencies = o.meansOfPayment
        ? [...new Set(Object.values(o.meansOfPayment).flat())]
        : [];
      return {
        id: o.id,
        type: o.type,
        amount: Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0),
        premium: o.premium ?? 0,
        methods,
        currencies,
        rep: o.user?.rating ?? 0,
        trades: o.user?.trades ?? 0,
        badges: o.user?.medals ?? o.user?.badges ?? [],
        auto: false,
        online: o.user?.online ?? false,
        isOwn: !!peachId && o.user?.id === peachId,
      };
    }

    async function fetchMarket() {
      try {
        const [bidsRes, asksRes] = await Promise.all([
          fetch(`${base}/offer/search`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"bid" }) }),
          fetch(`${base}/offer/search`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"ask" }) }),
        ]);
        const [bids, asks] = await Promise.all([
          bidsRes.ok ? bidsRes.json() : [],
          asksRes.ok ? asksRes.json() : [],
        ]);
        const all = [
          ...(Array.isArray(bids) ? bids : bids?.offers ?? []).map(normalizeOffer),
          ...(Array.isArray(asks) ? asks : asks?.offers ?? []).map(normalizeOffer),
        ];
        setLiveOffers(all);
      } catch {}
    }
    fetchMarket();

    if (auth) {
      fetch(`${base}/user/me/paymentMethods`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setLiveUserPMs(data.map(pm => ({
              id: pm.id,
              type: pm.type ?? pm.id,
              currencies: pm.currencies ?? [],
              details: pm.data ?? pm.details ?? {},
            })));
          }
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const marketOffers = liveOffers ?? MOCK_OFFERS;
  const userPMs = liveUserPMs ?? USER_PMS;

  const offerType = isSellTab ? "bid" : "ask";

  const PAYMENT_TYPE_MAP = {
    "Cash":      ["Cash"],
    "Online":    ["SEPA","Revolut","Wise","PayPal"],
    "Gift card": ["Amazon","iTunes"],
  };

  const filtered = marketOffers
    .filter(o => o.type === offerType)
    .filter(o => !myOffersOnly || o.isOwn)
    .filter(o => selCurrencies.length === 0 || selCurrencies.some(c => o.currencies.includes(c)))
    .filter(o => selMethods.length === 0    || selMethods.some(m => o.methods.includes(m)))
    .filter(o => selPaymentTypes.length === 0 || selPaymentTypes.some(pt =>
      (PAYMENT_TYPE_MAP[pt] || []).some(m => o.methods.includes(m))
    ))
    .filter(o => o.rep >= parseFloat(filterMinRep))
    .filter(o => searchQuery.trim() === "" ||
      o.methods.some(m => m.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.currencies.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey === "premium") return (a.premium - b.premium) * sortDir;
      if (sortKey === "amount") {
        const aV = Array.isArray(a.amount) ? a.amount[0] : a.amount;
        const bV = Array.isArray(b.amount) ? b.amount[0] : b.amount;
        return (aV - bV) * sortDir;
      }
      if (sortKey === "rep") return (b.rep - a.rep) * sortDir;
      return 0;
    });

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(1); }
  }

  // When logged out, mask isOwn and clear requested status — browser has no session data
  const displayOffers = isLoggedIn ? filtered : filtered.map(o => ({ ...o, isOwn: false }));
  const effectiveRequested = isLoggedIn ? localRequested : new Set();

  function SortTh({ col, label }) {
    const active = sortKey === col;
    return (
      <th onClick={() => toggleSort(col)}>
        <span className="th-sort">
          {label}
          <span className={`sort-arrow${active ? " active" : ""}`}>
            {active ? (sortDir === 1 ? "▲" : "▼") : "⇅"}
          </span>
        </span>
      </th>
    );
  }

  const stats      = premiumStats(filtered);
  const satsPerCur  = Math.round(100_000_000 / btcPrice);

  // For stat pill: avg color follows the same perspective logic
  function statColor(val) {
    const n = parseFloat(val);
    if (n === 0) return "var(--black)";
    return isSellTab
      ? (n > 0 ? "var(--success)" : "var(--error)")
      : (n < 0 ? "var(--success)" : "var(--error)");
  }

  // ── Popup renderer (inline JSX, not a component — avoids remount flicker) ──
  const popupContent = (() => {
    if (!popupOffer) return null;
    const offer = popupOffer;
    const isOwn = offer.isOwn;
    const isReq = effectiveRequested.has(offer.id) && !isOwn;
    const isInstant = offer.auto;
    const sym = currSym(selectedCurrency);
    const rate = Math.round(btcPrice * (1 + offer.premium / 100));
    const fiat = (offer.amount / 100_000_000) * btcPrice * (1 + offer.premium / 100);
    const premCls = offer.premium === 0 ? "prem-zero" : isSellTab
      ? (offer.premium > 0 ? "prem-good" : "prem-bad")
      : (offer.premium < 0 ? "prem-good" : "prem-bad");
    const matching = matchingUserPMs(offer);
    const hasMissingPM = matching.length === 0;

    // ── "Trade Requested" success animation ──
    if (requestAnim) {
      return (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-card popup-anim-card" onClick={e => e.stopPropagation()}>
            <div className="popup-success-anim">
              <div className="popup-success-circle">
                <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                  <path d="M10 19l6 6 12-12" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                    className="popup-check-path"/>
                </svg>
              </div>
              <div style={{fontWeight:800,fontSize:"1.1rem",color:"var(--black)",marginTop:16}}>Trade requested!</div>
              <div style={{fontSize:".82rem",color:"var(--black-65)",fontWeight:500,marginTop:4}}>
                You'll be notified when the {isSellTab ? "buyer" : "seller"} responds.
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="popup-overlay" onClick={closePopup}>
        <div className="popup-card" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="popup-header">
            <span className="popup-title">
              {isOwn ? "Your offer" : isReq ? "Trade requested" : "Offer details"}
            </span>
            <button className="popup-close" onClick={closePopup}>✕</button>
          </div>

          {/* Offer summary */}
          <div className="popup-body">
            {/* Peer row */}
            <div className="popup-peer-row">
              <div className="rep-avatar" style={{width:38,height:38,fontSize:".75rem"}}>
                {offer.id.toUpperCase().slice(0,2)}
                {offer.online && <span className="online-dot"/>}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span className="rep-stars"><span className="star">★</span>{offer.rep.toFixed(1)}</span>
                  <span className="rep-trades">({offer.trades} trades)</span>
                </div>
                <div style={{display:"flex",gap:3,marginTop:3}}>
                  {offer.badges.includes("supertrader") && <span className="badge badge-super">🏆 Super</span>}
                  {offer.badges.includes("fast") && <span className="badge badge-fast">⚡ Fast</span>}
                  {isOwn && <span className="own-label">Your offer</span>}
                </div>
              </div>
              {isInstant && <span className="auto-badge">⚡ Instant</span>}
            </div>

            {/* Summary rows */}
            <div className="popup-summary">
              <div className="popup-row">
                <span className="popup-label">Amount</span>
                <span className="popup-value"><SatsAmount sats={offer.amount}/></span>
              </div>
              <div className="popup-row">
                <span className="popup-label">Fiat value</span>
                <span className="popup-value" style={{fontWeight:800}}>{sym}{fmtFiat(fiat)}</span>
              </div>
              <div className="popup-row">
                <span className="popup-label">Price</span>
                <span className="popup-value">{rate.toLocaleString("fr-FR")} {sym} / BTC</span>
              </div>
              <div className="popup-row">
                <span className="popup-label">Premium</span>
                <span className={`popup-value ${premCls}`} style={{fontWeight:800}}>
                  {offer.premium > 0 ? "+" : ""}{offer.premium.toFixed(2)}%
                </span>
              </div>
              <div className="popup-row">
                <span className="popup-label">Payment methods</span>
                <span className="popup-value">
                  <span style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    {offer.methods.map(m => <span key={m} className="method-chip">{m}</span>)}
                  </span>
                </span>
              </div>
              <div className="popup-row">
                <span className="popup-label">Currencies</span>
                <span className="popup-value">
                  <span style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    {offer.currencies.map(c => <span key={c} className="currency-chip">{c}</span>)}
                  </span>
                </span>
              </div>
            </div>

            {/* ── TRADE REQUEST variant: PM selector ── */}
            {!isOwn && !isReq && (
              <>
                <div className="popup-section-label">
                  Select your payment method
                </div>
                {hasMissingPM ? (
                  <div className="popup-pm-warning">
                    <span style={{fontSize:"1rem",flexShrink:0}}>⚠️</span>
                    <div>
                      <div style={{fontWeight:700,fontSize:".82rem",color:"var(--black)",marginBottom:2}}>
                        No matching payment method
                      </div>
                      <div style={{fontSize:".76rem",color:"var(--black-65)",lineHeight:1.5}}>
                        This offer accepts {offer.methods.join(", ")} but you haven't configured any of these.
                      </div>
                      <button className="popup-pm-link" onClick={() => navigate("/payment-methods")}>
                        Go to Payment Methods →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="popup-pm-list">
                    {matching.map(pm => {
                      const sel = selectedPM === pm.id;
                      const detailStr = pm.type === "SEPA"
                        ? `${pm.details.holder} · ${pm.details.iban?.slice(0,8)}…`
                        : pm.type === "Revolut"
                          ? pm.details.username
                          : pm.details.email || pm.details.username || "—";
                      return (
                        <button key={pm.id}
                          className={`popup-pm-option${sel ? " selected" : ""}`}
                          onClick={() => setSelectedPM(pm.id)}>
                          <div className={`popup-pm-radio${sel ? " checked" : ""}`}>
                            {sel && <div className="popup-pm-radio-dot"/>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:700,fontSize:".82rem"}}>{pm.type}</div>
                            <div style={{fontSize:".72rem",color:"var(--black-65)",
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {detailStr}
                            </div>
                          </div>
                          <span style={{display:"flex",gap:3,flexShrink:0}}>
                            {pm.currencies.filter(c => offer.currencies.includes(c)).map(c =>
                              <span key={c} className="currency-chip" style={{fontSize:".6rem"}}>{c}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Currency selector — only when offer has 2+ currencies */}
                {!hasMissingPM && offer.currencies.length > 1 && (
                  <>
                    <div className="popup-section-label">
                      Select currency
                    </div>
                    <div className="popup-currency-pills">
                      {offer.currencies.map(c => (
                        <button key={c}
                          className={`popup-cur-pill${popupCurrency === c ? " selected" : ""}`}
                          onClick={() => setPopupCurrency(c)}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── ALREADY REQUESTED variant: read-only state ── */}
            {!isOwn && isReq && (
              <div className="popup-requested-state">
                <div className="popup-requested-badge">✓ Trade requested</div>
                <div style={{fontSize:".78rem",color:"var(--black-65)",marginTop:4}}>
                  Waiting for the {isSellTab ? "buyer" : "seller"} to respond.
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="popup-footer">
            {/* ── Trade request (not own, not already requested) ── */}
            {!isOwn && !isReq && (
              isInstant ? (
                <button className="popup-btn popup-btn-instant"
                  disabled={!selectedPM || !popupCurrency}
                  onClick={() => handleInstantTrade(offer)}>
                  ⚡ Instant trade
                </button>
              ) : (
                <button className="popup-btn popup-btn-request"
                  disabled={!selectedPM || !popupCurrency}
                  onClick={() => handleRequestTrade(offer)}>
                  Request trade
                </button>
              )
            )}

            {/* ── Already requested ── */}
            {!isOwn && isReq && (
              <div style={{display:"flex",gap:8,width:"100%"}}>
                <button className="popup-btn popup-btn-undo"
                  onClick={() => handleUndoRequest(offer)}>
                  Undo request
                </button>
                <button className="popup-btn popup-btn-chat" style={{opacity:.45,cursor:"not-allowed"}}
                  title="Coming soon" disabled>
                  💬 Chat
                </button>
              </div>
            )}

            {/* ── Own offer ── */}
            {isOwn && (
              <div style={{display:"flex",gap:8,width:"100%"}}>
                <button className="popup-btn popup-btn-edit" style={{opacity:.45,cursor:"not-allowed"}}
                  title="Coming soon" disabled>
                  ✏ Edit offer
                </button>
                <button className="popup-btn popup-btn-withdraw" style={{opacity:.45,cursor:"not-allowed"}}
                  title="Coming soon" disabled>
                  Withdraw
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  })();

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* ── POPUP ── */}
        {popupContent}

        {/* ── UNDO TOAST ── */}
        {undoAnim && (
          <div className="undo-toast">
            <span>↩ Trade request undone</span>
          </div>
        )}

        {/* ── TOP BAR ── */}
        <header className="topbar">
          <button className="burger-btn" onClick={() => setSidebarMobileOpen(o => !o)}><IconBurger/></button>
          <PeachIcon size={28} />
          <span className="logo-wordmark">Peach</span>
          {/* Price pill — hidden on mobile (shown in sidenav instead) */}
          <div className="topbar-price">
            <IcoBtc size={18}/>
            <span className="topbar-price-main">{btcPrice.toLocaleString("fr-FR")} {selectedCurrency}</span>
            <span className="topbar-price-sats">{satsPerCur.toLocaleString()} sats / {selectedCurrency.toLowerCase()}</span>
            <div className="topbar-cur-select">
              <span className="cur-select-label">{selectedCurrency}</span>
              <svg className="cur-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:"none",flexShrink:0}}><polyline points="1,1 5,5 9,1"/></svg>
              <select
                value={selectedCurrency}
                onChange={e => setSelectedCurrency(e.target.value)}
                className="cur-select-inner"
              >
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
          active="market"
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
                <select
                  value={selectedCurrency}
                  onChange={e => setSelectedCurrency(e.target.value)}
                  className="cur-select-inner"
                >
                  {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          }
        />

        <div className="page-wrap" style={{ marginTop:"var(--topbar)", marginLeft: sidebarCollapsed ? 44 : 68, display:"flex", flexDirection:"column", flex:1 }}>

          {/* ── SUBHEADER ── */}
          <div className="subheader">
            {/* Tabs */}
            <div className="tabs">
              <button className={`tab${!isSellTab ? " active-buy"  : ""}`} onClick={()=>setTab("buy") }>Buy BTC</button>
              <button className={`tab${ isSellTab ? " active-sell" : ""}`} onClick={()=>setTab("sell")}>Sell BTC</button>
            </div>

            {/* Stats */}
            {stats.avg !== null && (
              <div className="stat-pill">
                <span>{filtered.length} offers</span>
                <span className="stat-sep">·</span>
                <span>Avg <strong style={{color:statColor(stats.avg)}}>{fmtPct(stats.avg)}</strong></span>
                <span className="stat-sep">·</span>
                {isSellTab ? (
                  <span>Best <strong style={{color:"var(--success)"}}>{fmtPct(stats.max)}</strong></span>
                ) : (
                  <span>Best <strong style={{color:"var(--success)"}}>{fmtPct(stats.min)}</strong></span>
                )}
              </div>
            )}

            {/* Filters */}
            <MultiSelect
              label="Payment type"
              options={["Cash","Online","Gift card"]}
              value={selPaymentTypes}
              onChange={setSelPaymentTypes}
            />
            <MultiSelect
              label="Currency"
              options={ALL_CURRENCIES}
              value={selCurrencies}
              onChange={setSelCurrencies}
            />
            <MultiSelect
              label="Payment method"
              options={ALL_METHODS}
              value={selMethods}
              onChange={setSelMethods}
            />
            <select
              className="filter-select"
              value={filterMinRep}
              onChange={e=>setFilterMinRep(e.target.value)}
            >
              <option value="0">Any rep</option>
              <option value="4">4.0+</option>
              <option value="4.5">4.5+</option>
              <option value="4.8">4.8+</option>
            </select>

            <input
              className="search-inp"
              placeholder="Search offers…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            <button
              className={isLoggedIn ? "my-offers-btn" : "my-offers-btn my-offers-btn-disabled"}
              onClick={() => isLoggedIn && setMyOffersOnly(o => !o)}
              style={myOffersOnly && isLoggedIn ? {borderColor:"var(--primary)",color:"var(--primary-dark)",background:"var(--primary-mild)"} : {}}
            >
              My Offers{myOffersOnly && isLoggedIn ? " ✕" : ""}
            </button>
            <div className="cta-wrap">
              {isLoggedIn
                ? <button className="cta-btn" onClick={() => navigate("/offer/new")}>+ Create Offer</button>
                : <button className="cta-btn-disabled">+ Create Offer</button>
              }
              <span className="how-to-start">How to start</span>
            </div>
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className="table-wrap">
            <div className="info-sentence">
              Request as many trades as you want. You'll enter a trade with the first {isSellTab ? "buyer" : "seller"} who accepts your request.
            </div>
            {displayOffers.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🍑</div>
                <div className="empty-title">No offers match your filters</div>
                <div className="empty-sub">Try adjusting the currency, payment method, or reputation filter</div>
              </div>
            ) : (
              <table className="offer-table">
                <thead>
                  <tr>
                    <SortTh col="rep"     label="Reputation" />
                    <SortTh col="amount"  label="Amount" />
                    <th>Price (€ / BTC)</th>
                    <SortTh col="premium" label="Premium" />
                    <th>Payment</th>
                    <th>Currencies</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayOffers.map(offer => (
                    <tr key={offer.id} className={[
                        offer.isOwn?"own-row":"",
                        effectiveRequested.has(offer.id)&&!offer.auto&&!offer.isOwn?"requested-row":"",
                        undoAnim===offer.id?"undo-row":""
                      ].filter(Boolean).join(" ")}
                      style={{cursor: isLoggedIn ? "pointer" : "default"}} onClick={() => isLoggedIn && openPopup(offer)}>
                      <td><RepCell offer={offer}/></td>
                      <td><AmountCell offer={offer} btcPrice={btcPrice} currency={selectedCurrency}/></td>
                      <td><PriceCell offer={offer} btcPrice={btcPrice} currency={selectedCurrency}/></td>
                      <td><PremiumCell p={offer.premium} isSellTab={isSellTab}/></td>
                      <td>
                        <div className="methods">
                          {offer.methods.map(m=><span key={m} className="method-chip">{m}</span>)}
                        </div>
                      </td>
                      <td>
                        <div className="currencies">
                          {offer.currencies.map(c=><span key={c} className="currency-chip">{c}</span>)}
                        </div>
                      </td>
                      <td>
                        <div className="action-cell">
                          {offer.isOwn && <span className="own-label">Your offer</span>}
                          {offer.auto && <span className="auto-badge">⚡ Instant Match</span>}
                          {offer.isOwn
                            ? <button className="action-btn edit-btn">✏ Edit</button>
                            : effectiveRequested.has(offer.id) && !offer.auto
                              ? <span className="requested-tag">Requested</span>
                              : isLoggedIn
                                ? <button className={`action-btn action-${tab}`}>{isSellTab ? "Sell" : "Buy"}</button>
                                : <button className="action-btn-disabled">{isSellTab ? "Sell" : "Buy"}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── MOBILE CARDS ── */}
          <div className="cards">
            <div className="info-sentence" style={{margin:"0 0 4px"}}>
              Request as many trades as you want. You'll enter a trade with the first {isSellTab ? "buyer" : "seller"} who accepts your request.
            </div>
            {displayOffers.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🍑</div>
                <div className="empty-title">No offers found</div>
                <div className="empty-sub">Adjust your filters</div>
              </div>
            ) : displayOffers.map(offer => (
            <div key={offer.id} className={`offer-card${offer.isOwn?" own-card":""}${effectiveRequested.has(offer.id)&&!offer.auto&&!offer.isOwn?" requested-card":""}${undoAnim===offer.id?" undo-card":""}`}
              style={{cursor: isLoggedIn ? "pointer" : "default"}} onClick={() => isLoggedIn && openPopup(offer)}>
                {/* Row 1: avatar · rep/badges (left) | action buttons (right) */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div className="rep-avatar" style={{flexShrink:0}}>
                    {offer.id.toUpperCase().slice(0,2)}
                    {offer.online && <span className="online-dot"/>}
                  </div>
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                    <span className="rep-stars"><span className="star">★</span>{offer.rep.toFixed(1)}</span>
                    <span className="rep-trades">({offer.trades})</span>
                    {offer.isOwn && <span className="own-label">Your offer</span>}
                    {offer.badges.includes("supertrader")&&<span className="badge badge-super">🏆</span>}
                    {offer.badges.includes("fast")&&<span className="badge badge-fast">⚡</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    {offer.auto&&<span className="auto-badge">⚡ Instant Match</span>}
                    {offer.isOwn
                      ? <button className="action-btn edit-btn">✏ Edit</button>
                      : effectiveRequested.has(offer.id) && !offer.auto
                        ? <span className="requested-tag">Requested</span>
                        : isLoggedIn
                          ? <button className={`action-btn action-${tab}`}>{isSellTab?"Sell":"Buy"}</button>
                          : <button className="action-btn-disabled">{isSellTab?"Sell":"Buy"}</button>
                    }
                  </div>
                </div>
                {/* Row 2: price (left) · sats amount (right) */}
                {/* Row 3: premium (left) · fiat (right) — uses selectedCurrency */}
                {(() => {
                  const sym  = currSym(selectedCurrency);
                  const rate = Math.round(btcPrice * (1 + offer.premium / 100));
                  const rateStr = rate.toLocaleString("fr-FR") + " " + sym;
                  const fiat = (offer.amount / 100_000_000) * btcPrice * (1 + offer.premium / 100);
                  const fiatVal = sym + fmtFiat(fiat);
                  const premCls = offer.premium === 0 ? "prem-zero" : isSellTab ? (offer.premium > 0 ? "prem-good" : "prem-bad") : (offer.premium < 0 ? "prem-good" : "prem-bad");
                  return (
                    <>
                      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
                        <span style={{fontSize:".9rem",fontWeight:800,color:"var(--black)"}}>{rateStr}</span>
                        <SatsAmount sats={offer.amount}/>
                      </div>
                      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
                        <span className={premCls} style={{fontSize:".9rem"}}>{offer.premium > 0 ? "+" : ""}{offer.premium.toFixed(2)}%</span>
                        <span style={{fontSize:".9rem",fontWeight:700,color:"var(--black)"}}>{fiatVal}</span>
                      </div>
                    </>
                  );
                })()}
                {/* Row 4: tags */}
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {offer.methods.map(m=><span key={m} className="method-chip">{m}</span>)}
                  {offer.currencies.map(c=><span key={c} className="currency-chip">{c}</span>)}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
