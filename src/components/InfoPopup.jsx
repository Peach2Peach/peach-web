// ─── INFO POPUP ─────────────────────────────────────────────────────────────
// Shared in-context help modal + inline "?" dot trigger. Mirrors the mobile
// app's help popups but styled to the Peach web modal pattern (white card,
// pill button, top-right close). Blue is used as an accent for "info".
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";

const INFO_BLUE = "#1FA3E8";

const INFO_CSS = `
  .ip-overlay{position:fixed;inset:0;z-index:700;background:rgba(43,25,17,.55);
    display:flex;align-items:center;justify-content:center;padding:20px;
    animation:ip-fade .15s ease}
  @keyframes ip-fade{from{opacity:0}to{opacity:1}}
  .ip-card{position:relative;background:var(--surface);border-radius:16px;
    padding:28px 24px;max-width:380px;width:100%;
    box-shadow:0 20px 60px rgba(0,0,0,.25);
    animation:modalIn .18s ease;color:var(--text);font-family:var(--font)}
  .ip-header{display:flex;align-items:flex-start;gap:12px}
  .ip-icon{flex-shrink:0;color:${INFO_BLUE};font-weight:800;font-size:1.35rem;
    line-height:1.2;margin-top:1px}
  .ip-title{font-weight:800;font-size:1.05rem;margin:0;color:var(--text);
    line-height:1.25;flex:1;min-width:0}
  .ip-body{margin-top:14px;padding-left:30px}
  .ip-text{font-size:.88rem;line-height:1.6;color:var(--black-65);margin:0}
  .ip-text + .ip-text{margin-top:10px}
  .ip-actions{margin-top:22px;display:flex}
  .ip-btn{flex:1;border:none;border-radius:999px;
    font-family:var(--font);font-weight:800;font-size:.95rem;
    color:#fff;background:${INFO_BLUE};padding:13px;cursor:pointer;
    box-shadow:0 4px 18px rgba(31,163,232,.4);transition:filter .15s}
  .ip-btn:hover{filter:brightness(0.92)}

  .ip-dot{display:inline-flex;align-items:center;justify-content:center;
    width:18px;height:18px;border-radius:50%;border:1.5px solid ${INFO_BLUE};
    background:transparent;color:${INFO_BLUE};cursor:pointer;padding:0;
    margin-left:6px;vertical-align:middle;font-family:var(--font);
    font-weight:800;font-size:.72rem;line-height:1;
    transition:background .12s,color .12s}
  .ip-dot:hover{background:${INFO_BLUE};color:#fff}
  .ip-dot:focus-visible{outline:2px solid ${INFO_BLUE};outline-offset:2px}

  .ip-badge-row{display:flex;align-items:flex-start;gap:10px;margin-top:14px}
  .ip-badge-row:first-of-type{margin-top:0}
  .ip-badge-ico{flex-shrink:0;width:22px;height:22px;border-radius:50%;
    background:${INFO_BLUE};color:#fff;display:inline-flex;align-items:center;
    justify-content:center;font-size:.8rem;font-weight:800;line-height:1}
  .ip-badge-body{flex:1;min-width:0}
  .ip-badge-name{font-weight:800;color:var(--text);font-size:.92rem;line-height:1.2}
  .ip-badge-desc{font-size:.85rem;line-height:1.5;color:var(--black-65);margin-top:4px}
`;

export function InfoDot({ onClick, ariaLabel }) {
  return (
    <>
      <style>{INFO_CSS}</style>
      <button
        type="button"
        className="ip-dot"
        aria-label={ariaLabel || "More info"}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
      >
        ?
      </button>
    </>
  );
}

// ── Pre-canned: Peach badges explainer ──
// Single source of truth for the four badge descriptions. Mounted by every
// clickable badge across the app; copy is verbatim from the mobile help popup.
export function BadgesInfoPopup({ onClose }) {
  return (
    <InfoPopup title="Peach badges" onClose={onClose}>
      <div className="ip-badge-row">
        <span className="ip-badge-ico" aria-hidden="true">★</span>
        <div className="ip-badge-body">
          <div className="ip-badge-name">supertrader</div>
          <div className="ip-badge-desc">A supertrader is a very active Peach user. They have done at least 20 trades.</div>
        </div>
      </div>
      <div className="ip-badge-row">
        <span className="ip-badge-ico" aria-hidden="true">⚡</span>
        <div className="ip-badge-body">
          <div className="ip-badge-name">fast trader</div>
          <div className="ip-badge-desc">A fast trader is as quick as the lightning network. They accept matches and make or confirm payments almost instantly.</div>
        </div>
      </div>
      <div className="ip-badge-row">
        <span className="ip-badge-ico" aria-hidden="true">🏅</span>
        <div className="ip-badge-body">
          <div className="ip-badge-name">early adopter</div>
          <div className="ip-badge-desc">These fine people have been with us from the very beginning!</div>
        </div>
      </div>
      <div className="ip-badge-row">
        <span className="ip-badge-ico" aria-hidden="true">🔁</span>
        <div className="ip-badge-body">
          <div className="ip-badge-name">repeat trader</div>
          <div className="ip-badge-desc">The number of times you have traded with this user in the past.</div>
        </div>
      </div>
    </InfoPopup>
  );
}

// ── Pre-canned: Trading limits explainer ──
export function TradingLimitsInfoPopup({ onClose }) {
  return (
    <InfoPopup title="trading limits" onClose={onClose}>
      <p className="ip-text">Peach enforces trading limits to comply with Swiss law:</p>
      <p className="ip-text">
        Daily: up to 1,000 CHF in bitcoin<br/>
        Monthly (anonymous methods: cash or online gift cards): up to 1,000 CHF<br/>
        Yearly: up to 100,000 CHF in bitcoin
      </p>
    </InfoPopup>
  );
}

export default function InfoPopup({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <style>{INFO_CSS}</style>
      <div className="ip-overlay" onClick={onClose}>
        <div className="ip-card" onClick={(e) => e.stopPropagation()}>
          <div className="ip-header">
            <span className="ip-icon" aria-hidden="true">ⓘ</span>
            {title && <h2 className="ip-title">{title}</h2>}
          </div>
          <div className="ip-body">{children}</div>
          <div className="ip-actions">
            <button type="button" className="ip-btn" onClick={onClose}>Got it</button>
          </div>
        </div>
      </div>
    </>
  );
}
