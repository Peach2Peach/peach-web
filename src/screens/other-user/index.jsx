import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatPeachId } from "../../components/Navbars.jsx";
import { SatsAmount } from "../../components/BitcoinAmount.jsx";
import { useAuth, refreshBlockedUsers } from "../../hooks/useAuth.js";
import { useApi } from "../../hooks/useApi.js";
import { fetchWithSessionCheck } from "../../utils/sessionGuard.js";
import PeachRating from "../../components/PeachRating.jsx";
import Avatar from "../../components/Avatar.jsx";
import RepeatTraderBadge from "../../components/RepeatTraderBadge.jsx";
import { formatTradeId, toPeaches } from "../../utils/format.js";
import { methodDisplayName } from "../../data/paymentMethodMeta.js";
import { BadgesInfoPopup } from "../../components/InfoPopup.jsx";
import OfferDetailPopup from "../../components/OfferDetailPopup.jsx";
import Toast from "../../components/Toast.jsx";
import { normalizeOffer } from "../../utils/normalizeOffer.js";

const CSS = `
  .page-wrap{display:flex;flex-direction:column;flex:1;margin-top:var(--topbar);margin-left:68px}
  .content{padding:28px 28px 60px;display:flex;flex-direction:column;gap:20px;max-width:960px;margin:0 auto;width:100%}

  .ou-header{display:flex;align-items:center;gap:16px;background:var(--surface);
    border:1px solid var(--black-10);border-radius:16px;padding:20px}
  .ou-id-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .ou-id{font-size:.82rem;font-weight:800;letter-spacing:.06em;background:var(--black-5);
    border:1.5px solid var(--black-10);border-radius:999px;padding:5px 12px;color:var(--black);
    font-family:monospace}
  .ou-since{font-size:.76rem;color:var(--black-65);margin-top:4px}
  .ou-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}
  .ou-badges:empty{display:none}
  .ou-badge{font-size:.7rem;font-weight:700;color:var(--primary);border:1.5px solid var(--primary);
    border-radius:999px;padding:2px 10px}
  .ou-badge-blocked{color:var(--error);border-color:var(--error);background:rgba(239,68,68,0.08)}
  .ou-disabled{background:var(--error-bg);color:var(--error);border:1.5px solid var(--error);
    border-radius:10px;padding:10px 14px;font-size:.82rem;font-weight:700}

  .ou-actions{margin-left:auto;display:flex;gap:8px;flex-shrink:0}
  .ou-btn{padding:8px 18px;border-radius:999px;font-family:var(--font);
    font-size:.82rem;font-weight:700;cursor:pointer;border:1.5px solid var(--black-10);
    background:var(--surface);color:var(--black);transition:all .15s}
  .ou-btn:hover:not(:disabled){border-color:var(--primary);color:var(--primary-dark)}
  .ou-btn.block{border-color:var(--error);color:var(--error)}
  .ou-btn.block:hover:not(:disabled){background:var(--error);color:white}
  .ou-btn.unblock{border-color:var(--success);color:var(--success)}
  .ou-btn.unblock:hover:not(:disabled){background:var(--success);color:white}
  .ou-btn:disabled{opacity:.5;cursor:not-allowed}

  .ou-card{background:var(--surface);border:1px solid var(--black-10);border-radius:16px;padding:18px 20px}
  .ou-card-title{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;
    color:var(--primary);margin-bottom:12px}

  .ou-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .ou-stats.is-3{grid-template-columns:repeat(3,1fr)}
  .ou-stat{background:var(--black-5);border-radius:10px;padding:12px;text-align:center}
  .ou-stat-val{font-size:1.15rem;font-weight:800;color:var(--black);line-height:1.2}
  .ou-stat-lbl{font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
    color:var(--black-65);margin-top:3px}
  .ou-substat-lbl{font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
    color:var(--black-65);margin-top:16px;margin-bottom:8px}

  .ou-meta-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px 24px}
  .ou-meta-row .lbl{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
    color:var(--black-65);margin-bottom:3px}
  .ou-meta-row .val{font-size:.85rem;font-weight:700;color:var(--black);word-break:break-all}

  .ou-offers-list{display:flex;flex-direction:column;gap:10px}
  .ou-offer{display:flex;align-items:center;gap:12px;padding:12px 14px;
    background:var(--black-5);border-radius:10px;border:1px solid var(--black-10);
    cursor:pointer;transition:background-color .12s,box-shadow .12s,border-color .12s}
  .ou-offer:hover{background:var(--black-10);box-shadow:0 2px 12px rgba(43,25,17,.09)}
  .ou-offer.ou-offer-disabled{cursor:default}
  .ou-offer.ou-offer-disabled:hover{background:var(--black-5);box-shadow:none}
  .ou-offer-type{font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;
    padding:3px 10px;border-radius:999px;flex-shrink:0}
  .ou-offer-bid{background:var(--success-bg);color:var(--success)}
  .ou-offer-ask{background:var(--error-bg);color:var(--error)}
  .ou-offer-id{font-family:monospace;font-size:.76rem;color:var(--black-65);flex-shrink:0}
  .ou-offer-amount{font-size:.88rem;font-weight:800;color:var(--black);margin-left:auto;text-align:right}
  .ou-offer-premium{font-size:.78rem;font-weight:700}
  .ou-offer-methods{display:flex;gap:4px;flex-wrap:wrap}
  .ou-offer-chip{font-size:.68rem;font-weight:600;padding:2px 8px;border-radius:999px;
    background:var(--surface);color:var(--black-65);border:1px solid var(--black-10)}

  .ou-loading,.ou-empty,.ou-error{padding:24px;text-align:center;font-size:.85rem;color:var(--black-65)}
  .ou-error{color:var(--error);font-weight:700}
  .ou-back-btn{display:inline-flex;align-items:center;gap:6px;background:none;border:none;
    color:var(--primary);font-family:var(--font);font-size:.82rem;font-weight:700;cursor:pointer;padding:0}
  .ou-back-btn:hover{text-decoration:underline}

  @media(max-width:767px){
    .page-wrap{margin-left:0}
    .content{padding:18px 14px 48px}
    .ou-header{flex-wrap:wrap}
    .ou-actions{margin-left:0;width:100%}
    .ou-stats{grid-template-columns:repeat(2,1fr)}
    .ou-meta-grid{grid-template-columns:1fr}
    .ou-offer{flex-wrap:wrap}
    .ou-offer-amount{margin-left:0;text-align:left}
  }
`;

function normalizeDisputes(raw) {
  if (!raw) return { opened: 0, won: 0, lost: 0, resolved: 0 };
  if (typeof raw === "number") return { opened: raw, won: 0, lost: 0, resolved: 0 };
  return {
    opened: raw.opened ?? 0,
    won: raw.won ?? 0,
    lost: raw.lost ?? 0,
    resolved: raw.resolved ?? 0,
  };
}

function OfferRow({ offer, type, onClick, disabled }) {
  const amount = offer.amountSats ?? (Array.isArray(offer.amount) ? offer.amount[0] : (offer.amount ?? 0));
  const premium = offer.premium ?? 0;
  const currencies = offer.meansOfPayment ? Object.keys(offer.meansOfPayment) : [];
  const methods = offer.meansOfPayment
    ? [...new Set(Object.values(offer.meansOfPayment).flat())]
    : [];
  const premCls = premium === 0 ? "" : premium > 0 ? "prem-good" : "prem-bad";
  const handleKeyDown = (e) => {
    if (disabled || !onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      className={`ou-offer${disabled ? " ou-offer-disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      <span className={`ou-offer-type ${type === "bid" ? "ou-offer-bid" : "ou-offer-ask"}`}>
        {type === "bid" ? "BUY" : "SELL"}
      </span>
      <span className="ou-offer-id">{formatTradeId(offer.id, "offer")}</span>
      <div className="ou-offer-methods">
        {currencies.map(c => <span key={c} className="ou-offer-chip">{c}</span>)}
        {methods.map(m => <span key={m} className="ou-offer-chip">{methodDisplayName(m)}</span>)}
      </div>
      <div className="ou-offer-amount">
        <SatsAmount sats={amount}/>
        <div className="ou-offer-premium" style={{color: premium > 0 ? "var(--error)" : premium < 0 ? "var(--success)" : "var(--black-65)"}}>
          {premium > 0 ? "+" : ""}{premium.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function OtherUserPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { get, put, del, auth } = useApi();
  // AppLayout owns Topbar/SideNav state + currency. Other-user only needs isLoggedIn + handleLogin.
  const { isLoggedIn, handleLogin } = useAuth();

  const [user, setUser] = useState(null);
  const [userError, setUserError] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  const [offersData, setOffersData] = useState(null);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState(null);

  const [isBlocked, setIsBlocked] = useState(false);
  const [badgesHelpOpen, setBadgesHelpOpen] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockError, setBlockError] = useState(null);

  const [popupOffer, setPopupOffer] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastTone, setToastTone] = useState("default");

  const isSelf = auth?.peachId && userId && auth.peachId.toLowerCase() === userId.toLowerCase();

  function showToast(message, tone = "default", durationMs = 3500) {
    setToast(message);
    setToastTone(tone);
    setTimeout(() => { setToast(null); setToastTone("default"); }, durationMs);
  }

  useEffect(() => {
    if (!userId) return;
    setUserLoading(true);
    setUserError(null);
    (async () => {
      try {
        const res = await get(`/user/${encodeURIComponent(userId)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setUserError(err.message || `Failed to load user (${res.status})`);
          setUserLoading(false);
          return;
        }
        const data = await res.json();
        setUser(data);
      } catch {
        setUserError("Network error — check your connection");
      } finally {
        setUserLoading(false);
      }
    })();
  }, [userId]);

  const refreshOffers = useCallback(async () => {
    if (!auth || !userId) {
      setOffersLoading(false);
      return;
    }
    setOffersLoading(true);
    setOffersError(null);
    try {
      const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
      const res = await fetchWithSessionCheck(`${v069Base}/user/${encodeURIComponent(userId)}/offers`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) {
        setOffersError(`Failed to load offers (${res.status})`);
        return;
      }
      const data = await res.json();
      setOffersData(data);
    } catch {
      setOffersError("Network error — check your connection");
    } finally {
      setOffersLoading(false);
    }
  }, [auth, userId]);

  useEffect(() => { refreshOffers(); }, [refreshOffers]);

  useEffect(() => {
    if (!auth || !userId || isSelf) return;
    (async () => {
      try {
        const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
        const res = await fetchWithSessionCheck(`${v069Base}/selfUser/blockedUsers`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const blocked = (data.users ?? []).some(u => u.id?.toLowerCase() === userId.toLowerCase());
        setIsBlocked(blocked);
      } catch {}
    })();
  }, [auth, userId, isSelf]);

  function handleOpenOffer(rawOffer, type) {
    // Enrich raw offer with the profile user so normalizeOffer can fill in
    // rating/badges/pgpPublicKeys (the /v069/user/:id/offers endpoint does
    // not embed user data on each offer since they all belong to userId).
    const enriched = {
      ...rawOffer,
      user: rawOffer.user ?? { id: userId, ...(user ?? {}) },
    };
    setPopupOffer(normalizeOffer(enriched, type, auth?.peachId ?? null));
  }

  async function handleToggleBlock() {
    if (!auth || isSelf) return;
    setBlockSubmitting(true);
    setBlockError(null);
    try {
      const res = isBlocked
        ? await del(`/user/${encodeURIComponent(userId)}/block`)
        : await put(`/user/${encodeURIComponent(userId)}/block`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setBlockError(err.message || `Failed to ${isBlocked ? "unblock" : "block"} user`);
        setBlockSubmitting(false);
        return;
      }
      setIsBlocked(!isBlocked);
      refreshBlockedUsers();
    } catch {
      setBlockError("Network error — check your connection");
    } finally {
      setBlockSubmitting(false);
    }
  }

  const peachIdLabel = userId ? formatPeachId(userId) : "—";
  const rating = toPeaches(user?.rating ?? 0);
  const badges = user?.medals ?? [];
  const disputes = normalizeDisputes(user?.disputes);
  const creationDate = user?.creationDate ? new Date(user.creationDate) : null;
  const createdStr = creationDate
    ? `${creationDate.toLocaleDateString("en-GB")} (${Math.floor((Date.now() - creationDate.getTime()) / 86400000)} days ago)`
    : "—";

  const buyOffers = offersData?.buyOffers ?? [];
  const sellOffers = offersData?.sellOffers ?? [];

  return (
    <>
      <style>{CSS}</style>
        <div className="page-wrap">
          <div className="content">

            <button className="ou-back-btn" onClick={() => navigate(-1)}>← Back</button>

            {userLoading ? (
              <div className="ou-loading">Loading user…</div>
            ) : userError ? (
              <div className="ou-error">{userError}</div>
            ) : (
              <>
                {/* Header */}
                <div className="ou-header">
                  <Avatar peachId={userId} size={64} />
                  <div style={{flex:1,minWidth:0}}>
                    <div className="ou-id-row">
                      <span className="ou-id">{peachIdLabel}</span>
                      <PeachRating rep={rating} size={14} trades={user?.trades}/>
                      <span style={{fontSize:".78rem",color:"var(--black-65)"}}>({user?.ratingCount ?? 0} ratings)</span>
                    </div>
                    <div className="ou-since">Member since {creationDate ? creationDate.toLocaleDateString("en-US",{month:"long",year:"numeric"}) : "—"}</div>
                    <div className="ou-badges">
                      {badges.map(b => (
                        <span
                          key={b}
                          className="ou-badge"
                          style={{ cursor:"pointer" }}
                          onClick={() => setBadgesHelpOpen(true)}
                        >
                          {b === "ambassador" ? "early adopter" : b}
                        </span>
                      ))}
                      <RepeatTraderBadge userId={userId} />
                      {isLoggedIn && !isSelf && isBlocked && (
                        <span className="ou-badge ou-badge-blocked">You blocked this user</span>
                      )}
                    </div>
                  </div>
                  {isLoggedIn && !isSelf && (
                    <div className="ou-actions">
                      <button
                        className={`ou-btn ${isBlocked ? "unblock" : "block"}`}
                        onClick={handleToggleBlock}
                        disabled={blockSubmitting}
                      >
                        {blockSubmitting ? "…" : isBlocked ? "Unblock" : "Block"}
                      </button>
                    </div>
                  )}
                </div>

                {blockError && <div className="ou-error">{blockError}</div>}

                {user?.disabledReason && (
                  <div className="ou-disabled">Account disabled: {user.disabledReason}</div>
                )}

                {/* Stats */}
                <div className="ou-card">
                  <div className="ou-card-title">Trading Stats</div>
                  <div className="ou-stats is-3">
                    <div className="ou-stat">
                      <div className="ou-stat-val">{user?.trades ?? 0}</div>
                      <div className="ou-stat-lbl">Trades</div>
                    </div>
                    <div className="ou-stat">
                      <div className="ou-stat-val">{user?.canceledTrades ?? 0}</div>
                      <div className="ou-stat-lbl">Canceled</div>
                    </div>
                    <div className="ou-stat">
                      <div className="ou-stat-val" style={{color: disputes.opened > 0 ? "var(--error)" : "var(--success)"}}>
                        {disputes.opened}
                      </div>
                      <div className="ou-stat-lbl">Disputes</div>
                    </div>
                  </div>
                  <div className="ou-substat-lbl">Disputes</div>
                  <div className="ou-stats">
                    <div className="ou-stat">
                      <div className="ou-stat-val" style={{color:"var(--primary)"}}>{disputes.opened}</div>
                      <div className="ou-stat-lbl">Opened</div>
                    </div>
                    <div className="ou-stat">
                      <div className="ou-stat-val" style={{color:"var(--success)"}}>{disputes.won}</div>
                      <div className="ou-stat-lbl">Won</div>
                    </div>
                    <div className="ou-stat">
                      <div className="ou-stat-val" style={{color:"var(--error)"}}>{disputes.lost}</div>
                      <div className="ou-stat-lbl">Lost</div>
                    </div>
                    <div className="ou-stat">
                      <div className="ou-stat-val" style={{color:"var(--black-65)"}}>{disputes.resolved}</div>
                      <div className="ou-stat-lbl">Resolved</div>
                    </div>
                  </div>
                </div>

                {/* Account info */}
                <div className="ou-card">
                  <div className="ou-card-title">Account</div>
                  <div className="ou-meta-grid">
                    <div className="ou-meta-row">
                      <div className="lbl">Account created</div>
                      <div className="val">{createdStr}</div>
                    </div>
                    {user?.referralCode && (
                      <div className="ou-meta-row">
                        <div className="lbl">Referral code</div>
                        <div className="val">{user.referralCode}</div>
                      </div>
                    )}
                    {user?.source && (
                      <div className="ou-meta-row">
                        <div className="lbl">Source</div>
                        <div className="val">{user.source}</div>
                      </div>
                    )}
                    <div className="ou-meta-row" style={{gridColumn:"1 / -1"}}>
                      <div className="lbl">Public key</div>
                      <div className="val" style={{fontFamily:"monospace",fontSize:".78rem"}}>{userId}</div>
                    </div>
                  </div>
                </div>

                {/* Offers */}
                <div className="ou-card">
                  <div className="ou-card-title">Available Offers</div>
                  {!isLoggedIn ? (
                    <div className="ou-empty">Log in to view this user's offers.</div>
                  ) : offersLoading ? (
                    <div className="ou-loading">Loading offers…</div>
                  ) : offersError ? (
                    <div className="ou-error">{offersError}</div>
                  ) : buyOffers.length === 0 && sellOffers.length === 0 ? (
                    <div className="ou-empty">No active offers.</div>
                  ) : (
                    <div className="ou-offers-list">
                      {sellOffers.map(o => (
                        <OfferRow
                          key={`ask-${o.id}`}
                          offer={o}
                          type="ask"
                          disabled={!isLoggedIn}
                          onClick={() => handleOpenOffer(o, "ask")}
                        />
                      ))}
                      {buyOffers.map(o => (
                        <OfferRow
                          key={`bid-${o.id}`}
                          offer={o}
                          type="bid"
                          disabled={!isLoggedIn}
                          onClick={() => handleOpenOffer(o, "bid")}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
        {badgesHelpOpen && <BadgesInfoPopup onClose={() => setBadgesHelpOpen(false)} />}
        {popupOffer && (
          <OfferDetailPopup
            key={popupOffer.id}
            offer={popupOffer}
            onClose={() => setPopupOffer(null)}
            onLocalRequestedChange={() => refreshOffers()}
            onOfferUpdated={() => refreshOffers()}
            onOfferWithdrawn={() => { setPopupOffer(null); refreshOffers(); }}
            onContractAccepted={(contractId) => { setPopupOffer(null); navigate(`/trade/${contractId}`); }}
            onTradeRequested={() => refreshOffers()}
            onToast={(message, tone) => showToast(message, tone)}
          />
        )}
        <Toast message={toast} tone={toastTone} />
    </>
  );
}
