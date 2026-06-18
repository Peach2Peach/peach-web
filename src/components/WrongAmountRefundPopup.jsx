import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi.js";
import { savePendingTask } from "./MobileSigningModal.jsx";

// Global popup shown when a CONTRACT enters wrongAmountFundedOnContractRefundWaiting
// (escrow funded with an amount that can't be used → refund only). Fired by
// useNotifications via "peach:contract-wrong-amount". Operates at the contract
// level — distinct from WrongFundingAmountPopup, which is offer-level.
//   seller → can trigger the refund (createRefundEscrowContractPendingAction).
//   buyer  → informational only (the trade is cancelled; the seller is refunded).
const css = `
.war-overlay{
  position:fixed;inset:0;z-index:650;
  background:rgba(43,25,17,.55);
  display:flex;align-items:center;justify-content:center;
  padding:20px;animation:fadeIn .15s ease;
}
.war-card{
  background:var(--surface);border-radius:20px;
  padding:32px 28px 24px;max-width:400px;width:100%;
  display:flex;flex-direction:column;gap:16px;
  animation:modalIn .18s ease;
  box-shadow:0 16px 48px rgba(0,0,0,.18);
}
.war-head{display:flex;align-items:center;gap:12px}
.war-circle{
  width:48px;height:48px;border-radius:50%;flex-shrink:0;
  background:var(--warning-soft);
  display:flex;align-items:center;justify-content:center;
  font-size:1.4rem;
}
.war-title{font-size:1.2rem;font-weight:800;color:var(--warning)}
.war-text{font-size:.88rem;font-weight:500;color:var(--black-65);line-height:1.6}
.war-err{font-size:.8rem;color:var(--error);font-weight:600}
.war-btns{display:flex;gap:10px;margin-top:4px}
.war-btn{
  flex:1;padding:12px 18px;border-radius:999px;
  font-family:'Baloo 2',cursive;font-size:.86rem;font-weight:800;
  cursor:pointer;border:none;transition:filter .15s;
}
.war-btn:disabled{cursor:not-allowed;opacity:.6}
.war-btn-refund{
  background:var(--grad);color:white;
  box-shadow:0 2px 12px rgba(245,101,34,.3);
}
.war-btn:not(:disabled):hover{filter:brightness(.96)}
.war-see{
  background:none;border:none;cursor:pointer;align-self:center;
  font-family:var(--font);font-size:.84rem;font-weight:700;
  color:var(--primary-dark);padding:4px;
}
.war-see:hover{text-decoration:underline}
`;

export default function WrongAmountRefundPopup({ contractId, role, onClose }) {
  const navigate = useNavigate();
  const { post } = useApi();
  const isSeller = role === "seller";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function goToContract() {
    onClose();
    navigate(`/trade/${contractId}`);
  }

  async function handleRefund() {
    setError(null);
    setBusy(true);
    try {
      const res = await post(
        `/contract/${contractId}/createRefundEscrowContractPendingAction`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
      }
      // Mirror the in-screen card: record the pending task so the trade
      // execution screen reflects the in-flight refund immediately. The mount
      // effect picks this up on a fresh navigation; the event covers the case
      // where the screen is already mounted (no remount on same-route nav).
      savePendingTask(contractId, "refund");
      window.dispatchEvent(
        new CustomEvent("peach:refund-pending-created", {
          detail: { contractId },
        }),
      );
      goToContract();
    } catch (err) {
      setError("Couldn't request the refund: " + err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="war-overlay" onClick={onClose}>
        <div className="war-card" onClick={(e) => e.stopPropagation()}>
          <div className="war-head">
            <div className="war-circle">⚠</div>
            <div className="war-title">Wrong amount funded</div>
          </div>

          <div className="war-text">
            {isSeller
              ? "You funded the escrow with an amount that can't be used for this trade. The escrow will be refunded to you."
              : "The seller funded the escrow with an incorrect amount. The trade has been cancelled and the seller will be refunded."}
          </div>

          {error && <div className="war-err">{error}</div>}

          {isSeller && (
            <div className="war-btns">
              <button
                className="war-btn war-btn-refund"
                onClick={handleRefund}
                disabled={busy}
              >
                Refund
              </button>
            </div>
          )}

          <button className="war-see" onClick={goToContract}>
            See contract
          </button>
        </div>
      </div>
    </>
  );
}
