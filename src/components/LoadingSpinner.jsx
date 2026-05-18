// Large-area loading spinner: peach-orange arc rotating around a static PeachIcon.
// Self-contained (style + JSX in one file, same pattern as RefreshIndicator.jsx) so
// it drops into any screen without modifying that screen's local CSS.

import { PeachIcon } from "./Navbars";

const style = `
@keyframes peach-spinner-rotate { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
.peach-spinner-wrap {
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;
  text-align:center;
}
.peach-spinner-ring {
  position:relative; display:flex; align-items:center; justify-content:center;
}
.peach-spinner-ring::before {
  content:""; position:absolute; inset:0;
  border:3px solid var(--black-10);
  border-top-color: var(--primary);
  border-radius:50%;
  animation: peach-spinner-rotate 1s linear infinite;
}
.peach-spinner-label {
  font-size:1rem; font-weight:700; color: var(--black);
}
`;

export function LoadingSpinner({ size = 64, label = "Loading…", padding = "60px 20px" }) {
  return (
    <>
      <style>{style}</style>
      <div className="peach-spinner-wrap" style={{ padding }} role="status" aria-live="polite">
        <div className="peach-spinner-ring" style={{ width: size, height: size }}>
          <PeachIcon size={Math.round(size * 0.56)} />
        </div>
        {label && <div className="peach-spinner-label">{label}</div>}
      </div>
    </>
  );
}
