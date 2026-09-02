// ─── TRADING CONDITIONS UPDATE ──────────────────────────────────────────────
// Temporary notice shown wherever a user is about to enter a trade as a buyer:
// creating a buy offer, or requesting a trade on someone's sell offer.
// Mirrors the mobile app's blue info banner + popup (copy is verbatim).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import InfoPopup from "./InfoPopup.jsx";

const INFO_BLUE = "#1FA3E8";

const BANNER_CSS = `
  .tcu-banner{display:flex;align-items:center;gap:12px;width:100%;text-align:left;
    border:none;border-radius:14px;padding:12px 16px;cursor:pointer;
    background:#DFF1FC;color:#1D7BAF;font-family:var(--font);
    font-weight:600;font-size:.85rem;line-height:1.45;
    transition:filter .15s,box-shadow .15s}
  .tcu-banner:hover{filter:brightness(.97);box-shadow:0 2px 12px rgba(31,163,232,.22)}
  .tcu-banner:focus-visible{outline:2px solid ${INFO_BLUE};outline-offset:2px}
  .tcu-banner-ico{flex-shrink:0;display:inline-flex;align-items:center;
    justify-content:center;width:20px;height:20px;border-radius:50%;
    border:1.5px solid currentColor;font-size:.72rem;font-weight:800;line-height:1}
  [data-theme="dark"] .tcu-banner{background:#1C2C36;color:#7FC5EA}
`;

// The paragraph containing the bold clause; split so the emphasis matches the
// mobile copy exactly ("tradingConditionsUpdate.text.bold").
const BOLD = "Peach's escrow system doesn't have any control from Peach's part";

export function TradingConditionsInfoPopup({ onClose }) {
  return (
    <InfoPopup title="trading conditions updated" onClose={onClose}>
      <p className="ip-text">Peach has some temporary changes to its trading system.</p>
      <p className="ip-text">
        First of all: only very highly trusted sellers with a long reputation at Peach can sell.
        Peach created a very demanding set of criteria to allow sellers to participate.
      </p>
      <p className="ip-text">
        Temporarily, <strong>{BOLD}</strong>: the seller fully controls the escrowed BTC.
      </p>
      <p className="ip-text">
        In case of dispute, Peach is still available to assist and mediate the dispute, and in
        ultimate cases provide full support if the seller is acting wrongfully.
      </p>
      <p className="ip-text">Any questions, please contact us directly!</p>
    </InfoPopup>
  );
}

// Self-contained: renders the clickable banner and owns its popup state, so
// call sites only need to drop it in where the notice belongs.
export default function TradingConditionsBanner({ style }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <style>{BANNER_CSS}</style>
      <button type="button" className="tcu-banner" style={style} onClick={() => setOpen(true)}>
        <span className="tcu-banner-ico" aria-hidden="true">i</span>
        <span>Peach has updated the trading conditions, press to read more!</span>
      </button>
      {open && <TradingConditionsInfoPopup onClose={() => setOpen(false)} />}
    </>
  );
}
