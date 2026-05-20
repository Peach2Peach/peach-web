import { IS_PHONE, buildMobileActionDeepLink } from "../utils/mobileAction.js";

// Standardised post-trigger "check your phone" state for any action delegated to
// the Peach mobile app. Two branches:
//   1. On the phone itself (IS_PHONE) with a numeric action id → orange-gradient
//      "Open Peach App" deep-link.
//   2. Otherwise → a dashed-orange, gently-pulsing pending indicator. Renders a
//      <button> when onClick is given (e.g. re-open the signing modal), else a
//      static <div>.
// The initial trigger buttons (gradient "Fund via mobile app", sliders) are NOT
// handled here — only the waiting state after a task has been sent.

const css = `
@keyframes mpiPulse{0%,100%{opacity:1}50%{opacity:.55}}
.mpi{
  width:100%;display:flex;align-items:center;justify-content:center;gap:8px;
  padding:11px 16px;border-radius:999px;
  font-family:var(--font);font-weight:700;font-size:.85rem;
  text-align:center;box-sizing:border-box;
}
.mpi-pending{
  border:1.5px dashed var(--primary);
  background:var(--primary-mild);
  color:var(--primary);
  animation:mpiPulse 1.8s ease-in-out infinite;
}
.mpi-pending--button{cursor:pointer}
.mpi-pending--button:hover{filter:brightness(.96)}
.mpi-pending--static{cursor:default}
.mpi-deeplink{
  text-decoration:none;font-weight:800;
  background:var(--grad);color:#fff;
  box-shadow:0 2px 12px rgba(245,101,34,.3);
}
.mpi-icon{flex-shrink:0}
`;

export function PhoneIcon() {
  return (
    <svg
      className="mpi-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12" y2="18.01" />
    </svg>
  );
}

export default function MobilePendingButton({ label, type, actionId, onClick }) {
  if (IS_PHONE && typeof actionId === "number") {
    return (
      <>
        <style>{css}</style>
        <a className="mpi mpi-deeplink" href={buildMobileActionDeepLink(type, actionId)}>
          <PhoneIcon />
          Open Peach App
        </a>
      </>
    );
  }

  const Tag = onClick ? "button" : "div";
  return (
    <>
      <style>{css}</style>
      <Tag
        className={`mpi mpi-pending mpi-pending--${onClick ? "button" : "static"}`}
        onClick={onClick}
      >
        <PhoneIcon />
        {label}
      </Tag>
    </>
  );
}
