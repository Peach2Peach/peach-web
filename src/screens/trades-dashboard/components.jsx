// ─── TRADES DASHBOARD — SUB-COMPONENTS ─────────────────────────────────────
// Extracted from peach-trades-dashboard.jsx
// Contains: icons, helpers, FilterDropdown, PILL_CONFIG, Badge,
//           TradeCard, HistorySatsAmount, CURRENCY_SYMBOLS, HistoryTable
// PeachRating is now shared — see src/components/PeachRating.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SatsAmount, IcoBtc } from "../../components/BitcoinAmount.jsx";
import { BTC_PRICE_FALLBACK as BTC_PRICE, satsToFiatRaw, relTime as relativeTime, formatDate } from "../../utils/format.js";
import { STATUS_CONFIG } from "../../data/statusConfig.js";
import Avatar from "../../components/Avatar.jsx";
import StatusChip from "../../components/StatusChip.jsx";
export { default as PeachRating } from "../../components/PeachRating.jsx";

// ─── ICONS ────────────────────────────────────────────────────────────────────
export const IconSort      = ({ dir }) => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d={dir === "asc" ? "M2 8l4-5 4 5" : dir === "desc" ? "M2 4l4 5 4-5" : "M2 4.5l4-3 4 3M2 7.5l4 3 4-3"}/></svg>;
export const IconChevDown  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,5 7,9 11,5"/></svg>;
export const IconMsg       = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-3 2V10H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/></svg>;
export const IconClock     = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="5"/><path d="M6.5 3.5v3l2 1.5"/></svg>;
export const IconAlert     = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2L1 12h12L7 2z"/><line x1="7" y1="6" x2="7" y2="9"/><circle cx="7" cy="11" r=".5" fill="currentColor"/></svg>;
export const IconEmpty     = () => <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--black-25)" strokeWidth="1.5" strokeLinecap="round"><rect x="8" y="12" width="32" height="28" rx="4"/><path d="M16 12V9a8 8 0 0 1 16 0v3"/><line x1="19" y1="24" x2="29" y2="24"/><line x1="19" y1="30" x2="25" y2="30"/></svg>;


// satsToFiat for dashboard: whole euros (no decimals) for compact display
export function satsToFiat(sats, price = BTC_PRICE) {
  return Math.round(satsToFiatRaw(sats, price)).toLocaleString("de-DE");
}

export const ALL_METHODS = ["SEPA","Revolut","Wise","PayPal","Strike"];
export const ALL_CURRENCIES = ["EUR","CHF","GBP"];
export const ALL_STATUSES = Object.keys(STATUS_CONFIG);


// ─── DROPDOWN FILTER ─────────────────────────────────────────────────────────
export function FilterDropdown({ label, options, selected, onChange }) {
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

// ─── PILL CONFIG — maps every status to pill appearance + label ──────────────
// Uses real API TradeStatus values
export const PILL_CONFIG = {
  // Pending / no action
  searchingForPeer:    { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Waiting for a match",   passive:true  },
  waitingForTradeRequest:{ bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Waiting for a match", passive:true  },
  offerHidden:         { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Offer hidden",          passive:true  },
  // Action required
  hasMatchesAvailable: { bg:"var(--primary)",    color:"white",              label:"View matches",          passive:false },
  acceptTradeRequest:  { bg:"var(--primary)",    color:"white",              label:"Accept trade request",  passive:false },
  offerHiddenWithMatchesAvailable: { bg:"var(--primary)", color:"white",    label:"View matches",          passive:false },
  // Sent trade request (synthetic — user performed a trade request on a counterparty's offer)
  tradeRequestSent:  { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Request sent",         passive:true  },
  // Escrow stage
  createEscrow:        { bg:"var(--primary)", color:"white", label:"Create Escrow",      passive:false },
  fundEscrow:          { bg:"var(--primary)", color:"white", label:"Fund Escrow",        passive:false },
  waitingForFunding:   { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Waiting for funding",  passive:true  },
  escrowWaitingForConfirmation: { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Escrow confirming", passive:true },
  fundingAmountDifferent: { bg:"var(--warning-soft)", color:"var(--warning)", label:"Wrong funding amount", passive:false },
  // Payment stage
  paymentRequired:     { bg:"var(--primary)", color:"white", label:"Send Payment",       passive:false },
  confirmPaymentRequired:{ bg:"var(--primary)", color:"white", label:"Confirm Payment",  passive:false },
  releaseEscrow:       { bg:"var(--success)",        color:"white", label:"Release Bitcoin",    passive:false },
  paymentTooLate:      { bg:"var(--warning-soft)",        color:"var(--warning)", label:"Not paid in time", passive:false },
  // Post-trade
  payoutPending:       { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Payout pending",       passive:true  },
  rateUser:            { bg:"var(--primary)",    color:"white", label:"Rate counterparty", passive:false },
  tradeCompleted:      { bg:"var(--success-bg)", color:"var(--success)", label:"Completed",               passive:true  },
  // Dispute / cancel
  dispute:             { bg:"var(--error)",        color:"white", label:"View Dispute",       passive:false },
  disputeWithoutEscrowFunded: { bg:"var(--error)", color:"white", label:"View Dispute",       passive:false },
  confirmCancelation:  { bg:"var(--error)",        color:"white", label:"Confirm Cancel",     passive:false },
  // Finished
  offerCanceled:       { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Offer cancelled",      passive:true  },
  tradeCanceled:       { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Cancelled",             passive:true  },
  fundingExpired:      { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Funding expired",       passive:true  },
  wrongAmountFundedOnContract: { bg:"var(--warning-soft)", color:"var(--warning)", label:"Wrong amount",     passive:false },
  wrongAmountFundedOnContractRefundWaiting: { bg:"var(--primary-bg)", color:"var(--primary-dark)", label:"Refund pending", passive:true },
  // Refund
  refundAddressRequired:     { bg:"var(--primary)", color:"white", label:"Refund address needed", passive:false },
  refundOrReviveRequired:    { bg:"var(--primary)", color:"white", label:"Refund or revive",      passive:false },
  refundTxSignatureRequired: { bg:"var(--primary)", color:"white", label:"Sign refund",           passive:false },
};

// Direction-aware label overrides (buyer vs seller see different labels)
const SELLER_LABEL = {
  paymentRequired: "Waiting for Payment",
};
const BUYER_LABEL = {
  confirmPaymentRequired: "Payment Sent",
};


// ─── BADGE — sober outlined style ─────────────────────────────────────────────
export function Badge({ label, icon }) {
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
export function TradeCard({ trade, onSelect, layout = "grid" }) {
  const statusKey = trade.tradeStatus ?? "searchingForPeer";
  const pill = PILL_CONFIG[statusKey] || PILL_CONFIG.searchingForPeer;
  const isBuy = trade.direction === "buy";
  const pillLabel = (isBuy ? BUYER_LABEL : SELLER_LABEL)[statusKey] ?? pill.label;
  const hasSatsRange = Array.isArray(trade.amount);
  const hasMatches = trade.tradeStatus === "hasMatchesAvailable" || trade.tradeStatus === "acceptTradeRequest";

  function fiatStr() {
    if (hasSatsRange) return `≈ €${satsToFiat(trade.amount[0])}–€${satsToFiat(trade.amount[1])}`;
    if (trade.fiatAmount) return `€${trade.fiatAmount}`;
    return `≈ €${satsToFiat(trade.amount)}`;
  }

  function timeStr() {
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
        <span className="trade-row-id">{trade.tradeId ?? trade.id}</span>
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
          {!pill.passive && <span style={{ width:6, height:6, borderRadius:"50%", background:pill.color, display:"inline-block", flexShrink:0 }}/>}
          {pillLabel}
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
          {trade.tradeId ?? trade.id}
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
              <span style={{ color:"var(--black-25)", fontWeight:700, fontSize:".88rem" }}>0.00</span>
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
                ? (trade.premium < 0 ? "var(--success)" : "var(--error)")
                : (trade.premium > 0 ? "var(--success)" : "var(--error)"),
            }}>
              {trade.premium > 0 ? "+" : ""}{trade.premium.toFixed(2)}%
            </span>
          )}
          <span style={{ fontSize:".68rem", color: isUrgentTime ? "var(--error)" : "var(--black-65)",
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
        {!pill.passive && <span style={{ width:6, height:6, borderRadius:"50%", background:pill.color, display:"inline-block", flexShrink:0 }}/>}
        {pillLabel}
      </button>

    </div>
  );
}

// ─── HISTORY TABLE ────────────────────────────────────────────────────────────
export function HistorySatsAmount({ sats }) {
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
      <span style={{ color:"var(--black-25)", fontWeight:700, fontSize:".78rem", whiteSpace:"nowrap" }}>{greyPart}</span>
      <span style={{ color:"var(--black)", fontWeight:800, fontSize:".78rem", whiteSpace:"nowrap" }}>{satsStr} Sats</span>
    </span>
  );
}

export const CURRENCY_SYMBOLS = { EUR: "€", CHF: "CHF ", GBP: "£", USD: "$", SEK: "kr ", NOK: "kr ", DKK: "kr ", PLN: "zł", CZK: "Kč " };

export function HistoryTable({ rows, onTradeSelect, selectedCurrency, tab, onRefresh, isLoading, emptyMessage, hideStatus }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState(-1);
  const [userSorted, setUserSorted] = useState(false); // true once user clicks a sort header
  const [histSearch, setHistSearch] = useState("");
  const [dirFilter, setDirFilter] = useState("all");       // "all" | "buy" | "sell"
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "completed" | "cancelled"

  // Pick the best fiat price: prefer topbar currency, fall back to offer's default
  function fiatDisplay(r) {
    const prices = r.prices ?? {};
    // If topbar currency is available in this offer's prices, use it
    if (selectedCurrency && prices[selectedCurrency] != null) {
      const sym = CURRENCY_SYMBOLS[selectedCurrency] ?? selectedCurrency + " ";
      return `${sym}${Number(prices[selectedCurrency]).toFixed(2)}`;
    }
    // Fall back to the offer's stored fiatAmount + currency
    if (r.fiatAmount && r.fiatAmount !== "—") {
      const sym = CURRENCY_SYMBOLS[r.currency] ?? r.currency + " ";
      return `${sym}${r.fiatAmount}`;
    }
    return "—";
  }

  const isHistory = tab === "history";

  function toggleSort(key) {
    setUserSorted(true);
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(-1); }
  }

  // Status grouping for the filter: "completed" covers all completion-like statuses,
  // "cancelled" covers all cancellation-like statuses
  function statusGroup(s) {
    if (["tradeCompleted"].includes(s)) return "completed";
    if (["offerCanceled", "tradeCanceled", "fundingExpired"].includes(s)) return "cancelled";
    return "other";
  }

  const sorted = [...rows]
    .filter(r => {
      if (dirFilter !== "all" && r.direction !== dirFilter) return false;
      if (statusFilter !== "all" && statusGroup(r.tradeStatus) !== statusFilter) return false;
      if (!histSearch.trim()) return true;
      const q = histSearch.toLowerCase();
      return r.tradeId.toLowerCase().includes(q) ||
        r.currency.toLowerCase().includes(q) ||
        (r.tradeStatus ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      // Pin action-required items on top unless user clicked a sort header
      if (!userSorted) {
        const aAction = STATUS_CONFIG[a.tradeStatus]?.action ? 1 : 0;
        const bAction = STATUS_CONFIG[b.tradeStatus]?.action ? 1 : 0;
        if (aAction !== bAction) return bAction - aAction; // action items first
      }
      if (sortKey === "status") {
        const aLabel = (STATUS_CONFIG[a.tradeStatus]?.label ?? a.tradeStatus ?? "").toLowerCase();
        const bLabel = (STATUS_CONFIG[b.tradeStatus]?.label ?? b.tradeStatus ?? "").toLowerCase();
        return aLabel.localeCompare(bLabel) * sortDir;
      }
      if (sortKey === "createdAt")   return (a.createdAt - b.createdAt) * sortDir;
      if (sortKey === "amount")      return (a.amount - b.amount) * sortDir;
      if (sortKey === "fiatAmount")  return (parseFloat(a.fiatAmount || 0) - parseFloat(b.fiatAmount || 0)) * sortDir;
      if (sortKey === "premium")     return (a.premium - b.premium) * sortDir;
      return 0;
    });

  function exportCSV() {
    const headers = ["Trade ID","Type","Status","Amount (sats)","Fiat","Currency","Premium (%)","Date"];
    const rowsCSV = sorted.map(r => [
      r.tradeId, r.direction.toUpperCase(), r.tradeStatus,
      r.amount, r.fiatAmount, r.currency,
      r.premium.toFixed(2), formatDate(r.createdAt),
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

  const statusColor = { completed:"var(--success)", cancelled:"var(--black-65)" };
  const emptyText = emptyMessage ?? "No trade history yet.";

  return (
    <div>
      {/* Search + Filters + Export row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <input
          className="hist-search"
          placeholder="Search by ID, currency, status…"
          value={histSearch}
          onChange={e => setHistSearch(e.target.value)}
        />
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {onRefresh && <button
            className="refresh-btn"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh trades"
            style={{opacity:isLoading?0.5:1,flexShrink:0}}
          >
            ↻
          </button>}
          <select
            className="filter-select"
            value={dirFilter}
            onChange={e => setDirFilter(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          {isHistory && <select
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>}
          {isHistory && <button onClick={exportCSV} className="hist-export-btn">
            ↓ Export CSV
          </button>}
        </div>
      </div>

      {/* ── Desktop table ── */}
      <div className="hist-table-wrap hist-desktop">
        <table className="hist-table">
          <thead>
            <tr>
              <th>Trade ID</th>
              <th>Type</th>
              {!hideStatus && <Th col="status" label="Status"/>}
              <Th col="amount" label="Amount"/>
              <Th col="fiatAmount" label="Fiat"/>
              <Th col="premium" label="Premium" align="right"/>
              <Th col="createdAt" label="Date"/>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={hideStatus ? 6 : 7} style={{ textAlign:"center", padding:"32px 16px", color:"var(--black-65)", fontSize:".88rem" }}>
                  {emptyText}
                </td>
              </tr>
            )}
            {sorted.map(r => (
              <tr key={r.id} className="hist-row" style={{cursor:"pointer"}} onClick={() => onTradeSelect ? onTradeSelect(r) : navigate(`/trade/${r.id}`)}>
                <td><span style={{ fontFamily:"monospace", fontSize:".78rem", color:"var(--black-65)" }}>{r.tradeId}</span></td>
                <td>
                  <span className={`direction-badge direction-${r.direction}`}>{r.direction.toUpperCase()}</span>
                </td>
                {!hideStatus && (
                  <td>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                      <StatusChip status={r.tradeStatus} showAction role={r.direction === "sell" ? "seller" : "buyer"}/>
                      {r.experienceLevel&&<span title={r.experienceLevel==="experiencedUsersOnly"?"Experienced users only":"New users only"} style={{fontSize:".72rem"}}>{r.experienceLevel==="experiencedUsersOnly"?"👤":"🆕"}</span>}
                      {r.instantTrade&&<span title="Instant trade" style={{fontSize:".72rem"}}>⚡</span>}
                      {r.unread > 0 && <span className="unread-badge"><span style={{ lineHeight:1 }}>{r.unread}</span><IconMsg/></span>}
                    </span>
                  </td>
                )}
                <td><HistorySatsAmount sats={r.amount}/></td>
                <td style={{ fontWeight:600 }}>{fiatDisplay(r)}</td>
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
                <td style={{ color:"var(--black-65)", fontSize:".82rem", whiteSpace:"nowrap" }}>{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile list ── */}
      <div className="hist-mobile">
        {sorted.length === 0 && (
          <div style={{ textAlign:"center", padding:"32px 16px", color:"var(--black-65)", fontSize:".88rem" }}>
            {emptyText}
          </div>
        )}
        {sorted.map(r => (
          <div key={r.id} className="hist-mob-row" onClick={() => onTradeSelect ? onTradeSelect(r) : navigate(`/trade/${r.id}`)}>
            <div className="hist-mob-left">
              <span className="hist-mob-id">{r.tradeId}</span>
              <span className="hist-mob-date">{formatDate(r.createdAt)}</span>
              <span className="hist-mob-status" style={{
                color: r.direction === "buy" ? "var(--success)" : "var(--error)"
              }}>
                {r.direction === "buy"
                  ? (isHistory ? "↓ Bought" : "↓ Buy")
                  : (isHistory ? "↑ Sold" : "↑ Sell")}
              </span>
            </div>
            <div className="hist-mob-right">
              <HistorySatsAmount sats={r.amount}/>
              <span className="hist-mob-fiat">{fiatDisplay(r)}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
