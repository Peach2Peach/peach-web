const css = `
.se-overlay{
  position:fixed;inset:0;z-index:600;
  background:rgba(43,25,17,.55);
  display:flex;align-items:center;justify-content:center;
  padding:20px;animation:fadeIn .15s ease;
}
.se-card{
  background:var(--surface);border-radius:20px;padding:36px 32px;
  max-width:380px;width:100%;text-align:center;
  box-shadow:0 20px 60px rgba(0,0,0,.25);
  animation:authPopIn .2s cubic-bezier(.34,1.56,.64,1);
}
.se-icon{
  width:64px;height:64px;border-radius:50%;
  background:var(--error-bg);display:flex;align-items:center;justify-content:center;
  margin:0 auto 18px;
}
.se-title{font-weight:800;font-size:1.15rem;color:var(--black);margin-bottom:8px}
.se-desc{font-size:.85rem;color:var(--black-65);line-height:1.6;margin-bottom:24px}
.se-btn{
  padding:11px 32px;border-radius:999px;background:var(--grad);color:white;
  font-family:var(--font);font-size:.88rem;font-weight:800;border:none;cursor:pointer;
  transition:transform .1s;
}
.se-btn:hover{transform:translateY(-1px)}
`;

export default function SessionExpiredModal({ onReauth }) {
  return (
    <>
      <style>{css}</style>
      <div className="se-overlay">
        <div className="se-card">
          <div className="se-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div className="se-title">Session expired</div>
          <div className="se-desc">
            Your session token has expired. Please scan the QR code again with your Peach mobile app to continue.
          </div>
          <button className="se-btn" onClick={onReauth}>
            Re-authenticate
          </button>
        </div>
      </div>
    </>
  );
}
