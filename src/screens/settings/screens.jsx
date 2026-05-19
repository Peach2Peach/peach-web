// ─── SETTINGS — SUB-SCREENS ──────────────────────────────────────────────────
// Extracted from peach-settings.jsx.
// Each sub-screen receives `onBack` to return to the main settings menu.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatPeachId, PeachIcon } from "../../components/Navbars.jsx";
import { useApi } from "../../hooks/useApi.js";
import { useAuth, refreshBlockedUsers } from "../../hooks/useAuth.js";
import { fetchWithSessionCheck } from "../../utils/sessionGuard.js";
import {
  syncCustomRefundAddressToServer,
  extractCustomRefundAddressFromProfile,
} from "../../utils/customRefundAddressSync.js";
import PayoutAddressWizard from "../../components/PayoutAddressWizard.jsx";
import { validateBtcAddress, validateFeeRate } from "../../peach-validators.js";
import { BITCOIN_NETWORK } from "../../utils/network.js";
import {
  IconCopy, IconTrash, IconExternalLink, IconShield,
  Toggle, SettingsRow, SettingsSection, SubScreenWrapper,
  CopyBtn, PrimaryBtn, OutlineBtn, FieldError, makeBlurHandler,
} from "./components.jsx";
import PeachRating from "../../components/PeachRating.jsx";
import Avatar from "../../components/Avatar.jsx";
import { toPeaches } from "../../utils/format.js";
import InfoPopup, { InfoDot, BadgesInfoPopup, TradingLimitsInfoPopup } from "../../components/InfoPopup.jsx";

// ── ProfileSubScreen ─────────────────────────────────────────────────────────

const PROFILE_CSS = `
  .mp-stack{display:flex;flex-direction:column;gap:20px}

  .mp-header{display:flex;align-items:center;gap:16px;background:var(--surface);
    border:1px solid var(--black-10);border-radius:16px;padding:20px}
  .mp-id-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .mp-id{font-size:.82rem;font-weight:800;letter-spacing:.06em;background:var(--black-5);
    border:1.5px solid var(--black-10);border-radius:999px;padding:5px 12px;color:var(--black);
    font-family:monospace}
  .mp-since{font-size:.76rem;color:var(--black-65);margin-top:4px}
  .mp-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}
  .mp-badges:empty{display:none}
  .mp-badge{font-size:.7rem;font-weight:700;color:var(--primary);border:1.5px solid var(--primary);
    border-radius:999px;padding:2px 10px}

  .mp-card{background:var(--surface);border:1px solid var(--black-10);border-radius:16px;padding:18px 20px}
  .mp-card-title{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;
    color:var(--primary);margin-bottom:12px}
  .mp-card-clickable{cursor:pointer;transition:background .15s ease}
  .mp-card-clickable:hover{background:var(--black-5)}
  .mp-card-row{display:flex;align-items:center;justify-content:space-between;gap:16px}
  .mp-card-row .mp-card-title{margin-bottom:6px}

  .mp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .mp-stats.is-3{grid-template-columns:repeat(3,1fr)}
  .mp-stat{background:var(--black-5);border-radius:10px;padding:12px;text-align:center}
  .mp-stat-val{font-size:1.15rem;font-weight:800;color:var(--black);line-height:1.2}
  .mp-stat-lbl{font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
    color:var(--black-65);margin-top:3px}

  .mp-meta-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px 24px}
  .mp-meta-row .lbl{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
    color:var(--black-65);margin-bottom:3px}
  .mp-meta-row .val{font-size:.85rem;font-weight:700;color:var(--black);word-break:break-all}

  .mp-limits{display:flex;flex-direction:column;gap:14px}
  .mp-bar-track{height:4px;background:var(--black-10);border-radius:999px;margin-bottom:5px;overflow:hidden}
  .mp-bar-fill{height:100%;background:var(--primary);border-radius:999px}
  .mp-bar-lbl{font-size:.78rem;color:var(--black-65)}

  @media(max-width:767px){
    .mp-header{flex-wrap:wrap}
    .mp-stats{grid-template-columns:repeat(2,1fr)}
    .mp-meta-grid{grid-template-columns:1fr}
  }
`;

export function ProfileSubScreen({ onBack }) {
  const navigate = useNavigate();
  const { get, auth, isLoggedIn } = useApi();
  const { blockedUsers } = useAuth();
  const liveProfile = auth?.profile ?? null;

  const peachId = auth?.peachId ? formatPeachId(auth.peachId) : "—";
  const pubkey  = auth?.peachId ?? "—";
  const badges  = isLoggedIn ? (liveProfile?.medals ?? liveProfile?.badges ?? []) : [];
  const rating  = isLoggedIn ? toPeaches(liveProfile?.rating ?? 0) : 0;
  const ratingCount = isLoggedIn ? (liveProfile?.ratingCount ?? 0) : 0;
  const trades  = isLoggedIn ? (liveProfile?.trades ?? 0) : 0;
  const openedTrades = isLoggedIn ? (liveProfile?.openedTrades ?? 0) : 0;
  const canceledTrades = isLoggedIn ? (liveProfile?.canceledTrades ?? 0) : 0;
  const bitcoinLevel = isLoggedIn ? (liveProfile?.bitcoinLevel ?? "—") : "—";
  const linkedIdsCount = isLoggedIn ? (liveProfile?.linkedIds?.length ?? 0) : 0;

  // ── Disputes — API returns number or object ──
  const rawDisputes = liveProfile?.disputes;
  const disputeObj = isLoggedIn
    ? (typeof rawDisputes === "object" && rawDisputes
        ? rawDisputes
        : { opened: typeof rawDisputes === "number" ? rawDisputes : 0, won: 0, lost: 0, resolved: 0 })
    : { opened: 0, won: 0, lost: 0, resolved: 0 };

  // ── Account created ──
  const creationDate = liveProfile?.creationDate ? new Date(liveProfile.creationDate) : null;
  const createdStr = isLoggedIn
    ? (creationDate
        ? `${creationDate.toLocaleDateString("en-GB")} (${Math.floor((Date.now() - creationDate) / 86400000)} days ago)`
        : "—")
    : "—";
  const memberSince = creationDate
    ? creationDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  // ── Help popups ──
  const [badgesHelpOpen, setBadgesHelpOpen] = useState(false);
  const [limitsHelpOpen, setLimitsHelpOpen] = useState(false);

  // ── Trading limits (fetch from API) ──
  const [liveLimit, setLiveLimit] = useState(null);
  useEffect(() => {
    if (!isLoggedIn) return;
    get("/user/tradingLimit").then(async r => { if (r.ok) setLiveLimit(await r.json()); });
  }, [isLoggedIn]);

  const volumes = isLoggedIn ? [
    { label:"daily traded volume",            current: liveLimit?.dailyAmount ?? 0,              max: liveLimit?.daily ?? 1000,            currency:"CHF" },
    { label:"monthly anonymous traded volume", current: liveLimit?.monthlyAnonymousAmount ?? 0,  max: liveLimit?.monthlyAnonymous ?? 1000, currency:"CHF" },
    { label:"yearly traded volume",            current: liveLimit?.yearlyAmount ?? 0,             max: liveLimit?.yearly ?? 100000,         currency:"CHF" },
  ] : [
    { label:"daily traded volume",            current:0, max:0, currency:"CHF" },
    { label:"monthly anonymous traded volume", current:0, max:0, currency:"CHF" },
    { label:"yearly traded volume",            current:0, max:0, currency:"CHF" },
  ];

  return (
    <SubScreenWrapper title="My Profile" onBack={onBack}>
      <style>{PROFILE_CSS}</style>
      <div className="mp-stack">

        {/* Header */}
        <div className="mp-header">
          <Avatar peachId={auth?.peachId} size={64} />
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mp-id-row">
              <span className="mp-id">{peachId}</span>
              <CopyBtn text={peachId}/>
              <PeachRating rep={rating} size={14} trades={trades}/>
              <span style={{ fontSize:".78rem", color:"var(--black-65)" }}>({ratingCount} ratings)</span>
            </div>
            <div className="mp-since">Member since {memberSince}</div>
            <div className="mp-badges">
              {badges.map(b => (
                <span
                  key={b}
                  className="mp-badge"
                  style={{ cursor:"pointer" }}
                  onClick={() => setBadgesHelpOpen(true)}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Trading Stats */}
        <div className="mp-card">
          <div className="mp-card-title">Trading Stats</div>
          <div className="mp-stats is-3">
            <div className="mp-stat">
              <div className="mp-stat-val">{trades}</div>
              <div className="mp-stat-lbl">Trades</div>
            </div>
            <div className="mp-stat">
              <div className="mp-stat-val">{canceledTrades}</div>
              <div className="mp-stat-lbl">Canceled</div>
            </div>
            <div className="mp-stat">
              <div className="mp-stat-val" style={{ color: (disputeObj.opened ?? 0) > 0 ? "var(--error)" : "var(--success)" }}>
                {disputeObj.opened ?? 0}
              </div>
              <div className="mp-stat-lbl">Disputes</div>
            </div>
          </div>
        </div>

        {/* Disputes */}
        <div className="mp-card">
          <div className="mp-card-title">Disputes</div>
          <div className="mp-stats">
            <div className="mp-stat">
              <div className="mp-stat-val" style={{ color:"var(--primary)" }}>{disputeObj.opened ?? 0}</div>
              <div className="mp-stat-lbl">Opened</div>
            </div>
            <div className="mp-stat">
              <div className="mp-stat-val" style={{ color:"var(--success)" }}>{disputeObj.won ?? 0}</div>
              <div className="mp-stat-lbl">Won</div>
            </div>
            <div className="mp-stat">
              <div className="mp-stat-val" style={{ color:"var(--error)" }}>{disputeObj.lost ?? 0}</div>
              <div className="mp-stat-lbl">Lost</div>
            </div>
            <div className="mp-stat">
              <div className="mp-stat-val" style={{ color:"var(--black-65)" }}>{disputeObj.resolved ?? 0}</div>
              <div className="mp-stat-lbl">Resolved</div>
            </div>
          </div>
        </div>

        {/* Blocked Users — deep-links to the Block Users sub-screen */}
        {isLoggedIn && (
          <div
            className="mp-card mp-card-clickable"
            onClick={() => navigate("/settings", { state: { openSection: "block-users" } })}
          >
            <div className="mp-card-row">
              <div>
                <div className="mp-card-title">Blocked Users</div>
                <div className="mp-stat-val">{blockedUsers?.count ?? 0}</div>
              </div>
              <span style={{ color: "var(--primary)", fontSize: "1.4rem", fontWeight: 700 }}>→</span>
            </div>
          </div>
        )}

        {/* Trading Limits */}
        <div className="mp-card" style={{ position:"relative" }}>
          <div style={{ position:"absolute", top:14, right:14 }}>
            <InfoDot ariaLabel="About trading limits" onClick={() => setLimitsHelpOpen(true)} />
          </div>
          <div className="mp-card-title">Trading Limits</div>
          <div className="mp-limits">
            {volumes.map(v => {
              const pct = Math.min(100, v.max > 0 ? (v.current / v.max) * 100 : 0);
              return (
                <div key={v.label}>
                  <div className="mp-bar-track">
                    <div className="mp-bar-fill" style={{ width:`${pct}%`, minWidth: pct > 0 ? 8 : 0 }}/>
                  </div>
                  <div className="mp-bar-lbl">
                    {v.label}{" "}
                    <span style={{ fontWeight:800, color: v.current > 0 ? "var(--primary)" : "var(--black)" }}>{v.current.toLocaleString()}</span>
                    {" / "}
                    <span style={{ color:"var(--primary)" }}>{v.max.toLocaleString()} {v.currency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Account */}
        <div className="mp-card">
          <div className="mp-card-title">Account</div>
          <div className="mp-meta-grid">
            <div className="mp-meta-row">
              <div className="lbl">Account created</div>
              <div className="val">{createdStr}</div>
            </div>
            <div className="mp-meta-row">
              <div className="lbl">Bitcoin level</div>
              <div className="val">{bitcoinLevel}</div>
            </div>
            <div className="mp-meta-row">
              <div className="lbl">Linked IDs</div>
              <div className="val">{linkedIdsCount}</div>
            </div>
            <div className="mp-meta-row" style={{ gridColumn:"1 / -1" }}>
              <div className="lbl">Public key</div>
              <div className="val" style={{ display:"flex", alignItems:"flex-start", gap:8, fontWeight:400 }}>
                <span style={{ fontFamily:"monospace", fontSize:".78rem", lineHeight:1.6, wordBreak:"break-all" }}>
                  <span style={{ color:"var(--primary)" }}>{pubkey.slice(0,8)}</span>
                  <span style={{ color:"var(--black)" }}>{pubkey.slice(8)}</span>
                </span>
                <CopyBtn text={pubkey}/>
              </div>
            </div>
          </div>
        </div>

      </div>
      {badgesHelpOpen && <BadgesInfoPopup onClose={() => setBadgesHelpOpen(false)} />}
      {limitsHelpOpen && <TradingLimitsInfoPopup onClose={() => setLimitsHelpOpen(false)} />}
    </SubScreenWrapper>
  );
}

// ── ReferralsSubScreen ───────────────────────────────────────────────────────

export function ReferralsSubScreen({ onBack }) {
  const points = 0;
  const maxPoints = 400;
  const pct = Math.min(100, (points / maxPoints) * 100);
  const rewards = [
    { label:"custom referral code", cost:100 },
    { label:"2x no Peach fees",     cost:400 },
    { label:"sweet sweet sats",     cost:300 },
  ];
  const [selected, setSelected] = useState(null);
  const code = "PR00001S";
  const inviteLink = `peachbitcoin.com/referral?code=${code}`;

  return (
    <SubScreenWrapper title="Referrals" onBack={onBack}>
      {/* Points bar */}
      <div style={{ marginBottom:24 }}>
        <div style={{ height:5, background:"var(--black-10)", borderRadius:999, marginBottom:8, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:"var(--grad)", borderRadius:999 }}/>
        </div>
        <div style={{ fontSize:".82rem", color:"var(--black-65)" }}>
          Peach referral points: <span style={{ fontWeight:800, color:"var(--primary)" }}>{points}</span>
        </div>
      </div>

      {/* Rewards */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:".82rem", color:"var(--black-65)", marginBottom:12, textAlign:"center" }}>
          Continue saving for cool stuff
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {rewards.map(r => (
            <button key={r.label} onClick={() => setSelected(r.label)} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"14px 16px", borderRadius:10,
              border: selected === r.label ? "1.5px solid var(--primary)" : "1.5px solid var(--black-10)",
              background: selected === r.label ? "var(--bg)" : "var(--black-5)",
              cursor:"pointer", fontFamily:"'Baloo 2',cursive",
            }}>
              <span style={{ fontSize:".85rem", fontWeight:600, color:"var(--black)" }}>{r.label}</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:".8rem", color:"var(--black-65)" }}>({r.cost})</span>
                <span style={{ color:"var(--black-25)", fontSize:"1.1rem", lineHeight:1 }}>–</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom:24 }}>
        <PrimaryBtn label="SELECT REWARD 🎁" disabled={!selected || points < (rewards.find(r=>r.label===selected)?.cost ?? 9999)}/>
      </div>

      {/* Code */}
      <div style={{ textAlign:"center", marginBottom:16 }}>
        <div style={{ fontSize:".8rem", color:"var(--black-65)", marginBottom:6 }}>your referral code:</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <span style={{ fontSize:"1.8rem", fontWeight:800, color:"var(--black)", letterSpacing:".04em" }}>{code}</span>
          <CopyBtn text={code} size={18}/>
        </div>
      </div>

      {/* Invite link */}
      <div style={{ border:"1.5px solid var(--primary)", borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, background:"var(--bg)" }}>
        <div>
          <div style={{ fontSize:".72rem", fontWeight:700, color:"var(--black-65)", marginBottom:2 }}>invite link</div>
          <div style={{ fontSize:".78rem", color:"var(--black)" }}>{inviteLink}</div>
        </div>
        <CopyBtn text={`https://${inviteLink}`} size={18}/>
      </div>

      <OutlineBtn label="INVITE FRIENDS" onClick={() => {}}/>
    </SubScreenWrapper>
  );
}

// ── BackupsSubScreen ─────────────────────────────────────────────────────────

export function BackupsSubScreen({ onBack }) {
  return (
    <SubScreenWrapper title="Backups" onBack={onBack}>
      {/* Main info card */}
      <div style={{ background:"var(--primary-mild)", border:"1.5px solid var(--primary)", borderRadius:12, padding:"18px 20px", marginBottom:20, display:"flex", gap:14, alignItems:"flex-start" }}>
        <div style={{ width:40, height:40, borderRadius:10, background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
          <IconShield size={20}/>
        </div>
        <div>
          <div style={{ fontSize:".9rem", fontWeight:800, color:"var(--black)", marginBottom:6 }}>
            Backups are done on the mobile app.
            <br/>
            To create a backup: Peach mobile app → Settings → Backups
          </div>
          <p style={{ fontSize:".8rem", color:"var(--black-75)", lineHeight:1.6, margin:0 }}>
            Your Peach wallet private keys live on your mobile device, they are never on the web.
            Backups can only be created and restored from the Peach mobile app — this is by design,
            to ensure your Bitcoin private keys never leave your phone.
          </p>
        </div>
      </div>

      <SettingsSection title="How your backup works">
        
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--black-5)" }}>
          <div style={{ fontSize:".82rem", fontWeight:700, color:"var(--black)", marginBottom:4 }}>🔐 End-to-end encrypted</div>
          <div style={{ fontSize:".76rem", color:"var(--black-65)", lineHeight:1.5 }}>
            Your backup file is encrypted with the password of your choice before it leaves your device. Peach never sees your unencrypted account data.
          </div>
        </div>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--black-5)" }}>
          <div style={{ fontSize:".82rem", fontWeight:700, color:"var(--black)", marginBottom:4 }}>💾🔑 Two backup types: file backup and seed-only.</div>
          <div style={{ fontSize:".76rem", color:"var(--black-65)", lineHeight:1.5 }}>
            Save an encrypted file with your account data. Recover your account just by inserting your file password. Fast and easy. Be certain to recover all your activity (trade history, chats, payment methods…).
            <br/><br/>
            <strong>Or</strong>, follow the industry standards and write down your seed. If your account was created after April 2026, your PGP key is derived from you seed and the latter is sufficient to recover everything included in the file backup too (especially trade history chats and payment methods).
          </div>
        </div>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--black-5)" }}>
          <div style={{ fontSize:".82rem", fontWeight:700, color:"var(--black)", marginBottom:4 }}>📱 Stored where you choose</div>
          <div style={{ fontSize:".76rem", color:"var(--black-65)", lineHeight:1.5 }}>
            You control where your backup file goes — local storage, iCloud, Google Drive, or anywhere you choose.
          </div>
        </div>
        <div style={{ padding:"14px 20px" }}>
          <div style={{ fontSize:".82rem", fontWeight:700, color:"var(--black)", marginBottom:4 }}>⚠️ Back up regularly</div>
          <div style={{ fontSize:".76rem", color:"var(--black-65)", lineHeight:1.5 }}>
            Without a backup, losing your phone means losing access to your account and any escrowed funds.
          </div>
        </div>
      </SettingsSection>

    </SubScreenWrapper>
  );
}

// ── NetworkFeesSubScreen ─────────────────────────────────────────────────────

export function NetworkFeesSubScreen({ onBack }) {
  const { get, patch, auth } = useApi();
  const savedFeeRate = auth?.profile?.feeRate;
  const tierFromSaved = { fastestFee:"fast", halfHourFee:"medium", hourFee:"slow" }[savedFeeRate];
  const [feeRates, setFeeRates] = useState({ fast:1, medium:1, slow:1 });
  const [selected, setSelected] = useState(
    typeof savedFeeRate === "number" ? "custom" : (tierFromSaved ?? "medium")
  );
  const [customVal, setCustomVal] = useState(
    typeof savedFeeRate === "number" ? String(savedFeeRate) : ""
  );
  const [saved, setSaved] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const handleBlur = makeBlurHandler(setErrors);

  useEffect(() => {
    async function fetchFees() {
      try {
        const res = await get('/estimateFees');
        const data = await res.json();
        if (data) setFeeRates({
          fast:   data.fastestFee  ?? data.fast   ?? 1,
          medium: data.halfHourFee ?? data.medium ?? 1,
          slow:   data.hourFee     ?? data.slow   ?? 1,
        });
      } catch {}
    }
    fetchFees();

    async function refreshFeeRate() {
      if (!auth) return;
      try {
        const res = await get('/user/me');
        if (!res.ok) return;
        const profile = await res.json();
        const fresh = profile?.feeRate;
        if (auth.profile) auth.profile.feeRate = fresh;
        try { sessionStorage.setItem('peach_auth', JSON.stringify(window.__PEACH_AUTH__)); } catch {}
        const tier = { fastestFee:"fast", halfHourFee:"medium", hourFee:"slow" }[fresh];
        if (typeof fresh === "number") {
          setSelected("custom");
          setCustomVal(String(fresh));
        } else if (tier) {
          setSelected(tier);
          setCustomVal("");
        } else {
          setSelected("medium");
          setCustomVal("");
        }
        setSaved(true);
      } catch {}
    }
    refreshFeeRate();
  }, []);

  const options = [
    { id:"fast",   label:"~10 minutes", sat: feeRates.fast },
    { id:"medium", label:"~30 minutes", sat: feeRates.medium },
    { id:"slow",   label:"~1 hour",     sat: feeRates.slow },
    { id:"custom", label:"custom:",     sat: null },
  ];

  function handleCustomBlur() {
    if (selected !== "custom" || customVal === "") { setErrors(p => ({ ...p, fee: null })); return; }
    handleBlur("fee", customVal, validateFeeRate);
  }

  const customValid = selected !== "custom" || (customVal !== "" && validateFeeRate(customVal).valid);
  const canSave = !saved && customValid && !submitting;

  async function handleSave() {
    const feeRate = selected === "custom" ? Number(customVal) : feeRates[selected];
    setSubmitting(true);
    setErrors(p => ({ ...p, save: null }));
    try {
      if (auth) {
        const res = await patch('/user', { feeRate });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setErrors(p => ({ ...p, save: err.message || "Failed to save — try again" }));
          setSubmitting(false);
          return;
        }
        if (auth.profile) auth.profile.feeRate = feeRate;
        try { sessionStorage.setItem('peach_auth', JSON.stringify(window.__PEACH_AUTH__)); } catch {}
      } else {
        await new Promise(r => setTimeout(r, 600));
      }
      setSubmitting(false);
      setSaved(true);
    } catch {
      setErrors(p => ({ ...p, save: "Network error — check your connection" }));
      setSubmitting(false);
    }
  }

  return (
    <SubScreenWrapper title="Network Fees" onBack={onBack}>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:32 }}>
        {options.map(o => (
          <button key={o.id} onClick={() => { setSelected(o.id); setSaved(false); }} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"16px 18px", borderRadius:12,
            border: selected === o.id ? "2px solid var(--primary)" : "1.5px solid var(--black-10)",
            background: selected === o.id ? "var(--bg)" : "var(--black-5)",
            cursor:"pointer", fontFamily:"'Baloo 2',cursive", transition:"all .15s",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:".9rem", fontWeight: selected===o.id ? 700 : 600, color:"var(--black)" }}>{o.label}</span>
              {o.id === "custom" ? (
                <input
                  value={customVal}
                  onChange={e => { setCustomVal(e.target.value); setSelected("custom"); setSaved(false); setErrors(p => ({ ...p, fee: null })); }}
                  onBlur={handleCustomBlur}
                  onClick={e => e.stopPropagation()}
                  placeholder="0" type="number" min="1" max="150"
                  style={{ width:60, padding:"4px 8px", borderRadius:6, border: errors.fee ? "1.5px solid var(--error)" : "1.5px solid var(--black-25)", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"var(--black)", outline:"none", background:"var(--surface)" }}
                />
              ) : (
                <span style={{ fontSize:".82rem", color:"var(--black-65)", fontWeight:500 }}>({o.sat} sat/vB)</span>
              )}
              {o.id === "custom" && <span style={{ fontSize:".82rem", color:"var(--black-65)" }}>sat/vB</span>}
            </div>
            <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, border: selected===o.id ? "2px solid var(--primary)" : "2px solid var(--black-25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {selected === o.id && <div style={{ width:10, height:10, borderRadius:"50%", background:"var(--primary)" }}/>}
            </div>
          </button>
        ))}
        {errors.fee && <FieldError error={errors.fee}/>}
      </div>
      {errors.save && <div style={{ marginBottom:12 }}><FieldError error={errors.save}/></div>}
      <PrimaryBtn label={submitting ? "SAVING…" : (saved ? "FEE RATE SET" : "SET FEE RATE")} onClick={handleSave} disabled={!canSave}/>
    </SubScreenWrapper>
  );
}

// ── TxBatchingSubScreen ──────────────────────────────────────────────────────

export function TxBatchingSubScreen({ onBack }) {
  const { get, post, auth } = useApi();
  const [batching, setBatching] = useState(
    auth?.profile?.isBatchingEnabled ?? false
  );
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await get('/user/me');
        if (!res.ok) return;
        const profile = await res.json();
        if (cancelled) return;
        if (window.__PEACH_AUTH__) window.__PEACH_AUTH__.profile = profile;
        setBatching(!!profile.isBatchingEnabled);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleBatchingChange(value) {
    const previous = batching;
    setBatching(value);

    if (!auth) return;

    if (value === false) {
      let hasPending = false;
      try {
        const res = await get('/contracts/summary');
        if (res.ok) {
          const list = await res.json();
          hasPending = Array.isArray(list)
            && list.some(c => c.tradeStatus === 'payoutPending');
        }
      } catch {}
      if (hasPending) {
        const ok = window.confirm(
          "You have payouts queued in the batching program. " +
          "Turning off batching will trigger an immediate payout at higher fees. Continue?"
        );
        if (!ok) { setBatching(previous); return; }
      }
    }

    const body = value
      ? { enableBatching: true }
      : { enableBatching: false, riskAcknowledged: true };
    try {
      await post('/user/batching', body);
      if (window.__PEACH_AUTH__?.profile) {
        window.__PEACH_AUTH__.profile.isBatchingEnabled = value;
      }
    } catch {}
  }

  return (
    <SubScreenWrapper
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          Transaction Batching
          <InfoDot ariaLabel="About transaction batching" onClick={() => setShowInfo(true)} />
        </span>
      }
      onBack={onBack}
    >
      {showInfo && (
        <InfoPopup title="Payout fees" onClose={() => setShowInfo(false)}>
          <p className="ip-text">
            Escrows are paid in batched transactions with a half-hour fee by default. You can opt out, but understand the risks.
          </p>
          <p className="ip-text">
            Peach incurs additional consolidation costs, which the user covers. Calculated as 30-minute fee × 68. Since fees are dynamic, costs can become a significant part of the trade.
          </p>
        </InfoPopup>
      )}
      {batching ? (
        <>
          <p style={{ fontSize:".9rem", color:"var(--black)", marginBottom:8, lineHeight:1.6 }}>
            Escrow payouts are delayed. Free Trades pay instantly.
          </p>
          <p style={{ fontSize:".9rem", color:"var(--black)", marginBottom:16, lineHeight:1.6 }}>
            You'll be warned if mining fees exceed 10%.
          </p>
          <div style={{ background:"var(--primary-mild)", border:"1.5px solid var(--primary)", borderRadius:12, padding:"14px 16px", marginBottom:24 }}>
            <span style={{ fontWeight:800, color:"var(--primary)" }}>Save up to 23%</span>
            <span style={{ fontSize:".82rem", color:"var(--black-75)", marginLeft:4, lineHeight:1.6 }}>
              in network fees
            </span>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize:".9rem", color:"var(--black)", marginBottom:16, lineHeight:1.6 }}>
            Escrow payouts are instant
          </p>
          <div style={{ background:"var(--primary-mild)", border:"1.5px solid var(--primary)", borderRadius:12, padding:"14px 16px", marginBottom:24 }}>
            <span style={{ fontWeight:800, color:"var(--primary)" }}>Caution!</span>
            <span style={{ fontSize:".82rem", color:"var(--black-75)", marginLeft:4, lineHeight:1.6 }}>
              You cover Peach's additional costs. Costs are dynamic and can spike. Ensure you understand this!
            </span>
          </div>
        </>
      )}
      <div style={{ background:"var(--surface)", border:"1px solid var(--black-10)", borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:".9rem", fontWeight:700, color:"var(--black)" }}>transaction batching</span>
        <Toggle checked={batching} onChange={handleBatchingChange}/>
      </div>
      <p style={{ fontSize:".85rem", fontWeight:500, color:"var(--black-75)", lineHeight:1.55, margin:"0 4px 20px" }}>
        Un-toggle to accelerate your pending payouts. This will incur a small fee.
      </p>
      <div style={{ background:"var(--black-5)", borderRadius:10, padding:"12px 16px" }}>
        <p style={{ fontSize:".76rem", color:"var(--black-65)", lineHeight:1.5, margin:0 }}>
          Transaction batching (GroupHug) combines multiple payouts into a single Bitcoin transaction, reducing on-chain fees per payout. When disabled, your escrow payout is broadcast immediately as its own transaction.
        </p>
      </div>
    </SubScreenWrapper>
  );
}

// ── RefundAddressSubScreen ───────────────────────────────────────────────────

export function RefundAddressSubScreen({ onBack }) {
  const { auth } = useApi();
  const btcNetwork = BITCOIN_NETWORK;
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [addressSet, setAddressSet] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const handleBlur = makeBlurHandler(setErrors);

  // Load the existing encrypted refund address from /v069/selfUser on mount.
  useEffect(() => {
    if (!auth?.token || !auth?.pgpPrivKey) return;
    let cancelled = false;
    (async () => {
      try {
        const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
        const res = await fetchWithSessionCheck(`${v069Base}/selfUser`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const profile = data.user ?? data;
        const saved = await extractCustomRefundAddressFromProfile(profile, auth.pgpPrivKey);
        if (cancelled || !saved) return;
        setLabel(saved.label || "");
        setAddress(saved.address || "");
        if (saved.address && validateBtcAddress(saved.address, btcNetwork).valid) {
          setAddressSet(true);
        }
      } catch (err) {
        console.warn("[RefundAddress] Failed to load:", err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.token, auth?.pgpPrivKey, auth?.baseUrl, btcNetwork]);

  function handleLabelBlur() {
    if (!label.trim()) setErrors(p => ({ ...p, label: "Label is required" }));
    else setErrors(p => ({ ...p, label: null }));
  }
  function handleAddressBlur() {
    if (!address.trim()) { setErrors(p => ({ ...p, address: null })); setAddressSet(false); return; }
    const valid = handleBlur("address", address, validateBtcAddress, btcNetwork);
    setAddressSet(valid);
  }
  async function handleRemove() {
    setErrors({});
    setSubmitting(true);
    try {
      if (auth) {
        const ok = await syncCustomRefundAddressToServer(
          { address: null, label: null },
          auth,
        );
        if (!ok) {
          setErrors(p => ({ ...p, form: "Server error — try again" }));
          setSubmitting(false);
          return;
        }
      }
      setLabel("");
      setAddress("");
      setAddressSet(false);
    } catch {
      setErrors(p => ({ ...p, form: "Network error — check your connection" }));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSave() {
    setErrors(p => ({ ...p, form: null }));
    setSubmitting(true);
    try {
      if (auth) {
        const ok = await syncCustomRefundAddressToServer(
          { address, label: label.trim() },
          auth,
        );
        if (!ok) {
          setErrors(p => ({ ...p, form: "Server error — try again" }));
          setSubmitting(false);
          return;
        }
      } else {
        await new Promise(r => setTimeout(r, 600));
      }
      setSubmitting(false);
      setShowSuccess(true);
    } catch {
      setErrors(p => ({ ...p, form: "Network error — check your connection" }));
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 1500);
    return () => clearTimeout(t);
  }, [showSuccess]);

  const canSave = !!label.trim() && addressSet && !errors.label && !errors.address && !submitting;

  return (
    <SubScreenWrapper title="Refund Address" onBack={onBack}>
      <p style={{ fontSize:".82rem", color:"var(--black-65)", marginBottom:20, lineHeight:1.6 }}>
        If a trade is cancelled after the seller has funded the escrow, Bitcoin will be refunded to this address.
      </p>

      <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--black)", marginBottom:8 }}>set custom refund address</div>

      <input value={label} onChange={e => { setLabel(e.target.value); if (errors.label) setErrors(p => ({ ...p, label: null })); }} onBlur={handleLabelBlur} placeholder="address label"
        style={{ width:"100%", padding:"10px 14px", borderRadius:10, marginBottom: errors.label ? 0 : 10, border: errors.label ? "2px solid var(--error)" : "1.5px solid var(--black-25)", background:"var(--surface)", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"var(--black)", outline:"none" }}/>
      {errors.label && <div style={{ marginBottom:10 }}><FieldError error={errors.label}/></div>}

      <div style={{ position:"relative", marginBottom: addressSet ? 8 : (errors.address ? 0 : 24) }}>
        <input value={address} onChange={e => { setAddress(e.target.value); setAddressSet(false); setErrors(p => ({ ...p, address: null })); }} onBlur={handleAddressBlur}
          placeholder={btcNetwork === "regtest" ? "bcrt1q …" : "bc1q …"}
          style={{ width:"100%", padding:"10px 44px 10px 14px", borderRadius:10, border: errors.address ? "2px solid var(--error)" : addressSet ? "2px solid var(--primary)" : "1.5px solid var(--black-25)", background:"var(--surface)", fontFamily:"monospace", fontSize:".85rem", color:"var(--black)", outline:"none" }}/>
        <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", display:"flex", gap:4 }}>
          <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setAddress(t); setErrors(p => ({ ...p, address: null })); const r = validateBtcAddress(t, btcNetwork); if(r.valid) setAddressSet(true); else { setAddressSet(false); setErrors(p => ({ ...p, address: r.error })); } } catch {} }}
            style={{ border:"none", background:"transparent", cursor:"pointer", color:"var(--primary)", padding:4 }}>
            <IconCopy size={16}/>
          </button>
        </div>
      </div>
      {errors.address && <div style={{ marginBottom:16 }}><FieldError error={errors.address}/></div>}

      {addressSet && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginBottom:20 }}>
          <span style={{ fontSize:".8rem", fontWeight:800, color:"var(--success)", letterSpacing:".04em" }}>ADDRESS SET ✓</span>
          <button onClick={handleRemove} disabled={submitting} style={{ display:"flex", alignItems:"center", gap:5, border:"none", background:"transparent", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.5 : 1, color:"var(--black)", fontFamily:"'Baloo 2',cursive", fontSize:".78rem", fontWeight:700, textDecoration:"underline", textTransform:"uppercase", letterSpacing:".04em" }}>
            {submitting ? "REMOVING…" : <>REMOVE WALLET <IconTrash size={14}/></>}
          </button>
        </div>
      )}

      {errors.form && <div style={{ marginBottom:12 }}><FieldError error={errors.form}/></div>}

      <PrimaryBtn label={submitting ? "SAVING…" : "SAVE"} onClick={handleSave} disabled={!canSave}/>

      {showSuccess && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, animation:"fadeIn .15s ease" }}>
          <div style={{ background:"var(--surface)", borderRadius:16, padding:"28px 32px", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", boxShadow:"0 12px 36px rgba(43,25,17,.18)", animation:"authPopIn .2s cubic-bezier(.34,1.56,.64,1)", maxWidth:300 }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"var(--success-bg)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ fontSize:"1rem", fontWeight:800, color:"var(--black)" }}>Refund address saved</div>
          </div>
        </div>
      )}
    </SubScreenWrapper>
  );
}

// ── PayoutWalletSubScreen ────────────────────────────────────────────────────

export function PayoutWalletSubScreen({ onBack }) {
  const { auth } = useApi();
  return (
    <div className="settings-scroll">
      <PayoutAddressWizard auth={auth} onClose={onBack} onDone={() => {}}/>
    </div>
  );
}

// ── BlockUsersSubScreen ──────────────────────────────────────────────────────

export function BlockUsersSubScreen({ onBack }) {
  const navigate = useNavigate();
  const { put, del, auth } = useApi();
  const [inputId, setInputId] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  async function fetchBlockedUsers() {
    if (!auth) return;
    setListLoading(true);
    setListError(null);
    try {
      const v069Base = auth.baseUrl.replace(/\/v1$/, '/v069');
      const res = await fetchWithSessionCheck(`${v069Base}/selfUser/blockedUsers`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setListError(err.message || "Failed to load blocked users");
        setListLoading(false);
        return;
      }
      const data = await res.json();
      setBlockedUsers(data.users ?? []);
    } catch {
      setListError("Network error — check your connection");
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => { fetchBlockedUsers(); }, [auth]);

  async function handleUnblock(userId) {
    try {
      const res = await del(`/user/${encodeURIComponent(userId)}/block`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setListError(err.message || "Failed to unblock user");
        return;
      }
      fetchBlockedUsers();
      refreshBlockedUsers();
    } catch {
      setListError("Network error — check your connection");
    }
  }

  async function handleBlock() {
    const userId = inputId.trim();
    if (!userId) return;

    setBlocking(true);
    setError(null);
    setSuccess(null);
    try {
      if (auth) {
        const res = await put(`/user/${encodeURIComponent(userId)}/block`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.message || "Failed to block user");
          setBlocking(false);
          return;
        }
      } else {
        await new Promise(r => setTimeout(r, 400));
      }
      setSuccess(`User blocked successfully`);
      setInputId("");
      setBlocking(false);
      fetchBlockedUsers();
      refreshBlockedUsers();
    } catch {
      setError("Network error — check your connection");
      setBlocking(false);
    }
  }

  return (
    <SubScreenWrapper title="Block Users" onBack={onBack}>
      <p style={{ fontSize:".82rem", color:"var(--black-65)", marginBottom:20, lineHeight:1.6 }}>
        Enter a user's public key to block them. Blocked users will not be able to send trade requests on your offers.
      </p>

      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--black)", marginBottom:6 }}>user public key</div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={inputId} onChange={e => { setInputId(e.target.value); setError(null); setSuccess(null); }}
            onKeyDown={e => { if (e.key === "Enter" && inputId.trim()) handleBlock(); }}
            placeholder="Public key"
            style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"1.5px solid var(--black-25)", background:"var(--surface)", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"var(--black)", outline:"none" }}/>
          <button onClick={handleBlock} disabled={!inputId.trim() || blocking}
            style={{ padding:"10px 20px", borderRadius:10, border:"none",
              background: !inputId.trim() || blocking ? "var(--black-25)" : "var(--primary)",
              color:"var(--surface)", fontFamily:"'Baloo 2',cursive", fontSize:".8rem", fontWeight:700,
              cursor: !inputId.trim() || blocking ? "not-allowed" : "pointer", whiteSpace:"nowrap" }}>
            {blocking ? "…" : "Block"}
          </button>
        </div>
        {error && <FieldError error={error}/>}
        {success && <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--success)", marginTop:6 }}>{success}</div>}
      </div>

      <div style={{ marginTop:32 }}>
        <div style={{ fontSize:".72rem", fontWeight:700, color:"var(--primary)", textTransform:"uppercase",
          letterSpacing:".1em", marginBottom:12, paddingLeft:4 }}>
          Blocked Users
        </div>

        {listLoading && (
          <div style={{ fontSize:".82rem", color:"var(--black-65)", textAlign:"center", padding:"20px 0" }}>
            Loading…
          </div>
        )}

        {listError && (
          <div style={{ fontSize:".75rem", fontWeight:600, color:"var(--error)", textAlign:"center", padding:"12px 0" }}>
            {listError}
          </div>
        )}

        {!listLoading && !listError && blockedUsers.length === 0 && (
          <div style={{ fontSize:".82rem", color:"var(--black-25)", textAlign:"center", padding:"24px 0", fontWeight:600 }}>
            No blocked users
          </div>
        )}

        {!listLoading && blockedUsers.length > 0 && (
          <div style={{ background:"var(--surface)", border:"1px solid var(--black-10)", borderRadius:12, overflow:"hidden" }}>
            {blockedUsers.map((user, i) => (
              <div key={user.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 16px",
                borderBottom: i < blockedUsers.length - 1 ? "1px solid var(--black-5)" : "none",
              }}>
                <span
                  onClick={() => navigate(`/user/${user.id}`)}
                  style={{ fontSize:".8rem", fontWeight:700, letterSpacing:".04em",
                    color:"var(--primary)", fontFamily:"monospace", cursor:"pointer", textDecoration:"underline" }}
                  title="View user profile"
                >
                  {formatPeachId(user.id)}
                </span>
                <button onClick={() => handleUnblock(user.id)}
                  style={{ padding:"6px 14px", borderRadius:8, border:"1.5px solid var(--error)",
                    background:"transparent", color:"var(--error)", fontFamily:"'Baloo 2',cursive",
                    fontSize:".72rem", fontWeight:700, cursor:"pointer" }}>
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SubScreenWrapper>
  );
}

// ── ComingSoonPlaceholder ────────────────────────────────────────────────────

export function ComingSoonPlaceholder({ title, icon, description, onBack }) {
  return (
    <SubScreenWrapper title={title} onBack={onBack}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"60px 20px", textAlign:"center", gap:16 }}>
        <div style={{ width:64, height:64, borderRadius:16, background:"var(--primary-mild)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem" }}>
          {icon}
        </div>
        <div style={{ fontSize:"1rem", fontWeight:800, color:"var(--black)" }}>{title}</div>
        <p style={{ fontSize:".82rem", color:"var(--black-65)", lineHeight:1.6, maxWidth:360, margin:0 }}>
          {description}
        </p>
        <div style={{ fontSize:".72rem", fontWeight:700, color:"var(--black-25)", textTransform:"uppercase",
          letterSpacing:".08em", marginTop:8 }}>
          Coming soon
        </div>
      </div>
    </SubScreenWrapper>
  );
}

export function NotificationsSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Notifications" icon="🔔"
    description="Configure which notifications you receive: trade requests, escrow funded, payment sent, disputes, and price alerts."
    onBack={onBack}/>;
}

export function LanguageSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Language" icon="🌐"
    description="Choose your preferred language. Peach Web will support English, French, German, Spanish, and Italian."
    onBack={onBack}/>;
}

export function NodeSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Use Your Own Node" icon="🖧"
    description="Connect to your own Bitcoin or Electrum node for maximum privacy and sovereignty."
    onBack={onBack}/>;
}

// ── ContactSubScreen ─────────────────────────────────────────────────────────

export function ContactSubScreen({ onBack }) {
  const { post, auth } = useApi();
  const [topic, setTopic] = useState("general");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const canSubmit = topic && message.trim().length > 0 && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      if (auth) {
        const res = await post('/contact/report', {
          topic,
          reason: reason.trim() || undefined,
          message: message.trim(),
          email: email.trim() || undefined,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.message || "Failed to send — try again");
          setSubmitting(false);
          return;
        }
      } else {
        await new Promise(r => setTimeout(r, 800));
      }
      setSubmitting(false);
      setShowSuccess(true);
    } catch {
      setError("Network error — check your connection");
      setSubmitting(false);
    }
  }

  if (showSuccess) {
    return (
      <SubScreenWrapper title="Contact Peach" onBack={onBack}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", textAlign:"center" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"var(--success-bg)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize:"1.1rem", fontWeight:800, color:"var(--black)", marginBottom:8 }}>Message sent!</div>
          <div style={{ fontSize:".88rem", color:"var(--black-65)", lineHeight:1.5 }}>The Peach team will get back to you soon.</div>
          <div style={{ marginTop:32, width:"100%" }}>
            <PrimaryBtn label="DONE" onClick={onBack}/>
          </div>
        </div>
      </SubScreenWrapper>
    );
  }

  const inputStyle = {
    width:"100%", padding:"10px 14px", borderRadius:10,
    border:"1.5px solid var(--black-25)", background:"var(--surface)",
    fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"var(--black)", outline:"none",
  };
  const labelStyle = { fontSize:".75rem", fontWeight:700, color:"var(--black)", marginBottom:6 };

  return (
    <SubScreenWrapper title="Contact Peach" onBack={onBack}>
      <p style={{ fontSize:".82rem", color:"var(--black-65)", marginBottom:20, lineHeight:1.6 }}>
        Get in touch with the Peach team for support, feedback, or partnership inquiries.
      </p>

      {/* Topic */}
      <div style={{ marginBottom:16 }}>
        <div style={labelStyle}>topic</div>
        <select value={topic} onChange={e => setTopic(e.target.value)}
          style={{ ...inputStyle, cursor:"pointer", appearance:"auto" }}>
          <option value="general">General inquiry</option>
          <option value="support">Support</option>
          <option value="bug">Bug report</option>
          <option value="feedback">Feedback</option>
          <option value="partnership">Partnership</option>
        </select>
      </div>

      {/* Reason */}
      <div style={{ marginBottom:16 }}>
        <div style={labelStyle}>subject</div>
        <input value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Brief summary (optional)"
          style={inputStyle}/>
      </div>

      {/* Message */}
      <div style={{ marginBottom:16 }}>
        <div style={labelStyle}>message <span style={{ color:"var(--primary)" }}>*</span></div>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Describe your question or issue…"
          rows={5}
          style={{ ...inputStyle, resize:"vertical", minHeight:100 }}/>
      </div>

      {/* Email */}
      <div style={{ marginBottom:28 }}>
        <div style={labelStyle}>email <span style={{ color:"var(--black-65)", fontWeight:500 }}>(optional)</span></div>
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          type="email"
          style={inputStyle}/>
      </div>

      <FieldError error={error}/>
      <PrimaryBtn label={submitting ? "SENDING…" : "SEND MESSAGE"} disabled={!canSubmit} onClick={handleSubmit}/>
    </SubScreenWrapper>
  );
}

// ── AboutSubScreen ───────────────────────────────────────────────────────────

export function AboutSubScreen({ onBack }) {
  const links = [
    { icon:"🌐", label:"Website",  url:"https://peachbitcoin.com" },
    { icon:"𝕏",  label:"Twitter / X", url:"https://x.com/peachbitcoin" },
    { icon:"💬", label:"Telegram", url:"https://t.me/+5xWlXoI5Nrk3ZmQ0" },
    { icon:"📖", label:"GitHub",   url:"https://github.com/Peach2Peach" },
  ];

  return (
    <SubScreenWrapper title="About Peach" onBack={onBack}>
      {/* Branding header */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 20px 28px", textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:16, background:"var(--primary-mild)",
          display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
          <PeachIcon size={36}/>
        </div>
        <div style={{ fontSize:"1.1rem", fontWeight:800, color:"var(--black)", marginBottom:4 }}>Peach Bitcoin Web</div>
        <div style={{ fontSize:".78rem", fontWeight:600, color:"var(--black-25)" }}>v0.1.0</div>
      </div>

      {/* Description */}
      <SettingsSection title="About">
        <div style={{ padding:"14px 16px" }}>
          <p style={{ fontSize:".82rem", color:"var(--black-65)", lineHeight:1.6, margin:0 }}>
            Buy and sell Bitcoin peer-to-peer. No KYC. No middlemen.
          </p>
        </div>
      </SettingsSection>

      {/* Links */}
      <SettingsSection title="Links">
        {links.map((l, i) => (
          <SettingsRow key={l.url} icon={l.icon} label={l.label}
            description={l.url.replace(/^https?:\/\//, "")}
            right={<IconExternalLink size={14}/>}
            onClick={() => window.open(l.url, "_blank", "noopener")}
            noBorder={i === links.length - 1}/>
        ))}
      </SettingsSection>

      <div style={{ textAlign:"center", fontSize:".72rem", color:"var(--black-25)", fontWeight:600, marginTop:24 }}>
        Made with 🍑 · Open source
      </div>
    </SubScreenWrapper>
  );
}
