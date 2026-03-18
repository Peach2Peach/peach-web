import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SideNav, Topbar } from "../components/Navbars.jsx";
import { SatsAmount, IcoBtc } from "../components/BitcoinAmount.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useApi } from "../hooks/useApi.js";
import { extractPMsFromProfile, isApiError } from "../utils/pgp.js";
import { getCached, setCache, clearCache } from "../hooks/useApi.js";
import { MOCK_OFFERS, MOCK_USER_PMS as USER_PMS, MOCK_ALL_METHODS as ALL_METHODS } from "../data/mockData.js";
import { BTC_PRICE_FALLBACK as BTC_PRICE, fmtPct, fmtFiat } from "../utils/format.js";
import { PeachRating } from "./trades-dashboard/components.jsx";

/** Convert API rating (-1…+1) to Peach scale (0…5) */
function toPeaches(apiRating) {
  return (apiRating + 1) / 2 * 5;
}

const ALL_CURRENCIES = ["EUR","CHF","GBP"];

function premiumStats(offers) {
  if (!offers.length) return { avg: null, best: null };
  const vals = offers.map(o => o.premium);
  const avg  = (vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(2);
  const min  = Math.min(...vals).toFixed(2);
  const max  = Math.max(...vals).toFixed(2);
  return { avg, min, max };
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
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
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
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
  .offer-id-label{font-size:.62rem;font-weight:600;color:var(--black-50);
    font-family:monospace;white-space:nowrap;letter-spacing:.02em}
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

const MAX_CHIPS = 4;
function Chips({ items, className }) {
  const visible = items.slice(0, MAX_CHIPS);
  const extra = items.length - MAX_CHIPS;
  return <>
    {visible.map(v => <span key={v} className={className}>{v}</span>)}
    {extra > 0 && <span className={className} style={{opacity:.55}}>+{extra}</span>}
  </>;
}

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
          <PeachRating rep={offer.rep} size={14}/>
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

  const [myOffersOnly,        setMyOffersOnly]        = useState(false);
  const [allPrices,           setAllPrices]           = useState({ EUR: BTC_PRICE });
  const [availableCurrencies, setAvailableCurrencies] = useState(ALL_CURRENCIES);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // ── AUTH + API ──
  const { get, post, patch, auth } = useApi();
  const [liveOffers,   setLiveOffers]   = useState(() => getCached("market-offers")?.data ?? null);
  const [liveUserPMs,  setLiveUserPMs]  = useState(null); // null = use mock
  const [pmError,      setPmError]      = useState(false);
  const [offersLoading, setOffersLoading] = useState(() => !!auth && !getCached("market-offers"));

  const { isLoggedIn, handleLogin, handleLogout, showAvatarMenu, setShowAvatarMenu } = useAuth();
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

  // ── Own-offer edit / withdraw state ──
  const [editingPremium,   setEditingPremium]   = useState(false);   // toggle edit mode
  const [editPremiumVal,   setEditPremiumVal]   = useState("");      // input value
  const [editSaving,       setEditSaving]       = useState(false);
  const [editError,        setEditError]        = useState(null);
  const [withdrawConfirm,  setWithdrawConfirm]  = useState(false);   // show confirm step
  const [withdrawing,      setWithdrawing]       = useState(false);
  const [withdrawError,    setWithdrawError]    = useState(null);
  const [signingModal,     setSigningModal]     = useState(null);    // { offerId } for sell offer cancel
  const [toast,            setToast]            = useState(null);

  const isSellTab = tab === "sell";

  // Derive current BTC price in selected currency
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? BTC_PRICE);

  // ── Popup helpers ──
  function openPopup(offer) {
    setSelectedPM(null);
    setPopupCurrency(offer.currencies.length === 1 ? offer.currencies[0] : null);
    setEditingPremium(false); setEditError(null);
    setWithdrawConfirm(false); setWithdrawError(null);
    setPopupOffer(offer);
  }
  function closePopup() {
    setPopupOffer(null);
    setSelectedPM(null);
    setPopupCurrency(null);
    setRequestAnim(false);
    setEditingPremium(false); setEditError(null);
    setWithdrawConfirm(false); setWithdrawError(null);
  }

  // ── Own-offer handlers ──
  async function handleSavePremium(offer) {
    const val = parseFloat(editPremiumVal);
    if (isNaN(val)) { setEditError("Enter a valid number"); return; }
    setEditSaving(true); setEditError(null);
    try {
      const res = await patch(`/offer/${offer.id}`, { premium: val });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || d?.message || `Server error ${res.status}`);
      }
      // Update offer in local state
      setPopupOffer(prev => ({ ...prev, premium: val }));
      if (liveOffers) {
        setLiveOffers(prev => prev.map(o => o.id === offer.id ? { ...o, premium: val } : o));
      }
      setEditingPremium(false);
      setToast("Premium updated"); setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setEditError(err.message || "Failed to save");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleWithdraw(offer) {
    setWithdrawing(true); setWithdrawError(null);
    try {
      const res = await post(`/offer/${offer.id}/cancel`, {});
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Server error ${res.status}`);
      }
      // Sell offers return a PSBT → needs mobile signing
      if (data?.psbt) {
        setSigningModal({ offerId: offer.id });
        closePopup();
        // Remove from list
        if (liveOffers) setLiveOffers(prev => prev.filter(o => o.id !== offer.id));
        setToast("Refund sent to mobile for signing"); setTimeout(() => setToast(null), 4000);
        return;
      }
      // Buy offers — done
      closePopup();
      if (liveOffers) setLiveOffers(prev => prev.filter(o => o.id !== offer.id));
      setToast("Offer withdrawn"); setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setWithdrawError(err.message || "Failed to withdraw");
    } finally {
      setWithdrawing(false);
    }
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
        const res = await get('/market/prices');
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

  // ── Offer normalizers (stable references, used by fetchMarket + refresh) ──
  const peachId = auth?.peachId ?? null;

  function normalizeOffer(o) {
    const currencies = o.meansOfPayment ? Object.keys(o.meansOfPayment) : [];
    const methods = o.meansOfPayment
      ? [...new Set(Object.values(o.meansOfPayment).flat())]
      : [];
    return {
      id: o.id,
      type: o.type,
      amount: Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0),
      premium: o.premium ?? 0,
      methods,
      currencies,
      rep: toPeaches(o.user?.rating ?? 0),
      trades: o.user?.trades ?? 0,
      badges: o.user?.medals ?? o.user?.badges ?? [],
      auto: false,
      online: o.user?.online ?? false,
      isOwn: !!peachId && o.user?.id === peachId,
    };
  }

  function normalizeOwnOffer(o, type) {
    const methods = o.meansOfPayment ? Object.values(o.meansOfPayment).flat() : [];
    const currencies = o.meansOfPayment ? Object.keys(o.meansOfPayment) : [];
    return {
      id: o.id,
      type,
      amount: Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0),
      premium: o.premium ?? 0,
      methods: [...new Set(methods)],
      currencies,
      rep: toPeaches(auth?.profile?.rating ?? 0),
      trades: auth?.profile?.trades ?? 0,
      badges: auth?.profile?.medals ?? [],
      auto: false,
      online: true,
      isOwn: true,
    };
  }

  async function fetchMarket() {
    try {
      const [bidsRes, asksRes] = await Promise.all([
        post('/offer/search', { type: 'bid', size: 50 }),
        post('/offer/search', { type: 'ask', size: 50 }),
      ]);
      if (!bidsRes.ok || !asksRes.ok) {
        console.warn("[MarketView] offer/search status:", bidsRes.status, asksRes.status);
      }
      const [bids, asks] = await Promise.all([
        bidsRes.ok ? bidsRes.json() : [],
        asksRes.ok ? asksRes.json() : [],
      ]);
      const bidsArr = Array.isArray(bids) ? bids : bids?.offers ?? [];
      const asksArr = Array.isArray(asks) ? asks : asks?.offers ?? [];
      console.log("[MarketView] bids:", bidsArr.length, "asks:", asksArr.length);
      if (bidsArr[0]) console.log("[MarketView] sample bid keys:", Object.keys(bidsArr[0]), "type:", bidsArr[0].type);
      if (asksArr[0]) console.log("[MarketView] sample ask keys:", Object.keys(asksArr[0]), "type:", asksArr[0].type);
      const all = [
        ...bidsArr.map(normalizeOffer),
        ...asksArr.map(normalizeOffer),
      ];
      console.log("[MarketView] normalized sample:", all[0]);

      // Fetch own active offers from v069 (when authenticated)
      if (auth) {
        try {
          const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
          const hdrs = { Authorization: `Bearer ${auth.token}` };
          const [ownBuysRes, ownSellsRes] = await Promise.all([
            fetch(`${v069Base}/buyOffer?ownOffers=true`, { headers: hdrs }),
            fetch(`${v069Base}/sellOffer?ownOffers=true`, { headers: hdrs }),
          ]);
          const ownBuys  = ownBuysRes.ok  ? await ownBuysRes.json()  : [];
          const ownSells = ownSellsRes.ok ? await ownSellsRes.json() : [];
          const ownBuysArr  = Array.isArray(ownBuys)  ? ownBuys  : [];
          const ownSellsArr = Array.isArray(ownSells) ? ownSells : [];
          const ownOffers = [
            ...ownBuysArr.map(o => normalizeOwnOffer(o, "bid")),
            ...ownSellsArr.map(o => normalizeOwnOffer(o, "ask")),
          ];
          // Deduplicate: own offers take priority
          const ownIds = new Set(ownOffers.map(o => o.id));
          const deduped = all.filter(o => !ownIds.has(o.id));
          all.splice(0, all.length, ...deduped, ...ownOffers);
        } catch (err) {
          console.warn("[MarketView] Own offers fetch failed:", err.message);
        }
      }

      setCache("market-offers", all);
      setLiveOffers(all);
    } catch (err) {
      console.error("[MarketView] fetchMarket failed:", err);
    } finally {
      setOffersLoading(false);
    }
  }

  function handleRefreshOffers() {
    clearCache("market-offers");
    setLiveOffers(null);
    setOffersLoading(true);
    fetchMarket();
  }

  // ── LIVE MARKET OFFERS + USER PMs ──
  useEffect(() => {
    fetchMarket();

    if (auth) {
      const selfUserBase = auth.baseUrl.replace(/\/v1$/, '/v069');
      fetch(`${selfUserBase}/selfUser`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(async (data) => {
          const profile = data?.user ?? data;
          if (!profile || isApiError(profile)) throw new Error(`API error: ${profile?.error || profile?.message || "no data"}`);
          const pms = auth?.pgpPrivKey
            ? await extractPMsFromProfile(profile, auth.pgpPrivKey)
            : null;
          if (!pms) throw new Error("No PM data found in profile");
          // Keys that belong to the PM structure — everything else is a detail field
          const STRUCTURAL = new Set([
            "id", "methodId", "type", "name", "label", "currencies", "hashes",
            "details", "data", "country", "anonymous",
          ]);
          function mapD(d) {
            const m = { ...d };
            if (d.userName && !d.username) m.username = d.userName;
            if (d.userName && !d.email)    m.email    = d.userName;
            if (d.beneficiary && !d.holder) m.holder  = d.beneficiary;
            return m;
          }
          function shortId(raw) { return raw.replace(/-\d+$/, ""); }
          function sweepFields(obj) {
            const explicit = obj.data || obj.details || null;
            const swept = {};
            if (!explicit) {
              for (const [k, v] of Object.entries(obj)) {
                if (!STRUCTURAL.has(k) && typeof v !== "object") swept[k] = v;
              }
            }
            return mapD(explicit || (Object.keys(swept).length ? swept : {}));
          }
          if (Array.isArray(pms) && pms.length > 0) {
            setLiveUserPMs(pms.map(pm => ({
              id: pm.id,
              type: shortId(pm.type ?? pm.id),
              currencies: pm.currencies ?? [],
              details: sweepFields(pm),
            })));
          } else if (pms && typeof pms === "object") {
            setLiveUserPMs(Object.entries(pms).map(([key, val]) => ({
              id: val?.id || key,
              type: shortId(key),
              currencies: val?.currencies ?? [],
              details: sweepFields(val || {}),
            })));
          }
        })
        .catch((err) => {
          console.warn("[MarketView] PM fetch failed:", err.message);
          setPmError(true);
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const marketOffers = liveOffers ?? (auth ? [] : MOCK_OFFERS);
  const userPMs = liveUserPMs ?? (auth ? [] : USER_PMS);

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
              <span className="offer-id-label" style={{marginLeft:8}}>#{offer.id.slice(0,8)}</span>
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
                  <PeachRating rep={offer.rep} size={16}/>
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
                {pmError ? (
                  <div style={{padding:"12px 16px",borderRadius:10,background:"var(--error-bg)",
                    color:"var(--error)",fontWeight:700,fontSize:".82rem",textAlign:"center"}}>
                    Failed to load payment data
                  </div>
                ) : hasMissingPM ? (
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
            {isOwn && !withdrawConfirm && (
              <>
                {/* Premium edit */}
                {editingPremium ? (
                  <div style={{display:"flex",gap:8,width:"100%",alignItems:"center"}}>
                    <input type="number" step="0.1" value={editPremiumVal}
                      onChange={e => setEditPremiumVal(e.target.value)}
                      style={{flex:1,padding:"10px 14px",borderRadius:10,border:"1.5px solid var(--black-10)",
                        fontFamily:"var(--font)",fontSize:".88rem",fontWeight:700,outline:"none"}}
                      placeholder="e.g. 5.0" autoFocus/>
                    <span style={{fontSize:".82rem",fontWeight:700,color:"var(--black-50)"}}>%</span>
                    <button className="popup-btn popup-btn-edit" onClick={() => handleSavePremium(offer)}
                      disabled={editSaving} style={{flex:"none",width:"auto",padding:"10px 20px"}}>
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                    <button className="popup-btn popup-btn-withdraw" onClick={() => { setEditingPremium(false); setEditError(null); }}
                      style={{flex:"none",width:"auto",padding:"10px 16px"}}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{display:"flex",gap:8,width:"100%"}}>
                    <button className="popup-btn popup-btn-edit"
                      onClick={() => { setEditPremiumVal(String(offer.premium ?? 0)); setEditingPremium(true); setEditError(null); }}>
                      Edit premium
                    </button>
                    <button className="popup-btn popup-btn-withdraw"
                      onClick={() => { setWithdrawConfirm(true); setWithdrawError(null); }}>
                      Withdraw
                    </button>
                  </div>
                )}
                {editError && (
                  <div style={{color:"var(--error)",fontSize:".78rem",fontWeight:600,marginTop:6}}>{editError}</div>
                )}
              </>
            )}
            {/* ── Withdraw confirmation ── */}
            {isOwn && withdrawConfirm && (
              <div style={{width:"100%"}}>
                <div style={{fontSize:".84rem",fontWeight:600,color:"var(--black)",marginBottom:10}}>
                  Withdraw this offer?
                </div>
                <div style={{fontSize:".78rem",color:"var(--black-65)",lineHeight:1.5,marginBottom:12}}>
                  {offer.type === "ask"
                    ? "The escrow funds will be returned via your mobile app."
                    : "This action cannot be undone."}
                </div>
                {withdrawError && (
                  <div style={{color:"var(--error)",fontSize:".78rem",fontWeight:600,marginBottom:8}}>{withdrawError}</div>
                )}
                <div style={{display:"flex",gap:8}}>
                  <button className="popup-btn popup-btn-edit"
                    onClick={() => { setWithdrawConfirm(false); setWithdrawError(null); }}>
                    Keep offer
                  </button>
                  <button className="popup-btn popup-btn-withdraw" style={{background:"var(--error)",color:"white",borderColor:"var(--error)"}}
                    onClick={() => handleWithdraw(offer)} disabled={withdrawing}>
                    {withdrawing ? "Withdrawing…" : "Yes, withdraw"}
                  </button>
                </div>
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

        {/* ── TOAST ── */}
        {toast && (
          <div className="undo-toast">{toast}</div>
        )}

        {/* ── TOP BAR ── */}
        <Topbar
          onBurgerClick={() => setSidebarMobileOpen(o => !o)}
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
            <button
              className="my-offers-btn"
              onClick={handleRefreshOffers}
              title="Refresh offers"
              disabled={offersLoading}
              style={{padding:"6px 10px",minWidth:0,fontSize:"1rem",opacity:offersLoading?0.5:1}}
            >
              ↻
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
              Request as many trades as you want. You'll enter a trade with the first {isSellTab ? "buyer" : "seller"} who accepts your request, and your other requests will be automatically cancelled.
            </div>
            {offersLoading && auth ? (
              <div className="empty">
                <div className="empty-icon" style={{animation:"spin 1s linear infinite"}}>↻</div>
                <div className="empty-title">Loading offers…</div>
              </div>
            ) : displayOffers.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🍑</div>
                <div className="empty-title">No offers match your filters</div>
                <div className="empty-sub">Try adjusting the currency, payment method, or reputation filter</div>
              </div>
            ) : (
              <table className="offer-table">
                <thead>
                  <tr>
                    <SortTh col="rep"     label="User" />
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
                          <Chips items={offer.methods} className="method-chip"/>
                        </div>
                      </td>
                      <td>
                        <div className="currencies">
                          <Chips items={offer.currencies} className="currency-chip"/>
                        </div>
                      </td>
                      <td>
                        <div className="action-cell">
                          <span className="offer-id-label">#{offer.id.slice(0,8)}</span>
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
              Request as many trades as you want. You'll enter a trade with the first {isSellTab ? "buyer" : "seller"} who accepts your request, and your other requests will be automatically cancelled.
            </div>
            {offersLoading && auth ? (
              <div className="empty">
                <div className="empty-icon" style={{animation:"spin 1s linear infinite"}}>↻</div>
                <div className="empty-title">Loading offers…</div>
              </div>
            ) : displayOffers.length === 0 ? (
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
                    <PeachRating rep={offer.rep} size={14}/>
                    <span className="rep-trades">({offer.trades})</span>
                    {offer.isOwn && <span className="own-label">Your offer</span>}
                    {offer.badges.includes("supertrader")&&<span className="badge badge-super">🏆</span>}
                    {offer.badges.includes("fast")&&<span className="badge badge-fast">⚡</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    <span className="offer-id-label">#{offer.id.slice(0,8)}</span>
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
                  <Chips items={offer.methods} className="method-chip"/>
                  <Chips items={offer.currencies} className="currency-chip"/>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
