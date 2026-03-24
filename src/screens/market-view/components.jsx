// ─── MARKET VIEW — SUB-COMPONENTS & HELPERS ─────────────────────────────────
// Extracted from peach-market-view.jsx.
// All components are prop-driven with no parent state closures.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { SatsAmount } from "../../components/BitcoinAmount.jsx";
import { PeachRating } from "../trades-dashboard/components.jsx";
import { fmtPct, fmtFiat } from "../../utils/format.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert API rating (-1…+1) to Peach scale (0…5) */
export function toPeaches(apiRating) {
  return (apiRating + 1) / 2 * 5;
}

export function premiumStats(offers) {
  if (!offers.length) return { avg: null, best: null };
  const vals = offers.map(o => o.premium);
  const avg  = (vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(2);
  const min  = Math.min(...vals).toFixed(2);
  const max  = Math.max(...vals).toFixed(2);
  return { avg, min, max };
}

/** Premium color class: seller perspective → high premium is GOOD */
export function premiumCls(p, isSellTab) {
  if (p === 0) return "prem-zero";
  if (isSellTab) return p > 0 ? "prem-good" : "prem-bad";
  return p < 0 ? "prem-good" : "prem-bad";
}

const CURRENCY_SYMBOL = { EUR:"€", GBP:"£", USD:"$", CHF:"CHF", JPY:"¥", SEK:"kr", NOK:"kr", DKK:"kr" };
export function currSym(c) { return CURRENCY_SYMBOL[c] || c; }

// ── MultiSelect ──────────────────────────────────────────────────────────────

export function MultiSelect({ label, options, value, onChange }) {
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

// ── Chips ─────────────────────────────────────────────────────────────────────

const MAX_CHIPS = 4;
export function Chips({ items, className }) {
  const hasOverflow = items.length > MAX_CHIPS;
  const visible = hasOverflow ? items.slice(0, MAX_CHIPS - 1) : items;
  const extra = items.length - (MAX_CHIPS - 1);
  return <>
    {visible.map(v => <span key={v} className={className}>{v}</span>)}
    {hasOverflow && <span className={className} style={{opacity:.55}}>+{extra}</span>}
  </>;
}

// ── RepCell ───────────────────────────────────────────────────────────────────

export function RepCell({ offer }) {
  const initials = offer.id.toUpperCase().slice(0, 2);
  return (
    <div className="rep-cell">
      <span className="offer-id-label">{offer.tradeId}</span>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
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
    </div>
  );
}

// ── AmountCell ────────────────────────────────────────────────────────────────

export function AmountCell({ offer, btcPrice, currency }) {
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

// ── PriceCell ─────────────────────────────────────────────────────────────────

export function PriceCell({ offer, btcPrice, currency, isSellTab }) {
  const rate = Math.round(btcPrice * (1 + offer.premium / 100));
  const sym  = currSym(currency);
  const p = offer.premium;
  return (
    <div className="price-cell">
      <span className="price-rate">{rate.toLocaleString("fr-FR")} {sym}</span>
      <span className={premiumCls(p, isSellTab)}>{p > 0 ? "+" : ""}{p.toFixed(2)}%</span>
    </div>
  );
}
