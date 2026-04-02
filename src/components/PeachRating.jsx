// ─── PEACH RATING — 5-peach proportional fill ───────────────────────────────
// Shared component. Renders 5 peach icons filled proportionally to `rep` (0–5).
// Used by: market-view, trades-dashboard, MatchesPopup, settings, home,
//          trade-execution, peach-status-cards
// ─────────────────────────────────────────────────────────────────────────────
import { useId } from "react";

export default function PeachRating({ rep, size = 16 }) {
  const uid = useId();
  const safeRep = typeof rep === "number" ? rep : 0;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
      <span style={{ display:"inline-flex", alignItems:"center", gap:1 }}>
        {[0,1,2,3,4].map(i => {
          const fill = Math.max(0, Math.min(1, safeRep - i));
          return (
            <svg key={i} width={size} height={size} viewBox="0 0 32 32"
                 style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}>
              {fill > 0 && fill < 1 && (
                <defs>
                  <clipPath id={`${uid}-${i}`}>
                    <rect x="0" y={32 * (1 - fill)} width="32" height={32 * fill}/>
                  </clipPath>
                </defs>
              )}
              {/* Empty / background peach */}
              <g opacity="0.25">
                <circle cx="16" cy="17" r="11" fill="#F56522"/>
                <path d="M14 8c1-3 5-4 6-1" stroke="#05A85A" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </g>
              {/* Filled peach */}
              {fill === 1 && (
                <g>
                  <circle cx="16" cy="17" r="11" fill="#F56522"/>
                  <path d="M14 8c1-3 5-4 6-1" stroke="#05A85A" strokeWidth="2" fill="none" strokeLinecap="round"/>
                  <path d="M11 17 Q16 13 21 17" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
                </g>
              )}
              {fill > 0 && fill < 1 && (
                <g clipPath={`url(#${uid}-${i})`}>
                  <circle cx="16" cy="17" r="11" fill="#F56522"/>
                  <path d="M14 8c1-3 5-4 6-1" stroke="#05A85A" strokeWidth="2" fill="none" strokeLinecap="round"/>
                  <path d="M11 17 Q16 13 21 17" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
                </g>
              )}
            </svg>
          );
        })}
      </span>
      <span style={{ fontSize:".78rem", fontWeight:700, color:"var(--black-75)" }}>
        {safeRep.toFixed(1)}
      </span>
    </span>
  );
}
