// ─── MARKET VIEW — SUB-COMPONENTS & HELPERS ─────────────────────────────────
// Extracted from peach-market-view.jsx.
// All components are prop-driven with no parent state closures.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { SatsAmount } from "../../components/BitcoinAmount.jsx";
import PeachRating from "../../components/PeachRating.jsx";
import Avatar from "../../components/Avatar.jsx";
import { fmtPct, fmtFiat, toPeaches, hasPrice, PRICE_PLACEHOLDER } from "../../utils/format.js";
import { BadgesInfoPopup } from "../../components/InfoPopup.jsx";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

export function MultiSelect({ label, options, value, onChange, searchable = false, searchPlaceholder = "Search…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  // Normalize options: accept both ["EUR", ...] and [{value:"EUR", count:12}, ...]
  const normOptions = options.map(o =>
    typeof o === "string" ? { value: o, count: undefined } : o
  );

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset query whenever the panel closes; focus the search when it opens
  useEffect(() => {
    if (!open) {
      setQuery("");
    } else if (searchable) {
      const id = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open, searchable]);

  function toggle(v) {
    if (value.includes(v)) onChange(value.filter(x => x !== v));
    else onChange([...value, v]);
  }

  const allSelected = value.length === 0;
  const displayLabel = allSelected
    ? label
    : value.length === 1
      ? value[0]
      : `${value[0]} +${value.length - 1}`;

  const q = query.trim().toLowerCase();
  const visibleOptions = searchable && q
    ? normOptions.filter(o => o.value.toLowerCase().includes(q))
    : normOptions;

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
          {searchable && (
            <div className="ms-search-wrap">
              <input
                ref={searchRef}
                className="ms-search"
                placeholder={searchPlaceholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
          {visibleOptions.length === 0 ? (
            <div className="ms-empty">No results</div>
          ) : (
            visibleOptions.map(opt => {
              const checked = value.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  className={`ms-option${checked ? " selected" : ""}`}
                  onClick={() => toggle(opt.value)}
                >
                  <div className={`ms-checkbox${checked ? " checked" : ""}`}>
                    {checked && "✓"}
                  </div>
                  <span className="ms-option-label">{opt.value}</span>
                  {opt.count !== undefined && (
                    <span className="ms-option-count">({opt.count})</span>
                  )}
                </div>
              );
            })
          )}
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
  const [helpOpen, setHelpOpen] = useState(false);
  const onBadgeClick = (e) => { e.stopPropagation(); setHelpOpen(true); };
  const badgeStyle = { cursor:"pointer" };

  if (offer.isOwn) {
    return (
      <div className="rep-cell rep-cell-own">
        <span className="user-peach-id">{offer.peachId}</span>
        <span className="my-offer-badge">My offer</span>
        {offer.badges.length > 0 && (
          <div className="badges-row">
            {offer.badges.includes("supertrader") && <span className="badge badge-super" style={badgeStyle} onClick={onBadgeClick}>🏆 Super</span>}
            {offer.badges.includes("fast")        && <span className="badge badge-fast"  style={badgeStyle} onClick={onBadgeClick}>⚡ Fast</span>}
          </div>
        )}
        {helpOpen && <BadgesInfoPopup onClose={() => setHelpOpen(false)} />}
      </div>
    );
  }
  return (
    <div className="rep-cell">
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <Avatar peachId={offer.userId} size={32} online={offer.online} />
        <div className="rep-info">
          <span className="user-peach-id">{offer.peachId}</span>
          <div className="rep-row">
            <PeachRating rep={offer.rep} size={14} trades={offer.trades}/>
            <span className="rep-trades">({offer.trades})</span>
          </div>
          {offer.badges.length > 0 && (
            <div className="badges-row">
              {offer.badges.includes("supertrader") && <span className="badge badge-super" style={badgeStyle} onClick={onBadgeClick}>🏆 Super</span>}
              {offer.badges.includes("fast")        && <span className="badge badge-fast"  style={badgeStyle} onClick={onBadgeClick}>⚡ Fast</span>}
            </div>
          )}
        </div>
      </div>
      {helpOpen && <BadgesInfoPopup onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

// ── OfferIdCopy ──────────────────────────────────────────────────────────────

export function OfferIdCopy({ tradeId }) {
  const [copied, setCopied] = useState(false);
  function copy(e) {
    e.stopPropagation();
    try { navigator.clipboard.writeText(tradeId); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <span className="offer-id-copy" onClick={copy} title="Copy offer ID">
      <span className="offer-id-copy-label">offer ID:</span>
      <span className={`offer-id-copy-value${copied ? " is-copied" : ""}`}>
        {copied ? "✓ Copied" : tradeId}
      </span>
    </span>
  );
}

// ── AmountCell ────────────────────────────────────────────────────────────────

export function AmountCell({ offer, btcPrice, currency }) {
  const priced = hasPrice(btcPrice);
  const rate = btcPrice * (1 + offer.premium / 100);
  const fiat = (offer.amount / 100_000_000) * rate;
  const sym  = currSym(currency);
  return (
    <div className="amount-cell">
      <SatsAmount sats={offer.amount} />
      <span className="amount-fiat">{sym}{priced ? fmtFiat(fiat) : PRICE_PLACEHOLDER}</span>
    </div>
  );
}

// ── PriceCell ─────────────────────────────────────────────────────────────────

export function PriceCell({ offer, btcPrice, currency, isSellTab }) {
  const priced = hasPrice(btcPrice);
  const rate = Math.round(btcPrice * (1 + offer.premium / 100));
  const sym  = currSym(currency);
  const p = offer.premium;
  return (
    <div className="price-cell">
      <span className="price-rate">{priced ? rate.toLocaleString("fr-FR") : PRICE_PLACEHOLDER} {sym}</span>
      <span className={premiumCls(p, isSellTab)}>{p > 0 ? "+" : ""}{p.toFixed(2)}%</span>
    </div>
  );
}
