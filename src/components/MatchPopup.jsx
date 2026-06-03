import { useNavigate } from "react-router-dom";

// Celebratory modal shown when a contract is created from one of the user's
// trade requests. Triggered by the `peach:match-popup` event (dispatched from
// useServerNotifications when a fresh "contract created" push notification
// arrives). Styled to match OfferPublishedPopup.
const css = `
.mp-overlay{
  position:fixed;inset:0;z-index:600;
  background:rgba(43,25,17,.55);
  display:flex;align-items:center;justify-content:center;
  padding:20px;animation:fadeIn .15s ease;
}
.mp-card{
  background:var(--surface);border-radius:20px;
  padding:36px 32px 28px;max-width:380px;width:100%;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;gap:16px;
  animation:modalIn .18s ease;
  box-shadow:0 16px 48px rgba(0,0,0,.18);
}
.mp-circle{
  width:68px;height:68px;border-radius:50%;
  background:var(--grad);
  display:flex;align-items:center;justify-content:center;
  animation:popupSuccessPop .35s cubic-bezier(.34,1.56,.64,1);
  box-shadow:0 6px 24px rgba(245,101,34,.3);
}
.mp-title{font-size:1.35rem;font-weight:800;color:var(--black)}
.mp-subtitle{font-size:.88rem;font-weight:500;color:var(--black-65);line-height:1.6;max-width:280px}
.mp-btns{display:flex;gap:12px;margin-top:8px;width:100%}
.mp-btn{
  flex:1;padding:12px 20px;border-radius:999px;
  font-family:var(--font);font-size:.84rem;font-weight:800;
  cursor:pointer;transition:transform .1s,box-shadow .1s;border:none;
}
.mp-btn:hover{transform:translateY(-1px)}
.mp-btn-show{
  background:var(--grad);color:white;
  box-shadow:0 2px 12px rgba(245,101,34,.3);
}
.mp-btn-close{
  background:transparent;color:var(--black-65);
  border:1.5px solid var(--black-10);
}
`;

export default function MatchPopup({ contractId, title, body, onClose }) {
  const navigate = useNavigate();

  function handleView() {
    if (contractId) navigate(`/trade/${contractId}`);
    onClose();
  }

  return (
    <>
      <style>{css}</style>
      <div className="mp-overlay" onClick={onClose}>
        <div className="mp-card" onClick={e => e.stopPropagation()}>
          <div className="mp-circle">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M12 21s-6.7-4.35-9.33-8.07C1.1 10.6 1.5 7.8 3.6 6.3c1.86-1.33 4.2-.7 5.4.93L12 11l3-3.77c1.2-1.63 3.54-2.26 5.4-.93 2.1 1.5 2.5 4.3.93 6.63C18.7 16.65 12 21 12 21z"/>
            </svg>
          </div>
          <div className="mp-title">{title || "It's a match!"}</div>
          <div className="mp-subtitle">
            {body || "Your trade has started."}
          </div>
          <div className="mp-btns">
            <button className="mp-btn mp-btn-close" onClick={onClose}>
              Close
            </button>
            <button className="mp-btn mp-btn-show" onClick={handleView} disabled={!contractId}>
              View trade
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
