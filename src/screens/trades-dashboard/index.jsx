// ─── TRADES DASHBOARD — MAIN COMPONENT ─────────────────────────────────────
// Extracted from peach-trades-dashboard.jsx
// Sub-components live in ./components.jsx, popup in ./MatchesPopup.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SideNav, Topbar, CurrencyDropdown } from "../../components/Navbars.jsx";
import { SatsAmount, IcoBtc } from "../../components/BitcoinAmount.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useApi, getCached, setCache, clearCache } from "../../hooks/useApi.js";
import { fetchWithSessionCheck } from "../../utils/sessionGuard.js";
import MobileSigningModal from "../../components/MobileSigningModal.jsx";
import { useUnread } from "../../hooks/useUnread.js";
import {
  extractPMsFromProfile,
  isApiError,
  generateSymmetricKey,
  encryptForRecipients,
  encryptSymmetric,
  signPGPMessage,
  hashPaymentFields,
  decryptPGPMessage,
  verifyDetachedSignature,
  derivePublicKeyArmored,
} from "../../utils/pgp.js";
import {
  SAT,
  BTC_PRICE_FALLBACK as BTC_PRICE,
  satsToFiatRaw,
  fmtFiat,
  fmt,
} from "../../utils/format.js";
import {
  STATUS_CONFIG,
  FINISHED_STATUSES,
  PENDING_STATUSES,
} from "../../data/statusConfig.js";
import { isReturnAddressFromXpub } from "../../utils/escrow.js";
import { QRCodeSVG } from "qrcode.react";

// Local sub-components
import { IconAlert, HistoryTable } from "./components.jsx";

// Matches popup + helpers
import MatchesPopup, {
  formatTradeId,
  formatPeachName,
  transformMatch,
  transformTradeRequest,
} from "./MatchesPopup.jsx";
import RequestedOfferPopup from "../../components/RequestedOfferPopup.jsx";
import { RefreshIndicator } from "../../components/RefreshIndicator.jsx";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  /* Page layout */
  .page-wrap{margin-top:var(--topbar);margin-left:68px;padding:32px 28px;min-height:calc(100vh - 56px)}
  @media(max-width:767px){
    .page-wrap{margin-left:0;padding:20px 16px;overflow-x:hidden}
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

  /* Tab badge (count pill) */
  .tab-badge{border-radius:999px;padding:0 7px;font-size:.7rem;font-weight:800;margin-left:6px;
    background:var(--black-10);color:var(--black-65)}
  .tab-badge[data-has-action="true"]{background:var(--primary);color:white}

  /* Mobile: short labels only */
  .tab-label-short{display:none}
  @media(max-width:600px){
    .tab-label-full{display:none}
    .tab-label-short{display:inline}
  }

  /* Sub-tabs (Buy/Sell) */
  .sub-tabs{display:flex;gap:8px;margin-bottom:16px;align-items:center}
  .sub-tab{background:none;border:1.5px solid var(--black-10);cursor:pointer;font-family:var(--font);
    font-size:.82rem;font-weight:700;color:var(--black-65);
    padding:5px 18px;border-radius:999px;transition:all .15s}
  .sub-tab:hover{border-color:var(--primary);color:var(--primary-dark)}
  .sub-tab.active.buy{background:var(--success-bg);border-color:var(--success);color:var(--success)}
  .sub-tab.active.sell{background:var(--error-bg);border-color:var(--error);color:var(--error)}
  .sub-tab-count{border-radius:999px;
    padding:1px 7px;font-size:.65rem;font-weight:800;margin-left:4px;
    background:var(--black-10);color:var(--black-65)}
  .sub-tab.active.buy .sub-tab-count{background:var(--success);color:white}
  .sub-tab.active.sell .sub-tab-count{background:var(--error);color:white}

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
    display:flex;align-items:center;justify-content:center;gap:6px;
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
    display:inline-flex;align-items:center;gap:4px;
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
  .direction-buy{background:var(--success-bg);color:var(--success)}
  .direction-sell{background:var(--error-bg);color:var(--error)}

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

  /* Section heading (used to label stacked tables in the Pending tab) */
  .section-heading{font-size:.82rem;font-weight:800;text-transform:uppercase;
    letter-spacing:.06em;color:var(--black-65);margin:0 0 10px;padding:0 4px}
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
    background:linear-gradient(90deg,var(--error-bg),var(--bg));
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
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes matchesFadeIn{from{opacity:0}to{opacity:1}}
  .matches-popup{
    background:var(--surface);border-radius:20px;
    max-width:560px;width:100%;
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
  .match-row-expanded{
    flex-direction:column;gap:10px;cursor:default;
    padding:14px 16px;border:1px solid var(--black-10);margin-bottom:8px;
  }
  .match-row-expanded:hover{background:var(--surface);border-color:var(--primary-mild)}
  .match-row-top{display:flex;align-items:flex-start;gap:12px;width:100%}
  .match-row-actions{
    display:flex;align-items:center;gap:8px;width:100%;
    padding-top:10px;border-top:1px solid var(--black-5);
  }
  .match-btn-sm{flex:0 !important;padding:8px 18px !important;font-size:.82rem !important}
  .match-chat-btn-lg{
    position:relative;display:inline-flex;align-items:center;gap:6px;
    padding:7px 16px;border-radius:999px;
    border:1.5px solid var(--black-10);background:var(--surface);
    font-family:var(--font);font-size:.8rem;font-weight:600;
    color:var(--black-65);cursor:pointer;transition:border-color .15s,color .15s;
  }
  .match-chat-btn-lg:hover{border-color:var(--primary);color:var(--primary)}
  .match-chat-btn-lg .chat-unread-dot{top:-2px;right:-2px}
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
  .match-btn-reject{
    flex:1;background:none;border:1.5px solid var(--error);border-radius:999px;
    font-family:var(--font);font-size:.88rem;font-weight:700;color:var(--error);
    padding:12px 20px;cursor:pointer;transition:background .15s,color .15s;
  }
  .match-btn-reject:hover{background:var(--error);color:white}
  .toast-bar{
    position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
    background:var(--black);color:white;padding:10px 28px;border-radius:999px;
    font-family:var(--font);font-size:.84rem;font-weight:700;
    box-shadow:0 4px 20px rgba(0,0,0,.25);z-index:9999;
    animation:toastIn .3s ease both;pointer-events:none;
  }
  .toast-bar--error{
    background:var(--error);
    color:var(--text-on-accent);
    box-shadow:0 4px 20px rgba(223,50,31,.28);
  }
  @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  @media(max-width:640px){
    .matches-popup{max-width:100%;border-radius:16px}
  }

  /* ── Offer detail popup ── */
  .offer-detail-body{padding:16px 24px 8px}
  .offer-detail-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--black-5)}
  .offer-detail-row:last-child{border-bottom:none}
  .offer-detail-label{font-size:.8rem;color:var(--black-50);font-weight:600}
  .offer-detail-value{font-size:.84rem;font-weight:700;color:var(--black);text-align:right}
  .offer-detail-chips{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}
  .method-chip{padding:2px 7px;border-radius:999px;font-size:.69rem;font-weight:600;background:var(--black-5);color:var(--black-65);border:1px solid var(--black-10)}
  .currency-chip{padding:2px 7px;border-radius:4px;font-size:.69rem;font-weight:700;background:var(--primary-mild);color:var(--primary-dark);letter-spacing:.04em}
  .offer-detail-footer{padding:12px 24px 20px;display:flex;flex-direction:column;gap:8px}
  .offer-detail-btn{flex:1;padding:12px;border-radius:999px;border:none;font-family:var(--font);font-size:.88rem;font-weight:800;cursor:pointer;letter-spacing:.02em;transition:all .14s}
  .offer-detail-btn:disabled{opacity:.4;cursor:not-allowed}
  .offer-detail-btn-edit{background:var(--primary-mild);color:var(--primary-dark)}
  .offer-detail-btn-edit:hover:not(:disabled){background:var(--primary);color:white}
  .offer-detail-btn-withdraw{background:var(--error-bg, var(--error-bg));color:var(--error)}
  .offer-detail-btn-withdraw:hover:not(:disabled){background:var(--error);color:white}

  /* ── Premium editor (mobile-inspired) ── */
  .premium-editor{display:flex;flex-direction:column;align-items:center;gap:14px;padding:16px 24px 0}
  .premium-editor-title{font-size:.95rem;font-weight:800;color:var(--black);text-align:center}
  .premium-editor-subtitle{font-size:.8rem;font-weight:600;color:var(--black-50);text-align:center}
  .premium-editor-controls{display:flex;align-items:center;gap:12px;width:100%;justify-content:center}
  .premium-circle-btn{
    width:36px;height:36px;border-radius:50%;border:2px solid var(--black-10);
    background:var(--surface);display:flex;align-items:center;justify-content:center;
    cursor:pointer;font-size:1.1rem;font-weight:700;color:var(--black-65);
    transition:border-color .15s,color .15s,background .15s;flex-shrink:0;
  }
  .premium-circle-btn:hover{border-color:var(--success, var(--success));color:var(--success, var(--success))}
  .premium-circle-btn:disabled{opacity:.3;cursor:not-allowed}
  .premium-input-group{display:flex;align-items:center;gap:6px}
  .premium-input-label{font-size:.82rem;font-weight:700;color:var(--primary-dark)}
  .premium-input-field{
    width:72px;padding:8px 10px;border-radius:10px;border:1.5px solid var(--black-10);
    font-family:var(--font);font-size:.92rem;font-weight:700;text-align:center;outline:none;
    transition:border-color .15s;
  }
  .premium-input-field:focus{border-color:var(--primary)}
  .premium-pct{font-size:.82rem;font-weight:700;color:var(--black-50)}
  .premium-slider-wrap{width:100%;padding:0 4px}
  .premium-slider{
    -webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;
    background:linear-gradient(90deg, var(--error) 0%, var(--black-10) 50%, var(--success, var(--success)) 100%);
    outline:none;cursor:pointer;
  }
  .premium-slider::-webkit-slider-thumb{
    -webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;
    background:var(--primary);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:pointer;
  }
  .premium-slider::-moz-range-thumb{
    width:20px;height:20px;border-radius:50%;
    background:var(--primary);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:pointer;
  }
  .premium-fiat-line{font-size:.78rem;font-weight:600;color:var(--black-50);text-align:center}
  .premium-actions{display:flex;gap:8px;width:100%}
  .premium-btn-save{
    flex:1;padding:12px;border-radius:999px;border:none;font-family:var(--font);
    font-size:.88rem;font-weight:800;cursor:pointer;
    background:var(--success, var(--success));color:white;transition:opacity .15s;
  }
  .premium-btn-save:hover{opacity:.85}
  .premium-btn-save:disabled{opacity:.4;cursor:not-allowed}
  .premium-btn-cancel{
    flex:1;padding:12px;border-radius:999px;border:1.5px solid var(--black-10);
    font-family:var(--font);font-size:.88rem;font-weight:700;cursor:pointer;
    background:var(--surface);color:var(--black-65);transition:border-color .15s,color .15s;
  }
  .premium-btn-cancel:hover{border-color:var(--primary);color:var(--primary-dark)}

  /* ── Pre-contract chat (inside matches popup) ── */
  .matches-popup-chat{display:flex;flex-direction:column;max-height:85vh;overflow:hidden}
  .precontract-chat-messages{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
  .precontract-chat-accept-bar{
    padding:12px 24px;border-top:1px solid var(--black-10);
    background:var(--surface);border-radius:0 0 20px 20px;
  }
  .match-chat-btn{
    position:relative;background:none;border:none;cursor:pointer;padding:4px;
    border-radius:8px;color:var(--black-50);transition:color .15s;
  }
  .match-chat-btn:hover{color:var(--primary)}
  .chat-unread-dot{
    position:absolute;top:0;right:0;
    min-width:16px;height:16px;border-radius:999px;
    background:var(--primary);color:#fff;
    font-family:var(--font);font-size:.6rem;font-weight:800;line-height:1;
    display:flex;align-items:center;justify-content:center;padding:0 4px;
    border:2px solid var(--surface);
  }

  /* Chat bubbles (shared pattern with trade-execution) */
  .chat-enc-notice{
    display:flex;align-items:center;gap:6px;padding:7px 18px;
    background:var(--black-5);border-bottom:1px solid var(--black-10);
    font-size:.7rem;font-weight:600;color:var(--black-65);flex-shrink:0;font-family:monospace}
  .chat-bubble-row{display:flex}
  .chat-bubble-row-me{justify-content:flex-end}
  .chat-bubble{max-width:72%;border-radius:14px;padding:9px 13px;line-height:1.5}
  .chat-bubble-me{background:var(--grad);color:white;border-bottom-right-radius:4px}
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
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TradesDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mainTab, setMainTab] = useState("history"); // "active" | "pending" | "history"
  const [subTab, setSubTab] = useState("buy"); // "buy" | "sell"
  const [filterMethods, setFilterMethods] = useState([]);
  const [filterCurrencies, setFilterCurrencies] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  const [mobileOpen, setMobileOpen] = useState(false);

  // ── AUTH + API ──
  const { get, post, patch, del, auth } = useApi();
  const [liveItems, setLiveItems] = useState(
    () => getCached("trades-items")?.data ?? null,
  );
  const [livePending, setLivePending] = useState(
    () => getCached("trades-pending")?.data ?? null,
  );
  const [liveLimit, setLiveLimit] = useState(null); // null = not yet loaded
  const [tradesLoading, setTradesLoading] = useState(
    () => !!auth && !getCached("trades-items"),
  );
  const [isRefetching, setIsRefetching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [userPMs, setUserPMs] = useState(null); // Decrypted user payment methods for match acceptance
  const profileCacheRef = useRef(new Map()); // userId → { data, ts } — avoids re-fetching profiles every cycle

  // ── Tab scaling: shrink tabs proportionally to fit viewport ──
  const tabsRef = useRef(null);
  const tabsWrapRef = useRef(null);
  const [tabScale, setTabScale] = useState(1);

  useEffect(() => {
    const tabsEl = tabsRef.current;
    const wrapEl = tabsWrapRef.current;
    if (!tabsEl || !wrapEl) return;
    function measure() {
      tabsEl.style.transform = "none";
      const natural = tabsEl.scrollWidth;
      const available = wrapEl.clientWidth;
      const s = available < natural ? available / natural : 1;
      setTabScale(s);
      tabsEl.style.transform = s < 1 ? `scale(${s})` : "none";
    }
    const ro = new ResizeObserver(measure);
    ro.observe(wrapEl);
    return () => ro.disconnect();
  }, []);

  const { byContract: liveUnread } = useUnread();
  const {
    isLoggedIn,
    handleLogin,
    handleLogout,
    showAvatarMenu,
    setShowAvatarMenu,
  } = useAuth();
  useEffect(() => {
    if (!showAvatarMenu) return;
    const close = (e) => {
      if (!e.target.closest(".avatar-menu-wrap")) setShowAvatarMenu(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAvatarMenu]);

  const [allPrices, setAllPrices] = useState(null);
  const [availableCurrencies, setAvailableCurrencies] = useState([
    "EUR",
    "CHF",
    "GBP",
  ]);
  const [selectedCurrency, setSelectedCurrency] = useState("EUR");
  const pricesLoaded = allPrices !== null;
  const btcPrice = Math.round(allPrices?.[selectedCurrency] ?? BTC_PRICE);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await get("/market/prices");
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

  // ── NORMALIZE HELPERS (stable across renders — only depend on auth.peachId) ──
  const peachId = auth?.peachId;

  // Instant trade is enabled iff at least one paymentData entry carries an
  // `encrypted` blob (the counterparty-readable copy). `selfEncrypted` alone
  // means the owner can read it back but no counterparty key was attached.
  function hasInstantTradeEnabled(paymentData) {
    if (!paymentData || typeof paymentData !== "object") return false;
    return Object.values(paymentData).some((d) => d && d.encrypted);
  }

  function normalizeOffer(o) {
    // Direction: prefer _direction tag (set from v069 endpoint), fall back to type field
    const rawType = (o.type ?? o.offerType ?? "").toLowerCase();
    const isBuy =
      o._direction === "buy" || rawType === "bid" || rawType === "buy";
    // Extract first fiat price — v1 uses `prices` object, v069 uses `priceIn{CURRENCY}` fields
    let pricesObj = o.prices ?? {};
    if (Object.keys(pricesObj).length === 0) {
      for (const key of Object.keys(o)) {
        if (key.startsWith("priceIn")) {
          const cur = key.slice(7);
          if (cur && o[key] != null) pricesObj[cur] = o[key];
        }
      }
    }
    const mop = o.meansOfPayment ?? {};
    const offerCurrencies = Object.keys(mop);
    const offerMethods = [...new Set(Object.values(mop).flat())];
    const amtForPrice =
      o.amountSats ?? (Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0));
    // Buy offers from v069 don't reliably expose priceIn{offerCurrency} — compute
    // fiat locally from amountSats × BTC price × (1 + premium) for the offer's
    // own currencies. Falls back to whatever v069 did return if allPrices is absent.
    if (isBuy && offerCurrencies.length > 0) {
      const factor = 1 + (o.premium ?? 0) / 100;
      const computed = {};
      for (const cur of offerCurrencies) {
        const btc = allPrices?.[cur];
        if (btc != null && amtForPrice) {
          computed[cur] = (amtForPrice / 1e8) * btc * factor;
        } else if (pricesObj[cur] != null) {
          computed[cur] = pricesObj[cur];
        }
      }
      pricesObj = computed;
    }
    const firstCurrency =
      (isBuy ? offerCurrencies[0] : null) ?? Object.keys(pricesObj)[0] ?? null;
    const fiatAmount =
      firstCurrency && pricesObj[firstCurrency] != null
        ? String(pricesObj[firstCurrency])
        : "—";
    const currency = firstCurrency ?? "";
    const amt =
      o.amountSats ?? (Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0));
    const status = o.tradeStatusNew ?? o.tradeStatus ?? o.status ?? "unknown";
    return {
      id: o.id,
      tradeId: formatTradeId(o.id, "offer"),
      kind: "offer",
      direction: isBuy ? "buy" : "sell",
      amount: amt,
      premium: o.premium ?? 0,
      fiatAmount,
      currency,
      prices: pricesObj,
      tradeStatus: status,
      createdAt: new Date(o.creationDate ?? Date.now()),
      methods:
        offerMethods.length > 0 ? offerMethods : (o.paymentMethods ?? []),
      currencies:
        offerCurrencies.length > 0 ? offerCurrencies : (o.currencies ?? []),
      paymentData: o.paymentData ?? null,
      experienceLevel: o.experienceLevelCriteria ?? null,
      // Sell offers: /v1/offers/summary returns `instantTradeEnabled` directly.
      // Buy offers: derive from paymentData (v069 endpoint doesn't set the flag).
      instantTrade: isBuy
        ? hasInstantTradeEnabled(o.paymentData)
        : !!o.instantTradeEnabled,
      instantTradeCriteria: o.instantTradeCriteria ?? null,
    };
  }

  function normalizeSentRequest(o, offerType) {
    const userDirection = offerType === "buyOffer" ? "sell" : "buy";
    const mop = o.meansOfPayment ?? {};
    const offerCurrencies = Object.keys(mop);
    const offerMethods = [...new Set(Object.values(mop).flat())];
    const amt =
      o.amountSats ?? (Array.isArray(o.amount) ? o.amount[0] : (o.amount ?? 0));
    return {
      id: o.id,
      tradeId: formatTradeId(o.id, "offer"),
      kind: "sentRequest",
      direction: userDirection,
      amount: amt,
      premium: o.premium ?? 0,
      fiatAmount: "—",
      currency: offerCurrencies[0] ?? "",
      tradeStatus: "tradeRequestSent",
      createdAt: new Date(o.creationDate ?? Date.now()),
      methods: offerMethods,
      currencies: offerCurrencies,
      _offerType: offerType,
      _offerId: o.id,
      _tradeRequestData: null,
    };
  }

  function normalizeContract(c) {
    const rawType = (c.type ?? "").toLowerCase();
    const isBuyer =
      rawType === "bid" ||
      rawType === "buy" ||
      (c.buyer?.id ?? c.buyerId) === peachId;
    return {
      id: c.id,
      tradeId: formatTradeId(c.id),
      kind: "contract",
      direction: isBuyer ? "buy" : "sell",
      amount: c.amount ?? 0,
      premium: c.premium ?? 0,
      fiatAmount: c.price != null ? String(c.price) : "—",
      currency: c.currency ?? "",
      tradeStatus: c.tradeStatus ?? c.status ?? "unknown",
      tradeStatusWithoutDispute: c.tradeStatusWithoutDispute ?? null,
      disputeActive: !!c.disputeActive,
      createdAt: new Date(c.creationDate ?? Date.now()),
      unread: c.unreadMessages ?? 0,
      refunded: !!c.refunded,
      newTradeId: c.newTradeId ?? null,
    };
  }

  // ── FAST TIER: Core data (every 15s) ──
  // Fetches: /offers/summary (once, shared), /contracts/summary,
  //          /v069/buyOffer?ownOffers=true, /v069/user/{peachId}/offers
  useEffect(() => {
    if (!auth) return;

    async function fetchCore() {
      const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
      const hdrs = { Authorization: `Bearer ${auth.token}` };
      setIsRefetching(true);
      try {
        const [offersRes, contractsRes, v069BuyRes, ownOffersRes] =
          await Promise.all([
            get("/offers/summary"),
            get("/contracts/summary"),
            fetchWithSessionCheck(`${v069Base}/buyOffer?ownOffers=true`, {
              headers: hdrs,
            }),
            fetchWithSessionCheck(`${v069Base}/user/${auth.peachId}/offers`, {
              headers: hdrs,
            }),
          ]);
        const [offersData, contractsData, v069BuyData, ownOffersData] =
          await Promise.all([
            offersRes.ok ? offersRes.json() : [],
            contractsRes.ok ? contractsRes.json() : [],
            v069BuyRes.ok ? v069BuyRes.json() : [],
            ownOffersRes.ok ? ownOffersRes.json() : null,
          ]);

        const offersArr = Array.isArray(offersData)
          ? offersData
          : (offersData?.offers ?? []);
        const contractsArr = Array.isArray(contractsData)
          ? contractsData
          : (contractsData?.contracts ?? []);

        // ── Merge v1 + v069 offer data (used for both liveItems and pending) ──
        const v069BuyArr = Array.isArray(v069BuyData)
          ? v069BuyData
          : (v069BuyData?.offers ?? []);
        v069BuyArr.forEach((o) => {
          o._direction = "buy";
        });

        // Own sell offers from /user/{peachId}/offers (replaces broken sellOffer?ownOffers=true)
        const ownSellArr = ownOffersData?.sellOffers ?? [];
        ownSellArr.forEach((o) => {
          o._direction = "sell";
        });

        // Debug: decrypt selfEncrypted PM data on own offers
        if (auth?.pgpPrivKey) {
          for (const o of [...v069BuyArr, ...ownSellArr]) {
            const pd = o.paymentData;
            if (!pd) continue;
            for (const [method, data] of Object.entries(pd)) {
              if (data?.selfEncrypted) {
                decryptPGPMessage(data.selfEncrypted, auth.pgpPrivKey).catch(
                  () => {},
                );
              }
            }
          }
        }

        // Also pull own buy offers from the /user/{id}/offers response as backup
        const ownBuyBackup = ownOffersData?.buyOffers ?? [];

        // Merge and deduplicate by ID. Sell offers come from /v1/offers/summary
        // (type="ask") — that endpoint carries the owner's full paymentData with
        // the `encrypted` blob that signals instant trade. /user/{id}/offers lacks it.
        const byId = new Map();
        offersArr.forEach((o) => byId.set(o.id, o)); // v1 base layer — canonical for own sells
        ownBuyBackup.forEach((o) => {
          o._direction = "buy";
          const existing = byId.get(o.id);
          if (existing?.prices && !o.prices) o.prices = existing.prices;
          byId.set(o.id, o);
        });
        v069BuyArr.forEach((o) => {
          // v069 has full tradeStatus but may omit `prices` — carry v1's over so
          // buy-offer rows can display fiat without waiting for /market/prices.
          const existing = byId.get(o.id);
          if (existing?.prices && !o.prices) o.prices = existing.prices;
          byId.set(o.id, o);
        });

        const all = [...byId.values()].map(normalizeOffer);
        const pending = all.filter((i) => PENDING_STATUSES.has(i.tradeStatus));

        // ── Build liveItems (Active + History tabs) from merged offers + contracts ──
        const items = [...all, ...contractsArr.map(normalizeContract)];
        // Cache revive/refund state per contract — trade execution page reads this
        // since /contract/:id doesn't return these fields
        contractsArr.forEach((c) => {
          if (c.refunded || c.newTradeId) {
            try {
              sessionStorage.setItem(
                `contract-meta:${c.id}`,
                JSON.stringify({
                  refunded: !!c.refunded,
                  newTradeId: c.newTradeId ?? null,
                }),
              );
            } catch {}
          }
        });
        setCache("trades-items", items);
        setLiveItems(items);

        // Merge with existing enrichment data (sent requests, matches) from slow tier
        setLivePending((prev) => {
          if (!prev) {
            setCache("trades-pending", pending);
            return pending;
          }
          // Preserve enrichment data (matches, sentRequests) from previous slow-tier fetch
          const enrichMap = new Map();
          prev.forEach((p) => {
            if (p.kind === "sentRequest" || p.matches || p.matchCount)
              enrichMap.set(p.id, p);
          });
          const merged = pending.map((p) => {
            const enriched = enrichMap.get(p.id);
            if (enriched && enriched.kind === "offer") {
              return {
                ...p,
                matches: enriched.matches,
                matchCount: enriched.matchCount,
              };
            }
            return p;
          });
          // Re-append sent requests from previous enrichment (they only come from slow tier)
          const sentRequests = prev.filter((p) => p.kind === "sentRequest");
          const result = [...merged, ...sentRequests];
          setCache("trades-pending", result);
          return result;
        });
      } catch {
      } finally {
        setTradesLoading(false);
        setIsRefetching(false);
      }
    }

    fetchCore();
    const iv = setInterval(fetchCore, 15_000);
    return () => clearInterval(iv);
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SLOW TIER: Enrichments (every 60s) ──
  // Fetches: browse endpoints (sent requests), match/trade-request details,
  //          user profiles (cached), selfUser PMs, tradingLimit
  useEffect(() => {
    if (!auth) return;

    // Helper: fetch user profile with 5-minute cache
    function getCachedProfile(userId) {
      const cached = profileCacheRef.current.get(userId);
      if (cached && Date.now() - cached.ts < 5 * 60_000)
        return Promise.resolve(cached.data);
      return get(`/user/${userId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          profileCacheRef.current.set(userId, { data, ts: Date.now() });
          return data;
        })
        .catch(() => null);
    }

    async function fetchEnrichments() {
      const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
      const hdrs = { Authorization: `Bearer ${auth.token}` };

      // ── Trading limit + PMs (rarely change) ──
      const [limitRes] = await Promise.all([
        get("/user/tradingLimit").catch(() => null),
        // Fetch PMs in parallel
        (async () => {
          if (!auth?.pgpPrivKey) return;
          try {
            const res = await fetchWithSessionCheck(`${v069Base}/selfUser`, {
              headers: hdrs,
            });
            if (!res.ok) return;
            const data = await res.json();
            const profile = data?.user ?? data;
            if (!profile || isApiError(profile)) return;
            const pms = await extractPMsFromProfile(profile, auth.pgpPrivKey);
            if (pms) setUserPMs(pms);
          } catch (err) {
            console.warn("[Trades] PM fetch failed:", err.message);
          }
        })(),
      ]);
      if (limitRes?.ok) {
        const limitData = await limitRes.json();
        if (limitData) setLiveLimit(limitData);
      }

      // ── Browse marketplace for sent trade requests ──
      try {
        const [browseBuyRes, browseSellRes] = await Promise.all([
          fetchWithSessionCheck(`${v069Base}/buyOffer?ownOffers=false`, {
            headers: hdrs,
          }),
          fetchWithSessionCheck(`${v069Base}/sellOffer?ownOffers=false`, {
            headers: hdrs,
          }),
        ]);
        const [browseBuyData, browseSellData] = await Promise.all([
          browseBuyRes.ok ? browseBuyRes.json() : [],
          browseSellRes.ok ? browseSellRes.json() : [],
        ]);
        const browseBuyArr = Array.isArray(browseBuyData)
          ? browseBuyData
          : (browseBuyData?.offers ?? []);
        const browseSellArr = Array.isArray(browseSellData)
          ? browseSellData
          : (browseSellData?.offers ?? []);
        const sentBuy = browseBuyArr
          .filter((o) => o.hasPerformedTradeRequest)
          .map((o) => normalizeSentRequest(o, "buyOffer"));
        const sentSell = browseSellArr
          .filter((o) => o.hasPerformedTradeRequest)
          .map((o) => normalizeSentRequest(o, "sellOffer"));
        const sentRequests = [...sentBuy, ...sentSell];

        // Fetch trade request details + unread for each sent request
        if (sentRequests.length > 0) {
          await Promise.all(
            sentRequests.map(async (sr) => {
              try {
                const detailRes = await fetchWithSessionCheck(
                  `${v069Base}/${sr._offerType}/${sr._offerId}/tradeRequestPerformed/`,
                  { headers: hdrs },
                );
                if (detailRes.ok) {
                  const detailData = await detailRes.json();
                  sr._tradeRequestData = Array.isArray(detailData)
                    ? detailData[0]
                    : detailData;
                }
                const chatRes = await fetchWithSessionCheck(
                  `${v069Base}/${sr._offerType}/${sr._offerId}/tradeRequestPerformed/chat`,
                  { headers: hdrs },
                );
                if (chatRes.ok) {
                  const chatData = await chatRes.json();
                  const msgs = Array.isArray(chatData)
                    ? chatData
                    : (chatData.messages ?? chatData.data ?? []);
                  sr.unread = msgs.filter(
                    (m) => m.sender === "offerOwner" && m.seen === false,
                  ).length;
                }
              } catch {
                /* silent */
              }
            }),
          );
        }

        // ── Fetch matches/trade requests for matchable pending offers ──
        // Read current pending state to find matchable offers
        setLivePending((prev) => {
          const currentPending = prev ?? [];
          const ownOffers = currentPending.filter((o) => o.kind === "offer");
          const matchable = ownOffers.filter(
            (o) =>
              o.tradeStatus === "hasMatchesAvailable" ||
              o.tradeStatus === "acceptTradeRequest",
          );

          if (matchable.length > 0) {
            // Fire match fetches asynchronously, then update state when done
            Promise.all(
              matchable.map(async (offer) => {
                try {
                  // Sell offers always use v069 (see note in handleTradeSelect).
                  const useV069 =
                    offer.tradeStatus === "acceptTradeRequest" ||
                    offer.direction === "sell";
                  if (useV069) {
                    const offerType =
                      offer.direction === "buy" ? "buyOffer" : "sellOffer";
                    const res = await fetchWithSessionCheck(
                      `${v069Base}/${offerType}/${offer.id}/tradeRequestReceived/`,
                      { headers: hdrs },
                    );
                    if (!res.ok)
                      return {
                        offerId: offer.id,
                        matches: [],
                        totalMatches: 0,
                      };
                    const data = await res.json();
                    const requests = Array.isArray(data)
                      ? data
                      : (data?.tradeRequests ?? []);
                    const userProfiles = await Promise.all(
                      requests.map((tr) =>
                        tr.userId
                          ? getCachedProfile(tr.userId)
                          : Promise.resolve(null),
                      ),
                    );
                    return {
                      offerId: offer.id,
                      matches: requests.map((tr, i) =>
                        transformTradeRequest(tr, offer, userProfiles[i]),
                      ),
                      totalMatches: requests.length,
                    };
                  } else {
                    const res = await get(
                      `/offer/${offer.id}/matches?page=0&size=21&sortBy=bestReputation`,
                    );
                    if (!res.ok)
                      return {
                        offerId: offer.id,
                        matches: [],
                        totalMatches: 0,
                      };
                    const data = await res.json();
                    return {
                      offerId: offer.id,
                      matches: (data.matches ?? []).map(transformMatch),
                      totalMatches: data.totalMatches ?? 0,
                    };
                  }
                } catch {
                  return { offerId: offer.id, matches: [], totalMatches: 0 };
                }
              }),
            ).then((matchResults) => {
              const matchMap = new Map(matchResults.map((r) => [r.offerId, r]));
              setLivePending((prev2) => {
                const base = (prev2 ?? []).filter(
                  (p) => p.kind !== "sentRequest",
                );
                const enriched = base.map((o) => {
                  const m = matchMap.get(o.id);
                  if (m)
                    return {
                      ...o,
                      matchCount: m.totalMatches,
                      matches: m.matches,
                    };
                  return o;
                });
                const result = [...enriched, ...sentRequests];
                setCache("trades-pending", result);
                return result;
              });
            });

            // Return current state with sent requests appended (matches will arrive async)
            const withSent = [...ownOffers, ...sentRequests];
            setCache("trades-pending", withSent);
            return withSent;
          }

          // No matchable offers — just merge sent requests
          const result = [...ownOffers, ...sentRequests];
          setCache("trades-pending", result);
          return result;
        });
      } catch {}
    }

    fetchEnrichments();
    const iv = setInterval(fetchEnrichments, 60_000);
    return () => clearInterval(iv);
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRefreshTrades() {
    clearCache("trades-items");
    clearCache("trades-pending");
    setLiveItems(null);
    setLivePending(null);
    setTradesLoading(true);
    setRefreshKey((k) => k + 1);
  }

  const trades = liveItems ?? [];

  // Split items into active (unfinished) vs history (finished)
  // Merge live unread counts from background polling into trade items
  const rawItems = liveItems ?? [];
  const allItems = useMemo(
    () =>
      rawItems.map((i) => {
        let out = i;
        if (i.kind === "contract" && liveUnread[i.id] != null) {
          out = { ...out, unread: liveUnread[i.id] };
        }
        // Buy-offer fiat recompute: normalizeOffer may have run before allPrices
        // loaded, leaving fiatAmount empty. Fill it in now using live BTC prices.
        if (
          out.kind === "offer" &&
          out.direction === "buy" &&
          allPrices &&
          out.amount
        ) {
          const factor = 1 + (out.premium ?? 0) / 100;
          const computed = {};
          for (const cur of out.currencies ?? []) {
            const btc = allPrices[cur];
            if (btc != null) computed[cur] = (out.amount / 1e8) * btc * factor;
          }
          // Prefer the offer's own first currency over any stale cached `currency`
          // (pre-fix caches stored the topbar currency, e.g. "CHF", which won't
          // appear in `computed` and would silently skip the update).
          const firstCur =
            out.currencies?.[0] || Object.keys(computed)[0] || null;
          if (firstCur && computed[firstCur] != null) {
            out = {
              ...out,
              prices: computed,
              currency: firstCur,
              fiatAmount: String(computed[firstCur]),
            };
          }
        }
        return out;
      }),
    [rawItems, liveUnread, allPrices],
  );
  // Buyer-side exception: when the seller funded with the wrong amount, the
  // trade is canceled and the buyer has nothing left to do. The seller still
  // has an in-flight refund, so this only moves to History on the buyer side.
  const isBuyerSideRefundWaiting = (i) =>
    i.tradeStatus === "wrongAmountFundedOnContractRefundWaiting" &&
    i.direction === "buy";

  const activeItems = allItems.filter(
    (i) =>
      !isBuyerSideRefundWaiting(i) &&
      (i.disputeActive ||
        (!FINISHED_STATUSES.has(i.tradeStatus) &&
          !PENDING_STATUSES.has(i.tradeStatus))),
  );
  const historyItems = allItems.filter(
    (i) =>
      FINISHED_STATUSES.has(i.tradeStatus) || isBuyerSideRefundWaiting(i),
  );

  const pendingItems = livePending ?? [];
  const ownPendingItems = pendingItems
    .filter((i) => i.kind !== "sentRequest")
    .map((i) => {
      // Same buy-offer fiat recompute as allItems — pending tab bypasses that useMemo.
      if (
        i.kind !== "offer" ||
        i.direction !== "buy" ||
        !allPrices ||
        !i.amount
      ) {
        return i;
      }
      const factor = 1 + (i.premium ?? 0) / 100;
      const computed = {};
      for (const cur of i.currencies ?? []) {
        const btc = allPrices[cur];
        if (btc != null) computed[cur] = (i.amount / 1e8) * btc * factor;
      }
      const firstCur = i.currencies?.[0] || Object.keys(computed)[0] || null;
      if (!firstCur || computed[firstCur] == null) return i;
      return {
        ...i,
        prices: computed,
        currency: firstCur,
        fiatAmount: String(computed[firstCur]),
      };
    });
  const sentPendingItems = pendingItems
    .filter((i) => i.kind === "sentRequest")
    .map((r) => {
      // Sent requests come from /v069/{buy,sell}Offer with no fiat amount populated.
      // Compute it on the fly from the live BTC prices so the Fiat column has data.
      if (!allPrices || !r.amount) return r;
      const computed = {};
      const factor = 1 + (r.premium ?? 0) / 100;
      for (const [cur, price] of Object.entries(allPrices)) {
        computed[cur] = (r.amount / 1e8) * price * factor;
      }
      return { ...r, prices: computed };
    });

  // Auto-select the best default tab: navigation state > Active > Pending > History
  // Only runs after data has loaded (tradesLoading === false)
  const [autoTabDone, setAutoTabDone] = useState(false);
  useEffect(() => {
    if (autoTabDone || tradesLoading) return;
    const navTab = location.state?.tab;
    if (navTab && ["pending", "active", "history"].includes(navTab)) {
      setMainTab(navTab);
      setAutoTabDone(true);
    } else if (activeItems.length > 0) {
      setMainTab("active");
      setAutoTabDone(true);
    } else if (pendingItems.length > 0) {
      setMainTab("pending");
      setAutoTabDone(true);
    } else {
      setMainTab("history");
      setAutoTabDone(true);
    }
  }, [activeItems.length, pendingItems.length, autoTabDone, tradesLoading]);

  // Force a fresh fetch when arriving with state.refresh — used by "save and fund later"
  // so the just-created offer appears in Pending. Cached pendingItems stay visible
  // during the refetch (no loading flicker).
  useEffect(() => {
    if (location.state?.refresh) {
      setRefreshKey((k) => k + 1);
      const { refresh: _drop, ...rest } = location.state;
      navigate(location.pathname, { replace: true, state: rest });
    }
  }, [location.state?.refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const satsPerCur = Math.round(SAT / btcPrice);

  // Trading limits — API returns CHF: { daily, dailyAmount, yearly, yearlyAmount, monthlyAnonymous, monthlyAnonymousAmount }
  // "daily" = ceiling (CHF), "dailyAmount" = already used (CHF)
  const chfToDisplay = (chf) => {
    const rate =
      allPrices?.[selectedCurrency] && allPrices?.CHF
        ? allPrices[selectedCurrency] / allPrices.CHF
        : 1;
    return Math.round(chf * rate);
  };
  const LIMIT_TOTAL = liveLimit?.daily ?? 1000;
  const LIMIT_USED = liveLimit?.dailyAmount ?? 0;
  const ANON_TOTAL = liveLimit?.monthlyAnonymous ?? 1000;
  const ANON_USED = liveLimit?.monthlyAnonymousAmount ?? 0;
  const ANNUAL_TOTAL = liveLimit?.yearly ?? 100000;
  const ANNUAL_USED = liveLimit?.yearlyAmount ?? 0;
  const limitPct = LIMIT_TOTAL
    ? Math.min(100, (LIMIT_USED / LIMIT_TOTAL) * 100)
    : 0;
  const anonPct = ANON_TOTAL
    ? Math.min(100, (ANON_USED / ANON_TOTAL) * 100)
    : 0;
  const annualPct = ANNUAL_TOTAL
    ? Math.min(100, (ANNUAL_USED / ANNUAL_TOTAL) * 100)
    : 0;

  // Filter active trades
  const filtered = trades.filter((t) => {
    if (t.direction !== subTab) return false;

    if (filterMethods.length > 0) {
      const methods = t.methods || [];
      if (!filterMethods.some((m) => methods.includes(m))) return false;
    }
    if (filterCurrencies.length > 0) {
      const currencies = t.currencies || [];
      if (!filterCurrencies.some((c) => currencies.includes(c))) return false;
    }
    if (filterStatuses.length > 0) {
      const s = t.kind === "contract" ? t.tradeStatus : t.kind;
      if (!filterStatuses.includes(s)) return false;
    }
    return true;
  });

  const [acceptedTrades, setAcceptedTrades] = useState(new Set()); // trade ids accepted

  function resolveStatusKey(t) {
    return t.tradeStatus ?? "unknown";
  }

  // Sort: action-required first, then by time
  const sortedFiltered = [...filtered].sort((a, b) => {
    const aAction = (STATUS_CONFIG[resolveStatusKey(a)] || {}).action ? 1 : 0;
    const bAction = (STATUS_CONFIG[resolveStatusKey(b)] || {}).action ? 1 : 0;
    if (aAction !== bAction) return bAction - aAction;
    return 0;
  });

  // Count urgent items
  const urgentCount = trades.filter((t) => {
    const cfg = STATUS_CONFIG[resolveStatusKey(t)] || {};
    return cfg.action;
  }).length;

  // Count by sub-tab
  const buyCount = trades.filter((t) => t.direction === "buy").length;
  const sellCount = trades.filter((t) => t.direction === "sell").length;

  const anyFilterActive =
    filterMethods.length + filterCurrencies.length + filterStatuses.length > 0;

  function clearAllFilters() {
    setFilterMethods([]);
    setFilterCurrencies([]);
    setFilterStatuses([]);
  }

  // ── Matches popup state ──
  const [matchesPopup, setMatchesPopup] = useState(null); // trade object or null
  const [matchDetail, setMatchDetail] = useState(null); // selected match or null
  const [matchConfirm, setMatchConfirm] = useState(null); // match pending confirmation or null
  const [localMatches, setLocalMatches] = useState({}); // tradeId → remaining matches
  const [matchError, setMatchError] = useState(null); // error message shown in popup
  const [toast, setToast] = useState(null); // bottom toast message
  const [toastTone, setToastTone] = useState("default"); // "default" | "error"
  const [signingModal, setSigningModal] = useState(null); // mobile signing modal
  const [matchesLoading, setMatchesLoading] = useState(false); // loading matches on demand
  const [sentRequestPopup, setSentRequestPopup] = useState(null); // sent trade request detail/chat popup

  // ── Offer detail popup state ──
  const [offerDetailPopup, setOfferDetailPopup] = useState(null); // pending offer object or null
  const [canceledOfferPopup, setCanceledOfferPopup] = useState(null); // canceled sell offer (never-matched) or null
  const [canceledOfferDetails, setCanceledOfferDetails] = useState(null); // /offer/:id/details for canceled popup
  const [odEditingPremium, setOdEditingPremium] = useState(false);
  const [odEditPremiumVal, setOdEditPremiumVal] = useState("");
  const [odEditSaving, setOdEditSaving] = useState(false);
  const [odEditError, setOdEditError] = useState(null);
  const [odWithdrawConfirm, setOdWithdrawConfirm] = useState(false);
  const [odWithdrawing, setOdWithdrawing] = useState(false);
  const [odWithdrawError, setOdWithdrawError] = useState(null);
  // Fund-escrow enrichment (sell offers in fundEscrow status)
  const [odEscrowAddress, setOdEscrowAddress] = useState(null);
  const [odCopiedAddr, setOdCopiedAddr] = useState(false);
  const [odQrWithAmount, setOdQrWithAmount] = useState(true);
  const [odAcceptingWrong, setOdAcceptingWrong] = useState(false);
  const [odAcceptWrongError, setOdAcceptWrongError] = useState(null);
  const [odFundMobileLoading, setOdFundMobileLoading] = useState(false);
  const [odFundMobileRequested, setOdFundMobileRequested] = useState(false);
  const [odFundMobileError, setOdFundMobileError] = useState(null);
  // Mobile refund pending action — set from /offer/:id/details `mobileActionRefundWasTriggered`
  const [odRefundRequested, setOdRefundRequested] = useState(false);

  function openOfferDetail(offer) {
    setOdEditingPremium(false);
    setOdEditError(null);
    setOdWithdrawConfirm(false);
    setOdWithdrawError(null);
    setOfferDetailPopup(offer);
  }
  function closeOfferDetail() {
    setOfferDetailPopup(null);
    setOdEditingPremium(false);
    setOdEditError(null);
    setOdWithdrawConfirm(false);
    setOdWithdrawError(null);
    setOdEscrowAddress(null);
    setOdCopiedAddr(false);
    setOdAcceptingWrong(false);
    setOdAcceptWrongError(null);
    setOdFundMobileLoading(false);
    setOdFundMobileRequested(false);
    setOdFundMobileError(null);
    setOdRefundRequested(false);
  }

  // ── Offer details fetch (sell offers only — endpoint is sell-exclusive by design) ──
  // Fetches GET /v1/offer/:id/details when the popup opens, to enrich the view
  // with funding status, match count, and live fiat price. Silently falls back
  // to the list-sourced normalized offer on error.
  const [offerDetails, setOfferDetails] = useState(null);
  useEffect(() => {
    if (!offerDetailPopup?.id) {
      setOfferDetails(null);
      return;
    }
    // Endpoint is sell-exclusive per backend — buy offers return 401 by design.
    if (offerDetailPopup.direction !== "sell") {
      setOfferDetails(null);
      return;
    }
    const offerId = offerDetailPopup.id;
    let cancelled = false;
    async function check() {
      try {
        const res = await get(`/offer/${offerId}/details`);
        if (cancelled) return;
        if (!res.ok) {
          setOfferDetails(null);
          return;
        }
        const body = await res.json();
        if (!cancelled) {
          setOfferDetails(body);
          // If the details endpoint already carries the escrow address, use it.
          if (body?.escrow && typeof body.escrow === "string")
            setOdEscrowAddress(body.escrow);
          // Respect the backend "mobile fund-escrow action was triggered" flag.
          if (body?.mobileActionFundEscrowWasTriggered)
            setOdFundMobileRequested(true);
          // Same for the refund pending action — hide Withdraw if already in flight.
          if (body?.mobileActionRefundWasTriggered) setOdRefundRequested(true);
        }
      } catch {
        if (!cancelled) setOfferDetails(null);
      }
    }
    check();
    const iv = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [
    offerDetailPopup?.id,
    offerDetailPopup?.direction,
    offerDetailPopup?.tradeStatus,
  ]);

  // Determine whether a sell offer's refund address was derived from the user's
  // own Peach Wallet xpub (first 100 indexes of the /1/ branch) or from an
  // externally-provided "custom wallet" address.
  const refundWalletLabel = useMemo(() => {
    if (offerDetailPopup?.direction !== "sell") return null;
    const addr = offerDetails?.returnAddress;
    if (!addr || !auth?.xpub) return null;
    return isReturnAddressFromXpub(auth.xpub, addr)
      ? "Peach Wallet"
      : "Custom Wallet";
  }, [offerDetailPopup?.direction, offerDetails?.returnAddress, auth?.xpub]);

  // Secondary fetch: ensure the escrow address is available for fundEscrow sell offers
  // even if GET /offer/:id/details does not expose it. Mirrors offer-creation polling.
  useEffect(() => {
    const o = offerDetailPopup;
    if (!o || o.direction !== "sell" || o.tradeStatus !== "fundEscrow") return;
    if (odEscrowAddress) return; // already populated (from /details or previous fetch)
    let cancelled = false;
    (async () => {
      try {
        const res = await get(`/offer/${o.id}/escrow`);
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.escrow) setOdEscrowAddress(data.escrow);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [
    offerDetailPopup?.id,
    offerDetailPopup?.direction,
    offerDetailPopup?.tradeStatus,
    odEscrowAddress,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canceled-offer details fetch (escrow address + tolerant refund tx fields) ──
  useEffect(() => {
    if (!canceledOfferPopup?.id) {
      setCanceledOfferDetails(null);
      return;
    }
    const offerId = canceledOfferPopup.id;
    let cancelled = false;
    (async () => {
      try {
        const res = await get(`/offer/${offerId}/details`);
        if (cancelled || !res.ok) return;
        const body = await res.json();
        if (!cancelled) setCanceledOfferDetails(body);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [canceledOfferPopup?.id]);

  async function handleSaveOfferPremium(offer) {
    const val = parseFloat(odEditPremiumVal);
    if (isNaN(val)) {
      setOdEditError("Enter a valid number");
      return;
    }
    setOdEditSaving(true);
    setOdEditError(null);
    try {
      // Endpoint differs by direction:
      //   buy  → PATCH /v069/buyOffer/:id        (v069, per mobile app)
      //   sell → PATCH /v1/offer/:id             (v1, per mobile app)
      let res;
      if (offer.direction === "buy") {
        const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
        res = await fetchWithSessionCheck(`${v069Base}/buyOffer/${offer.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ premium: val }),
        });
      } else {
        res = await patch(`/offer/${offer.id}`, { premium: val });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || d?.message || `Server error ${res.status}`);
      }
      setOfferDetailPopup((prev) => ({ ...prev, premium: val }));
      setLivePending((prev) =>
        prev?.map((o) =>
          String(o.id) === String(offer.id) ? { ...o, premium: val } : o,
        ),
      );
      setOdEditingPremium(false);
      setToast("Premium updated");
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setOdEditError(err.message || "Failed to save");
    } finally {
      setOdEditSaving(false);
    }
  }

  async function handleWithdrawOffer(offer) {
    setOdWithdrawing(true);
    setOdWithdrawError(null);
    try {
      let res;
      if (offer.direction === "buy") {
        // Buy offers use v069 DELETE (v1 cancel returns 401 for numeric v069 IDs)
        const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
        res = await fetchWithSessionCheck(`${v069Base}/buyOffer/${offer.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok)
          throw new Error(
            data?.error || data?.message || `Server error ${res.status}`,
          );
        closeOfferDetail();
        setLivePending((prev) =>
          prev?.filter((o) => String(o.id) !== String(offer.id)),
        );
        setRefreshKey((k) => k + 1);
        setToast("Offer cancelled");
        setTimeout(() => setToast(null), 3000);
      } else {
        // Sell offers: cancel first (skip if already canceled). For unfunded offers
        // (fundEscrow) there's no escrow to refund, so we skip the refund pending
        // action entirely. Funded offers trigger the refund pending action for mobile.
        if (offer.tradeStatus !== "offerCanceled") {
          res = await post(`/offer/${offer.id}/cancel`, {});
          const data = await res.json().catch(() => null);
          if (!res.ok)
            throw new Error(
              data?.error || data?.message || `Server error ${res.status}`,
            );
        }
        const isUnfunded = offer.tradeStatus === "fundEscrow";
        if (isUnfunded) {
          closeOfferDetail();
          setLivePending((prev) =>
            prev?.filter((o) => String(o.id) !== String(offer.id)),
          );
          setRefreshKey((k) => k + 1);
          setToast("Offer cancelled");
          setTimeout(() => setToast(null), 3000);
        } else {
          // Funded offer — trigger refund pending action for mobile signing
          const refundRes = await post(
            `/offer/${offer.id}/refundPendingAction`,
          );
          if (!refundRes.ok) {
            const err = await refundRes.json().catch(() => null);
            throw new Error(
              err?.error ||
                err?.message ||
                `Refund request failed: HTTP ${refundRes.status}`,
            );
          }
          setOdRefundRequested(true);
          setOdWithdrawConfirm(false);
          setLivePending((prev) =>
            prev?.filter((o) => String(o.id) !== String(offer.id)),
          );
          setRefreshKey((k) => k + 1);
          setToast("Refund requested — check your phone");
          setTimeout(() => setToast(null), 4000);
        }
      }
    } catch (err) {
      setOdWithdrawError(err.message || "Failed to cancel");
    } finally {
      setOdWithdrawing(false);
    }
  }

  async function handleAcceptWrongAmount(offer) {
    setOdAcceptingWrong(true);
    setOdAcceptWrongError(null);
    try {
      const res = await post(`/offer/${offer.id}/escrow/confirm`);
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || d?.message || `Server error ${res.status}`);
      }
      setToast("Escrow accepted — offer going live");
      setTimeout(() => setToast(null), 3000);
      closeOfferDetail();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setOdAcceptWrongError(err.message || "Failed to confirm escrow");
    } finally {
      setOdAcceptingWrong(false);
    }
  }

  async function handleTradeSelect(trade, opts = {}) {
    const { forceMatches = false } = opts;
    // Sent trade requests → show detail/chat popup (MARKET-style nice modal)
    if (trade.kind === "sentRequest") {
      setSentRequestPopup(trade);
      return;
    }
    // Offers with available matches or trade requests → show match acceptance popup
    if (
      (forceMatches ||
        trade.tradeStatus === "hasMatchesAvailable" ||
        trade.tradeStatus === "acceptTradeRequest") &&
      !acceptedTrades.has(trade.id)
    ) {
      setMatchesPopup(trade);
      setMatchDetail(null);
      setMatchConfirm(null);
      setMatchError(null);
      // If no matches loaded yet, fetch on demand
      if (!trade.matches?.length && !localMatches[trade.id] && auth) {
        setMatchesLoading(true);
        try {
          let transformed = [];
          // Sell offers always use v069 tradeRequestReceived (v1 /offer/:id/matches
          // doesn't cover v069 trade requests, and the v1 summary sometimes reports
          // hasMatchesAvailable for sell offers whose requests are actually on v069).
          const useV069 =
            forceMatches ||
            trade.tradeStatus === "acceptTradeRequest" ||
            trade.direction === "sell";
          if (useV069) {
            const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
            const offerType =
              trade.direction === "buy" ? "buyOffer" : "sellOffer";
            const res = await fetchWithSessionCheck(
              `${v069Base}/${offerType}/${trade.id}/tradeRequestReceived/`,
              {
                headers: { Authorization: `Bearer ${auth.token}` },
              },
            );
            if (res.ok) {
              const data = await res.json();
              const requests = Array.isArray(data)
                ? data
                : (data?.tradeRequests ?? []);
              const userProfiles = await Promise.all(
                requests.map((tr) =>
                  tr.userId
                    ? get(`/user/${tr.userId}`)
                        .then((r) => (r.ok ? r.json() : null))
                        .catch(() => null)
                    : Promise.resolve(null),
                ),
              );
              transformed = requests.map((tr, i) =>
                transformTradeRequest(tr, trade, userProfiles[i]),
              );
            }
          } else {
            // v1: fetch system matches (buy offers only)
            const res = await get(
              `/offer/${trade.id}/matches?page=0&size=21&sortBy=bestReputation`,
            );
            if (res.ok) {
              const data = await res.json();
              transformed = (data.matches ?? []).map(transformMatch);
            }
          }
          if (transformed.length > 0) {
            setLocalMatches((prev) => ({ ...prev, [trade.id]: transformed }));
          }
        } catch {}
        setMatchesLoading(false);
      }
      return;
    }
    // Never-matched canceled sell offer (contract-shaped in /contracts/summary
    // but bare offer-style ID, no "-peerId"). Trade-execution expects a matched
    // contract, so routing there calls /v1/contract/:id on an offer id and breaks.
    // Show a read-only popup with refund status instead.
    if (
      trade.kind === "contract" &&
      !String(trade.id).includes("-") &&
      (trade.tradeStatus === "offerCanceled" ||
        trade.tradeStatus === "tradeCanceled")
    ) {
      setCanceledOfferPopup(trade);
      return;
    }
    // Only contracts have valid IDs for trade execution
    if (trade.kind === "contract") {
      navigate(`/trade/${trade.id}`);
    }
    // Pending offers → open detail popup with edit/withdraw options
    if (trade.kind === "offer") {
      openOfferDetail(trade);
    }
  }

  // ── Auto-open matches popup when navigated with openOfferId state ──
  useEffect(() => {
    const offerId = location.state?.openOfferId;
    if (!offerId) return;
    const intent = location.state?.intent;
    // Clear location state so it doesn't re-trigger on refresh
    const clearState = () =>
      navigate(location.pathname, { replace: true, state: {} });

    // 1. Offer still pending → open matches popup
    if (livePending) {
      const trade = livePending.find((t) => String(t.id) === String(offerId));
      if (trade && !matchesPopup) {
        handleTradeSelect(trade, { forceMatches: intent === "tradeRequest" });
        clearState();
        return;
      }
    }
    // 2. Offer with non-pending status (e.g. fundingAmountDifferent) lives in
    //    liveItems as kind="offer" → open the offer detail popup directly
    if (liveItems) {
      const offerItem = liveItems.find(
        (t) => t.kind === "offer" && String(t.id) === String(offerId),
      );
      if (offerItem) {
        clearState();
        openOfferDetail(offerItem);
        return;
      }
      // 3. Offer already accepted → find its contract and go to trade execution
      //    Contract IDs are "buyOfferId-sellOfferId", so check if either part matches
      const contract = liveItems.find(
        (t) =>
          t.kind === "contract" &&
          String(t.id).split("-").includes(String(offerId)),
      );
      if (contract) {
        clearState();
        navigate(`/trade/${contract.id}`);
        return;
      }
    }
  }, [location.state?.openOfferId, livePending, liveItems]); // eslint-disable-line react-hooks/exhaustive-deps

  function getMatchesForTrade(trade) {
    if (localMatches[trade.id]) return localMatches[trade.id];
    return trade.matches || [];
  }

  async function handleSkipMatch(trade, match) {
    setMatchError(null);
    // Save current state for rollback
    const previousMatches = getMatchesForTrade(trade);
    // Update UI immediately (optimistic)
    const remaining = previousMatches.filter(
      (m) => m.offerId !== match.offerId,
    );
    setLocalMatches((prev) => ({ ...prev, [trade.id]: remaining }));
    setMatchDetail(null);
    if (remaining.length === 0) {
      setMatchesPopup(null);
    }
    // Send rejection to API
    if (auth) {
      try {
        const res = await del(`/offer/${trade.id}/match`, {
          matchingOfferId: match.offerId,
        });
        if (!res.ok) {
          // Rollback: restore the requester
          setLocalMatches((prev) => ({ ...prev, [trade.id]: previousMatches }));
          setMatchesPopup(trade);
          setMatchError("Could not decline this request. Please try again.");
        }
      } catch {
        setLocalMatches((prev) => ({ ...prev, [trade.id]: previousMatches }));
        setMatchesPopup(trade);
        setMatchError("Network error — could not decline this request.");
      }
    }
  }

  // ── REJECT trade request (v069 DELETE) ──
  async function handleRejectRequest(trade, match) {
    setMatchError(null);
    const previousMatches = getMatchesForTrade(trade);
    const remaining = previousMatches.filter(
      (m) => m.offerId !== match.offerId,
    );
    setLocalMatches((prev) => ({ ...prev, [trade.id]: remaining }));
    setMatchDetail(null);
    if (remaining.length === 0) setMatchesPopup(null);

    if (auth) {
      try {
        const userId = match._raw?.tradeRequestUserId;
        const offerType = trade.direction === "buy" ? "buyOffer" : "sellOffer";
        const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
        const res = await fetchWithSessionCheck(
          `${v069Base}/${offerType}/${trade.id}/tradeRequestReceived/${userId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${auth.token}` },
          },
        );
        if (!res.ok) {
          setLocalMatches((prev) => ({ ...prev, [trade.id]: previousMatches }));
          setMatchesPopup(trade);
          setMatchError("Could not reject this request. Please try again.");
        } else {
          setToast("Trade request rejected");
          setToastTone("error");
          setTimeout(() => { setToast(null); setToastTone("default"); }, 3000);
        }
      } catch {
        setLocalMatches((prev) => ({ ...prev, [trade.id]: previousMatches }));
        setMatchesPopup(trade);
        setMatchError("Network error — could not reject this request.");
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
      setMatchError("You must be logged in to accept trades");
      return;
    }
    try {
      const currency =
        match._raw?.selectedCurrency || match.currencies?.[0] || trade.currency;
      const paymentMethod =
        match._raw?.selectedPaymentMethod || match.methods?.[0] || "";
      const price =
        match._raw?.matchedPrice ?? match._raw?.prices?.[currency] ?? 0;

      // ── Find user's PM for the selected payment method + currency ──
      let pmData = null;
      if (userPMs && typeof userPMs === "object") {
        const entries = Array.isArray(userPMs)
          ? userPMs.map((pm) => [pm.id || pm.type, pm])
          : Object.entries(userPMs);
        for (const [key, val] of entries) {
          const pmType = (key || "").replace(/-\d+$/, "");
          if (
            pmType === paymentMethod &&
            (val?.currencies ?? []).includes(currency)
          ) {
            pmData = val;
            break;
          }
        }
        if (!pmData) {
          for (const [key, val] of entries) {
            const pmType = (key || "").replace(/-\d+$/, "");
            if (pmType === paymentMethod) {
              pmData = val;
              break;
            }
          }
        }
      }

      // Fallback: if no matching PM found locally, decrypt selfEncrypted from the offer's paymentData
      const pmSelfEnc = trade.paymentData?.[paymentMethod]?.selfEncrypted;
      const pmSelfSig =
        trade.paymentData?.[paymentMethod]?.selfEncryptedSignature;
      if (!pmData && pmSelfEnc && auth?.pgpPrivKey) {
        const decrypted = await decryptPGPMessage(pmSelfEnc, auth.pgpPrivKey);
        if (decrypted) {
          if (pmSelfSig) {
            const pubKey = await derivePublicKeyArmored(auth.pgpPrivKey);
            const valid = await verifyDetachedSignature(
              decrypted,
              pmSelfSig,
              pubKey,
            );
            if (!valid)
              throw new Error("selfEncrypted signature verification failed");
          }
          pmData = JSON.parse(decrypted);
        }
      }

      // Clean PM data for encryption
      const STRUCTURAL = new Set([
        "id",
        "methodId",
        "type",
        "name",
        "label",
        "currencies",
        "hashes",
        "details",
        "data",
        "country",
        "anonymous",
      ]);
      const cleanData = {};
      if (pmData) {
        for (const [k, v] of Object.entries(pmData)) {
          if (!STRUCTURAL.has(k) && typeof v !== "object") cleanData[k] = v;
        }
      }

      // ── Two different acceptance flows ──
      if (match._raw?.isTradeRequest) {
        // ═══ v069 trade request acceptance ═══
        // Counterparty already sent their symmetricKeyEncrypted (encrypted to our PGP key).
        // We decrypt it, then encrypt our PM data with it.
        let symmetricKey = null;
        if (auth?.pgpPrivKey && match._raw?.symmetricKeyEncrypted) {
          const raw = await decryptPGPMessage(
            match._raw.symmetricKeyEncrypted,
            auth.pgpPrivKey,
          );
          symmetricKey = raw ? raw.trim() : null;
        }

        let paymentDataEncrypted = null;
        let paymentDataSignature = null;
        if (symmetricKey && Object.keys(cleanData).length > 0) {
          const pmJson = JSON.stringify(cleanData);
          paymentDataEncrypted = await encryptSymmetric(pmJson, symmetricKey);
          paymentDataSignature = await signPGPMessage(pmJson, auth.pgpPrivKey);
        }

        const userId = match._raw.tradeRequestUserId;
        const offerType = trade.direction === "buy" ? "buyOffer" : "sellOffer";
        const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
        const acceptUrl = `${v069Base}/${offerType}/${trade.id}/tradeRequestReceived/${userId}/accept`;

        const res = await fetchWithSessionCheck(acceptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ paymentDataEncrypted, paymentDataSignature }),
        });

        if (res.ok) {
          const data = await res.json();
          setAcceptedTrades((prev) => new Set([...prev, trade.id]));
          setMatchesPopup(null);
          setMatchDetail(null);
          setMatchConfirm(null);
          // v069 accept returns a Contract — navigate to it
          const contractId = data.id ?? data.contractId;
          if (contractId) navigate(`/trade/${contractId}`);
        } else {
          setMatchConfirm(null);
          const errData = await res.json().catch(() => ({}));
          setMatchError(
            errData.error
              ? `Could not accept: ${errData.error}`
              : "Could not accept this trade. Please try again.",
          );
        }
      } else {
        // ═══ v1 match acceptance (system-matched offers) ═══
        let symmetricKeyEncrypted = null;
        let symmetricKeySignature = null;
        let paymentDataEncrypted = null;
        let paymentDataSignature = null;
        let hashedPaymentData = null;

        if (auth?.pgpPrivKey) {
          const symmetricKey = generateSymmetricKey();
          const counterpartyKeys = (match._raw?.pgpPublicKeys ?? [])
            .map((k) => (typeof k === "string" ? k : k?.publicKey))
            .filter(Boolean);
          const keyResult = await encryptForRecipients(
            symmetricKey,
            counterpartyKeys,
            auth.pgpPrivKey,
          );
          if (keyResult) {
            symmetricKeyEncrypted = keyResult.encrypted;
            symmetricKeySignature = keyResult.signature;
          }
          if (Object.keys(cleanData).length > 0 && symmetricKey) {
            const pmJson = JSON.stringify(cleanData);
            paymentDataEncrypted = await encryptSymmetric(pmJson, symmetricKey);
            paymentDataSignature = await signPGPMessage(
              pmJson,
              auth.pgpPrivKey,
            );
            hashedPaymentData = await hashPaymentFields(
              paymentMethod,
              cleanData,
              pmData?.country || undefined,
            );
          }
        }

        const payload = {
          matchingOfferId: match.offerId,
          currency,
          paymentMethod,
          price,
          premium: match.premium,
          instantTrade: match._raw?.instantTrade ?? false,
        };
        if (symmetricKeyEncrypted)
          payload.symmetricKeyEncrypted = symmetricKeyEncrypted;
        if (symmetricKeySignature)
          payload.symmetricKeySignature = symmetricKeySignature;
        if (paymentDataEncrypted)
          payload.paymentDataEncrypted = paymentDataEncrypted;
        if (paymentDataSignature)
          payload.paymentDataSignature = paymentDataSignature;
        if (hashedPaymentData) payload.paymentData = hashedPaymentData;

        const res = await post(`/offer/${trade.id}/match`, payload);
        if (res.ok) {
          const data = await res.json();
          setAcceptedTrades((prev) => new Set([...prev, trade.id]));
          setMatchesPopup(null);
          setMatchDetail(null);
          setMatchConfirm(null);
          if (data.contractId) navigate(`/trade/${data.contractId}`);
        } else {
          setMatchConfirm(null);
          const errData = await res.json().catch(() => ({}));
          setMatchError(
            errData.error
              ? `Could not accept: ${errData.error}`
              : "Could not accept this trade. Please try again.",
          );
        }
      }
    } catch (err) {
      console.warn("[Trades] Match accept failed:", err);
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
        onBurgerClick={() => setMobileOpen((o) => !o)}
        isLoggedIn={isLoggedIn}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
        showAvatarMenu={showAvatarMenu}
        setShowAvatarMenu={setShowAvatarMenu}
        btcPrice={btcPrice}
        pricesLoaded={pricesLoaded}
        selectedCurrency={selectedCurrency}
        availableCurrencies={availableCurrencies}
        onCurrencyChange={(c) => setSelectedCurrency(c)}
      />

      <SideNav
        active="trades"
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNavigate={navigate}
        mobilePriceSlot={
          <div className="mobile-price-pill">
            <IcoBtc size={16} />
            <div className="mobile-price-text">
              <span className="mobile-price-main">
                {pricesLoaded ? btcPrice.toLocaleString("fr-FR") : "?"}{" "}
                {selectedCurrency}
              </span>
              <span className="mobile-price-sats">
                {pricesLoaded ? satsPerCur.toLocaleString() : "?"} sats /{" "}
                {selectedCurrency.toLowerCase()}
              </span>
            </div>
            <CurrencyDropdown
              className="mobile-cur-select"
              value={selectedCurrency}
              options={availableCurrencies}
              onChange={setSelectedCurrency}
            />
          </div>
        }
      />

      {/* ── PAGE ── */}
      <main className="page-wrap">
        {/* Page header */}
        {/* Title row */}
        <div style={{ marginBottom: 16 }}>
          <div className="page-title">
            Your Trades
            <RefreshIndicator active={isRefetching && !tradesLoading} />
          </div>
          <div className="page-subtitle">
            Manage your active trades and review history
          </div>
        </div>

        {/* Limits card — left-aligned */}
        <div style={{ marginBottom: 20 }}>
          <div
            className="limit-bar-wrap"
            style={{
              display: "inline-block",
              minWidth: 260,
              maxWidth: 380,
              width: "100%",
            }}
          >
            {/* Daily */}
            <div className="limit-bar-top">
              <span className="limit-bar-label">Daily Limit</span>
              <span className="limit-bar-val">
                {chfToDisplay(LIMIT_USED).toLocaleString()} {selectedCurrency}{" "}
                <span style={{ fontWeight: 400, color: "var(--black-65)" }}>
                  / {chfToDisplay(LIMIT_TOTAL).toLocaleString()}{" "}
                  {selectedCurrency}
                </span>
              </span>
            </div>
            <div className="limit-bar-track">
              <div
                className="limit-bar-fill"
                style={{ width: `${limitPct}%` }}
              />
            </div>
            {/* Anonymous methods — monthly */}
            <div className="limit-bar-top" style={{ marginTop: 10 }}>
              <span className="limit-bar-label">
                <span className="limit-anon-dot" />
                Anonymous · Monthly
              </span>
              <span className="limit-bar-val">
                {chfToDisplay(ANON_USED).toLocaleString()} {selectedCurrency}{" "}
                <span style={{ fontWeight: 400, color: "var(--black-65)" }}>
                  / {chfToDisplay(ANON_TOTAL).toLocaleString()}{" "}
                  {selectedCurrency}
                </span>
              </span>
            </div>
            <div className="limit-bar-track">
              <div
                className="limit-bar-fill limit-bar-fill-anon"
                style={{ width: `${anonPct}%` }}
              />
            </div>
            {/* Annual */}
            <div className="limit-bar-top" style={{ marginTop: 10 }}>
              <span className="limit-bar-label">Annual Limit</span>
              <span className="limit-bar-val">
                {chfToDisplay(ANNUAL_USED).toLocaleString()} {selectedCurrency}{" "}
                <span style={{ fontWeight: 400, color: "var(--black-65)" }}>
                  / {chfToDisplay(ANNUAL_TOTAL).toLocaleString()}{" "}
                  {selectedCurrency}
                </span>
              </span>
            </div>
            <div className="limit-bar-track">
              <div
                className="limit-bar-fill limit-bar-fill-annual"
                style={{ width: `${annualPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs + urgent banner + New Offer button — all one row */}
        {/* Badge is orange only if at least one item in that tab has action:true */}
        <div className="tabs-action-row">
          <div
            ref={tabsWrapRef}
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              height:
                tabScale < 1 && tabsRef.current
                  ? tabsRef.current.offsetHeight * tabScale
                  : "auto",
              overflow: "hidden",
            }}
          >
            <div
              className="main-tabs"
              ref={tabsRef}
              style={{
                margin: 0,
                transformOrigin: "left top",
                transform: tabScale < 1 ? `scale(${tabScale})` : "none",
              }}
            >
              <button
                className={`main-tab${mainTab === "pending" ? " active" : ""}`}
                onClick={() => setMainTab("pending")}
              >
                <span className="tab-label-full">Pending Offers</span>
                <span className="tab-label-short">Pending</span>
                {ownPendingItems.length > 0 && (
                  <span
                    className="tab-badge"
                    data-has-action={ownPendingItems.some(
                      (i) => STATUS_CONFIG[i.tradeStatus]?.action,
                    )}
                  >
                    {ownPendingItems.length}
                  </span>
                )}
              </button>
              <button
                className={`main-tab${mainTab === "active" ? " active" : ""}`}
                onClick={() => setMainTab("active")}
              >
                <span className="tab-label-full">Active Trades</span>
                <span className="tab-label-short">Active</span>
                {activeItems.length > 0 && (
                  <span
                    className="tab-badge"
                    data-has-action={activeItems.some(
                      (i) => STATUS_CONFIG[i.tradeStatus]?.action,
                    )}
                  >
                    {activeItems.length}
                  </span>
                )}
              </button>
              <button
                className={`main-tab${mainTab === "history" ? " active" : ""}`}
                onClick={() => setMainTab("history")}
              >
                <span className="tab-label-full">Trade History</span>
                <span className="tab-label-short">History</span>
                {historyItems.length > 0 && (
                  <span
                    className="tab-badge"
                    data-has-action={historyItems.some((i) => i.unread > 0)}
                  >
                    {historyItems.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          {urgentCount > 0 && (
            <div className="urgent-banner" style={{ margin: 0 }}>
              <IconAlert />
              <span>
                {urgentCount} trade{urgentCount > 1 ? "s" : ""} require
                {urgentCount === 1 ? "s" : ""} your attention
              </span>
            </div>
          )}
          <button
            className="btn-cta"
            onClick={() => navigate("/offer/new")}
            style={{ marginLeft: "auto", flexShrink: 0 }}
          >
            + Create Offer
          </button>
        </div>

        {/* ── PENDING OFFERS ── */}
        {tradesLoading && auth ? (
          <div className="empty-state">
            <div
              style={{
                fontSize: "2rem",
                animation: "spin 1s linear infinite",
                display: "inline-block",
              }}
            >
              ↻
            </div>
            <p>Loading trades…</p>
          </div>
        ) : (
          <>
            {/* ── PENDING OFFERS (your own) ── */}
            {mainTab === "pending" && (
              <>
                <HistoryTable
                  rows={ownPendingItems}
                  onTradeSelect={handleTradeSelect}
                  selectedCurrency={selectedCurrency}
                  tab="pending"
                  onRefresh={handleRefreshTrades}
                  isLoading={tradesLoading}
                  emptyMessage="No pending offers."
                />
              </>
            )}

            {/* ── ACTIVE TRADES ── */}
            {mainTab === "active" && (
              <HistoryTable
                rows={activeItems}
                onTradeSelect={handleTradeSelect}
                selectedCurrency={selectedCurrency}
                tab="active"
                onRefresh={handleRefreshTrades}
                isLoading={tradesLoading}
                emptyMessage="No active trades yet."
              />
            )}

            {/* ── TRADE HISTORY ── */}
            {mainTab === "history" && (
              <HistoryTable
                rows={historyItems}
                onTradeSelect={handleTradeSelect}
                selectedCurrency={selectedCurrency}
                tab="history"
                onRefresh={handleRefreshTrades}
                isLoading={tradesLoading}
                emptyMessage="No trade history yet."
              />
            )}

            {mainTab === "pending" && (
              <>
                <h2 className="section-heading" style={{ marginTop: 28 }}>
                  Sent trade requests
                </h2>
                <HistoryTable
                  rows={sentPendingItems}
                  onTradeSelect={handleTradeSelect}
                  selectedCurrency={selectedCurrency}
                  tab="pending"
                  onRefresh={handleRefreshTrades}
                  isLoading={tradesLoading}
                  emptyMessage="No sent trade requests."
                  hideStatus
                />
              </>
            )}
          </>
        )}
      </main>

      {/* ── MATCHES POPUP ── */}
      {matchesPopup && (
        <MatchesPopup
          trade={matchesPopup}
          matches={getMatchesForTrade(matchesPopup)}
          matchDetail={matchDetail}
          matchConfirm={matchConfirm}
          matchError={matchError}
          matchesLoading={matchesLoading}
          setMatchDetail={setMatchDetail}
          setMatchConfirm={setMatchConfirm}
          onClose={closeMatchesPopup}
          onSkip={handleSkipMatch}
          onReject={handleRejectRequest}
          onAccept={handleAcceptMatch}
          onConfirmAccept={handleConfirmAccept}
        />
      )}

      {/* ── SENT REQUEST POPUP (shared component, used here + on MARKET) ── */}
      {sentRequestPopup && (
        <RequestedOfferPopup
          offer={{
            id: sentRequestPopup._offerId,
            tradeId: sentRequestPopup.tradeId,
            type: sentRequestPopup._offerType === "buyOffer" ? "bid" : "ask",
            amount: sentRequestPopup.amount,
            premium: sentRequestPopup.premium,
            methods: sentRequestPopup.methods,
            currencies: sentRequestPopup.currencies,
          }}
          auth={auth}
          selectedCurrency={selectedCurrency}
          btcPrice={btcPrice}
          onClose={() => setSentRequestPopup(null)}
          onUndoSuccess={(offerId) => {
            setLivePending((prev) =>
              prev?.filter((p) => !(p.kind === "sentRequest" && String(p._offerId) === String(offerId))),
            );
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* ── OFFER DETAIL POPUP (pending offer edit / withdraw) ── */}
      {offerDetailPopup &&
        (() => {
          const o = offerDetailPopup;
          const statusCfg = STATUS_CONFIG[o.tradeStatus] || {};
          const isBuy = o.direction === "buy";

          const fundingConfs =
            typeof offerDetails?.funding?.confirmations === "number"
              ? offerDetails.funding.confirmations
              : 0;
          const fundingApiStatus = offerDetails?.funding?.status ?? null;

          let fundingStage; // "needs" | "mempool" | "funded" | "fallback"
          let derivedStatus;
          if (isBuy) {
            fundingStage = "fallback";
            derivedStatus = String(
              statusCfg.label ?? o.tradeStatus ?? "",
            ).toUpperCase();
          } else if (fundingApiStatus === "CONFIRMED" || fundingConfs > 0) {
            fundingStage = "funded";
            derivedStatus = `FUNDED · ${fundingConfs} CONF`;
          } else if (fundingApiStatus === "MEMPOOL") {
            fundingStage = "mempool";
            derivedStatus = "TRANSACTION IN MEMPOOL";
          } else if (o.tradeStatus === "fundEscrow") {
            fundingStage = "needs";
            derivedStatus = "NEEDS FUNDING";
          } else {
            fundingStage = "fallback";
            derivedStatus = String(
              statusCfg.label ?? o.tradeStatus ?? "",
            ).toUpperCase();
          }

          const criteria =
            offerDetails?.instantTradeCriteria ??
            o.instantTradeCriteria ??
            null;
          const instantTradeOn = offerDetails
            ? hasInstantTradeEnabled(offerDetails.paymentData)
            : !!o.instantTrade;
          const BADGE_LABELS = {
            fastTrader: "Fast trader",
            superTrader: "Super trader",
          };
          const attrChips = [];
          if (instantTradeOn) attrChips.push("⚡ Instant trade");
          if (criteria) {
            if ((criteria.minTrades ?? 0) > 0) attrChips.push("No new users");
            if ((criteria.minReputation ?? -1) > 0.5)
              attrChips.push("Min reputation 4.5");
            for (const b of criteria.badges ?? []) {
              attrChips.push(BADGE_LABELS[b] ?? b);
            }
          }
          if (o.experienceLevel === "experiencedUsersOnly")
            attrChips.push("Experienced users only");
          if (o.experienceLevel === "newUsersOnly")
            attrChips.push("New users only");

          return (
            <div
              className="matches-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeOfferDetail();
              }}
            >
              <div className="matches-popup">
                {/* Header */}
                <div className="matches-header">
                  <span style={{ fontWeight: 800, fontSize: ".95rem" }}>
                    {isBuy ? "Buy" : "Sell"} offer
                  </span>
                  <span
                    style={{
                      fontSize: ".78rem",
                      color: "var(--black-50)",
                      fontWeight: 600,
                    }}
                  >
                    {o.tradeId}
                  </span>
                  <button className="matches-close" onClick={closeOfferDetail}>
                    ✕
                  </button>
                </div>

                {/* Body — offer summary */}
                <div className="offer-detail-body">
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Type</span>
                    <span
                      className="offer-detail-value"
                      style={{
                        color: isBuy
                          ? "var(--success, var(--success))"
                          : "var(--error)",
                      }}
                    >
                      {isBuy ? "Buy" : "Sell"}
                    </span>
                  </div>
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Amount</span>
                    <span className="offer-detail-value">
                      <SatsAmount sats={o.amount} />
                    </span>
                  </div>
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Premium</span>
                    <span
                      className="offer-detail-value"
                      style={{
                        color:
                          (o.premium ?? 0) > 0
                            ? "var(--success, var(--success))"
                            : (o.premium ?? 0) < 0
                              ? "var(--error)"
                              : "var(--black)",
                      }}
                    >
                      {(o.premium ?? 0) > 0 ? "+" : ""}
                      {(o.premium ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  {o.methods?.length > 0 && (
                    <div className="offer-detail-row">
                      <span className="offer-detail-label">
                        Payment methods
                      </span>
                      <div className="offer-detail-chips">
                        {o.methods.map((m) => (
                          <span key={m} className="method-chip">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {o.currencies?.length > 0 && (
                    <div className="offer-detail-row">
                      <span className="offer-detail-label">Currencies</span>
                      <div className="offer-detail-chips">
                        {o.currencies.map((c) => (
                          <span key={c} className="currency-chip">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isBuy && refundWalletLabel && (
                    <div className="offer-detail-row">
                      <span className="offer-detail-label">Refund to</span>
                      <span className="offer-detail-value">
                        {refundWalletLabel}
                      </span>
                    </div>
                  )}
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Status</span>
                    <span className="offer-detail-value">
                      {derivedStatus}
                    </span>
                  </div>
                  {/* Trade request count — from /offer/:id/details (only after funding confirmed) */}
                  {fundingStage === "funded" &&
                    Array.isArray(offerDetails?.matches) && (
                      <div className="offer-detail-row">
                        <span className="offer-detail-label">Requests</span>
                        <span className="offer-detail-value">
                          {offerDetails.matches.length}
                        </span>
                      </div>
                    )}
                  {/* Live fiat price — from /offer/:id/details */}
                  {offerDetails?.prices &&
                    Object.keys(offerDetails.prices).length > 0 && (
                      <div className="offer-detail-row">
                        <span className="offer-detail-label">Live price</span>
                        <span className="offer-detail-value">
                          {Object.entries(offerDetails.prices).map(
                            ([cur, val]) => (
                              <span key={cur} style={{ marginRight: 8 }}>
                                {cur} {val}
                              </span>
                            ),
                          )}
                        </span>
                      </div>
                    )}
                  {/* Live fiat price — buy offers (computed locally in allItems useMemo) */}
                  {isBuy &&
                    o.prices &&
                    Object.keys(o.prices).length > 0 && (
                      <div className="offer-detail-row">
                        <span className="offer-detail-label">Live price</span>
                        <span className="offer-detail-value">
                          {Object.entries(o.prices).map(([cur, val]) => (
                            <span key={cur} style={{ marginRight: 8 }}>
                              {cur} {Number(val).toFixed(2)}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Created</span>
                    <span className="offer-detail-value">
                      {o.createdAt
                        ? (() => {
                            const d = new Date(o.createdAt);
                            return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                          })()
                        : "—"}
                    </span>
                  </div>
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Attributes</span>
                    {attrChips.length === 0 ? (
                      <span
                        className="offer-detail-value"
                        style={{ color: "var(--black-50)" }}
                      >
                        None
                      </span>
                    ) : (
                      <div className="offer-detail-chips">
                        {attrChips.map((c, i) => (
                          <span key={`${c}-${i}`} className="method-chip">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Escrow address + QR — sell offers awaiting funding (needs / mempool) */}
                {!isBuy &&
                  (fundingStage === "needs" || fundingStage === "mempool") && (
                  <div
                    style={{
                      padding: "12px 20px 16px",
                      borderTop: "1px solid var(--black-10)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: ".72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        color: "var(--black-65)",
                        marginBottom: 8,
                      }}
                    >
                      Escrow address
                    </div>
                    {odEscrowAddress ? (
                      <div style={{ position: "relative" }}>
                        <div
                          style={
                            fundingStage === "mempool"
                              ? {
                                  filter: "blur(6px)",
                                  pointerEvents: "none",
                                  userSelect: "none",
                                }
                              : undefined
                          }
                        >
                        <div
                          onClick={() => {
                            navigator.clipboard
                              .writeText(odEscrowAddress)
                              .catch(() => {});
                            setOdCopiedAddr(true);
                            setTimeout(() => setOdCopiedAddr(false), 2000);
                          }}
                          style={{
                            fontFamily: "monospace",
                            fontSize: ".78rem",
                            background: "var(--black-5)",
                            border: "1px solid var(--black-10)",
                            borderRadius: 8,
                            padding: "10px 12px",
                            wordBreak: "break-all",
                            cursor: "pointer",
                          }}
                        >
                          {odEscrowAddress}
                        </div>
                        <div
                          style={{
                            fontSize: ".7rem",
                            fontWeight: 700,
                            color: "var(--success)",
                            minHeight: 16,
                            marginTop: 4,
                          }}
                        >
                          {odCopiedAddr
                            ? "✓ Copied to clipboard"
                            : "Click to copy"}
                        </div>

                        <div
                          style={{ textAlign: "right", marginTop: 6 }}
                        >
                          <a
                            href={`https://mempool.space/address/${odEscrowAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: ".72rem",
                              fontWeight: 600,
                              color: "var(--primary)",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            See on mempool.space
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 11 11"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M2 9L9 2M9 2H5M9 2v4" />
                            </svg>
                          </a>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            margin: "14px 0 8px",
                          }}
                        >
                          <div
                            style={{
                              padding: 10,
                              background: "white",
                              borderRadius: 10,
                              border: "1px solid var(--black-10)",
                            }}
                          >
                            <QRCodeSVG
                              value={
                                odQrWithAmount
                                  ? `bitcoin:${odEscrowAddress}?amount=${(o.amount / 1e8).toFixed(8)}`
                                  : odEscrowAddress
                              }
                              size={128}
                              level="L"
                              bgColor="#ffffff"
                              fgColor="#2B1911"
                            />
                          </div>
                        </div>

                        {/* Address only / Address + amount toggle */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginBottom: 6,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0,
                              background: "var(--black-5)",
                              borderRadius: 999,
                              padding: 3,
                              fontSize: ".72rem",
                              fontWeight: 700,
                            }}
                          >
                            <button
                              type="button"
                              style={{
                                border: "none",
                                borderRadius: 999,
                                padding: "4px 14px",
                                cursor: "pointer",
                                fontFamily: "Baloo 2, cursive",
                                fontSize: ".72rem",
                                fontWeight: 700,
                                background: !odQrWithAmount
                                  ? "white"
                                  : "transparent",
                                color: !odQrWithAmount
                                  ? "#2B1911"
                                  : "var(--black-65)",
                                boxShadow: !odQrWithAmount
                                  ? "0 1px 3px rgba(0,0,0,.1)"
                                  : "none",
                                transition: "all .15s",
                              }}
                              onClick={() => setOdQrWithAmount(false)}
                            >
                              Address only
                            </button>
                            <button
                              type="button"
                              style={{
                                border: "none",
                                borderRadius: 999,
                                padding: "4px 14px",
                                cursor: "pointer",
                                fontFamily: "Baloo 2, cursive",
                                fontSize: ".72rem",
                                fontWeight: 700,
                                background: odQrWithAmount
                                  ? "white"
                                  : "transparent",
                                color: odQrWithAmount
                                  ? "#2B1911"
                                  : "var(--black-65)",
                                boxShadow: odQrWithAmount
                                  ? "0 1px 3px rgba(0,0,0,.1)"
                                  : "none",
                                transition: "all .15s",
                              }}
                              onClick={() => setOdQrWithAmount(true)}
                            >
                              Address + amount
                            </button>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: ".68rem",
                            color: "var(--black-65)",
                            textAlign: "center",
                            lineHeight: 1.5,
                            marginBottom: 10,
                          }}
                        >
                          {odQrWithAmount
                            ? "QR includes amount — most wallets will fill it in automatically"
                            : "QR contains address only — enter the amount manually in your wallet"}
                        </div>

                        <div
                          style={{
                            fontSize: ".72rem",
                            color: "var(--black-65)",
                            textAlign: "center",
                            fontWeight: 500,
                            marginBottom: 12,
                          }}
                        >
                          Send exactly <SatsAmount sats={o.amount} /> to
                          activate your offer
                        </div>

                        {/* Fund via mobile app — alternative to scanning QR */}
                        <div style={{ marginBottom: 12 }}>
                          {odFundMobileRequested ? (
                            <div
                              style={{
                                padding: "10px 14px",
                                borderRadius: 8,
                                background: "var(--black-5)",
                                color: "var(--black-65)",
                                fontSize: ".78rem",
                                fontWeight: 700,
                                textAlign: "center",
                              }}
                            >
                              ✓ Funding request sent — check your phone
                            </div>
                          ) : (
                            <>
                              <div
                                style={{
                                  fontSize: ".68rem",
                                  fontWeight: 700,
                                  color: "var(--black-65)",
                                  textTransform: "uppercase",
                                  letterSpacing: ".05em",
                                  marginBottom: 6,
                                  textAlign: "center",
                                }}
                              >
                                Or fund from your Peach mobile app
                              </div>
                              <button
                                disabled={odFundMobileLoading}
                                onClick={async () => {
                                  setOdFundMobileError(null);
                                  setOdFundMobileLoading(true);
                                  try {
                                    const res = await post(
                                      `/offer/${o.id}/fundEscrowPendingAction`,
                                    );
                                    if (!res.ok) {
                                      const err = await res
                                        .json()
                                        .catch(() => null);
                                      throw new Error(
                                        err?.error ||
                                          err?.message ||
                                          `HTTP ${res.status}`,
                                      );
                                    }
                                    setOdFundMobileRequested(true);
                                    setToast("Request sent — check your phone");
                                    setTimeout(() => setToast(null), 3000);
                                  } catch (e) {
                                    setOdFundMobileError(
                                      "Failed to request funding: " + e.message,
                                    );
                                  } finally {
                                    setOdFundMobileLoading(false);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px 14px",
                                  borderRadius: 999,
                                  border: "none",
                                  background: "var(--grad)",
                                  color: "white",
                                  fontFamily: "var(--font)",
                                  fontSize: ".8rem",
                                  fontWeight: 800,
                                  cursor: odFundMobileLoading
                                    ? "default"
                                    : "pointer",
                                  opacity: odFundMobileLoading ? 0.6 : 1,
                                }}
                              >
                                {odFundMobileLoading
                                  ? "Sending request…"
                                  : "Fund via mobile app"}
                              </button>
                              {odFundMobileError && (
                                <div
                                  style={{
                                    color: "var(--error)",
                                    fontSize: ".74rem",
                                    fontWeight: 600,
                                    marginTop: 6,
                                    textAlign: "center",
                                  }}
                                >
                                  {odFundMobileError}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        </div>
                        {fundingStage === "mempool" && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--error)",
                              fontWeight: 800,
                              fontSize: ".95rem",
                              pointerEvents: "none",
                            }}
                          >
                            funding in progress
                          </div>
                        )}

                        {/* Wrong-amount call to action — parity with offer-creation step 2 */}
                        {offerDetails?.funding?.status ===
                          "WRONG_FUNDING_AMOUNT" && (
                          <div
                            style={{
                              background: "var(--error-bg,var(--error-bg))",
                              border: "1px solid var(--error)",
                              borderRadius: 10,
                              padding: "12px 14px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: ".78rem",
                                fontWeight: 700,
                                color: "var(--error)",
                                marginBottom: 6,
                              }}
                            >
                              ⚠ Wrong amount funded
                            </div>
                            <div
                              style={{
                                fontSize: ".72rem",
                                color: "var(--black-65)",
                                fontWeight: 500,
                                marginBottom: 10,
                                lineHeight: 1.5,
                              }}
                            >
                              Expected <strong>{fmt(o.amount)}</strong> sats —
                              received{" "}
                              <strong>
                                {fmt(
                                  (offerDetails.funding.amounts ?? []).reduce(
                                    (a, b) => a + b,
                                    0,
                                  ),
                                )}
                              </strong>{" "}
                              sats. Accept the received amount to continue, or
                              withdraw the offer to refund.
                            </div>
                            {odAcceptWrongError && (
                              <div
                                style={{
                                  color: "var(--error)",
                                  fontSize: ".74rem",
                                  fontWeight: 600,
                                  marginBottom: 6,
                                }}
                              >
                                {odAcceptWrongError}
                              </div>
                            )}
                            <button
                              disabled={odAcceptingWrong}
                              onClick={() => handleAcceptWrongAmount(o)}
                              style={{
                                width: "100%",
                                padding: "9px 14px",
                                borderRadius: 999,
                                background: "var(--grad)",
                                color: "white",
                                border: "none",
                                cursor: "pointer",
                                fontFamily: "var(--font)",
                                fontSize: ".78rem",
                                fontWeight: 700,
                              }}
                            >
                              {odAcceptingWrong
                                ? "Accepting…"
                                : "Accept anyway & continue"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: ".76rem",
                          color: "var(--black-40)",
                          fontWeight: 600,
                          padding: "8px 0",
                        }}
                      >
                        Loading escrow address…
                      </div>
                    )}
                  </div>
                )}

                {/* Funded sell offer: Edit + Cancel buttons replace the address section */}
                {!isBuy &&
                  fundingStage === "funded" &&
                  !odEditingPremium &&
                  !odWithdrawConfirm &&
                  !odRefundRequested && (
                    <div
                      style={{
                        padding: "12px 20px 16px",
                        borderTop: "1px solid var(--black-10)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8 }}>
                        {!FINISHED_STATUSES.has(o.tradeStatus) && (
                          <button
                            className="offer-detail-btn offer-detail-btn-edit"
                            onClick={() => {
                              setOdEditPremiumVal(String(o.premium ?? 0));
                              setOdEditingPremium(true);
                              setOdEditError(null);
                            }}
                          >
                            Edit premium
                          </button>
                        )}
                        <button
                          className="offer-detail-btn offer-detail-btn-withdraw"
                          onClick={() => {
                            setOdWithdrawConfirm(true);
                            setOdWithdrawError(null);
                          }}
                        >
                          Cancel offer
                        </button>
                      </div>
                    </div>
                  )}

                {/* Footer — actions */}
                <div className="offer-detail-footer">
                  {/* Unfunded sell offer: single "Cancel offer" button, no confirmation
                    (nothing has been escrowed, so the action is non-destructive). */}
                  {!odEditingPremium &&
                    !odWithdrawConfirm &&
                    o.direction === "sell" &&
                    o.tradeStatus === "fundEscrow" &&
                    fundingStage !== "funded" && (
                      <button
                        className="offer-detail-btn offer-detail-btn-withdraw"
                        disabled={odWithdrawing}
                        onClick={() => handleWithdrawOffer(o)}
                      >
                        {odWithdrawing ? "Cancelling…" : "Cancel offer"}
                      </button>
                    )}

                  {/* Wrong amount funded — seller chooses: continue with funded
                    amount (confirm escrow) or refund (cancel offer + mobile refund
                    pending action). Replaces the default edit/cancel buttons. */}
                  {!odEditingPremium &&
                    !odWithdrawConfirm &&
                    o.direction === "sell" &&
                    o.tradeStatus === "fundingAmountDifferent" &&
                    (() => {
                      const actualFunded = offerDetails?.funding?.amounts
                        ? offerDetails.funding.amounts.reduce(
                            (a, b) => a + b,
                            0,
                          )
                        : null;
                      if (odRefundRequested) {
                        return (
                          <div
                            style={{
                              padding: "10px 14px",
                              borderRadius: 8,
                              background: "var(--black-5)",
                              color: "var(--black-65)",
                              fontSize: ".78rem",
                              fontWeight: 700,
                              textAlign: "center",
                            }}
                          >
                            ✓ Refund request sent — check your phone
                          </div>
                        );
                      }
                      return (
                        <>
                          <div
                            style={{
                              fontSize: ".82rem",
                              color: "var(--black)",
                              lineHeight: 1.5,
                            }}
                          >
                            You funded the trade with{" "}
                            <strong>
                              {actualFunded != null
                                ? actualFunded.toLocaleString("en-US")
                                : "…"}
                            </strong>{" "}
                            sats, but the sell offer was created for{" "}
                            <strong>
                              {o.amount.toLocaleString("en-US")}
                            </strong>{" "}
                            sats. Do you want to continue with the sell offer
                            with{" "}
                            <strong>
                              {actualFunded != null
                                ? actualFunded.toLocaleString("en-US")
                                : "…"}
                            </strong>{" "}
                            sats, or do you want to be refunded?
                          </div>
                          {(odAcceptWrongError || odWithdrawError) && (
                            <div
                              style={{
                                color: "var(--error)",
                                fontSize: ".78rem",
                                fontWeight: 600,
                              }}
                            >
                              {odAcceptWrongError || odWithdrawError}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="offer-detail-btn offer-detail-btn-edit"
                              disabled={odAcceptingWrong || odWithdrawing}
                              onClick={() => handleAcceptWrongAmount(o)}
                            >
                              {odAcceptingWrong
                                ? "Confirming…"
                                : "Continue trade"}
                            </button>
                            <button
                              className="offer-detail-btn offer-detail-btn-withdraw"
                              disabled={odAcceptingWrong || odWithdrawing}
                              onClick={() => handleWithdrawOffer(o)}
                            >
                              {odWithdrawing ? "Refunding…" : "Refund escrow"}
                            </button>
                          </div>
                        </>
                      );
                    })()}

                  {/* Default: Edit + Cancel offer buttons (or refund-in-flight message).
                    Hidden for unfunded sell offers (handled above), for sell offers
                    with wrong-amount funded (handled by the choice panel above), and
                    for funded sell offers (handled by the inline buttons above). */}
                  {!odEditingPremium &&
                    !odWithdrawConfirm &&
                    !(
                      o.direction === "sell" &&
                      (o.tradeStatus === "fundEscrow" ||
                        o.tradeStatus === "fundingAmountDifferent" ||
                        fundingStage === "funded")
                    ) &&
                    (odRefundRequested ? (
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: "var(--black-5)",
                          color: "var(--black-65)",
                          fontSize: ".78rem",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        ✓ Refund request sent — check your phone
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        {!FINISHED_STATUSES.has(o.tradeStatus) && (
                          <button
                            className="offer-detail-btn offer-detail-btn-edit"
                            onClick={() => {
                              setOdEditPremiumVal(String(o.premium ?? 0));
                              setOdEditingPremium(true);
                              setOdEditError(null);
                            }}
                          >
                            Edit premium
                          </button>
                        )}
                        <button
                          className="offer-detail-btn offer-detail-btn-withdraw"
                          onClick={() => {
                            setOdWithdrawConfirm(true);
                            setOdWithdrawError(null);
                          }}
                        >
                          Cancel offer
                        </button>
                      </div>
                    ))}

                  {/* Edit premium mode — mobile-inspired layout */}
                  {odEditingPremium &&
                    (() => {
                      const pVal = parseFloat(odEditPremiumVal) || 0;
                      const dispCur = o.currency || selectedCurrency;
                      const curPrice = allPrices?.[dispCur] ?? btcPrice;
                      const fiatWithPremium =
                        satsToFiatRaw(o.amount, curPrice) * (1 + pVal / 100);
                      const step = 0.2;
                      const clamp = (v) =>
                        String(
                          Math.round(Math.max(-50, Math.min(50, v)) * 10) / 10,
                        );
                      return (
                        <div className="premium-editor">
                          <div className="premium-editor-title">
                            {pVal >= 0
                              ? "set your premium"
                              : "set your discount"}
                          </div>
                          <div className="premium-editor-subtitle">
                            for {o.direction === "buy" ? "buying" : "selling"}{" "}
                            <SatsAmount sats={o.amount} />
                          </div>

                          {/* +/- buttons + input */}
                          <div className="premium-editor-controls">
                            <button
                              className="premium-circle-btn"
                              disabled={pVal <= -50}
                              onClick={() =>
                                setOdEditPremiumVal(clamp(pVal - step))
                              }
                            >
                              −
                            </button>
                            <div className="premium-input-group">
                              <span className="premium-input-label">
                                premium:
                              </span>
                              <input
                                type="number"
                                step="0.2"
                                className="premium-input-field"
                                value={odEditPremiumVal}
                                onChange={(e) =>
                                  setOdEditPremiumVal(e.target.value)
                                }
                                autoFocus
                              />
                              <span className="premium-pct">%</span>
                            </div>
                            <button
                              className="premium-circle-btn"
                              disabled={pVal >= 50}
                              onClick={() =>
                                setOdEditPremiumVal(clamp(pVal + step))
                              }
                            >
                              +
                            </button>
                          </div>

                          {/* Slider */}
                          <div className="premium-slider-wrap">
                            <input
                              type="range"
                              className="premium-slider"
                              min="-50"
                              max="50"
                              step="0.2"
                              value={pVal}
                              onChange={(e) =>
                                setOdEditPremiumVal(e.target.value)
                              }
                            />
                          </div>

                          {/* Fiat equivalent */}
                          <div className="premium-fiat-line">
                            (currently {fmtFiat(fiatWithPremium)} {dispCur})
                          </div>

                          {/* Error */}
                          {odEditError && (
                            <div
                              style={{
                                color: "var(--error)",
                                fontSize: ".78rem",
                                fontWeight: 600,
                                width: "100%",
                              }}
                            >
                              {odEditError}
                            </div>
                          )}

                          {/* Cancel + Save buttons */}
                          <div className="premium-actions">
                            <button
                              className="premium-btn-cancel"
                              onClick={() => {
                                setOdEditingPremium(false);
                                setOdEditError(null);
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              className="premium-btn-save"
                              onClick={() => handleSaveOfferPremium(o)}
                              disabled={odEditSaving}
                            >
                              {odEditSaving ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                  {/* Withdraw confirmation */}
                  {odWithdrawConfirm && (
                    <div>
                      <div
                        style={{
                          fontSize: ".84rem",
                          fontWeight: 600,
                          color: "var(--black)",
                          marginBottom: 10,
                        }}
                      >
                        Cancel this offer?
                      </div>
                      <div
                        style={{
                          fontSize: ".78rem",
                          color: "var(--black-65)",
                          lineHeight: 1.5,
                          marginBottom: 12,
                        }}
                      >
                        {o.direction === "sell"
                          ? "The escrow funds will be returned via your mobile app."
                          : "This action cannot be undone."}
                      </div>
                      {odWithdrawError && (
                        <div
                          style={{
                            color: "var(--error)",
                            fontSize: ".78rem",
                            fontWeight: 600,
                            marginBottom: 8,
                          }}
                        >
                          {odWithdrawError}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="offer-detail-btn offer-detail-btn-edit"
                          onClick={() => {
                            setOdWithdrawConfirm(false);
                            setOdWithdrawError(null);
                          }}
                        >
                          Keep offer
                        </button>
                        <button
                          className="offer-detail-btn offer-detail-btn-withdraw"
                          style={{ background: "var(--error)", color: "white" }}
                          onClick={() => handleWithdrawOffer(o)}
                          disabled={odWithdrawing}
                        >
                          {odWithdrawing ? "Cancelling…" : "Yes, cancel"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── CANCELED SELL OFFER POPUP (never-matched, refund in-flight or done) ── */}
      {canceledOfferPopup &&
        (() => {
          const o = canceledOfferPopup;
          const d = canceledOfferDetails;
          // Tolerant read — backend doesn't expose a refund tx id field yet; these are
          // candidate names so the link lights up automatically once it does.
          const refundTxId =
            d?.refundTxId ??
            d?.refundTxHash ??
            d?.refundTx ??
            d?.refund?.txId ??
            d?.refund?.txHash ??
            null;
          const escrow = d?.escrow ?? null;
          const isRefunded = !!o.refunded || !!d?.refunded;
          const close = () => setCanceledOfferPopup(null);
          return (
            <div
              className="matches-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) close();
              }}
            >
              <div className="matches-popup">
                <div className="matches-header">
                  <span style={{ fontWeight: 800, fontSize: ".95rem" }}>
                    Canceled sell offer
                  </span>
                  <span
                    style={{
                      fontSize: ".78rem",
                      color: "var(--black-50)",
                      fontWeight: 600,
                    }}
                  >
                    {o.tradeId}
                  </span>
                  <button className="matches-close" onClick={close}>
                    ✕
                  </button>
                </div>

                <div className="offer-detail-body">
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Type</span>
                    <span
                      className="offer-detail-value"
                      style={{ color: "var(--error)" }}
                    >
                      Sell
                    </span>
                  </div>
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Amount</span>
                    <span className="offer-detail-value">
                      <SatsAmount sats={o.amount} />
                    </span>
                  </div>
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Premium</span>
                    <span
                      className="offer-detail-value"
                      style={{
                        color:
                          (o.premium ?? 0) > 0
                            ? "var(--success)"
                            : (o.premium ?? 0) < 0
                              ? "var(--error)"
                              : "var(--black)",
                      }}
                    >
                      {(o.premium ?? 0) > 0 ? "+" : ""}
                      {(o.premium ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  {o.methods?.length > 0 && (
                    <div className="offer-detail-row">
                      <span className="offer-detail-label">
                        Payment methods
                      </span>
                      <div className="offer-detail-chips">
                        {o.methods.map((m) => (
                          <span key={m} className="method-chip">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Status</span>
                    <span className="offer-detail-value">Offer Cancelled</span>
                  </div>
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Refund</span>
                    <span
                      className="offer-detail-value"
                      style={{
                        color: isRefunded
                          ? "var(--success)"
                          : "var(--black-65)",
                        fontWeight: 700,
                      }}
                    >
                      {isRefunded
                        ? "✓ Refunded"
                        : "Pending — awaiting mobile signature / broadcast"}
                    </span>
                  </div>
                  <div className="offer-detail-row">
                    <span className="offer-detail-label">Created</span>
                    <span className="offer-detail-value">
                      {o.createdAt
                        ? new Date(o.createdAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>

                {(refundTxId || escrow) && (
                  <div
                    style={{
                      padding: "12px 20px 16px",
                      borderTop: "1px solid var(--black-10)",
                      textAlign: "right",
                    }}
                  >
                    <a
                      href={
                        refundTxId
                          ? `https://mempool.space/tx/${refundTxId}`
                          : `https://mempool.space/address/${escrow}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: ".72rem",
                        fontWeight: 600,
                        color: "var(--black-65)",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--primary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--black-65)")
                      }
                    >
                      {refundTxId
                        ? "View refund tx on mempool.space"
                        : "View escrow on mempool.space"}
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 11 11"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 9L9 2M9 2H5M9 2v4" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* ── AUTH POPUP (when logged out) ── */}
      {!isLoggedIn && (
        <div className="auth-screen-overlay">
          <div className="auth-popup">
            <div className="auth-popup-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="5" y="12" width="18" height="13" rx="3" />
                <path d="M9 12V9a5 5 0 0 1 10 0v3" />
                <circle cx="14" cy="19" r="1.5" fill="var(--primary)" />
              </svg>
            </div>
            <div className="auth-popup-title">Authentication required</div>
            <div className="auth-popup-sub">
              Please authenticate to view your trades and manage active orders
            </div>
            <button className="auth-popup-btn" onClick={handleLogin}>
              Log in
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE SIGNING MODAL ── */}
      <MobileSigningModal
        open={!!signingModal}
        title={signingModal?.title}
        description={signingModal?.description}
        onCancel={() => setSigningModal(null)}
      />

      {/* ── TOAST ── */}
      {toast && (
        <div className={`toast-bar${toastTone === "error" ? " toast-bar--error" : ""}`}>
          {toast}
        </div>
      )}
    </>
  );
}
