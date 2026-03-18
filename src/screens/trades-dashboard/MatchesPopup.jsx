// ─── TRADES DASHBOARD — MATCHES POPUP ──────────────────────────────────────
// Extracted from peach-trades-dashboard.jsx
// Contains: MatchesPopup component + helper functions used by the popup
//           and by the main component's fetch logic.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { SatsAmount, IcoBtc } from "../../components/BitcoinAmount.jsx";
import { relTime as relativeTime, formatTradeId } from "../../utils/format.js";
import { AVATAR_COLORS } from "../../data/mockData.js";
import Avatar from "../../components/Avatar.jsx";
import { PeachRating, Badge, satsToFiat } from "./components.jsx";
import { decryptPGPMessage, decryptSymmetric, encryptSymmetric, signPGPMessage } from "../../utils/pgp.js";

// ─── ICONS (chat) ────────────────────────────────────────────────────────────
const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 3h11a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2.5V4a1 1 0 011-1z"/>
  </svg>
);
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="14" y1="2" x2="6" y2="10"/><polygon points="14,2 9,14 6,10 2,7" fill="currentColor" stroke="none"/>
  </svg>
);
const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <rect x="2" y="5.5" width="8" height="5.5" rx="1.5"/><path d="M4 5.5V3.5a2 2 0 0 1 4 0v2"/>
  </svg>
);


// ─── HELPER FUNCTIONS (also used by index.jsx fetch logic) ──────────────────

// Re-export for backwards compatibility (other files import from here)
export { formatTradeId } from "../../utils/format.js";

export function formatPeachName(rawId) {
  if (!rawId || rawId === "unknown") return "Unknown";
  // "03c292c382..." → "Peach03C292C3" (first 8 hex chars, uppercase)
  return "Peach" + rawId.slice(0, 8).toUpperCase();
}

export function transformMatch(apiMatch) {
  const u = apiMatch.user ?? {};
  const peachId = u.id ?? "unknown";
  const displayName = formatPeachName(peachId);
  const initials = displayName.slice(-2).toUpperCase();
  const color = AVATAR_COLORS[
    peachId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  ];
  const badges = (u.medals ?? []).map(m => {
    if (m === "fastTrader") return "fast";
    if (m === "superTrader") return "supertrader";
    return m;
  });
  const mop = apiMatch.meansOfPayment ?? {};
  const currencies = Object.keys(mop);
  const methods = [...new Set(Object.values(mop).flat())];
  return {
    offerId: apiMatch.offerId,
    requestedAt: new Date(apiMatch.creationDate ?? Date.now()).getTime(),
    user: {
      name: displayName,
      initials,
      color,
      rep: u.peachRating ?? u.rating ?? 0,
      trades: u.trades ?? 0,
      badges,
    },
    amount: apiMatch.amount ?? 0,
    premium: apiMatch.premium ?? 0,
    methods,
    currencies,
    _raw: {
      matchedPrice: apiMatch.matchedPrice,
      prices: apiMatch.prices,
      selectedCurrency: apiMatch.selectedCurrency,
      selectedPaymentMethod: apiMatch.selectedPaymentMethod,
      symmetricKeyEncrypted: apiMatch.symmetricKeyEncrypted,
      symmetricKeySignature: apiMatch.symmetricKeySignature,
      instantTrade: apiMatch.instantTrade,
      pgpPublicKeys: u.pgpPublicKeys,
    },
  };
}

export function transformTradeRequest(tr, offer, userProfile) {
  const peachId = tr.userId ?? "unknown";
  const displayName = formatPeachName(peachId);
  const initials = displayName.slice(-2).toUpperCase();
  const color = AVATAR_COLORS[
    peachId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  ];
  const u = userProfile ?? {};
  const badges = (u.medals ?? []).map(m => {
    if (m === "fastTrader") return "fast";
    if (m === "superTrader") return "supertrader";
    return m;
  });
  return {
    offerId: String(tr.id), // trade request ID
    requestedAt: new Date(tr.creationDate ?? Date.now()).getTime(),
    user: {
      name: displayName,
      initials,
      color,
      rep: u.peachRating ?? u.rating ?? 0,
      trades: u.trades ?? 0,
      badges,
    },
    amount: offer.amount ?? 0,
    premium: offer.premium ?? 0,
    methods: tr.paymentMethod ? [tr.paymentMethod] : [],
    currencies: tr.currency ? [tr.currency] : [],
    _raw: {
      matchedPrice: tr.price,
      prices: tr.currency ? { [tr.currency]: tr.price } : {},
      selectedCurrency: tr.currency,
      selectedPaymentMethod: tr.paymentMethod,
      symmetricKeyEncrypted: tr.symmetricKeyEncrypted,
      symmetricKeySignature: tr.symmetricKeySignature,
      instantTrade: false,
      pgpPublicKeys: [],
      // v069-specific: counterparty already sent their encrypted payment data
      paymentDataEncrypted: tr.paymentDataEncrypted,
      paymentDataSignature: tr.paymentDataSignature,
      isTradeRequest: true, // flag to use v069 accept endpoint
      tradeRequestUserId: peachId,
    },
  };
}


// ─── MATCHES POPUP COMPONENT ────────────────────────────────────────────────
// Props:
//   trade           — the offer object that the popup is showing matches for
//   matches         — array of match objects
//   matchDetail     — currently selected match (detail view) or null
//   matchConfirm    — match pending confirmation or null
//   matchError      — error message or null
//   matchesLoading  — boolean
//   setMatchDetail  — setter
//   setMatchConfirm — setter
//   onClose         — close popup handler
//   onSkip          — (trade, match) handler (system matches)
//   onReject        — (trade, match) handler (v069 trade requests)
//   onAccept        — (trade, match) handler
//   onConfirmAccept — (trade, match) handler
// ─────────────────────────────────────────────────────────────────────────────
export default function MatchesPopup({
  trade, matches, matchDetail, matchConfirm, matchError, matchesLoading,
  setMatchDetail, setMatchConfirm, onClose, onSkip, onReject, onAccept, onConfirmAccept,
}) {
  const auth = window.__PEACH_AUTH__ ?? null;
  const isBuy = trade.direction === "buy";

  // ── Chat state (local to popup) ──
  const [chatMatch, setChatMatch] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatSymKey, setChatSymKey] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const messagesRef = useRef(null);

  // ── Unread dot state ──
  const [unreadMatchIds, setUnreadMatchIds] = useState(new Set());

  // Check for unread messages on each match when popup opens
  useEffect(() => {
    if (!auth || !matches.length) return;
    let cancelled = false;
    const chatMatches = matches.filter(m => m._raw.symmetricKeyEncrypted && m._raw.tradeRequestUserId);
    if (!chatMatches.length) return;

    const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
    const offerType = trade.direction === "buy" ? "buyOffer" : "sellOffer";

    Promise.all(chatMatches.map(async (m) => {
      try {
        const url = `${v069Base}/${offerType}/${trade.id}/tradeRequestReceived/${m._raw.tradeRequestUserId}/chat`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } });
        if (!res.ok) return null;
        const data = await res.json();
        const msgs = Array.isArray(data) ? data : (data.messages ?? data.data ?? []);
        const hasUnread = msgs.some(msg => msg.sender === "tradeRequester" && msg.seen === false);
        return hasUnread ? m.offerId : null;
      } catch { return null; }
    })).then(results => {
      if (cancelled) return;
      const ids = new Set(results.filter(Boolean));
      setUnreadMatchIds(ids);
    });

    return () => { cancelled = true; };
  }, [matches]);

  // ── Build v069 chat URL for current chat match ──
  function buildChatUrl(match) {
    if (!auth || !match) return null;
    const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
    const offerType = trade.direction === "buy" ? "buyOffer" : "sellOffer";
    const userId = match._raw.tradeRequestUserId;
    return `${v069Base}/${offerType}/${trade.id}/tradeRequestReceived/${userId}/chat`;
  }

  // ── Decrypt messages from API response ──
  async function decryptMessages(rawMessages, symKey) {
    const decrypted = [];
    for (const msg of rawMessages) {
      let text = msg.encryptedMessage ?? "";
      try {
        if (text.startsWith("-----BEGIN PGP MESSAGE-----")) {
          text = await decryptSymmetric(text, symKey);
        }
      } catch { /* show raw if decryption fails */ }
      decrypted.push({
        id: msg.id,
        from: msg.sender === "offerOwner" ? "me" : "them",
        text,
        ts: new Date(msg.creationDate ?? Date.now()).getTime(),
      });
    }
    return decrypted.sort((a, b) => a.ts - b.ts);
  }

  // ── Fetch & decrypt chat on open ──
  useEffect(() => {
    if (!chatMatch || !auth) return;
    let cancelled = false;

    async function load() {
      setChatLoading(true);
      setChatMessages([]);
      setChatSymKey(null);
      try {
        // Decrypt symmetric key from the trade request
        const symKey = await decryptPGPMessage(chatMatch._raw.symmetricKeyEncrypted, auth.pgpPrivKey);
        if (cancelled) return;
        setChatSymKey(symKey);

        // Fetch messages
        const url = buildChatUrl(chatMatch);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const msgs = Array.isArray(data) ? data : (data.messages ?? data.data ?? []);
          const decrypted = await decryptMessages(msgs, symKey);
          if (!cancelled) setChatMessages(decrypted);
        }
      } catch (err) {
        console.error("Pre-contract chat load error:", err);
      }
      if (!cancelled) setChatLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [chatMatch]);

  // ── Poll for new messages every 5s ──
  useEffect(() => {
    if (!chatMatch || !chatSymKey || !auth) return;
    const url = buildChatUrl(chatMatch);
    const iv = setInterval(async () => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const msgs = Array.isArray(data) ? data : (data.messages ?? data.data ?? []);
        const decrypted = await decryptMessages(msgs, chatSymKey);
        setChatMessages(prev => {
          const ids = new Set(prev.filter(m => m.optimistic).map(m => m.id));
          const merged = [...prev.filter(m => m.optimistic)];
          for (const msg of decrypted) {
            if (!ids.has(msg.id)) merged.push(msg);
          }
          merged.sort((a, b) => a.ts - b.ts);
          return merged;
        });
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [chatMatch, chatSymKey]);

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ── Send message ──
  async function handleSendChat() {
    if (!chatText.trim() || chatSending || !chatSymKey || !auth) return;
    const plaintext = chatText.trim();
    const tempId = Date.now();

    // Optimistic UI
    setChatMessages(prev => [...prev, { id: tempId, from: "me", text: plaintext, ts: Date.now(), optimistic: true }]);
    setChatText("");
    setChatSending(true);

    try {
      const encrypted = await encryptSymmetric(plaintext, chatSymKey);
      const signature = await signPGPMessage(plaintext, auth.pgpPrivKey, { detached: true });
      const url = buildChatUrl(chatMatch);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); }
  }

  // ── Confirmation dialog ──
  if (matchConfirm) {
    const m = matchConfirm;
    return (
      <div className="matches-overlay" onClick={onClose}>
        <div className="matches-popup" onClick={e => e.stopPropagation()}>
          <div className="matches-header">
            <span style={{fontWeight:800,fontSize:"1.05rem"}}>Confirm trade</span>
            <button className="matches-close" onClick={onClose}>✕</button>
          </div>
          <div style={{padding:"20px 24px",textAlign:"center"}}>
            <Avatar initials={m.user.initials} color={m.user.color} size={56}/>
            <div style={{fontWeight:800,fontSize:"1rem",marginTop:12}}>
              Accept trade with {m.user.name}?
            </div>
            <div style={{fontSize:".82rem",color:"var(--black-65)",marginTop:6}}>
              This will create a contract. Other requesters will be automatically declined.
            </div>
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"center"}}>
              <button className="match-btn-skip" onClick={() => setMatchConfirm(null)}>Cancel</button>
              <button className="match-btn-accept" onClick={() => onConfirmAccept(trade, m)}>Confirm</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Chat view ──
  if (chatMatch) {
    const m = chatMatch;
    return (
      <div className="matches-overlay" onClick={onClose}>
        <div className="matches-popup matches-popup-chat" onClick={e => e.stopPropagation()}>
          <div className="matches-header">
            <button className="matches-back" onClick={() => { setChatMatch(null); setChatSymKey(null); }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,2 4,8 10,14"/></svg>
            </button>
            <Avatar initials={m.user.initials} color={m.user.color} size={28}/>
            <span style={{fontWeight:800,fontSize:".95rem",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.user.name}</span>
            <button className="matches-close" onClick={onClose}>✕</button>
          </div>

          <div className="chat-enc-notice">
            <IconLock/> End-to-end encrypted
          </div>

          <div className="precontract-chat-messages" ref={messagesRef}>
            {chatLoading && (
              <div style={{textAlign:"center",padding:"24px 0",fontSize:".82rem",color:"var(--black-65)",fontWeight:600}}>
                Loading messages\u2026
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
                <div key={msg.id} className={`chat-bubble-row${isMe ? " chat-bubble-row-me" : ""}`}>
                  <div className={`chat-bubble${isMe ? " chat-bubble-me" : " chat-bubble-them"}`}>
                    <div className="chat-text">{msg.text}</div>
                    <div className="chat-ts">
                      {relativeTime(msg.ts)}
                      {msg.optimistic && <span style={{opacity:.6}}> · sending\u2026</span>}
                      {msg.failed && <span style={{color:"#DF321F"}}> · failed to send</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chat-input-row">
            <textarea
              className="chat-input"
              placeholder="Send an encrypted message\u2026"
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              onKeyDown={handleChatKey}
              rows={1}
            />
            <button
              className="chat-send-btn"
              onClick={handleSendChat}
              disabled={!chatText.trim() || chatSending}
              style={{opacity: chatText.trim() && !chatSending ? 1 : 0.45}}
            >
              <IconSend/>
            </button>
          </div>

          <div className="precontract-chat-accept-bar">
            <button
              className="match-btn-accept"
              style={{width:"100%"}}
              onClick={() => { setMatchDetail(m); setChatMatch(null); setChatSymKey(null); }}
            >
              Review & Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detail view ──
  if (matchDetail) {
    const m = matchDetail;
    const reqAgo = relativeTime(m.requestedAt);
    return (
      <div className="matches-overlay" onClick={onClose}>
        <div className="matches-popup" onClick={e => e.stopPropagation()}>
          <div className="matches-header">
            <button className="matches-back" onClick={() => setMatchDetail(null)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,2 4,8 10,14"/></svg>
            </button>
            <span style={{fontWeight:800,fontSize:"1.05rem"}}>Review trader</span>
            <button className="matches-close" onClick={onClose}>✕</button>
          </div>
          <div style={{padding:"16px 24px 24px"}}>
            {/* Peer profile */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:20}}>
              <Avatar initials={m.user.initials} color={m.user.color} size={56}/>
              <div style={{fontWeight:800,fontSize:"1rem"}}>{m.user.name}</div>
              <PeachRating rep={m.user.rep} size={20}/>
              <span style={{fontSize:".82rem",color:"var(--black-65)"}}>{m.user.trades} trades</span>
              {m.user.badges.length > 0 && (
                <div style={{display:"flex",gap:6}}>
                  {m.user.badges.includes("supertrader") && <Badge label="supertrader" icon="☆"/>}
                  {m.user.badges.includes("fast") && <Badge label="fast" icon="⚡"/>}
                </div>
              )}
            </div>
            {/* Trade terms */}
            <div className="match-detail-terms">
              <div className="match-detail-row">
                <span className="match-detail-label">Amount</span>
                <SatsAmount sats={m.amount}/>
              </div>
              {(() => {
                const cur = m.currencies[0] ?? "EUR";
                const sym = cur === "CHF" ? "CHF " : cur === "GBP" ? "£" : "€";
                const matchedPrice = m._raw.matchedPrice;
                return (
                  <div className="match-detail-row">
                    <span className="match-detail-label">You pay</span>
                    <span style={{fontWeight:700}}>{sym}{matchedPrice != null ? Number(matchedPrice).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : satsToFiat(m.amount)}</span>
                  </div>
                );
              })()}
              <div className="match-detail-row">
                <span className="match-detail-label">Premium</span>
                <span style={{fontWeight:700,color:m.premium < 0 ? "#65A519" : m.premium > 0 ? "#DF321F" : "var(--black)"}}>
                  {m.premium > 0 ? "+" : ""}{m.premium.toFixed(2)}%
                </span>
              </div>
              <div className="match-detail-row">
                <span className="match-detail-label">Payment</span>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {m.methods.map(pm => <span key={pm} className="tag tag-method">{pm}</span>)}
                  {m.currencies.map(c => <span key={c} className="tag tag-currency">{c}</span>)}
                </div>
              </div>
              <div className="match-detail-row">
                <span className="match-detail-label">Requested</span>
                <span style={{fontSize:".82rem",color:"var(--black-65)"}}>{reqAgo}</span>
              </div>
            </div>
            {/* Error */}
            {matchError && (
              <div style={{background:"var(--error-bg)",color:"var(--error)",borderRadius:10,padding:"8px 14px",fontSize:".82rem",fontWeight:600,marginTop:12}}>
                {matchError}
              </div>
            )}
            {/* Actions */}
            <div style={{display:"flex",gap:10,marginTop:12}}>
              {m._raw?.isTradeRequest ? (
                <button className="match-btn-reject" onClick={() => onReject(trade, m)}>Reject</button>
              ) : (
                <button className="match-btn-skip" onClick={() => onSkip(trade, m)}>Skip</button>
              )}
              <button className="match-btn-accept" onClick={() => onAccept(trade, m)}>Accept trade</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="matches-overlay" onClick={onClose}>
      <div className="matches-popup" onClick={e => e.stopPropagation()}>
        <div className="matches-header">
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:"1.05rem"}}>Trade requests</div>
            <div style={{fontSize:".72rem",fontFamily:"monospace",color:"var(--black-50)",marginTop:1}}>{formatTradeId(trade.id, "offer")}</div>
          </div>
          <button className="matches-close" onClick={onClose}>✕</button>
        </div>
        {/* Offer summary — tinted card for visual separation */}
        <div style={{margin:"0 16px 0",padding:"12px 16px",background:"var(--primary-mild)",borderRadius:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span className={`direction-badge direction-${isBuy ? "buy" : "sell"}`}>
              {isBuy ? "BUY" : "SELL"}
            </span>
            <SatsAmount sats={trade.amount}/>
            {trade.premium !== undefined && (
              <span style={{fontSize:".78rem",fontWeight:700,
                color: isBuy
                  ? (trade.premium < 0 ? "#65A519" : "#DF321F")
                  : (trade.premium > 0 ? "#65A519" : "#DF321F"),
              }}>
                {trade.premium > 0 ? "+" : ""}{trade.premium.toFixed(2)}%
              </span>
            )}
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {(trade.methods || []).map(m => <span key={m} className="tag tag-method">{m}</span>)}
            </div>
          </div>
        </div>
        {/* Count / Loading */}
        <div style={{padding:"12px 24px 8px",fontSize:".82rem",fontWeight:600,color:"var(--black-50)"}}>
          {matchesLoading && matches.length === 0
            ? "Loading matches\u2026"
            : matches.length === 0
              ? "No traders found"
              : `${matches.length} trader${matches.length !== 1 ? "s" : ""} want${matches.length === 1 ? "s" : ""} to trade with you`
          }
        </div>
        {matchError && (
          <div style={{padding:"0 24px 12px"}}>
            <div style={{background:"var(--error-bg)",color:"var(--error)",borderRadius:10,padding:"8px 14px",fontSize:".82rem",fontWeight:600}}>
              {matchError}
            </div>
          </div>
        )}
        {/* Match rows */}
        <div className="match-list">
          {matches.map(m => (
            <div key={m.offerId} className="match-row" onClick={() => setMatchDetail(m)}>
              <Avatar initials={m.user.initials} color={m.user.color} size={36}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:".88rem"}}>{m.user.name}</span>
                  <PeachRating rep={m.user.rep}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                  <span style={{fontSize:".72rem",color:"var(--black-65)"}}>{m.user.trades} trades</span>
                  {m.user.badges.includes("supertrader") && <Badge label="supertrader" icon="☆"/>}
                  {m.user.badges.includes("fast") && <Badge label="fast" icon="⚡"/>}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                <span style={{fontSize:".72rem",color:"var(--black-65)"}}>{relativeTime(m.requestedAt)}</span>
                {m._raw.symmetricKeyEncrypted && (
                  <button className="match-chat-btn" title="Chat" onClick={e => {
                    e.stopPropagation();
                    setChatMatch(m);
                    setUnreadMatchIds(prev => { const next = new Set(prev); next.delete(m.offerId); return next; });
                  }}>
                    <IconChat/>
                    {unreadMatchIds.has(m.offerId) && <span className="chat-unread-dot"/>}
                  </button>
                )}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--black-65)" strokeWidth="2" strokeLinecap="round"><polyline points="5,2 10,7 5,12"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── SENT REQUEST POPUP (requester-side detail + chat) ──────────────────────
// Props:
//   trade   — normalized sent request item (kind === "sentRequest")
//   onClose — close popup handler
// ─────────────────────────────────────────────────────────────────────────────
export function SentRequestPopup({ trade, onClose }) {
  const auth = window.__PEACH_AUTH__ ?? null;
  const isBuy = trade.direction === "buy";

  // ── Views: "detail" or "chat" ──
  const [view, setView] = useState("detail");

  // ── Chat state ──
  const [chatMessages, setChatMessages] = useState([]);
  const [chatSymKey, setChatSymKey] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const messagesRef = useRef(null);

  // ── Build v069 chat URL (requester perspective — no userId) ──
  function buildChatUrl() {
    if (!auth) return null;
    const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
    return `${v069Base}/${trade._offerType}/${trade._offerId}/tradeRequestPerformed/chat`;
  }

  // ── Decrypt messages (flipped sender: tradeRequester = me) ──
  async function decryptMsgs(rawMessages, symKey) {
    const decrypted = [];
    for (const msg of rawMessages) {
      let text = msg.encryptedMessage ?? "";
      try {
        if (text.startsWith("-----BEGIN PGP MESSAGE-----")) {
          text = await decryptSymmetric(text, symKey);
        }
      } catch { /* show raw */ }
      decrypted.push({
        id: msg.id,
        from: msg.sender === "tradeRequester" ? "me" : "them",
        text,
        ts: new Date(msg.creationDate ?? Date.now()).getTime(),
      });
    }
    return decrypted.sort((a, b) => a.ts - b.ts);
  }

  // ── Fetch & decrypt chat on open ──
  useEffect(() => {
    if (view !== "chat" || !auth || !trade._tradeRequestData) return;
    let cancelled = false;

    async function load() {
      setChatLoading(true);
      setChatMessages([]);
      setChatSymKey(null);
      try {
        const symKey = await decryptPGPMessage(trade._tradeRequestData.symmetricKeyEncrypted, auth.pgpPrivKey);
        if (cancelled) return;
        setChatSymKey(symKey);

        const url = buildChatUrl();
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const msgs = Array.isArray(data) ? data : (data.messages ?? data.data ?? []);
          const decrypted = await decryptMsgs(msgs, symKey);
          if (!cancelled) setChatMessages(decrypted);
        }
      } catch (err) {
        console.error("Requester chat load error:", err);
      }
      if (!cancelled) setChatLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [view]);

  // ── Poll every 5s ──
  useEffect(() => {
    if (view !== "chat" || !chatSymKey || !auth) return;
    const url = buildChatUrl();
    const iv = setInterval(async () => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const msgs = Array.isArray(data) ? data : (data.messages ?? data.data ?? []);
        const decrypted = await decryptMsgs(msgs, chatSymKey);
        setChatMessages(prev => {
          const ids = new Set(prev.filter(m => m.optimistic).map(m => m.id));
          const merged = [...prev.filter(m => m.optimistic)];
          for (const msg of decrypted) {
            if (!ids.has(msg.id)) merged.push(msg);
          }
          merged.sort((a, b) => a.ts - b.ts);
          return merged;
        });
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [view, chatSymKey]);

  // ── Scroll to bottom ──
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ── Send message ──
  async function handleSend() {
    if (!chatText.trim() || chatSending || !chatSymKey || !auth) return;
    const plaintext = chatText.trim();
    const tempId = Date.now();

    setChatMessages(prev => [...prev, { id: tempId, from: "me", text: plaintext, ts: Date.now(), optimistic: true }]);
    setChatText("");
    setChatSending(true);

    try {
      const encrypted = await encryptSymmetric(plaintext, chatSymKey);
      const signature = await signPGPMessage(plaintext, auth.pgpPrivKey, { detached: true });
      const url = buildChatUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
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

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Chat view ──
  if (view === "chat") {
    return (
      <div className="matches-overlay" onClick={onClose}>
        <div className="matches-popup matches-popup-chat" onClick={e => e.stopPropagation()}>
          <div className="matches-header">
            <button className="matches-back" onClick={() => setView("detail")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,2 4,8 10,14"/></svg>
            </button>
            <span style={{fontWeight:800,fontSize:".95rem",flex:1}}>Chat</span>
            <button className="matches-close" onClick={onClose}>✕</button>
          </div>

          <div className="chat-enc-notice">
            <IconLock/> End-to-end encrypted
          </div>

          <div className="precontract-chat-messages" ref={messagesRef}>
            {chatLoading && (
              <div style={{textAlign:"center",padding:"24px 0",fontSize:".82rem",color:"var(--black-65)",fontWeight:600}}>
                Loading messages\u2026
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
                <div key={msg.id} className={`chat-bubble-row${isMe ? " chat-bubble-row-me" : ""}`}>
                  <div className={`chat-bubble${isMe ? " chat-bubble-me" : " chat-bubble-them"}`}>
                    <div className="chat-text">{msg.text}</div>
                    <div className="chat-ts">
                      {relativeTime(msg.ts)}
                      {msg.optimistic && <span style={{opacity:.6}}> · sending\u2026</span>}
                      {msg.failed && <span style={{color:"#DF321F"}}> · failed to send</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chat-input-row">
            <textarea
              className="chat-input"
              placeholder="Send an encrypted message\u2026"
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!chatText.trim() || chatSending}
              style={{opacity: chatText.trim() && !chatSending ? 1 : 0.45}}
            >
              <IconSend/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detail view (default) ──
  const reqDate = trade._tradeRequestData?.creationDate
    ? relativeTime(new Date(trade._tradeRequestData.creationDate).getTime())
    : relativeTime(trade.createdAt?.getTime?.() ?? Date.now());

  return (
    <div className="matches-overlay" onClick={onClose}>
      <div className="matches-popup" onClick={e => e.stopPropagation()}>
        <div className="matches-header">
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:"1.05rem"}}>Trade request</div>
            <div style={{fontSize:".72rem",fontFamily:"monospace",color:"var(--black-50)",marginTop:1}}>{trade.tradeId}</div>
          </div>
          <button className="matches-close" onClick={onClose}>✕</button>
        </div>

        {/* Offer summary — tinted card */}
        <div style={{margin:"0 16px",padding:"12px 16px",background:"var(--primary-mild)",borderRadius:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span className={`direction-badge direction-${isBuy ? "buy" : "sell"}`}>
              {isBuy ? "BUY" : "SELL"}
            </span>
            <SatsAmount sats={trade.amount}/>
            {trade.premium !== undefined && (
              <span style={{fontSize:".78rem",fontWeight:700,
                color: isBuy
                  ? (trade.premium < 0 ? "#65A519" : "#DF321F")
                  : (trade.premium > 0 ? "#65A519" : "#DF321F"),
              }}>
                {trade.premium > 0 ? "+" : ""}{trade.premium.toFixed(2)}%
              </span>
            )}
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {(trade.methods || []).map(m => <span key={m} className="tag tag-method">{m}</span>)}
            </div>
          </div>
        </div>

        {/* Status + timestamp */}
        <div style={{padding:"16px 24px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{
              background:"var(--primary-bg)",color:"var(--primary-dark)",
              borderRadius:999,padding:"4px 12px",fontSize:".78rem",fontWeight:700,
            }}>
              Request sent
            </span>
            <span style={{fontSize:".78rem",color:"var(--black-50)"}}>{reqDate}</span>
          </div>

          {/* Chat button */}
          {trade._tradeRequestData?.symmetricKeyEncrypted && (
            <button
              className="match-btn-accept"
              style={{width:"100%"}}
              onClick={() => setView("chat")}
            >
              <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <IconChat/> Open chat
              </span>
            </button>
          )}

          {!trade._tradeRequestData?.symmetricKeyEncrypted && (
            <div style={{fontSize:".82rem",color:"var(--black-50)",fontWeight:600,textAlign:"center",padding:"8px 0"}}>
              Chat not available — trade request data missing
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
