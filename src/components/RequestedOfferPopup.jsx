// ─── REQUESTED OFFER POPUP — shared across MARKET and TRADES ────────────────
// Displays a single trade-requested offer (read-only details + chat + undo).
// Used wherever a user views an offer to which they've already sent a trade
// request (MARKET screen for `isReq` offers, TRADES screen for sent requests).
//
// Self-contained: brings its own styles, fetches its own data, manages its own
// chat session. Parent only needs to provide the offer + close/undo callbacks.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { SatsAmount } from "./BitcoinAmount.jsx";
import { fetchWithSessionCheck } from "../utils/sessionGuard.js";
import {
  decryptPGPMessage,
  decryptSymmetric,
  encryptSymmetric,
  signPGPMessage,
} from "../utils/pgp.js";
import { relTime as relativeTime, fmtFiat } from "../utils/format.js";
import { methodDisplayName } from "../data/paymentMethodMeta.js";
import { markSentRequestSelfCancelled } from "../hooks/useNotifications.js";
import ConfirmModal from "./ConfirmModal.jsx";

// Currency symbol helper (mirrors the one in market-view/components.jsx)
const CURRENCY_SYMS = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF " };
const currSym = (c) => CURRENCY_SYMS[c] ?? `${c} `;

const POPUP_CSS = `
  .rop-overlay{position:fixed;inset:0;z-index:600;background:rgba(43,25,17,.55);
    display:flex;align-items:center;justify-content:center;padding:20px;
    animation:rop-fade .15s ease}
  @keyframes rop-fade{from{opacity:0}to{opacity:1}}
  .rop-card{background:var(--surface);border-radius:20px;max-width:420px;width:100%;
    box-shadow:0 20px 60px rgba(43,25,17,.3);
    animation:rop-slide .2s cubic-bezier(.34,1.56,.64,1);
    max-height:calc(100vh - 40px);overflow-y:auto}
  @keyframes rop-slide{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
  .rop-card-chat{display:flex;flex-direction:column;height:min(560px, calc(100vh - 40px));overflow:hidden}
  .rop-card-loading{display:flex;align-items:center;justify-content:center;min-height:220px}
  .rop-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 0}
  .rop-title{font-weight:800;font-size:1rem;color:var(--black)}
  .rop-id{font-size:.72rem;font-family:monospace;color:var(--black-50);margin-left:8px;font-weight:600}
  .rop-close,.rop-back{width:30px;height:30px;border-radius:8px;border:none;background:var(--black-5);
    font-size:.9rem;cursor:pointer;color:var(--black-65);
    display:flex;align-items:center;justify-content:center;transition:all .12s}
  .rop-close:hover,.rop-back:hover{background:var(--black-10);color:var(--black)}
  .rop-body{padding:16px 22px 8px}
  .rop-summary{display:flex;flex-direction:column;border:1px solid var(--black-10);border-radius:12px;overflow:hidden}
  .rop-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--black-5)}
  .rop-row:last-child{border-bottom:none}
  .rop-label{font-size:.76rem;font-weight:600;color:var(--black-65);white-space:nowrap}
  .rop-value{font-size:.82rem;font-weight:700;color:var(--black)}
  .rop-chip-method{padding:2px 7px;border-radius:999px;font-size:.69rem;font-weight:600;
    background:var(--black-5);color:var(--black-65);border:1px solid var(--black-10)}
  .rop-chip-cur{padding:2px 7px;border-radius:4px;font-size:.69rem;font-weight:700;
    background:var(--primary-mild);color:var(--primary-dark);letter-spacing:.04em}
  .rop-mempool{font-size:.78rem;font-weight:600;color:var(--primary);
    text-decoration:none;display:inline-flex;align-items:center;gap:4px}
  .rop-requested{margin-top:16px;padding:16px;border-radius:10px;background:var(--success-bg);text-align:center}
  .rop-requested-badge{font-size:.88rem;font-weight:800;color:var(--success)}
  .rop-footer{padding:12px 22px 18px;display:flex;gap:8px}
  .rop-btn{flex:1;padding:12px;border-radius:999px;border:none;
    font-family:var(--font);font-size:.88rem;font-weight:800;
    cursor:pointer;letter-spacing:.02em;transition:all .14s}
  .rop-btn:disabled{opacity:.4;cursor:not-allowed}
  .rop-btn-undo{background:var(--black-5);color:var(--black-65)}
  .rop-btn-undo:hover:not(:disabled){background:var(--black-10);color:var(--black)}
  .rop-btn-chat{background:var(--primary-mild);color:var(--primary-dark)}
  .rop-btn-chat:hover:not(:disabled){background:var(--primary);color:white}
  .rop-btn-primary{background:var(--grad);color:white}
  .rop-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(43,25,17,.18)}
  .rop-title-success{color:var(--success)}
  .rop-accepted{margin-top:16px;padding:16px;border-radius:10px;background:var(--success-bg);text-align:center}
  .rop-accepted-badge{font-size:.88rem;font-weight:800;color:var(--success)}
  /* Chat */
  .rop-chat-enc{margin:10px 22px 0;padding:6px 12px;border-radius:8px;
    background:var(--primary-mild);color:var(--primary-dark);
    font-size:.72rem;font-weight:700;text-align:center}
  .rop-chat-msgs{flex:1;overflow-y:auto;padding:14px 22px;display:flex;flex-direction:column;gap:10px}
  .rop-chat-row{display:flex}
  .rop-chat-row-me{justify-content:flex-end}
  .rop-chat-bubble{max-width:72%;border-radius:14px;padding:9px 13px;line-height:1.4}
  .rop-chat-bubble-me{background:var(--grad);color:white;border-bottom-right-radius:4px}
  .rop-chat-bubble-them{background:var(--surface);border:1px solid var(--black-10);color:var(--black);border-bottom-left-radius:4px}
  .rop-chat-text{font-size:.84rem;white-space:pre-wrap;word-break:break-word}
  .rop-chat-ts{font-size:.66rem;opacity:.7;margin-top:3px;text-align:right}
  .rop-chat-bubble-them .rop-chat-ts{text-align:left}
  .rop-chat-input-row{display:flex;gap:8px;padding:10px 16px 14px;border-top:1px solid var(--black-10);align-items:flex-end}
  .rop-chat-input{flex:1;resize:none;border:1.5px solid var(--black-10);border-radius:14px;
    padding:9px 12px;font-family:var(--font);font-size:.84rem;
    background:var(--surface);color:var(--black);outline:none;max-height:96px;line-height:1.35}
  .rop-chat-input:focus{border-color:var(--primary)}
  .rop-chat-send{width:38px;height:38px;border-radius:50%;border:none;
    background:var(--grad);color:white;cursor:pointer;
    display:flex;align-items:center;justify-content:center;transition:transform .1s}
  .rop-chat-send:not(:disabled):hover{transform:translateY(-1px)}
  @keyframes rop-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  .rop-spinner{font-size:2rem;animation:rop-spin 1s linear infinite;color:var(--primary)}
`;

/**
 * Props:
 *   offer            — must have: id, type ("ask"|"bid"), tradeId, amount, premium,
 *                      methods, currencies. Other fields (escrow, etc.) are fetched.
 *   auth             — auth object ({ baseUrl, token, pgpPrivKey })
 *   onClose          — close handler
 *   onUndoSuccess    — optional: called with offer.id after a successful DELETE undo
 *   selectedCurrency — optional fiat currency for the "Fiat value" row
 *   btcPrice         — optional BTC price in selectedCurrency
 */
export default function RequestedOfferPopup({
  offer,
  auth,
  onClose,
  onUndoSuccess,
  selectedCurrency,
  btcPrice,
  acceptedContractId,
  onOpenTrade,
  onAccepted,
}) {
  if (!offer) return null;

  const isSell = offer.type === "ask"; // sell offer (someone selling BTC)
  const offerTypePath = isSell ? "sellOffer" : "buyOffer";
  const isAccepted = !!acceptedContractId;

  // ── View: "detail" | "chat" ──
  const [view, setView] = useState("detail");

  // ── Server-fetched data (escrow, trade-request body w/ symmetric key) ──
  const [details, setDetails] = useState(null);          // GET /v069/sellOffer/:id
  const [tradeRequest, setTradeRequest] = useState(null); // GET .../tradeRequestPerformed
  const [initialLoading, setInitialLoading] = useState(true);

  // Tracks whether we've ever observed a non-empty tradeRequest body for this
  // popup session. When the request later disappears (counterparty accepted or
  // rejected), this gates the immediate /contracts/summary lookup so we can
  // distinguish acceptance from rejection without waiting for the parent's
  // poll cadence.
  const tradeRequestSeenRef = useRef(false);
  const acceptanceCheckRef = useRef(false);

  // Poll both endpoints every 10s while popup is open.
  useEffect(() => {
    if (!auth) return;
    if (isAccepted) { setInitialLoading(false); return; }
    let cancelled = false;
    const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
    const hdrs = { Authorization: `Bearer ${auth.token}` };

    async function refresh(isInitial) {
      try {
        const [detailsRes, tradeReqRes] = await Promise.all([
          isSell
            ? fetchWithSessionCheck(`${v069Base}/sellOffer/${offer.id}`, { headers: hdrs })
            : Promise.resolve(null),
          fetchWithSessionCheck(
            `${v069Base}/${offerTypePath}/${offer.id}/tradeRequestPerformed`,
            { headers: hdrs },
          ),
        ]);
        if (cancelled) return;
        if (detailsRes && detailsRes.ok) {
          const body = await detailsRes.json().catch(() => null);
          if (!cancelled && body) setDetails(body);
        }
        let tradeReqEmpty = false;
        if (tradeReqRes) {
          if (tradeReqRes.status === 404) {
            tradeReqEmpty = true;
          } else if (tradeReqRes.ok) {
            const body = await tradeReqRes.json().catch(() => null);
            if (!cancelled && body && body.success !== true) {
              setTradeRequest(body);
              tradeRequestSeenRef.current = true;
            } else if (body && body.success === true) {
              tradeReqEmpty = true;
            }
          }
        }
        // The trade request disappeared after we'd seen it — likely the
        // counterparty just accepted (offer became a contract) or rejected.
        // Check /contracts/summary directly so we surface acceptance fast,
        // independent of the parent's polling offset.
        if (
          tradeReqEmpty &&
          tradeRequestSeenRef.current &&
          !acceptedContractId &&
          !acceptanceCheckRef.current
        ) {
          acceptanceCheckRef.current = true;
          try {
            const cRes = await fetchWithSessionCheck(
              `${auth.baseUrl}/contracts/summary`,
              { headers: hdrs },
            );
            if (!cancelled && cRes && cRes.ok) {
              const list = await cRes.json().catch(() => null);
              if (Array.isArray(list)) {
                const offerIdStr = String(offer.id);
                const match = list.find(c => String(c.id).split("-").includes(offerIdStr));
                if (match && onAccepted) onAccepted(String(match.id));
              }
            }
          } catch { /* silent */ }
        }
      } catch { /* silent */ }
      finally {
        if (isInitial && !cancelled) setInitialLoading(false);
      }
    }

    refresh(true);
    const iv = setInterval(() => refresh(false), 10000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [auth, offer.id, offerTypePath, isSell, isAccepted, acceptedContractId, onAccepted]);

  // ── Undo state ──
  const [undoLoading, setUndoLoading] = useState(false);
  const [undoError, setUndoError] = useState(null);
  // Confirmation modal — gates the DELETE so users can't drop a sent request
  // without acknowledging the reputation impact.
  const [confirmUndoOpen, setConfirmUndoOpen] = useState(false);

  async function handleUndo() {
    if (undoLoading || !auth) return;
    setUndoLoading(true);
    setUndoError(null);
    try {
      const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
      const res = await fetchWithSessionCheck(
        `${v069Base}/${offerTypePath}/${offer.id}/tradeRequestPerformed`,
        { method: "DELETE", headers: { Authorization: `Bearer ${auth.token}` } },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setUndoError(err?.error || err?.message || `Failed (${res.status})`);
        setUndoLoading(false);
        return;
      }
      markSentRequestSelfCancelled(offer.id);
      onClose();
      if (onUndoSuccess) onUndoSuccess(offer.id);
    } catch (e) {
      setUndoError(e.message || "Undo failed");
      setUndoLoading(false);
    }
  }

  // ── Chat state ──
  const [chatMessages, setChatMessages] = useState([]);
  const [chatSymKey, setChatSymKey] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatScrollRef = useRef(null);

  function buildChatUrl() {
    if (!auth) return null;
    const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
    return `${v069Base}/${offerTypePath}/${offer.id}/tradeRequestPerformed/chat`;
  }

  async function decryptMsgs(rawMessages, symKey) {
    const decrypted = [];
    for (const msg of rawMessages) {
      let text = msg.encryptedMessage ?? "";
      try {
        if (text.startsWith("-----BEGIN PGP MESSAGE-----")) {
          text = await decryptSymmetric(text, symKey);
        }
      } catch { /* keep raw */ }
      decrypted.push({
        id: msg.id,
        from: msg.sender === "tradeRequester" ? "me" : "them",
        text,
        ts: new Date(msg.creationDate ?? Date.now()).getTime(),
      });
    }
    return decrypted.sort((a, b) => a.ts - b.ts);
  }

  // Fetch + decrypt messages on entering chat view
  useEffect(() => {
    if (view !== "chat" || !auth) return;
    if (!tradeRequest?.symmetricKeyEncrypted) return;
    let cancelled = false;
    (async () => {
      setChatLoading(true);
      setChatMessages([]);
      setChatSymKey(null);
      try {
        const symKey = await decryptPGPMessage(tradeRequest.symmetricKeyEncrypted, auth.pgpPrivKey);
        if (cancelled) return;
        setChatSymKey(symKey);
        const url = buildChatUrl();
        const res = await fetchWithSessionCheck(url, { headers: { Authorization: `Bearer ${auth.token}` } });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const msgs = Array.isArray(data) ? data : (data.messages ?? data.data ?? []);
          const decrypted = await decryptMsgs(msgs, symKey);
          if (!cancelled) setChatMessages(decrypted);
        }
      } catch (err) {
        console.error("Chat load error:", err);
      }
      if (!cancelled) setChatLoading(false);
    })();
    return () => { cancelled = true; };
  }, [view, tradeRequest?.symmetricKeyEncrypted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll every 5s while chat is open
  useEffect(() => {
    if (view !== "chat" || !chatSymKey || !auth) return;
    const url = buildChatUrl();
    const iv = setInterval(async () => {
      try {
        const res = await fetchWithSessionCheck(url, { headers: { Authorization: `Bearer ${auth.token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const msgs = Array.isArray(data) ? data : (data.messages ?? data.data ?? []);
        const decrypted = await decryptMsgs(msgs, chatSymKey);
        setChatMessages(prev => {
          const optimistic = prev.filter(m => m.optimistic);
          const optIds = new Set(optimistic.map(m => m.id));
          const merged = [...optimistic];
          for (const m of decrypted) if (!optIds.has(m.id)) merged.push(m);
          merged.sort((a, b) => a.ts - b.ts);
          return merged;
        });
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [view, chatSymKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  async function handleSendChat() {
    if (!chatText.trim() || chatSending || !chatSymKey || !auth) return;
    const plaintext = chatText.trim();
    const tempId = Date.now();
    setChatMessages(prev => [...prev, {
      id: tempId, from: "me", text: plaintext, ts: Date.now(), optimistic: true,
    }]);
    setChatText("");
    setChatSending(true);
    try {
      const encrypted = await encryptSymmetric(plaintext, chatSymKey);
      const signature = await signPGPMessage(plaintext, auth.pgpPrivKey);
      const url = buildChatUrl();
      const res = await fetchWithSessionCheck(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messageEncrypted: encrypted, signature }),
      });
      setChatMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, optimistic: false, failed: !res.ok } : m
      ));
    } catch {
      setChatMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, optimistic: false, failed: true } : m
      ));
    }
    setChatSending(false);
  }

  function handleChatKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  }

  // ── Initial load spinner ──
  if (initialLoading && !details && !tradeRequest) {
    return (
      <>
        <style>{POPUP_CSS}</style>
        <div className="rop-overlay" onClick={onClose}>
          <div className="rop-card rop-card-loading" onClick={e => e.stopPropagation()}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
              <div className="rop-spinner">↻</div>
              <div style={{fontSize:".82rem",fontWeight:600,color:"var(--black-65)"}}>
                Loading offer details…
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Chat view ──
  if (view === "chat") {
    return (
      <>
        <style>{POPUP_CSS}</style>
        <div className="rop-overlay" onClick={onClose}>
          <div className="rop-card rop-card-chat" onClick={e => e.stopPropagation()}>
            <div className="rop-header">
              <button className="rop-back" onClick={() => setView("detail")} aria-label="Back">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="10,2 4,8 10,14"/>
                </svg>
              </button>
              <span className="rop-title" style={{flex:1, marginLeft:8}}>Chat</span>
              <button className="rop-close" onClick={onClose}>✕</button>
            </div>
            <div className="rop-chat-enc">🔒 End-to-end encrypted</div>
            <div className="rop-chat-msgs" ref={chatScrollRef}>
              {chatLoading && (
                <div style={{textAlign:"center",padding:"24px 0",fontSize:".82rem",color:"var(--black-65)",fontWeight:600}}>
                  Loading messages…
                </div>
              )}
              {!chatLoading && chatMessages.length === 0 && (
                <div style={{textAlign:"center",padding:"24px 0",fontSize:".82rem",color:"var(--black-50)",fontWeight:600}}>
                  No messages yet
                </div>
              )}
              {chatMessages.map(msg => {
                const isMe = msg.from === "me";
                return (
                  <div key={msg.id} className={`rop-chat-row${isMe ? " rop-chat-row-me" : ""}`}>
                    <div className={`rop-chat-bubble${isMe ? " rop-chat-bubble-me" : " rop-chat-bubble-them"}`}>
                      <div className="rop-chat-text">{msg.text}</div>
                      <div className="rop-chat-ts">
                        {relativeTime(msg.ts)}
                        {msg.optimistic && <span style={{opacity:.6}}> · sending…</span>}
                        {msg.failed && <span style={{color:"var(--error)"}}> · failed</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rop-chat-input-row">
              <textarea
                className="rop-chat-input"
                placeholder="Send an encrypted message…"
                value={chatText}
                onChange={e => setChatText(e.target.value)}
                onKeyDown={handleChatKey}
                rows={1}
              />
              <button
                className="rop-chat-send"
                onClick={handleSendChat}
                disabled={!chatText.trim() || chatSending}
                style={{opacity: chatText.trim() && !chatSending ? 1 : .45}}
                aria-label="Send"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="14" y1="2" x2="7" y2="9"/>
                  <polygon points="14,2 9,14 7,9 2,7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Detail view ──
  const sym = currSym(selectedCurrency || "EUR");
  const fiat = btcPrice
    ? (offer.amount / 100_000_000) * btcPrice * (1 + (offer.premium ?? 0) / 100)
    : null;
  const escrow = details?.escrow ?? null;
  const chatEnabled = !!tradeRequest?.symmetricKeyEncrypted;

  return (
    <>
      <style>{POPUP_CSS}</style>
      <div className="rop-overlay" onClick={onClose}>
        <div className="rop-card" onClick={e => e.stopPropagation()}>
          <div className="rop-header">
            <span className={`rop-title${isAccepted ? " rop-title-success" : ""}`}>
              {isAccepted ? "Trade accepted" : "Trade requested"}
              <span className="rop-id">{offer.tradeId}</span>
            </span>
            <button className="rop-close" onClick={onClose}>✕</button>
          </div>

          <div className="rop-body">
            <div className="rop-summary">
              <div className="rop-row">
                <span className="rop-label">Type</span>
                <span className="rop-value" style={{color: isSell ? "var(--error)" : "var(--success)"}}>
                  {isSell ? "Sell" : "Buy"}
                </span>
              </div>
              <div className="rop-row">
                <span className="rop-label">Amount</span>
                <span className="rop-value"><SatsAmount sats={offer.amount}/></span>
              </div>
              {fiat != null && (
                <div className="rop-row">
                  <span className="rop-label">Fiat value</span>
                  <span className="rop-value" style={{fontWeight:800}}>{sym}{fmtFiat(fiat)}</span>
                </div>
              )}
              {offer.premium !== undefined && (
                <div className="rop-row">
                  <span className="rop-label">Premium</span>
                  <span className="rop-value" style={{
                    color: offer.premium === 0
                      ? "var(--black)"
                      : isSell
                        ? (offer.premium > 0 ? "var(--success)" : "var(--error)")
                        : (offer.premium < 0 ? "var(--success)" : "var(--error)"),
                  }}>
                    {offer.premium > 0 ? "+" : ""}{offer.premium.toFixed(2)}%
                  </span>
                </div>
              )}
              {offer.methods?.length > 0 && (
                <div className="rop-row">
                  <span className="rop-label">Payment methods</span>
                  <span className="rop-value">
                    <span style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      {offer.methods.map(m => <span key={m} className="rop-chip-method">{methodDisplayName(m)}</span>)}
                    </span>
                  </span>
                </div>
              )}
              {offer.currencies?.length > 0 && (
                <div className="rop-row">
                  <span className="rop-label">Currencies</span>
                  <span className="rop-value">
                    <span style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      {offer.currencies.map(c => <span key={c} className="rop-chip-cur">{c}</span>)}
                    </span>
                  </span>
                </div>
              )}
              {escrow && (
                <div className="rop-row">
                  <span className="rop-label">Onchain escrow</span>
                  <span className="rop-value">
                    <a className="rop-mempool"
                      href={`https://mempool.space/address/${escrow}`}
                      target="_blank" rel="noopener noreferrer">
                      See on mempool.space
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 9L9 2M9 2H5M9 2v4"/>
                      </svg>
                    </a>
                  </span>
                </div>
              )}
            </div>

            {isAccepted ? (
              <div className="rop-accepted">
                <div className="rop-accepted-badge">✓ Trade accepted</div>
                <div style={{fontSize:".78rem",color:"var(--black-65)",marginTop:4}}>
                  The {isSell ? "seller" : "buyer"} accepted your request.
                </div>
              </div>
            ) : (
              <div className="rop-requested">
                <div className="rop-requested-badge">✓ Trade requested</div>
                <div style={{fontSize:".78rem",color:"var(--black-65)",marginTop:4}}>
                  Waiting for the {isSell ? "seller" : "buyer"} to respond.
                </div>
              </div>
            )}

            {!isAccepted && undoError && (
              <div style={{color:"var(--error)",fontSize:".78rem",fontWeight:600,marginTop:10,textAlign:"center"}}>
                {undoError}
              </div>
            )}
          </div>

          <div className="rop-footer">
            {isAccepted ? (
              <button
                className="rop-btn rop-btn-primary"
                onClick={() => onOpenTrade && onOpenTrade()}
              >
                Open trade
              </button>
            ) : (
              <>
                <button
                  className="rop-btn rop-btn-undo"
                  disabled={undoLoading}
                  onClick={() => setConfirmUndoOpen(true)}
                >
                  {undoLoading ? "Undoing…" : "Undo request"}
                </button>
                <button
                  className="rop-btn rop-btn-chat"
                  disabled={!chatEnabled || undoLoading}
                  title={chatEnabled ? "Open chat" : "Chat not available"}
                  onClick={() => setView("chat")}
                >
                  💬 Chat
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {confirmUndoOpen && (
        <ConfirmModal
          title="Are you sure?"
          body="Your reputation will be impacted."
          confirmLabel="Undo request"
          tone="danger"
          onCancel={() => setConfirmUndoOpen(false)}
          onConfirm={() => { setConfirmUndoOpen(false); handleUndo(); }}
        />
      )}
    </>
  );
}
