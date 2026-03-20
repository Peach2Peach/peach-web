// ─── TRADE EXECUTION — SUB-COMPONENTS ────────────────────────────────────────
// Extracted from peach-trade-execution.jsx to keep the main file navigable.
// All components are used only by the trade-execution screen.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { SatsAmount } from "../../components/BitcoinAmount.jsx";
import { LIFECYCLE } from "../../data/statusConfig.js";
import { relTime } from "../../utils/format.js";

// ─── ICONS ────────────────────────────────────────────────────────────────────
export const IconBack      = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,3 5,8 10,13"/></svg>;
export const IconSend      = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="14" y1="2" x2="6" y2="10"/><polygon points="14,2 9,14 6,10 2,7" fill="currentColor" stroke="none"/></svg>;
export const IconLock      = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="2" y="5.5" width="8" height="5.5" rx="1.5"/><path d="M4 5.5V3.5a2 2 0 0 1 4 0v2"/></svg>;
export const IconCopy      = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M2 9.5V2.5a1 1 0 0 1 1-1h7"/></svg>;
export const IconCheck     = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="2,7 5.5,10.5 12,4"/></svg>;
export const IconAlert     = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2L1 12h12L7 2z"/><line x1="7" y1="6" x2="7" y2="9"/><circle cx="7" cy="11" r=".5" fill="currentColor"/></svg>;
export const IconClock     = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="5"/><path d="M6.5 3.5v3l2 1.5"/></svg>;
const IconQR        = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="10" y="1" width="5" height="5" rx="1"/><rect x="1" y="10" width="5" height="5" rx="1"/><rect x="2.5" y="2.5" width="2" height="2" fill="currentColor" stroke="none"/><rect x="11.5" y="2.5" width="2" height="2" fill="currentColor" stroke="none"/><rect x="2.5" y="11.5" width="2" height="2" fill="currentColor" stroke="none"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="13" y1="10" x2="15" y2="10"/><line x1="10" y1="13" x2="10" y2="15"/><line x1="13" y1="13" x2="15" y2="15"/></svg>;
const IconThumbUp   = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l2-5c.5-1.5 2-1.5 2.5 0L11 7h3.5a1 1 0 0 1 1 1.2l-1 5a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-1V9z"/><path d="M6 9H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2"/></svg>;
const IconThumbDown = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9l-2 5c-.5 1.5-2 1.5-2.5 0L7 11H3.5a1 1 0 0 1-1-1.2l1-5a1 1 0 0 1 1-.8H11a1 1 0 0 1 1 1V9z"/><path d="M12 9h2a1 1 0 0 1 1-1V4a1 1 0 0 0-1-1h-2"/></svg>;
const IconDispute   = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><line x1="8" y1="5" x2="8" y2="8.5"/><circle cx="8" cy="11" r=".6" fill="currentColor" stroke="none"/></svg>;
const IconChevronDown = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,5 7,9 11,5"/></svg>;
const IconChevronUp   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,9 7,5 11,9"/></svg>;

// ─── HORIZONTAL STEPPER (bottom bar) ─────────────────────────────────────────
export function HorizontalStepper({ status }) {
  const stepMap = {
    createEscrow:0, fundEscrow:0, waitingForFunding:0, escrowWaitingForConfirmation:0,
    fundingAmountDifferent:0,
    paymentRequired:1, paymentTooLate:1,
    confirmPaymentRequired:2, releaseEscrow:2,
    payoutPending:3, rateUser:3, tradeCompleted:3,
    dispute:2, disputeWithoutEscrowFunded:0, confirmCancelation:2,
    tradeCanceled:2, offerCanceled:0,
    refundAddressRequired:2, refundOrReviveRequired:2, refundTxSignatureRequired:2,
    wrongAmountFundedOnContract:0, wrongAmountFundedOnContractRefundWaiting:0,
    fundingExpired:0,
  };
  const activeStep = stepMap[status] ?? 0;
  const isAborted = status === "dispute" || status === "disputeWithoutEscrowFunded"
    || status === "tradeCanceled" || status === "confirmCancelation" || status === "offerCanceled";

  return (
    <div className="h-stepper">
      {LIFECYCLE.map((s, i) => {
        const isDone   = i < activeStep;
        const isActive = i === activeStep && !isAborted;
        const isAbortedStep = isAborted && i === activeStep;
        const dotColor = isDone ? "#65A519" : isActive ? "#F56522" : isAbortedStep ? "#DF321F" : "#C4B5AE";
        const labelColor = isDone ? "#65A519" : isActive ? "#2B1911" : isAbortedStep ? "#DF321F" : "#C4B5AE";
        const lineColor = isDone ? "#65A519" : "#EAE3DF";

        return (
          <div key={s.id} className="h-step">
            {/* Left connector */}
            {i > 0 && (
              <div className="h-step-line" style={{ background: lineColor }}/>
            )}
            {/* Dot */}
            <div className="h-step-dot" style={{
              background: dotColor,
              border: (isActive || isAbortedStep || isDone) ? "none" : "2px solid #C4B5AE",
              boxShadow: isActive ? "0 0 0 3px #FEEDE5" : "none",
            }}>
              {isDone && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><polyline points="1,4 3,6 7,2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>}
            </div>
            {/* Label */}
            <div className="h-step-label" style={{ color: labelColor, fontWeight: isActive ? 700 : 500 }}>
              {s.label}
            </div>
          </div>
        );
      })}
      {isAborted && (
        <div className="h-stepper-alert">
          <IconAlert/>
          <span>
            {(status === "dispute" || status === "disputeWithoutEscrowFunded") ? "Dispute open — mediator assigned" :
             status === "confirmCancelation" ? "Cancellation requested" :
             "Cancelled"}
          </span>
        </div>
      )}
    </div>
  );
}



// ─── PAYMENT DETAILS CARD ────────────────────────────────────────────────────
export function PaymentDetailsCard({ details }) {
  const [copied, setCopied] = useState(null);

  function copy(val, key) {
    navigator.clipboard?.writeText(val).catch(()=>{});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const rows = [
    { label:"Bank",      value:details.bank },
    { label:"IBAN",      value:details.iban },
    { label:"BIC",       value:details.bic },
    { label:"Name",      value:details.name },
    { label:"Reference", value:details.reference },
  ].filter(r => r.value);

  return (
    <div style={{
      background:"#FFF9F6", border:"1.5px solid #EAE3DF", borderRadius:12,
      overflow:"hidden", marginBottom:16,
    }}>
      <div style={{
        background:"#FEEDE5", padding:"8px 14px",
        display:"flex", alignItems:"center", gap:6,
        fontSize:".72rem", fontWeight:700, color:"#C45104",
        textTransform:"uppercase", letterSpacing:".05em",
      }}>
        <IconLock/> Payment Details — {details.type}
      </div>
      {rows.map(r => (
        <div key={r.label} style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"8px 14px", borderBottom:"1px solid #F4EEEB",
        }}>
          <div>
            <div style={{ fontSize:".68rem", color:"#7D675E", fontWeight:600, textTransform:"uppercase", letterSpacing:".04em" }}>{r.label}</div>
            <div style={{ fontSize:".85rem", fontWeight:600, color:"#2B1911", fontFamily: r.label === "IBAN" || r.label === "BIC" ? "monospace" : "inherit" }}>{r.value}</div>
          </div>
          <button
            style={{
              border:"none", background:"transparent", cursor:"pointer",
              color: copied === r.label ? "#65A519" : "#7D675E", padding:4, borderRadius:6,
              transition:"color .2s",
            }}
            onClick={() => copy(r.value, r.label)}
            title="Copy"
          >
            {copied === r.label ? <IconCheck/> : <IconCopy/>}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── ESCROW ADDRESS CARD ─────────────────────────────────────────────────────
export function EscrowAddressCard({ address }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(address).catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Simple QR placeholder — real impl would use a QR library
  function MiniQR() {
    return (
      <div style={{
        width:64, height:64, background:"white", border:"1px solid #EAE3DF",
        borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center",
        flexShrink:0,
      }}>
        <svg width="44" height="44" viewBox="0 0 9 9">
          {/* Simplified QR pattern */}
          {[0,1,2,3,4,5,6,7,8].map(r =>
            [0,1,2,3,4,5,6,7,8].map(c => {
              const isCorner = (r<3&&c<3)||(r<3&&c>5)||(r>5&&c<3);
              const seed = (r * 9 + c) * 2654435761;
              const fill = isCorner ? 1 : (seed % 3 === 0 ? 1 : 0);
              return fill ? <rect key={`${r}${c}`} x={c} y={r} width={1} height={1} fill="#2B1911"/> : null;
            })
          )}
          {/* Corner squares */}
          {[[0,0],[0,6],[6,0]].map(([r,c]) => (
            <rect key={`f${r}${c}`} x={c+1} y={r+1} width={1} height={1} fill="#2B1911"/>
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div style={{
      background:"#F4EEEB", border:"1px solid #EAE3DF", borderRadius:12,
      padding:"12px 14px", marginBottom:16,
    }}>
      <div style={{ fontSize:".68rem", fontWeight:700, color:"#7D675E", textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>
        <IconQR/> Escrow Address
      </div>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <MiniQR/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontFamily:"monospace", fontSize:".72rem", color:"#2B1911",
            wordBreak:"break-all", lineHeight:1.5, marginBottom:6,
          }}>{address}</div>
          <button
            style={{
              display:"flex", alignItems:"center", gap:5,
              border:"1px solid #EAE3DF", background:"white", borderRadius:999,
              fontFamily:"Baloo 2, cursive", fontSize:".72rem", fontWeight:700,
              color: copied ? "#65A519" : "#7D675E",
              padding:"3px 10px", cursor:"pointer", transition:"color .2s",
            }}
            onClick={copy}
          >
            {copied ? <><IconCheck/> Copied!</> : <><IconCopy/> Copy address</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DISPUTE FLOW ────────────────────────────────────────────────────────────
const DISPUTE_REASONS_BUYER = [
  { key: "noPayment.buyer", label: "I HAVEN'T RECEIVED BITCOIN" },
  { key: "unresponsive.buyer", label: "SELLER UNRESPONSIVE" },
  { key: "abusive", label: "ABUSIVE BEHAVIOUR" },
  { key: "other", label: "SOMETHING ELSE" },
];
const DISPUTE_REASONS_SELLER = [
  { key: "noPayment.seller", label: "I HAVEN'T RECEIVED PAYMENT" },
  { key: "unresponsive.seller", label: "BUYER UNRESPONSIVE" },
  { key: "abusive", label: "ABUSIVE BEHAVIOUR" },
  { key: "other", label: "SOMETHING ELSE" },
];

function DisputeFlow({ tradeId, role, onClose, onSubmit }) {
  const [step, setStep] = useState(1); // 1=warning, 2=reason, 3=details
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const reasons = role === "seller" ? DISPUTE_REASONS_SELLER : DISPUTE_REASONS_BUYER;
  const needsForm = reason.startsWith("noPayment.");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canConfirm = needsForm ? (email.trim().length > 0 && emailValid && message.trim().length > 0) : true;

  async function submitDispute(r, e, m) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = { reason: r };
      if (e) body.email = e;
      if (m) body.message = m;
      const ok = onSubmit ? await onSubmit(body) : true;
      if (ok) setSubmitted(true);
      else setSubmitError("Failed to open dispute. Please try again.");
    } catch (err) {
      setSubmitError(err.message || "Failed to open dispute.");
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:600,
        background:"rgba(43,25,17,.6)", display:"flex",
        alignItems:"center", justifyContent:"center", padding:20,
      }}>
        <div style={{
          background:"white", borderRadius:16, padding:"32px 24px",
          maxWidth:380, width:"100%", textAlign:"center",
          boxShadow:"0 20px 60px rgba(0,0,0,.25)",
          animation:"modalIn .18s ease",
        }}>
          <div style={{ fontSize:"2rem", marginBottom:12 }}>✓</div>
          <div style={{ fontWeight:800, fontSize:"1rem", marginBottom:8 }}>Dispute opened</div>
          <div style={{ fontSize:".88rem", color:"#7D675E", marginBottom:24, lineHeight:1.6 }}>
            A Peach mediator has been assigned to your case and will be in touch soon.
          </div>
          <button
            style={{
              width:"100%", border:"none", background:"#DF321F", borderRadius:999,
              fontFamily:"Baloo 2, cursive", fontWeight:800, fontSize:".9rem",
              color:"white", padding:"11px", cursor:"pointer",
            }}
            onClick={onClose}
          >Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:600,
      background:"rgba(43,25,17,.6)", display:"flex",
      alignItems:"center", justifyContent:"center", padding:20,
    }}>

      {/* ── Step 1: Warning ── */}
      {step === 1 && (
        <div style={{
          background:"white", borderRadius:20, maxWidth:400, width:"100%",
          boxShadow:"0 20px 60px rgba(0,0,0,.3)",
          animation:"modalIn .18s ease", overflow:"hidden",
        }}>
          <div style={{ padding:"24px 24px 20px" }}>
            <div style={{ fontWeight:800, fontSize:"1.15rem", marginBottom:16 }}>open dispute</div>
            <p style={{ fontSize:".9rem", color:"#2B1911", lineHeight:1.65, marginBottom:12 }}>
              This will request the intervention of a Peach employee to mediate between you and your counterpart.
            </p>
            <p style={{ fontSize:".9rem", color:"#2B1911", lineHeight:1.65, marginBottom:12 }}>
              Opening a dispute will reveal the chat and payment methods to Peach.
            </p>
            <p style={{ fontSize:".9rem", color:"#2B1911", lineHeight:1.65 }}>
              Please only use this as a last resort.
            </p>
          </div>
          <div style={{
            display:"flex", alignItems:"center",
            borderTop:"1px solid #EAE3DF",
            background:"#DF321F",
          }}>
            <button
              style={{
                flex:1, border:"none", background:"transparent",
                display:"flex", alignItems:"center", gap:8,
                fontFamily:"Baloo 2, cursive", fontWeight:700, fontSize:".9rem",
                color:"white", padding:"14px 20px", cursor:"pointer",
              }}
              onClick={() => setStep(2)}
            >
              <IconDispute/> open dispute
            </button>
            <div style={{ width:1, height:24, background:"rgba(255,255,255,.25)" }}/>
            <button
              style={{
                border:"none", background:"transparent",
                fontFamily:"Baloo 2, cursive", fontWeight:700, fontSize:".9rem",
                color:"white", padding:"14px 20px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:6,
              }}
              onClick={onClose}
            >
              close <span style={{
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                width:18, height:18, border:"1.5px solid rgba(255,255,255,.6)",
                borderRadius:4, fontSize:".7rem",
              }}>✕</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Reason ── */}
      {step === 2 && (
        <div style={{
          background:"#FFF9F6", borderRadius:20, maxWidth:400, width:"100%",
          boxShadow:"0 20px 60px rgba(0,0,0,.3)",
          animation:"modalIn .18s ease", padding:"40px 28px 32px",
        }}>
          <div style={{ fontWeight:800, fontSize:"1.2rem", marginBottom:24, textAlign:"center" }}>
            what's up?
          </div>
          {submitting && (
            <div style={{ textAlign:"center", fontSize:".85rem", color:"#7D675E", padding:"20px 0" }}>Submitting...</div>
          )}
          {submitError && (
            <div style={{ fontSize:".78rem", color:"#DF321F", textAlign:"center", marginBottom:10 }}>{submitError}</div>
          )}
          {!submitting && <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {reasons.map(r => (
              <button
                key={r.key}
                style={{
                  border: reason === r.key ? "2px solid #DF321F" : "1.5px solid #C4B5AE",
                  background: reason === r.key ? "#FFF0EE" : "white",
                  borderRadius:999, fontFamily:"Baloo 2, cursive",
                  fontWeight:700, fontSize:".82rem", letterSpacing:".04em",
                  color: reason === r.key ? "#DF321F" : "#624D44",
                  padding:"13px 20px", cursor:"pointer", transition:"all .15s",
                  textAlign:"center",
                }}
                onClick={() => {
                  setReason(r.key);
                  if (r.key.startsWith("noPayment.")) {
                    setStep(3); // needs email + message form
                  } else {
                    submitDispute(r.key, null, null); // submit immediately
                  }
                }}
              >{r.label}</button>
            ))}
          </div>}
          <button
            style={{
              marginTop:20, background:"none", border:"none",
              fontFamily:"Baloo 2, cursive", fontSize:".82rem",
              color:"#7D675E", cursor:"pointer", display:"block", margin:"20px auto 0",
            }}
            onClick={() => setStep(1)}
          >← Back</button>
        </div>
      )}

      {/* ── Step 3: Details ── */}
      {step === 3 && (
        <div style={{
          background:"#FFF9F6", borderRadius:20, maxWidth:400, width:"100%",
          boxShadow:"0 20px 60px rgba(0,0,0,.3)",
          animation:"modalIn .18s ease", padding:"40px 28px 32px",
        }}>
          <div style={{ fontWeight:800, fontSize:"1.1rem", marginBottom:24, textAlign:"center" }}>
            dispute for trade {tradeId}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
            <input
              style={{
                border:`1.5px solid ${email.trim().length > 0 && !emailValid ? "#DF321F" : "#C4B5AE"}`,
                borderRadius:12, background:"white",
                fontFamily:"Baloo 2, cursive", fontSize:".9rem", color:"#2B1911",
                padding:"12px 16px", outline:"none",
              }}
              placeholder="user@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={e => e.target.style.borderColor="#DF321F"}
              onBlur={e => e.target.style.borderColor = (email.trim().length > 0 && !emailValid) ? "#DF321F" : "#C4B5AE"}
            />
            {email.trim().length > 0 && !emailValid && (
              <div style={{ fontSize:".78rem", color:"#DF321F", marginTop:-4, paddingLeft:4 }}>
                Please enter a valid email address
              </div>
            )}
            <input
              style={{
                border:"1.5px solid #C4B5AE", borderRadius:12, background:"#F9F5F3",
                fontFamily:"Baloo 2, cursive", fontSize:".9rem", color:"#7D675E",
                padding:"12px 16px", outline:"none",
              }}
              value={(reasons.find(r => r.key === reason)?.label ?? reason).toLowerCase()}
              readOnly
            />
            <textarea
              style={{
                border:"1.5px solid #C4B5AE", borderRadius:12, background:"white",
                fontFamily:"Baloo 2, cursive", fontSize:".9rem", color:"#2B1911",
                padding:"12px 16px", outline:"none", resize:"none",
                minHeight:100, lineHeight:1.5,
              }}
              placeholder="your message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onFocus={e => e.target.style.borderColor="#DF321F"}
              onBlur={e => e.target.style.borderColor="#C4B5AE"}
            />
          </div>
          <button
            style={{
              width:"100%", border:"none", borderRadius:999,
              fontFamily:"Baloo 2, cursive", fontWeight:800, fontSize:".9rem",
              color:"white", padding:"13px",
              background: canConfirm ? "#DF321F" : "#F5C6BE",
              cursor: canConfirm ? "pointer" : "not-allowed",
              letterSpacing:".06em", transition:"background .2s",
            }}
            disabled={!canConfirm || submitting}
            onClick={() => { if (canConfirm) submitDispute(reason, email.trim(), message.trim()); }}
          >{submitting ? "SUBMITTING..." : "CONFIRM"}</button>
          {submitError && (
            <div style={{ fontSize:".78rem", color:"#DF321F", textAlign:"center", marginTop:8 }}>{submitError}</div>
          )}
          <button
            style={{
              marginTop:14, background:"none", border:"none",
              fontFamily:"Baloo 2, cursive", fontSize:".82rem",
              color:"#7D675E", cursor:"pointer", display:"block", margin:"14px auto 0",
            }}
            onClick={() => setStep(2)}
          >← Back</button>
        </div>
      )}

    </div>
  );
}

// ─── TRADING RULES CARD ───────────────────────────────────────────────────────
function TradingRulesCard({ disputeOpen, disabled, onOpenDispute }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      borderBottom:"1px solid #EAE3DF",
      background:"#FEFCE5",
      flexShrink:0,
    }}>
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 18px",
      }}>
        {/* Left: Trading Rules toggle */}
        <button
          style={{
            display:"flex", alignItems:"center", gap:6,
            border:"none", background:"transparent", fontFamily:"Baloo 2, cursive",
            fontWeight:700, fontSize:".82rem", color:"#624D44",
            padding:"10px 0", cursor:"pointer",
          }}
          onClick={() => setOpen(o => !o)}
        >
          <span>📋 Trading Rules</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#2B1911" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 1.5L0.8 10.5h10.4L6 1.5z"/><line x1="6" y1="5" x2="6" y2="7.5"/><circle cx="6" cy="9" r=".5" fill="#2B1911" stroke="none"/></svg>
          {open ? <IconChevronUp/> : <IconChevronDown/>}
        </button>

        {/* Right: Open dispute button */}
        <button
          style={{
            display:"flex", alignItems:"center", gap:5,
            border:"1.5px solid rgba(223,50,31,.25)", borderRadius:999,
            background:"white", fontFamily:"Baloo 2, cursive",
            fontWeight:700, fontSize:".72rem", color:"#DF321F",
            padding:"5px 12px", cursor: (disabled || disputeOpen) ? "default" : "pointer",
            opacity: disabled ? 0.4 : 1,
          }}
          onClick={() => !disabled && !disputeOpen && onOpenDispute?.()}
          onMouseEnter={e => { if (!disabled && !disputeOpen) e.currentTarget.style.background="#FFF0EE"; }}
          onMouseLeave={e => { e.currentTarget.style.background="white"; }}
        >
          <IconDispute/> <span>{disputeOpen ? "dispute open" : "open dispute"}</span>
        </button>
      </div>
      {open && (
        <div style={{
          padding:"0 18px 14px",
          fontSize:".82rem", color:"#624D44", lineHeight:1.7,
        }}>
          <p style={{ marginBottom:10 }}>
            <strong>For the Seller:</strong><br/>
            – do not release the escrow before receiving the money in your account, no matter what the buyer says
          </p>
          <p style={{ marginBottom:10 }}>
            <strong>For the Buyer:</strong><br/>
            – confirm "I made the payment" only after having done so<br/>
            – only pay the Seller to the details provided in the Contract Screen, after the escrow has been funded
          </p>
          <p>
            <strong>For all:</strong><br/>
            – the payment details used must match exactly<br/>
            – communications between the two parties must be conducted in this chat only.<br/>
            – if counterpart displays suspect behavior, start a dispute by pressing the top right icon on this screen
          </p>
        </div>
      )}
    </div>
  );
}

// ─── ESCROW FUNDING CARD (Seller) ────────────────────────────────────────────
export function EscrowFundingCard({ address, sats, btcPrice }) {
  const [withAmount, setWithAmount] = useState(true);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedAmt, setCopiedAmt]   = useState(false);

  const btcAmount = (sats / 100_000_000).toFixed(8);
  // BIP21 URI: bitcoin:<address>?amount=<btc> when withAmount, else just address
  const qrContent = withAmount
    ? `bitcoin:${address}?amount=${btcAmount}`
    : address;

  function copy(val, setter) {
    navigator.clipboard?.writeText(val).catch(()=>{});
    setter(true);
    setTimeout(() => setter(false), 1500);
  }

  function QRCode({ size = 160 }) {
    const ref = useRef(null);
    useEffect(() => {
      if (!ref.current) return;
      ref.current.innerHTML = '';
      function render() {
        new window.QRCode(ref.current, {
          text: qrContent,
          width: size,
          height: size,
          colorDark: "#2B1911",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      }
      if (window.QRCode) {
        render();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = render;
        document.head.appendChild(script);
      }
    }, [qrContent, size]);
    return <div ref={ref} style={{ width:size, height:size, borderRadius:6, overflow:"hidden" }}/>;
  }

  return (
    <div style={{
      background:"white", border:"1.5px solid #EAE3DF", borderRadius:14,
      overflow:"hidden", marginBottom:16,
    }}>
      {/* Header */}
      <div style={{
        background:"#FEEDE5", padding:"10px 16px",
        fontSize:".72rem", fontWeight:700, color:"#C45104",
        textTransform:"uppercase", letterSpacing:".05em",
        display:"flex", alignItems:"center", gap:6,
      }}>
        <IconLock/> Fund the Escrow
      </div>

      {/* Amount highlight */}
      <div style={{
        padding:"14px 16px 12px",
        borderBottom:"1px solid #F4EEEB",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <div style={{ fontSize:".68rem", fontWeight:700, color:"#7D675E", textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>Amount to send</div>
          <SatsAmount sats={sats} size="lg"/>
          <div style={{ fontSize:".78rem", color:"#7D675E", marginTop:2 }}>= {btcAmount} BTC</div>
        </div>
        <button
          style={{
            display:"flex", alignItems:"center", gap:5,
            border:"1px solid #EAE3DF", background: copiedAmt ? "#F2F9E7" : "white",
            borderRadius:999, fontFamily:"Baloo 2, cursive",
            fontSize:".72rem", fontWeight:700,
            color: copiedAmt ? "#65A519" : "#7D675E",
            padding:"5px 12px", cursor:"pointer", transition:"all .2s",
          }}
          onClick={() => copy(btcAmount, setCopiedAmt)}
        >
          {copiedAmt ? <><IconCheck/> Copied!</> : <><IconCopy/> Copy BTC</>}
        </button>
      </div>

      {/* QR code */}
      <div style={{ padding:"16px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
        <div style={{
          padding:10, background:"white", border:"1px solid #EAE3DF",
          borderRadius:10, display:"inline-block",
        }}>
          <QRCode size={160}/>
        </div>

        {/* Toggle */}
        <div style={{
          display:"flex", alignItems:"center", gap:0,
          background:"#F4EEEB", borderRadius:999, padding:3,
          fontSize:".72rem", fontWeight:700,
        }}>
          <button
            style={{
              border:"none", borderRadius:999, padding:"4px 14px", cursor:"pointer",
              fontFamily:"Baloo 2, cursive", fontSize:".72rem", fontWeight:700,
              background: !withAmount ? "white" : "transparent",
              color: !withAmount ? "#2B1911" : "#7D675E",
              boxShadow: !withAmount ? "0 1px 3px rgba(0,0,0,.1)" : "none",
              transition:"all .15s",
            }}
            onClick={() => setWithAmount(false)}
          >Address only</button>
          <button
            style={{
              border:"none", borderRadius:999, padding:"4px 14px", cursor:"pointer",
              fontFamily:"Baloo 2, cursive", fontSize:".72rem", fontWeight:700,
              background: withAmount ? "white" : "transparent",
              color: withAmount ? "#2B1911" : "#7D675E",
              boxShadow: withAmount ? "0 1px 3px rgba(0,0,0,.1)" : "none",
              transition:"all .15s",
            }}
            onClick={() => setWithAmount(true)}
          >Address + amount</button>
        </div>

        <div style={{ fontSize:".68rem", color:"#7D675E", textAlign:"center", lineHeight:1.5 }}>
          {withAmount
            ? "QR includes amount — most wallets will fill it in automatically"
            : "QR contains address only — enter the amount manually in your wallet"}
        </div>
      </div>

      {/* Address */}
      <div style={{
        padding:"12px 16px 14px",
        borderTop:"1px solid #F4EEEB",
      }}>
        <div style={{ fontSize:".68rem", fontWeight:700, color:"#7D675E", textTransform:"uppercase", letterSpacing:".05em", marginBottom:6 }}>Escrow address</div>
        <div style={{
          fontFamily:"monospace", fontSize:".72rem", color:"#2B1911",
          wordBreak:"break-all", lineHeight:1.6, marginBottom:8,
        }}>{address}</div>
        <button
          style={{
            display:"flex", alignItems:"center", gap:5,
            border:"1px solid #EAE3DF", background: copiedAddr ? "#F2F9E7" : "white",
            borderRadius:999, fontFamily:"Baloo 2, cursive",
            fontSize:".72rem", fontWeight:700,
            color: copiedAddr ? "#65A519" : "#7D675E",
            padding:"4px 12px", cursor:"pointer", transition:"all .2s",
          }}
          onClick={() => copy(address, setCopiedAddr)}
        >
          {copiedAddr ? <><IconCheck/> Copied!</> : <><IconCopy/> Copy address</>}
        </button>
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ───────────────────────────────────────────────────────────
function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500,
      background:"rgba(43,25,17,.55)", display:"flex",
      alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <div style={{
        background:"white", borderRadius:16, padding:"28px 24px",
        maxWidth:380, width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,.25)",
        animation:"modalIn .18s ease",
      }}>
        <div style={{
          width:44, height:44, borderRadius:"50%",
          background:"#FFF0EE", display:"flex", alignItems:"center",
          justifyContent:"center", marginBottom:14,
        }}>
          <IconAlert/>
        </div>
        <div style={{ fontWeight:800, fontSize:"1.05rem", marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:".88rem", color:"#7D675E", lineHeight:1.6, marginBottom:24 }}>{body}</div>
        <div style={{ display:"flex", gap:10 }}>
          <button
            style={{
              flex:1, border:"1.5px solid #EAE3DF", background:"white",
              borderRadius:999, fontFamily:"Baloo 2, cursive",
              fontWeight:700, fontSize:".87rem", color:"#2B1911",
              padding:"10px", cursor:"pointer",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor="#F56522"}
            onMouseLeave={e => e.currentTarget.style.borderColor="#EAE3DF"}
            onClick={onCancel}
          >Cancel</button>
          <button
            style={{
              flex:1, border:"none",
              background:"#DF321F", borderRadius:999,
              fontFamily:"Baloo 2, cursive", fontWeight:800,
              fontSize:".87rem", color:"white",
              padding:"10px", cursor:"pointer",
              boxShadow:"0 2px 10px rgba(223,50,31,.3)",
              transition:"filter .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.filter="brightness(0.9)"}
            onMouseLeave={e => e.currentTarget.style.filter=""}
            onClick={onConfirm}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE TO CONFIRM ────────────────────────────────────────────────────────
export function SlideToConfirm({ label, onConfirm, disabled = false, confirmedColor = "#65A519" }) {
  const [dragging, setDragging]   = useState(false);
  const [pos, setPos]             = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const trackRef  = useRef(null);
  const startXRef = useRef(0);
  const THUMB = 48;

  function getMax() {
    return (trackRef.current?.offsetWidth ?? 280) - THUMB - 4;
  }

  function onPointerDown(e) {
    if (disabled || confirmed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    startXRef.current = e.clientX - pos;
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const next = Math.max(0, Math.min(e.clientX - startXRef.current, getMax()));
    setPos(next);
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (pos >= getMax() * 0.88) {
      setPos(getMax());
      setConfirmed(true);
      onConfirm && onConfirm();
    } else {
      setPos(0);
    }
  }

  const progress = confirmed ? 1 : pos / Math.max(getMax(), 1);

  return (
    <div
      ref={trackRef}
      style={{
        position:"relative", height:52, borderRadius:999,
        background: confirmed
          ? confirmedColor
          : `linear-gradient(90deg, rgba(245,101,34,${0.12 + progress * 0.18}) ${progress * 100}%, #F4EEEB ${progress * 100}%)`,
        border:`1.5px solid ${confirmed ? confirmedColor : "#EAE3DF"}`,
        overflow:"hidden", userSelect:"none", touchAction:"none",
        cursor: disabled ? "not-allowed" : confirmed ? "default" : "grab",
        transition: dragging ? "none" : "background .3s, border-color .3s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Track label */}
      <div style={{
        position:"absolute", inset:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:".82rem", fontWeight:700,
        color: confirmed ? "white" : "#624D44",
        pointerEvents:"none",
        opacity: confirmed ? 1 : Math.max(0, 1 - progress * 2.5),
        transition:"opacity .2s",
      }}>
        {confirmed ? "✓  Done" : label}
      </div>

      {/* Thumb */}
      {!confirmed && (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position:"absolute", top:2, left:2 + pos,
            width:THUMB, height:THUMB - 4, borderRadius:999,
            background:"linear-gradient(135deg,#FF7A50,#FF4D42)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 8px rgba(245,101,34,.4)",
            cursor: disabled ? "not-allowed" : "grab",
            transition: dragging ? "none" : "left .25s cubic-bezier(.4,0,.2,1)",
            color:"white",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="6,5 12,9 6,13"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── DISPUTE BANNER ──────────────────────────────────────────────────────────
const OUTCOME_LABELS = {
  buyerWins:   "The dispute has been resolved in favour of the buyer.",
  sellerWins:  "The dispute has been resolved in favour of the seller.",
  none:        "The dispute has been reviewed and dismissed — no action taken.",
  cancelTrade: "The trade has been cancelled and the seller will be refunded.",
  payOutBuyer: "The dispute has been resolved — the buyer will receive the payout.",
};

function DisputeBanner({ scenario, onAction }) {
  const { role, disputeActive, disputeInitiator, disputeOutcome, disputeWinner,
          disputeOutcomeAcknowledgedBy, isEmailRequired, disputeAcknowledgedByCounterParty } = scenario;
  const peachId = window.__PEACH_AUTH__?.peachId;
  const iInitiated = disputeInitiator === peachId;
  const myRole = role === "buyer" ? "buyer" : "seller";
  const alreadyAckedOutcome = (disputeOutcomeAcknowledgedBy ?? []).includes(myRole);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [acked, setAcked] = useState(false);

  const boxStyle = {
    background:"#FFF0EE", border:"1px solid rgba(223,50,31,.2)",
    borderRadius:10, padding:"12px 14px", fontSize:".82rem",
    color:"#2B1911", lineHeight:1.6,
  };

  // ── Dispute resolved: show outcome + acknowledge button ──
  if (disputeOutcome && disputeOutcome !== "none" || (disputeOutcome === "none" && disputeActive === false)) {
    if (alreadyAckedOutcome || acked) {
      return (
        <div style={boxStyle}>
          <strong style={{ color:"#7D675E" }}>Dispute resolved.</strong><br/>
          {OUTCOME_LABELS[disputeOutcome] ?? "The dispute has been resolved."}
        </div>
      );
    }
    return (
      <div style={boxStyle}>
        <strong style={{ color:"#DF321F" }}>Dispute resolved</strong><br/>
        {OUTCOME_LABELS[disputeOutcome] ?? "The dispute has been resolved."}
        <div style={{ marginTop:10 }}>
          <button
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              setError(null);
              const ok = await onAction?.("dispute_ack_outcome");
              if (ok) setAcked(true);
              else setError("Failed to acknowledge. Please try again.");
              setSubmitting(false);
            }}
            style={{
              background:"#F56522", color:"#fff", border:"none", borderRadius:8,
              padding:"8px 20px", fontWeight:700, fontSize:".82rem", cursor:"pointer",
            }}
          >{submitting ? "SUBMITTING…" : "ACKNOWLEDGE"}</button>
          {error && <div style={{ color:"#DF321F", fontSize:".78rem", marginTop:6 }}>{error}</div>}
        </div>
      </div>
    );
  }

  // ── Dispute active, counterparty initiated, email required ──
  if (!iInitiated && isEmailRequired && !disputeAcknowledgedByCounterParty) {
    return (
      <div style={boxStyle}>
        <strong style={{ color:"#DF321F" }}>Your counterparty has opened a dispute.</strong><br/>
        Please enter your email address so the Peach mediator can contact you.
        <div style={{ display:"flex", gap:8, marginTop:10 }}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              flex:1, padding:"7px 10px", borderRadius:8, border:"1px solid #EAE3DF",
              fontSize:".82rem", fontFamily:"inherit",
            }}
          />
          <button
            disabled={submitting || !email.trim()}
            onClick={async () => {
              setSubmitting(true);
              setError(null);
              const ok = await onAction?.("dispute_ack_email", email.trim());
              if (ok) setAcked(true);
              else setError("Failed to submit. Please try again.");
              setSubmitting(false);
            }}
            style={{
              background:"#F56522", color:"#fff", border:"none", borderRadius:8,
              padding:"7px 16px", fontWeight:700, fontSize:".82rem", cursor:"pointer",
              opacity: (!email.trim() || submitting) ? 0.5 : 1,
            }}
          >{submitting ? "…" : "SUBMIT"}</button>
        </div>
        {error && <div style={{ color:"#DF321F", fontSize:".78rem", marginTop:6 }}>{error}</div>}
        {acked && <div style={{ color:"#65A519", fontSize:".78rem", marginTop:6 }}>Email submitted. A mediator will be in touch.</div>}
      </div>
    );
  }

  // ── Dispute active, default state (we initiated, or no email needed, or already acked) ──
  return (
    <div style={boxStyle}>
      <strong style={{ color:"#DF321F" }}>Dispute open.</strong> A Peach mediator has been assigned to your case and will be in touch soon.
      {iInitiated
        ? " You can provide additional evidence via the chat."
        : " Provide your side of the story via the chat."}
    </div>
  );
}

// ─── SELLER COUNTDOWN ─────────────────────────────────────────────────────────
function SellerPaymentCountdown({ deadline, onExtend }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = deadline ? deadline - now : null;
  const expired = ms !== null && ms <= 0;
  const urgent = ms !== null && ms > 0 && ms < 5 * 60_000; // < 5 min

  let timeStr = null;
  if (ms !== null) {
    if (ms <= 0) {
      timeStr = "Expired";
    } else {
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      timeStr = h > 0
        ? `${h}h ${m}m remaining.`
        : `${m}m ${s}s remaining.`;
    }
  }

  return <>
    <div style={{
      display:"flex", alignItems:"center", gap:8,
      background:"#FEEDE5", border:"1px solid rgba(196,81,4,.15)",
      borderRadius:8, padding:"10px 12px",
      fontSize:".83rem", color:"#C45104", fontWeight:600, lineHeight:1.5,
    }}>
      <IconClock/>
      <span>
        Waiting for the buyer to send payment.
        {timeStr && <span style={{ color: expired || urgent ? "#DF321F" : "#C45104" }}> {timeStr}</span>}
      </span>
    </div>
    {expired && <Btn label="⏱  Extend Deadline (+12h)" bg="#D7F2FE" color="#037DB5" onClick={onExtend}/>}
  </>;
}

// ─── ACTION BUTTONS ───────────────────────────────────────────────────────────
export function ActionPanel({ scenario, onAction, showPostCancel = false, pendingTask = null, onPendingClick = null }) {
  const { tradeStatus: status, role } = scenario;
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const Btn = ({ label, bg, color, onClick }) => (
    <button
      className="action-btn"
      style={{ background:bg, color:color }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.filter="brightness(0.92)"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter=""; e.currentTarget.style.transform=""; }}
    >{label}</button>
  );

  const PendingBtn = ({ label }) => (
    <button
      className="action-btn"
      style={{ background:"#FFF4EC", color:"#F56522", border:"1.5px dashed #F56522", cursor:"pointer" }}
      onClick={onPendingClick}
      onMouseEnter={e => { e.currentTarget.style.filter="brightness(0.95)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter=""; }}
    >📱 {label}</button>
  );

  const BtnGrad = ({ label, onClick }) => (
    <button className="action-btn-grad" onClick={onClick}>{label}</button>
  );

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          title="Confirm payment received?"
          body="This will immediately release the Bitcoin from escrow to the buyer. Only confirm if you have actually received the fiat payment in your account."
          confirmLabel="Yes, release Bitcoin"
          onConfirm={() => { setShowConfirm(false); onAction("release_bitcoin"); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showCancelConfirm && (
        <ConfirmModal
          title="cancel trade"
          body="Are you sure? The seller has already matched you back, so canceling now will impact your reputation in a major way."
          confirmLabel="cancel trade"
          onConfirm={() => { setShowCancelConfirm(false); onAction("cancel_trade"); }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}

      <div className="action-panel">
        {/* Buyer waiting for seller to fund escrow */}
        {(status === "fundEscrow" || status === "createEscrow" || status === "waitingForFunding") && role === "buyer" && (
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            gap:12, padding:"20px 0", textAlign:"center",
          }}>
            <div style={{
              width:48, height:48, borderRadius:"50%",
              background:"#FEFCE5", border:"2px solid #F5CE22",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1.4rem",
            }}>⏳</div>
            <div style={{ fontWeight:700, fontSize:".95rem" }}>Waiting for escrow</div>
            <div style={{ fontSize:".83rem", color:"#7D675E", lineHeight:1.6, maxWidth:280 }}>
              The seller is funding the escrow. Once the Bitcoin is locked in, the trade will begin and you'll be able to send payment.
            </div>
            <div style={{ fontSize:".85rem", fontWeight:700, color:"#7D675E" }}>No actions required for the moment.</div>
          </div>
        )}

        {/* Escrow tx broadcast, waiting for confirmations */}
        {status === "escrowWaitingForConfirmation" && (
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            gap:12, padding:"20px 0", textAlign:"center",
          }}>
            <div style={{
              width:48, height:48, borderRadius:"50%",
              background:"#FEFCE5", border:"2px solid #F5CE22",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1.4rem",
            }}>⛏️</div>
            <div style={{ fontWeight:700, fontSize:".95rem" }}>Escrow confirming</div>
            <div style={{ fontSize:".83rem", color:"#7D675E", lineHeight:1.6, maxWidth:280 }}>
              The escrow funding transaction has been broadcast. Waiting for blockchain confirmations.
            </div>
          </div>
        )}

        {/* Buyer: send payment */}
        {status === "paymentRequired" && role === "buyer" && <>
          <SlideToConfirm
            label="I've sent the payment"
            onConfirm={() => onAction("payment_sent")}
          />
        </>}

        {/* Seller: waiting for buyer to send payment */}
        {status === "paymentRequired" && role === "seller" && <>
          <SellerPaymentCountdown
            deadline={scenario.contract.paymentExpectedBy}
            onExtend={() => onAction("extend_time")}
          />
          {/* Greyed-out — seller cannot confirm payment yet */}
          <SlideToConfirm
            label="I've received the payment"
            disabled={true}
          />
        </>}

        {/* Seller: confirm receipt → releases bitcoin */}
        {(status === "confirmPaymentRequired" || status === "releaseEscrow") && role === "seller" && <>
          <div className="action-hint">The buyer has marked the payment as sent. Check your account and confirm once the funds have arrived.</div>
          {pendingTask === "release" ? (
            <PendingBtn label="Release pending in mobile app"/>
          ) : (
            <SlideToConfirm
              label="I've received the payment"
              onConfirm={() => setShowConfirm(true)}
            />
          )}
          <Btn label="Open Dispute" bg="#FFF0EE" color="#DF321F" onClick={() => onAction("dispute")}/>
        </>}

        {/* Buyer: waiting for seller to confirm payment */}
        {status === "confirmPaymentRequired" && role === "buyer" && <>
          <div className="action-hint">You've sent payment. Waiting for the seller to confirm.</div>
          <Btn label="Open Dispute" bg="#FFF0EE" color="#DF321F" onClick={() => onAction("dispute")}/>
        </>}

        {/* Payout pending — bitcoin being released */}
        {status === "payoutPending" && (
          <div className="action-hint">Bitcoin is being released. This may take a few minutes.</div>
        )}

        {/* Payment too late — seller POV */}
        {status === "paymentTooLate" && role === "seller" && !showPostCancel && <>
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"#FEFCE5", border:"1px solid rgba(154,112,0,.15)",
            borderRadius:8, padding:"10px 12px",
            fontSize:".83rem", color:"#9A7000", fontWeight:600, lineHeight:1.5,
          }}>
            <IconClock/>
            <span>The buyer did not pay in time. You can either cancel the trade without a reputation penalty, or give the buyer some more time.</span>
          </div>
          <SlideToConfirm
            label="Cancel Trade"
            onConfirm={() => onAction("cancel_trade")}
            confirmedColor="#DF321F"
          />
          <SlideToConfirm
            label="Give More Time"
            onConfirm={() => onAction("extend_time")}
          />
        </>}

        {/* Payment too late — seller POV after cancel: republish or refund */}
        {status === "paymentTooLate" && role === "seller" && showPostCancel && <>
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"#E8F9EE", border:"1px solid rgba(5,168,90,.15)",
            borderRadius:8, padding:"10px 12px",
            fontSize:".83rem", color:"#05A85A", fontWeight:600, lineHeight:1.5,
          }}>
            <span>Trade cancelled. What would you like to do with the escrow?</span>
          </div>
          <SlideToConfirm
            label="Re-publish Offer"
            onConfirm={() => onAction("republish_offer")}
          />
          {pendingTask === "refund" ? (
            <PendingBtn label="Refund pending in mobile app"/>
          ) : (
            <SlideToConfirm
              label="Refund Escrow"
              onConfirm={() => onAction("refund_escrow")}
            />
          )}
        </>}

        {/* refundOrReviveRequired — seller POV: republish or refund */}
        {status === "refundOrReviveRequired" && role === "seller" && !scenario.revived && !scenario.refunded && <>
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"#FEFCE5", border:"1px solid rgba(154,112,0,.15)",
            borderRadius:8, padding:"10px 12px",
            fontSize:".83rem", color:"#9A7000", fontWeight:600, lineHeight:1.5,
          }}>
            <span>The trade was cancelled. You can republish your offer or request a refund of the escrow.</span>
          </div>
          <SlideToConfirm
            label="Re-publish Offer"
            onConfirm={() => onAction("republish_offer")}
          />
          {pendingTask === "refund" ? (
            <PendingBtn label="Refund pending in mobile app"/>
          ) : (
            <SlideToConfirm
              label="Refund Escrow"
              onConfirm={() => onAction("refund_escrow")}
            />
          )}
        </>}

        {/* refundOrReviveRequired — already revived */}
        {status === "refundOrReviveRequired" && scenario.revived && (
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"#E8F9EE", border:"1px solid rgba(5,168,90,.15)",
            borderRadius:8, padding:"10px 12px",
            fontSize:".83rem", color:"#05A85A", fontWeight:600, lineHeight:1.5,
          }}>
            <span>Offer has been republished{scenario.newOfferId ? ` (new offer: ${scenario.newOfferId})` : ""}.</span>
          </div>
        )}

        {/* refundOrReviveRequired — already refunded */}
        {status === "refundOrReviveRequired" && scenario.refunded && (
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"#F4F4F4", border:"1px solid rgba(0,0,0,.08)",
            borderRadius:8, padding:"10px 12px",
            fontSize:".83rem", color:"var(--black-65)", fontWeight:600, lineHeight:1.5,
          }}>
            <span>Escrow has been refunded.</span>
          </div>
        )}

        {/* Payment too late — buyer POV */}
        {status === "paymentTooLate" && role === "buyer" && (
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"#FFF0EE", border:"1px solid rgba(223,50,31,.15)",
            borderRadius:8, padding:"10px 12px",
            fontSize:".83rem", color:"#DF321F", fontWeight:600, lineHeight:1.5,
          }}>
            <IconClock/>
            <span>You did not pay on time. The seller can now decide to give you more time or cancel the trade. In either case, your reputation has been impacted.</span>
          </div>
        )}

        {/* Trade cancelled — final state */}
        {(status === "tradeCanceled" || status === "confirmCancelation") && (
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"#FFF0EE", border:"1px solid rgba(223,50,31,.2)",
            borderRadius:8, padding:"12px 14px",
            fontSize:".83rem", color:"#DF321F", fontWeight:600, lineHeight:1.5,
          }}>
            <IconAlert/>
            <span>This trade has been cancelled. Your reputation has been affected.</span>
          </div>
        )}

        {/* Dispute states */}
        {(status === "dispute" || status === "disputeWithoutEscrowFunded") && (
          <DisputeBanner scenario={scenario} onAction={onAction} />
        )}

        {/* Cancel trade — available during active trade phases for buyer only (seller cancels at offer level or via dispute) */}
        {["paymentRequired", "confirmPaymentRequired", "fundEscrow", "createEscrow", "waitingForFunding", "escrowWaitingForConfirmation"].includes(status)
          && role === "buyer" && !scenario.disputeActive && (
          <Btn label="Cancel Trade" bg="#FFF0EE" color="#DF321F" onClick={() => setShowCancelConfirm(true)}/>
        )}
      </div>
    </>
  );
}

// ─── RATING PANEL ────────────────────────────────────────────────────────────
export function RatingPanel({ counterparty, onRate, pending, onPendingClick }) {
  const [rating, setRating] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted || pending) {
    return (
      <div style={{
        textAlign:"center", padding:"20px 0",
        fontSize:".9rem", color: pending ? "#F56522" : "#65A519", fontWeight:700,
      }}>
        {pending ? (
          <>
            <div style={{ fontSize:"1.5rem", marginBottom:8 }}>📱</div>
            Rating pending in mobile app
            <div style={{ marginTop:12 }}>
              <button onClick={onPendingClick} style={{
                border:"1.5px dashed #F56522", background:"#FFF9F6",
                borderRadius:999, fontFamily:"'Baloo 2',cursive",
                fontWeight:700, fontSize:".82rem", color:"#F56522",
                padding:"8px 20px", cursor:"pointer",
              }}>📱 Open signing request</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:"1.5rem", marginBottom:8 }}>✓</div>
            Rating submitted. Thanks!
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background:"linear-gradient(135deg,#FFF9F6,#FEEDE5)",
      border:"1.5px solid rgba(245,101,34,.2)",
      borderRadius:14, padding:"20px", marginTop:8,
    }}>
      <div style={{ fontWeight:800, fontSize:"1rem", marginBottom:4 }}>Trade Complete! 🎉</div>
      <div style={{ fontSize:".85rem", color:"#7D675E", marginBottom:16 }}>
        How was trading with <strong>{counterparty.name}</strong>?
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <button
          className={`rating-btn${rating === 5 ? " rating-selected-good" : ""}`}
          onClick={() => setRating(5)}
        >
          <IconThumbUp/>
          <span>Positive</span>
        </button>
        <button
          className={`rating-btn${rating === 1 ? " rating-selected-bad" : ""}`}
          onClick={() => setRating(1)}
        >
          <IconThumbDown/>
          <span>Negative</span>
        </button>
      </div>
      <button
        className="action-btn-grad"
        disabled={!rating}
        style={{ opacity: rating ? 1 : 0.5, cursor: rating ? "pointer" : "not-allowed" }}
        onClick={() => { if (rating) { onRate(rating); setSubmitted(true); }}}
      >
        Submit Rating
      </button>
    </div>
  );
}

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
export function ChatPanel({ messages, tradeId, role, disabled, status, onSend, onDisputeSubmit, hasMore, loadingMore, onLoadOlder }) {
  const disputeOpen = status === "dispute" || status === "disputeWithoutEscrowFunded";
  const [text, setText] = useState("");
  const [localMsgs, setLocalMsgs] = useState(messages);
  const [showDispute, setShowDispute] = useState(false);
  const messagesRef = useRef(null);
  const prevScrollHeight = useRef(0);

  useEffect(() => { setLocalMsgs(messages); }, [messages]);

  // Scroll to bottom on first load and new messages; preserve position when prepending older
  useEffect(() => {
    if (!messagesRef.current) return;
    const el = messagesRef.current;
    if (prevScrollHeight.current && el.scrollHeight > prevScrollHeight.current) {
      el.scrollTop = el.scrollHeight - prevScrollHeight.current;
    } else {
      el.scrollTop = el.scrollHeight;
    }
    prevScrollHeight.current = 0;
  }, [localMsgs]);

  // Auto-load older messages when user scrolls near the top
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    function onScroll() {
      if (el.scrollTop < 40 && hasMore && !loadingMore) {
        prevScrollHeight.current = el.scrollHeight;
        onLoadOlder?.();
      }
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loadingMore, onLoadOlder]);

  async function send() {
    if (!text.trim() || disabled) return;
    const msg = text.trim();
    const tempId = Date.now();
    // Optimistic UI — show immediately
    setLocalMsgs(prev => [...prev, { id:tempId, from:"me", text:msg, ts:Date.now(), optimistic:true }]);
    setText("");
    // Send via API if callback provided
    if (onSend) {
      const ok = await onSend(msg);
      // Mark as sent (remove optimistic flag) or show error
      setLocalMsgs(prev => prev.map(m => m.id === tempId ? { ...m, optimistic: false, failed: !ok } : m));
    }
  }
  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="chat-panel" style={{ position:"relative" }}>
      {showDispute && <DisputeFlow tradeId={tradeId} role={role} onClose={() => setShowDispute(false)} onSubmit={onDisputeSubmit}/>}

      {/* Disabled overlay */}
      {disabled && (
        <div style={{
          position:"absolute", inset:0, zIndex:10,
          background:"rgba(244,238,235,0.82)",
          backdropFilter:"blur(2px)",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:10,
          pointerEvents:"all",
        }}>
          <div style={{
            width:40, height:40, borderRadius:"50%",
            background:"#EAE3DF",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <IconLock/>
          </div>
          <div style={{
            fontSize:".85rem", fontWeight:700, color:"#7D675E",
            textAlign:"center", maxWidth:240, lineHeight:1.5,
          }}>
            Chat disabled while waiting for seller to fund escrow
          </div>
        </div>
      )}

      <TradingRulesCard
        disputeOpen={disputeOpen}
        disabled={disabled}
        onOpenDispute={() => setShowDispute(true)}
      />

      <div className="chat-enc-notice">
        <IconLock/> End-to-end encrypted
      </div>

      <div className="chat-messages" ref={messagesRef}>
        {loadingMore && (
          <div style={{ textAlign:"center", padding:"8px 0", fontSize:".78rem", color:"#7D675E", fontWeight:600 }}>
            Loading…
          </div>
        )}
        {localMsgs.map(msg => {
          const isMe = msg.from === "me";
          return (
            <div key={msg.id} className={`chat-bubble-row${isMe ? " chat-bubble-row-me" : ""}`}>
              <div className={`chat-bubble${isMe ? " chat-bubble-me" : " chat-bubble-them"}`}>
                <div className="chat-text">{msg.text}</div>
                <div className="chat-ts">
                  {relTime(msg.ts)}
                  {msg.optimistic && <span style={{ opacity:.6 }}> · sending…</span>}
                  {msg.failed && <span style={{ color:"#DF321F" }}> · failed to send</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          placeholder="Send an encrypted message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          disabled={disabled}
        />
        <button className="chat-send-btn" onClick={send} disabled={!text.trim() || disabled}
          style={{ opacity: (text.trim() && !disabled) ? 1 : 0.45 }}>
          <IconSend/>
        </button>
      </div>
    </div>
  );
}
