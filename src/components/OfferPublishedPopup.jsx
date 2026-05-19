import { useNavigate } from "react-router-dom";

const css = `
.op-overlay{
  position:fixed;inset:0;z-index:600;
  background:rgba(43,25,17,.55);
  display:flex;align-items:center;justify-content:center;
  padding:20px;animation:fadeIn .15s ease;
}
.op-card{
  background:var(--surface);border-radius:20px;
  padding:36px 32px 28px;max-width:380px;width:100%;
  display:flex;flex-direction:column;align-items:center;
  text-align:center;gap:16px;
  animation:modalIn .18s ease;
  box-shadow:0 16px 48px rgba(0,0,0,.18);
}
.op-circle{
  width:68px;height:68px;border-radius:50%;
  background:var(--grad);
  display:flex;align-items:center;justify-content:center;
  animation:popupSuccessPop .35s cubic-bezier(.34,1.56,.64,1);
  box-shadow:0 6px 24px rgba(245,101,34,.3);
}
.op-check{stroke-dasharray:40;stroke-dashoffset:40;
  animation:popupDrawCheck .4s ease .2s forwards}
.op-title{font-size:1.35rem;font-weight:800;color:var(--black)}
.op-subtitle{font-size:.88rem;font-weight:500;color:var(--black-65);line-height:1.6;max-width:280px}
.op-btns{display:flex;gap:12px;margin-top:8px;width:100%}
.op-btn{
  flex:1;padding:12px 20px;border-radius:999px;
  font-family:var(--font);font-size:.84rem;font-weight:800;
  cursor:pointer;transition:transform .1s,box-shadow .1s;border:none;
}
.op-btn:hover{transform:translateY(-1px)}
.op-btn-show{
  background:var(--grad);color:white;
  box-shadow:0 2px 12px rgba(245,101,34,.3);
}
.op-btn-close{
  background:transparent;color:var(--black-65);
  border:1.5px solid var(--black-10);
}
`;

export default function OfferPublishedPopup({ offerId, onClose }) {
  const navigate = useNavigate();

  function handleShowOffer() {
    navigate("/market", {
      state: {
        highlightOfferIds: offerId ? [String(offerId)] : [],
        highlightDirection: "sell",
      },
    });
    onClose();
  }

  function handleClose() {
    window.dispatchEvent(new Event("peach:offer-published-dismissed"));
    onClose();
  }

  return (
    <>
      <style>{css}</style>
      <div className="op-overlay" onClick={handleClose}>
        <div className="op-card" onClick={e => e.stopPropagation()}>
          <div className="op-circle">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <path className="op-check" d="M10 18l6 6 10-12"
                stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="op-title">Offer published!</div>
          <div className="op-subtitle">
            We'll notify you when matches are available.
          </div>
          <div className="op-btns">
            <button className="op-btn op-btn-close" onClick={handleClose}>
              Close
            </button>
            <button className="op-btn op-btn-show" onClick={handleShowOffer}>
              Show Offer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
