import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi.js";
import { SatsAmount } from "./BitcoinAmount.jsx";

// Global popup shown the moment a wrong-amount escrow funding is detected on a
// sell offer (fired by useNotifications via "peach:funding-amount-different").
//   variant "choice" → seller may continue with the funded amount or refund.
//   variant "refund" → funding can't be used (e.g. above limit) → refund only.
// Operates at the offer level: continue = confirm escrow; refund = cancel offer
// + trigger the mobile refund pending action, then route to the trades dashboard
// where the mobile-signing UI lives.
const css = `
.wfa-overlay{
  position:fixed;inset:0;z-index:650;
  background:rgba(43,25,17,.55);
  display:flex;align-items:center;justify-content:center;
  padding:20px;animation:fadeIn .15s ease;
}
.wfa-card{
  background:var(--surface);border-radius:20px;
  padding:32px 28px 24px;max-width:400px;width:100%;
  display:flex;flex-direction:column;gap:16px;
  animation:modalIn .18s ease;
  box-shadow:0 16px 48px rgba(0,0,0,.18);
}
.wfa-head{display:flex;align-items:center;gap:12px}
.wfa-circle{
  width:48px;height:48px;border-radius:50%;flex-shrink:0;
  background:var(--warning-soft);
  display:flex;align-items:center;justify-content:center;
  font-size:1.4rem;
}
.wfa-title{font-size:1.2rem;font-weight:800;color:var(--warning)}
.wfa-text{font-size:.88rem;font-weight:500;color:var(--black-65);line-height:1.6}
.wfa-amounts{
  display:flex;flex-direction:column;gap:8px;
  background:color-mix(in srgb, var(--warning) 8%, transparent);border-radius:10px;padding:14px 16px;
}
.wfa-row{display:flex;align-items:center;justify-content:space-between}
.wfa-label{font-size:.8rem;font-weight:600;color:var(--warning);min-width:70px}
.wfa-divider{height:1px;background:color-mix(in srgb, var(--warning) 14%, transparent)}
.wfa-loading{font-size:.84rem;font-weight:600;color:var(--warning)}
.wfa-err{font-size:.8rem;color:var(--error);font-weight:600}
.wfa-btns{display:flex;gap:10px;margin-top:4px}
.wfa-btn{
  flex:1;padding:12px 18px;border-radius:999px;
  font-family:'Baloo 2',cursive;font-size:.86rem;font-weight:800;
  cursor:pointer;border:none;transition:filter .15s;
}
.wfa-btn:disabled{cursor:not-allowed;opacity:.6}
.wfa-btn-refund{
  background:var(--grad);color:white;
  box-shadow:0 2px 12px rgba(245,101,34,.3);
}
.wfa-btn-refund-outline{
  background:var(--surface);color:var(--black);
  border:1.5px solid var(--black-10);font-weight:700;
}
.wfa-btn-continue{
  background:var(--grad);color:white;
  box-shadow:0 2px 12px rgba(245,101,34,.3);
}
.wfa-btn:not(:disabled):hover{filter:brightness(.96)}
.wfa-see{
  background:none;border:none;cursor:pointer;align-self:center;
  font-family:var(--font);font-size:.84rem;font-weight:700;
  color:var(--primary-dark);padding:4px;
}
.wfa-see:hover{text-decoration:underline}
`;

export default function WrongFundingAmountPopup({
  offerId,
  variant,
  expectedSats: expectedFromEvent,
  fundedSats: fundedFromEvent,
  onClose,
}) {
  const navigate = useNavigate();
  const { get, post } = useApi();
  const isChoice = variant === "choice";

  const [expectedSats, setExpectedSats] = useState(expectedFromEvent ?? null);
  const [fundedSats, setFundedSats] = useState(fundedFromEvent ?? null);
  const [loading, setLoading] = useState(expectedFromEvent == null || fundedFromEvent == null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Fill any amounts the detection event didn't carry, from the offer itself.
  useEffect(() => {
    if (expectedSats != null && fundedSats != null) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [dRes, eRes] = await Promise.all([
          expectedSats != null ? Promise.resolve(null) : get(`/offer/${offerId}/details`),
          fundedSats != null ? Promise.resolve(null) : get(`/offer/${offerId}/escrow`),
        ]);
        if (cancelled) return;
        if (dRes?.ok) {
          const d = await dRes.json();
          if (d?.amount != null) setExpectedSats(d.amount);
        }
        if (eRes?.ok) {
          const e = await eRes.json();
          const amounts = e?.funding?.amounts ?? [];
          if (amounts.length) setFundedSats(amounts.reduce((a, b) => a + b, 0));
        }
      } catch (err) {
        if (!cancelled) console.warn("[WrongFunding] fetch failed:", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [offerId]); // eslint-disable-line react-hooks/exhaustive-deps

  function goToOffer() {
    navigate("/trades", { state: { openOfferId: offerId } });
  }

  async function handleContinue() {
    setError(null);
    setBusy(true);
    try {
      const res = await post(`/offer/${offerId}/escrow/confirm`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
      }
      onClose();
      goToOffer();
    } catch (err) {
      setError("Couldn't continue the trade: " + err.message);
      setBusy(false);
    }
  }

  async function handleRefund() {
    setError(null);
    setBusy(true);
    try {
      // Cancel the offer, then trigger the mobile refund pending action — same
      // sequence the trades dashboard uses for a wrong-amount sell offer.
      const cancelRes = await post(`/offer/${offerId}/cancel`, {});
      if (!cancelRes.ok) {
        const err = await cancelRes.json().catch(() => null);
        throw new Error(err?.error || err?.message || `HTTP ${cancelRes.status}`);
      }
      const refundRes = await post(`/offer/${offerId}/refundPendingAction`);
      if (!refundRes.ok) {
        const err = await refundRes.json().catch(() => null);
        throw new Error(err?.error || err?.message || `HTTP ${refundRes.status}`);
      }
      onClose();
      goToOffer();
    } catch (err) {
      setError("Couldn't request the refund: " + err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="wfa-overlay" onClick={onClose}>
        <div className="wfa-card" onClick={e => e.stopPropagation()}>
          <div className="wfa-head">
            <div className="wfa-circle">⚠</div>
            <div className="wfa-title">
              {isChoice ? "Different amount funded" : "Wrong amount funded"}
            </div>
          </div>

          <div className="wfa-text">
            {isChoice
              ? "You funded the escrow with a different amount than the trade was made for. Decide whether to continue with the funded amount, or refund the escrow to yourself."
              : "You funded the escrow with an amount that can't be used for this trade. The escrow will be refunded to you."}
          </div>

          <div className="wfa-amounts">
            <div className="wfa-row">
              <span className="wfa-label">Funded</span>
              {loading && fundedSats == null
                ? <span className="wfa-loading">Loading…</span>
                : fundedSats != null
                  ? <SatsAmount sats={fundedSats} size="sm" />
                  : <span className="wfa-loading">—</span>}
            </div>
            <div className="wfa-divider" />
            <div className="wfa-row">
              <span className="wfa-label">Made for</span>
              {loading && expectedSats == null
                ? <span className="wfa-loading">Loading…</span>
                : expectedSats != null
                  ? <SatsAmount sats={expectedSats} size="sm" />
                  : <span className="wfa-loading">—</span>}
            </div>
          </div>

          {error && <div className="wfa-err">{error}</div>}

          <div className="wfa-btns">
            {isChoice ? (
              <>
                <button
                  className="wfa-btn wfa-btn-refund-outline"
                  onClick={handleRefund}
                  disabled={busy}
                >
                  Refund escrow
                </button>
                <button
                  className="wfa-btn wfa-btn-continue"
                  onClick={handleContinue}
                  disabled={busy}
                >
                  Continue trade
                </button>
              </>
            ) : (
              <button
                className="wfa-btn wfa-btn-refund"
                onClick={handleRefund}
                disabled={busy}
              >
                Refund escrow
              </button>
            )}
          </div>

          <button className="wfa-see" onClick={() => { onClose(); goToOffer(); }}>
            See offer
          </button>
        </div>
      </div>
    </>
  );
}
