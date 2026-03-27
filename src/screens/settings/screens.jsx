// ─── SETTINGS — SUB-SCREENS ──────────────────────────────────────────────────
// Extracted from peach-settings.jsx.
// Each sub-screen receives `onBack` to return to the main settings menu.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { formatPeachId, PeachIcon } from "../../components/Navbars.jsx";
import { useApi } from "../../hooks/useApi.js";
import { validateBtcAddress, validateBIP322Signature, validateFeeRate } from "../../peach-validators.js";
import {
  IconCopy, IconTrash, IconCamera, IconExternalLink, IconShield,
  Toggle, SettingsRow, SettingsSection, SubScreenWrapper,
  CopyBtn, PrimaryBtn, OutlineBtn, FieldError, makeBlurHandler, toPeaches,
} from "./components.jsx";

// ── ProfileSubScreen ─────────────────────────────────────────────────────────

export function ProfileSubScreen({ onBack }) {
  const { get, auth, isLoggedIn } = useApi();
  const liveProfile = auth?.profile ?? null;

  // ── Profile fields — live when logged in, mock when logged out ──
  const peachId = auth?.peachId ? formatPeachId(auth.peachId) : "PEACH03CF9E9A";
  const pubkey  = auth?.peachId ?? "03CF9E9A9DFB2951CEFC6107BCD63D963D85A00C50FCB93B7240C54C8E4053EEFA";
  const badges  = isLoggedIn ? (liveProfile?.medals ?? liveProfile?.badges ?? []) : ["supertrader", "fast trader", "early adopter"];
  const rating  = isLoggedIn ? toPeaches(liveProfile?.rating ?? 0) : 5.0;
  const trades  = isLoggedIn ? (liveProfile?.trades ?? 0) : 40;

  // ── Disputes — API returns number or object ──
  const rawDisputes = liveProfile?.disputes;
  const disputeObj = isLoggedIn
    ? (typeof rawDisputes === "object" && rawDisputes
        ? rawDisputes
        : { opened: typeof rawDisputes === "number" ? rawDisputes : 0, won: 0, lost: 0, resolved: 0 })
    : { opened: 2, won: 0, lost: 0, resolved: 0 };

  // ── Account created ──
  const creationDate = liveProfile?.creationDate ? new Date(liveProfile.creationDate) : null;
  const createdStr = isLoggedIn
    ? (creationDate
        ? `${creationDate.toLocaleDateString("en-GB")} (${Math.floor((Date.now() - creationDate) / 86400000)} days ago)`
        : "—")
    : "02/09/2025 (183 days ago)";

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
    { label:"daily traded volume",            current:0,    max:1095,   currency:"EUR" },
    { label:"monthly anonymous traded volume", current:0,    max:1095,   currency:"EUR" },
    { label:"yearly traded volume",            current:4218, max:109501, currency:"EUR" },
  ];

  return (
    <SubScreenWrapper title="My Profile" onBack={onBack}>
      {/* PeachID + rating */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:".75rem", fontWeight:800, letterSpacing:".06em", background:"#F4EEEB", border:"1.5px solid #EAE3DF", borderRadius:999, padding:"4px 10px", color:"#2B1911" }}>
            {peachId}
          </span>
          <CopyBtn text={peachId}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {[1,2,3,4,5].map(i => (
            <svg key={i} width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill={i <= Math.round(rating) ? "#F56522" : "none"} stroke="#F56522" strokeWidth="1.5"/>
            </svg>
          ))}
          <span style={{ fontSize:".82rem", fontWeight:800, color:"#2B1911", marginLeft:2 }}>{rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:24 }}>
        {badges.map(b => (
          <span key={b} style={{ fontSize:".72rem", fontWeight:600, color:"#F56522", border:"1.5px solid #F56522", borderRadius:999, padding:"3px 10px" }}>{b}</span>
        ))}
      </div>

      {/* Volume bars */}
      <div style={{ marginBottom:24, display:"flex", flexDirection:"column", gap:14 }}>
        {volumes.map(v => {
          const pct = Math.min(100, v.max > 0 ? (v.current / v.max) * 100 : 0);
          return (
            <div key={v.label}>
              <div style={{ height:4, background:"#EAE3DF", borderRadius:999, marginBottom:5, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, minWidth: pct > 0 ? 8 : 0, background:"#F56522", borderRadius:999 }}/>
              </div>
              <div style={{ fontSize:".78rem", color:"#7D675E" }}>
                {v.label}{" "}
                <span style={{ fontWeight:800, color: v.current > 0 ? "#F56522" : "#2B1911" }}>{v.current.toLocaleString()}</span>
                {" / "}
                <span style={{ color:"#F56522" }}>{v.max.toLocaleString()} {v.currency}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pubkey */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:".72rem", color:"#7D675E", marginBottom:4 }}>account pubkey:</div>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
          <div style={{ fontSize:".75rem", fontFamily:"monospace", wordBreak:"break-all", lineHeight:1.6 }}>
            <span style={{ color:"#F56522" }}>{pubkey.slice(0,8)}</span>
            <span style={{ color:"#2B1911" }}>{pubkey.slice(8)}</span>
          </div>
          <CopyBtn text={pubkey}/>
        </div>
      </div>

      {/* Meta rows */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div>
          <div style={{ fontSize:".72rem", color:"#7D675E" }}>account created:</div>
          <div style={{ fontSize:".88rem", fontWeight:700, color:"#2B1911" }}>{createdStr}</div>
        </div>
        <div>
          <div style={{ fontSize:".72rem", color:"#7D675E" }}>disputes:</div>
          <div style={{ fontSize:".88rem", fontWeight:700, color:"#2B1911" }}>
            {disputeObj.opened ?? 0} opened &nbsp; {disputeObj.won ?? 0} won &nbsp; {disputeObj.lost ?? 0} lost &nbsp; {disputeObj.resolved ?? 0} resolved
          </div>
        </div>
        <div>
          <div style={{ fontSize:".72rem", color:"#7D675E" }}>number of trades:</div>
          <div style={{ fontSize:".88rem", fontWeight:700, color:"#2B1911" }}>{trades}</div>
        </div>
      </div>
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
        <div style={{ height:5, background:"#EAE3DF", borderRadius:999, marginBottom:8, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#FF4D42,#FFA24C)", borderRadius:999 }}/>
        </div>
        <div style={{ fontSize:".82rem", color:"#7D675E" }}>
          Peach referral points: <span style={{ fontWeight:800, color:"#F56522" }}>{points}</span>
        </div>
      </div>

      {/* Rewards */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:".82rem", color:"#7D675E", marginBottom:12, textAlign:"center" }}>
          Continue saving for cool stuff
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {rewards.map(r => (
            <button key={r.label} onClick={() => setSelected(r.label)} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"14px 16px", borderRadius:10,
              border: selected === r.label ? "1.5px solid #F56522" : "1.5px solid #EAE3DF",
              background: selected === r.label ? "#FFF9F6" : "#F4EEEB",
              cursor:"pointer", fontFamily:"'Baloo 2',cursive",
            }}>
              <span style={{ fontSize:".85rem", fontWeight:600, color:"#2B1911" }}>{r.label}</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:".8rem", color:"#7D675E" }}>({r.cost})</span>
                <span style={{ color:"#C4B5AE", fontSize:"1.1rem", lineHeight:1 }}>–</span>
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
        <div style={{ fontSize:".8rem", color:"#7D675E", marginBottom:6 }}>your referral code:</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <span style={{ fontSize:"1.8rem", fontWeight:800, color:"#2B1911", letterSpacing:".04em" }}>{code}</span>
          <CopyBtn text={code} size={18}/>
        </div>
      </div>

      {/* Invite link */}
      <div style={{ border:"1.5px solid #F56522", borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, background:"#FFF9F6" }}>
        <div>
          <div style={{ fontSize:".72rem", fontWeight:700, color:"#7D675E", marginBottom:2 }}>invite link</div>
          <div style={{ fontSize:".78rem", color:"#2B1911" }}>{inviteLink}</div>
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
      <div style={{ background:"#FEEDE5", border:"1.5px solid #F56522", borderRadius:12, padding:"18px 20px", marginBottom:20, display:"flex", gap:14, alignItems:"flex-start" }}>
        <div style={{ width:40, height:40, borderRadius:10, background:"#FFF9F6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
          <IconShield size={20}/>
        </div>
        <div>
          <div style={{ fontSize:".9rem", fontWeight:800, color:"#2B1911", marginBottom:6 }}>
            Backups are done on the mobile app
          </div>
          <p style={{ fontSize:".8rem", color:"#624D44", lineHeight:1.6, margin:0 }}>
            Your Peach account and private keys live exclusively on your mobile device.
            Backups can only be created and restored from the Peach mobile app — this is by design,
            to ensure your Bitcoin private keys never leave your phone.
          </p>
        </div>
      </div>

      <SettingsSection title="How your backup works">
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #F4EEEB" }}>
          <div style={{ fontSize:".82rem", fontWeight:700, color:"#2B1911", marginBottom:4 }}>🔐 End-to-end encrypted</div>
          <div style={{ fontSize:".76rem", color:"#7D675E", lineHeight:1.5 }}>
            Your backup file is encrypted with your account password before it leaves your device. Peach never sees your unencrypted account data.
          </div>
        </div>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #F4EEEB" }}>
          <div style={{ fontSize:".82rem", fontWeight:700, color:"#2B1911", marginBottom:4 }}>📱 Stored where you choose</div>
          <div style={{ fontSize:".76rem", color:"#7D675E", lineHeight:1.5 }}>
            You control where your backup file goes — local storage, iCloud, Google Drive, or anywhere you choose.
          </div>
        </div>
        <div style={{ padding:"14px 20px" }}>
          <div style={{ fontSize:".82rem", fontWeight:700, color:"#2B1911", marginBottom:4 }}>⚠️ Back up regularly</div>
          <div style={{ fontSize:".76rem", color:"#7D675E", lineHeight:1.5 }}>
            Without a backup, losing your phone means losing access to your account and any escrowed funds. Back up after each trade.
          </div>
        </div>
      </SettingsSection>

      <div style={{ marginTop:4, background:"#F4EEEB", borderRadius:12, padding:"14px 18px" }}>
        <div style={{ fontSize:".82rem", fontWeight:700, color:"#2B1911", marginBottom:3 }}>
          To create a backup: Peach mobile app → Settings → Backups
        </div>
        <div style={{ fontSize:".75rem", color:"#7D675E" }}>
          Not on mobile yet? Download Peach at peachbitcoin.com.
        </div>
      </div>
    </SubScreenWrapper>
  );
}

// ── NetworkFeesSubScreen ─────────────────────────────────────────────────────

export function NetworkFeesSubScreen({ onBack }) {
  const { get, patch, auth } = useApi();
  const [feeRates, setFeeRates] = useState({ fast:1, medium:1, slow:1 });
  const [selected, setSelected] = useState("medium");
  const [customVal, setCustomVal] = useState("");
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
            border: selected === o.id ? "2px solid #F56522" : "1.5px solid #EAE3DF",
            background: selected === o.id ? "#FFF9F6" : "#F4EEEB",
            cursor:"pointer", fontFamily:"'Baloo 2',cursive", transition:"all .15s",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:".9rem", fontWeight: selected===o.id ? 700 : 600, color:"#2B1911" }}>{o.label}</span>
              {o.id === "custom" ? (
                <input
                  value={customVal}
                  onChange={e => { setCustomVal(e.target.value); setSelected("custom"); setSaved(false); setErrors(p => ({ ...p, fee: null })); }}
                  onBlur={handleCustomBlur}
                  onClick={e => e.stopPropagation()}
                  placeholder="0" type="number" min="1" max="150"
                  style={{ width:60, padding:"4px 8px", borderRadius:6, border: errors.fee ? "1.5px solid #DF321F" : "1.5px solid #C4B5AE", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"#2B1911", outline:"none", background:"#FFFFFF" }}
                />
              ) : (
                <span style={{ fontSize:".82rem", color:"#7D675E", fontWeight:500 }}>({o.sat} sat/vB)</span>
              )}
              {o.id === "custom" && <span style={{ fontSize:".82rem", color:"#7D675E" }}>sat/vB</span>}
            </div>
            <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, border: selected===o.id ? "2px solid #F56522" : "2px solid #C4B5AE", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {selected === o.id && <div style={{ width:10, height:10, borderRadius:"50%", background:"#F56522" }}/>}
            </div>
          </button>
        ))}
        {errors.fee && <FieldError error={errors.fee}/>}
      </div>
      {errors.save && <div style={{ marginBottom:12 }}><FieldError error={errors.save}/></div>}
      <PrimaryBtn label={submitting ? "SAVING…" : "SET FEE RATE"} onClick={handleSave} disabled={!canSave}/>
    </SubScreenWrapper>
  );
}

// ── TxBatchingSubScreen ──────────────────────────────────────────────────────

export function TxBatchingSubScreen({ onBack }) {
  const { patch, auth } = useApi();
  const [batching, setBatching] = useState(false);

  async function handleBatchingChange(value) {
    setBatching(value);
    if (!auth) return;
    try {
      await patch('/user/batching', { enable: value });
    } catch {}
  }

  return (
    <SubScreenWrapper title="Transaction Batching" onBack={onBack}>
      <p style={{ fontSize:".9rem", color:"#2B1911", marginBottom:16, lineHeight:1.6 }}>
        Escrow payouts are instant
      </p>
      <div style={{ background:"#FEEDE5", border:"1.5px solid #F56522", borderRadius:12, padding:"14px 16px", marginBottom:24 }}>
        <span style={{ fontWeight:800, color:"#F56522" }}>Caution!</span>
        <span style={{ fontSize:".82rem", color:"#624D44", marginLeft:4, lineHeight:1.6 }}>
          You cover Peach's additional costs. Costs are dynamic and can spike. Ensure you understand this!
        </span>
      </div>
      <div style={{ background:"#FFFFFF", border:"1px solid #EAE3DF", borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <span style={{ fontSize:".9rem", fontWeight:700, color:"#2B1911" }}>transaction batching</span>
        <Toggle checked={batching} onChange={handleBatchingChange}/>
      </div>
      <div style={{ background:"#F4EEEB", borderRadius:10, padding:"12px 16px" }}>
        <p style={{ fontSize:".76rem", color:"#7D675E", lineHeight:1.5, margin:0 }}>
          Transaction batching (GroupHug) combines multiple payouts into a single Bitcoin transaction, reducing on-chain fees per payout. When disabled, your escrow payout is broadcast immediately as its own transaction.
        </p>
      </div>
    </SubScreenWrapper>
  );
}

// ── RefundAddressSubScreen ───────────────────────────────────────────────────

export function RefundAddressSubScreen({ onBack }) {
  const { patch, auth } = useApi();
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [addressSet, setAddressSet] = useState(false);
  const [signature, setSignature] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const handleBlur = makeBlurHandler(setErrors);
  const peachId = auth?.peachId ?? "peach03cf9e9a";
  const signMessage = `I confirm that only I, ${peachId}, control the address ${address}`;

  function handleAddressBlur() {
    if (!address.trim()) { setErrors(p => ({ ...p, address: null })); setAddressSet(false); return; }
    const valid = handleBlur("address", address, validateBtcAddress);
    setAddressSet(valid);
  }
  function handleRemove() { setLabel(""); setAddress(""); setAddressSet(false); setErrors(p => ({ ...p, address: null })); }

  if (step === 2) {
    return (
      <SubScreenWrapper title="Sign Your Address" onBack={() => setStep(1)}>
        <p style={{ fontSize:".82rem", color:"#7D675E", marginBottom:20, lineHeight:1.6 }}>
          Prove you control this address by signing the message below with its private key, then paste the signature. Use your wallet's "Sign Message" feature.
        </p>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:6 }}>your address</div>
          <div style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid #EAE3DF", background:"#F4EEEB", fontSize:".78rem", fontFamily:"monospace", wordBreak:"break-all", lineHeight:1.5, display:"flex", alignItems:"flex-start", gap:8 }}>
            <span style={{ flex:1 }}>{address}</span>
            <CopyBtn text={address}/>
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:6 }}>message</div>
          <div style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid #EAE3DF", background:"#F4EEEB", fontSize:".76rem", fontFamily:"monospace", wordBreak:"break-all", lineHeight:1.5, display:"flex", alignItems:"flex-start", gap:8 }}>
            <span style={{ flex:1 }}>{signMessage}</span>
            <CopyBtn text={signMessage}/>
          </div>
        </div>

        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:6 }}>signature</div>
          <div style={{ position:"relative" }}>
            <input value={signature} onChange={e => { setSignature(e.target.value); setErrors(p => ({ ...p, sig: null })); }} onBlur={() => { if (signature.trim()) handleBlur("sig", signature, validateBIP322Signature); }} placeholder="signature"
              style={{ width:"100%", padding:"10px 40px 10px 14px", borderRadius:10, border: errors.sig ? "1.5px solid #DF321F" : "1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>
            <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)" }}>
              <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setSignature(t); setErrors(p => ({ ...p, sig: null })); } catch {} }}
                style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
                <IconCopy size={16}/>
              </button>
            </div>
          </div>
          <FieldError error={errors.sig}/>
        </div>

        <PrimaryBtn label={submitting ? "SAVING…" : "CONFIRM"} disabled={!signature.trim() || !!errors.sig || !validateBIP322Signature(signature).valid || submitting} onClick={async () => {
          setSubmitting(true);
          try {
            if (auth) {
              const res = await patch('/user', { refundAddress: address, refundAddressLabel: label || undefined, refundAddressSignature: signature });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setErrors(p => ({ ...p, sig: err.message || "Server error — try again" }));
                setSubmitting(false);
                return;
              }
            } else {
              await new Promise(r => setTimeout(r, 600));
            }
          } catch {
            setErrors(p => ({ ...p, sig: "Network error — check your connection" }));
            setSubmitting(false);
            return;
          }
          onBack();
        }}/>
      </SubScreenWrapper>
    );
  }

  return (
    <SubScreenWrapper title="Refund Address" onBack={onBack}>
      <p style={{ fontSize:".82rem", color:"#7D675E", marginBottom:20, lineHeight:1.6 }}>
        If a trade is cancelled after the seller has funded the escrow, Bitcoin will be refunded to this address.
      </p>

      <div style={{ fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:8 }}>set custom refund address</div>

      <input value={label} onChange={e => setLabel(e.target.value)} placeholder="address label"
        style={{ width:"100%", padding:"10px 14px", borderRadius:10, marginBottom:10, border:"1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>

      <div style={{ position:"relative", marginBottom: addressSet ? 8 : (errors.address ? 0 : 24) }}>
        <input value={address} onChange={e => { setAddress(e.target.value); setAddressSet(false); setErrors(p => ({ ...p, address: null })); }} onBlur={handleAddressBlur}
          placeholder="bc1q …"
          style={{ width:"100%", padding:"10px 72px 10px 14px", borderRadius:10, border: errors.address ? "2px solid #DF321F" : addressSet ? "2px solid #F56522" : "1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"monospace", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>
        <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", display:"flex", gap:4 }}>
          <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setAddress(t); setErrors(p => ({ ...p, address: null })); const r = validateBtcAddress(t); if(r.valid) setAddressSet(true); else { setAddressSet(false); setErrors(p => ({ ...p, address: r.error })); } } catch {} }}
            style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
            <IconCopy size={16}/>
          </button>
          <button style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
            <IconCamera size={16}/>
          </button>
        </div>
      </div>
      {errors.address && <div style={{ marginBottom:16 }}><FieldError error={errors.address}/></div>}

      {addressSet && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginBottom:20 }}>
          <span style={{ fontSize:".8rem", fontWeight:800, color:"#65A519", letterSpacing:".04em" }}>ADDRESS SET ✓</span>
          <button onClick={handleRemove} style={{ display:"flex", alignItems:"center", gap:5, border:"none", background:"transparent", cursor:"pointer", color:"#2B1911", fontFamily:"'Baloo 2',cursive", fontSize:".78rem", fontWeight:700, textDecoration:"underline", textTransform:"uppercase", letterSpacing:".04em" }}>
            REMOVE WALLET <IconTrash size={14}/>
          </button>
        </div>
      )}

      <div style={{ textAlign:"center", marginBottom:28 }}>
        <button style={{ border:"none", background:"transparent", cursor:"pointer", color:"#7D675E", fontFamily:"'Baloo 2',cursive", fontSize:".78rem", fontWeight:700, textDecoration:"underline", textTransform:"uppercase", letterSpacing:".04em", display:"inline-flex", alignItems:"center", gap:5 }}>
          OPEN EXTERNAL WALLET APP <IconExternalLink size={12}/>
        </button>
      </div>

      <PrimaryBtn label="NEXT" onClick={() => setStep(2)} disabled={!addressSet || !!errors.address}/>
    </SubScreenWrapper>
  );
}

// ── PayoutWalletSubScreen ────────────────────────────────────────────────────

export function PayoutWalletSubScreen({ onBack }) {
  const { patch, auth } = useApi();
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [addressSet, setAddressSet] = useState(false);
  const [signature, setSignature] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const handleBlur = makeBlurHandler(setErrors);
  const peachId = auth?.peachId ?? "peach03cf9e9a";
  const signMessage = `I confirm that only I, ${peachId}, control the address ${address}`;

  function handleAddressBlur() {
    if (!address.trim()) { setErrors(p => ({ ...p, address: null })); setAddressSet(false); return; }
    const valid = handleBlur("address", address, validateBtcAddress);
    setAddressSet(valid);
  }
  function handleRemove() { setLabel(""); setAddress(""); setAddressSet(false); setErrors(p => ({ ...p, address: null })); }

  async function handleConfirm() {
    const sigCheck = validateBIP322Signature(signature);
    if (!sigCheck.valid) { setErrors(p => ({ ...p, sig: sigCheck.error })); return; }

    setSubmitting(true);
    setErrors(p => ({ ...p, sig: null }));

    try {
      if (auth) {
        const res = await patch('/user', {
          payoutAddress: address,
          payoutAddressLabel: label || undefined,
          payoutAddressSignature: signature,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setErrors(p => ({ ...p, sig: (res.status === 400 || res.status === 401) ? "Signature invalid" : (err.message || "Server error — try again") }));
          setSubmitting(false);
          return;
        }
      } else {
        await new Promise(r => setTimeout(r, 800));
      }
      setSubmitting(false);
      setShowSuccess(true);
    } catch (e) {
      setSubmitting(false);
      setErrors(p => ({ ...p, sig: "Network error — check your connection" }));
    }
  }

  // ── Success popup overlay ──
  if (showSuccess) {
    return (
      <SubScreenWrapper title="Custom Payout Address" onBack={onBack}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", textAlign:"center" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"#E8F5E0", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#65A519" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize:"1.1rem", fontWeight:800, color:"#2B1911", marginBottom:8 }}>Signature valid</div>
          <div style={{ fontSize:".88rem", color:"#7D675E", lineHeight:1.5 }}>Custom payout address added.</div>
          <div style={{ marginTop:32, width:"100%" }}>
            <PrimaryBtn label="DONE" onClick={onBack}/>
          </div>
        </div>
      </SubScreenWrapper>
    );
  }

  if (step === 2) {
    const sigValid = signature.trim() && validateBIP322Signature(signature).valid && !errors.sig;
    return (
      <SubScreenWrapper title="Sign Your Address" onBack={() => setStep(1)}>
        <p style={{ fontSize:".82rem", color:"#7D675E", marginBottom:20, lineHeight:1.6 }}>
          Prove you control this address by signing the message below with its private key, then paste the signature. Use your wallet's "Sign Message" feature.
        </p>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:6 }}>your address</div>
          <div style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid #EAE3DF", background:"#F4EEEB", fontSize:".78rem", fontFamily:"monospace", wordBreak:"break-all", lineHeight:1.5, display:"flex", alignItems:"flex-start", gap:8 }}>
            <span style={{ flex:1 }}>{address}</span>
            <CopyBtn text={address}/>
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:6 }}>message</div>
          <div style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid #EAE3DF", background:"#F4EEEB", fontSize:".76rem", fontFamily:"monospace", wordBreak:"break-all", lineHeight:1.5, display:"flex", alignItems:"flex-start", gap:8 }}>
            <span style={{ flex:1 }}>{signMessage}</span>
            <CopyBtn text={signMessage}/>
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:6 }}>signature</div>
          <div style={{ position:"relative" }}>
            <input value={signature} onChange={e => { setSignature(e.target.value); setErrors(p => ({ ...p, sig: null })); }} onBlur={() => { if (signature.trim()) handleBlur("sig", signature, validateBIP322Signature); }} placeholder="signature"
              style={{ width:"100%", padding:"10px 40px 10px 14px", borderRadius:10, border: errors.sig ? "1.5px solid #DF321F" : "1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>
            <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)" }}>
              <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setSignature(t); setErrors(p => ({ ...p, sig: null })); } catch {} }}
                style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
                <IconCopy size={16}/>
              </button>
            </div>
          </div>
          <FieldError error={errors.sig}/>
        </div>

        <div style={{ background:"#FEEDE5", border:"1.5px solid #F56522", borderRadius:10, padding:"12px 14px", marginBottom:24 }}>
          <p style={{ fontSize:".76rem", color:"#7D675E", lineHeight:1.5, margin:0 }}>
            <span style={{ fontWeight:800, color:"#F56522" }}>Note:</span> BIP322 signature verification is required. This is verified server-side when saving your payout address.
          </p>
        </div>

        <PrimaryBtn label={submitting ? "VERIFYING…" : "CONFIRM"} onClick={handleConfirm} disabled={!sigValid || submitting}/>
      </SubScreenWrapper>
    );
  }

  return (
    <SubScreenWrapper title="Custom Payout Address" onBack={onBack}>
      <p style={{ fontSize:".82rem", color:"#7D675E", marginBottom:20, lineHeight:1.6 }}>
        Set an external Bitcoin wallet to automatically receive your sats after each completed trade. You must prove ownership of the address with a BIP322 signature.
      </p>

      <div style={{ fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:8 }}>set custom payout address</div>

      <input value={label} onChange={e => setLabel(e.target.value)} placeholder="address label"
        style={{ width:"100%", padding:"10px 14px", borderRadius:10, marginBottom:10, border:"1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>

      <div style={{ position:"relative", marginBottom: addressSet ? 8 : (errors.address ? 0 : 24) }}>
        <input value={address} onChange={e => { setAddress(e.target.value); setAddressSet(false); setErrors(p => ({ ...p, address: null })); }} onBlur={handleAddressBlur}
          placeholder="bc1q …"
          style={{ width:"100%", padding:"10px 72px 10px 14px", borderRadius:10, border: errors.address ? "2px solid #DF321F" : addressSet ? "2px solid #F56522" : "1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"monospace", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>
        <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", display:"flex", gap:4 }}>
          <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setAddress(t); setErrors(p => ({ ...p, address: null })); const r = validateBtcAddress(t); if(r.valid) setAddressSet(true); else { setAddressSet(false); setErrors(p => ({ ...p, address: r.error })); } } catch {} }}
            style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
            <IconCopy size={16}/>
          </button>
          <button style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
            <IconCamera size={16}/>
          </button>
        </div>
      </div>
      {errors.address && <div style={{ marginBottom:16 }}><FieldError error={errors.address}/></div>}

      {addressSet && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginBottom:20 }}>
          <span style={{ fontSize:".8rem", fontWeight:800, color:"#65A519", letterSpacing:".04em" }}>ADDRESS VALID ✓</span>
          <button onClick={handleRemove} style={{ display:"flex", alignItems:"center", gap:5, border:"none", background:"transparent", cursor:"pointer", color:"#2B1911", fontFamily:"'Baloo 2',cursive", fontSize:".78rem", fontWeight:700, textDecoration:"underline", textTransform:"uppercase", letterSpacing:".04em" }}>
            REMOVE WALLET <IconTrash size={14}/>
          </button>
        </div>
      )}


      <PrimaryBtn label="NEXT" onClick={() => setStep(2)} disabled={!addressSet || !!errors.address}/>
    </SubScreenWrapper>
  );
}

// ── BlockUsersSubScreen ──────────────────────────────────────────────────────

export function BlockUsersSubScreen({ onBack }) {
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
      const res = await fetch(`${v069Base}/selfUser/blockedUsers`, {
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
    } catch {
      setError("Network error — check your connection");
      setBlocking(false);
    }
  }

  return (
    <SubScreenWrapper title="Block Users" onBack={onBack}>
      <p style={{ fontSize:".82rem", color:"#7D675E", marginBottom:20, lineHeight:1.6 }}>
        Enter a user's public key to block them. Blocked users will not be able to match with your offers.
      </p>

      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:6 }}>user public key</div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={inputId} onChange={e => { setInputId(e.target.value); setError(null); setSuccess(null); }}
            onKeyDown={e => { if (e.key === "Enter" && inputId.trim()) handleBlock(); }}
            placeholder="Public key"
            style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>
          <button onClick={handleBlock} disabled={!inputId.trim() || blocking}
            style={{ padding:"10px 20px", borderRadius:10, border:"none",
              background: !inputId.trim() || blocking ? "#C4B5AE" : "#F56522",
              color:"#FFFFFF", fontFamily:"'Baloo 2',cursive", fontSize:".8rem", fontWeight:700,
              cursor: !inputId.trim() || blocking ? "not-allowed" : "pointer", whiteSpace:"nowrap" }}>
            {blocking ? "…" : "Block"}
          </button>
        </div>
        {error && <FieldError error={error}/>}
        {success && <div style={{ fontSize:".75rem", fontWeight:700, color:"#65A519", marginTop:6 }}>{success}</div>}
      </div>

      <div style={{ marginTop:32 }}>
        <div style={{ fontSize:".72rem", fontWeight:700, color:"#F56522", textTransform:"uppercase",
          letterSpacing:".1em", marginBottom:12, paddingLeft:4 }}>
          Blocked Users
        </div>

        {listLoading && (
          <div style={{ fontSize:".82rem", color:"#7D675E", textAlign:"center", padding:"20px 0" }}>
            Loading…
          </div>
        )}

        {listError && (
          <div style={{ fontSize:".75rem", fontWeight:600, color:"#DF321F", textAlign:"center", padding:"12px 0" }}>
            {listError}
          </div>
        )}

        {!listLoading && !listError && blockedUsers.length === 0 && (
          <div style={{ fontSize:".82rem", color:"#C4B5AE", textAlign:"center", padding:"24px 0", fontWeight:600 }}>
            No blocked users
          </div>
        )}

        {!listLoading && blockedUsers.length > 0 && (
          <div style={{ background:"#FFFFFF", border:"1px solid #EAE3DF", borderRadius:12, overflow:"hidden" }}>
            {blockedUsers.map((user, i) => (
              <div key={user.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 16px",
                borderBottom: i < blockedUsers.length - 1 ? "1px solid #F4EEEB" : "none",
              }}>
                <span style={{ fontSize:".8rem", fontWeight:700, letterSpacing:".04em",
                  color:"#2B1911", fontFamily:"monospace" }}>
                  {formatPeachId(user.id)}
                </span>
                <button onClick={() => handleUnblock(user.id)}
                  style={{ padding:"6px 14px", borderRadius:8, border:"1.5px solid #DF321F",
                    background:"transparent", color:"#DF321F", fontFamily:"'Baloo 2',cursive",
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
        <div style={{ width:64, height:64, borderRadius:16, background:"#FEEDE5",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem" }}>
          {icon}
        </div>
        <div style={{ fontSize:"1rem", fontWeight:800, color:"#2B1911" }}>{title}</div>
        <p style={{ fontSize:".82rem", color:"#7D675E", lineHeight:1.6, maxWidth:360, margin:0 }}>
          {description}
        </p>
        <div style={{ fontSize:".72rem", fontWeight:700, color:"#C4B5AE", textTransform:"uppercase",
          letterSpacing:".08em", marginTop:8 }}>
          Coming soon
        </div>
      </div>
    </SubScreenWrapper>
  );
}

export function AccountSessionsSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Account & Sessions" icon="🔐"
    description="View your active web sessions, revoke access, and check your mobile app link status."
    onBack={onBack}/>;
}

export function NotificationsSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Notifications" icon="🔔"
    description="Configure which notifications you receive: trade matches, escrow funded, payment sent, disputes, and price alerts."
    onBack={onBack}/>;
}

export function PinCodeSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Pin Code" icon="🔑"
    description="Set, change, or remove a numeric PIN to protect access to the web app."
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
          <div style={{ width:64, height:64, borderRadius:"50%", background:"#E8F5E0", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#65A519" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize:"1.1rem", fontWeight:800, color:"#2B1911", marginBottom:8 }}>Message sent!</div>
          <div style={{ fontSize:".88rem", color:"#7D675E", lineHeight:1.5 }}>The Peach team will get back to you soon.</div>
          <div style={{ marginTop:32, width:"100%" }}>
            <PrimaryBtn label="DONE" onClick={onBack}/>
          </div>
        </div>
      </SubScreenWrapper>
    );
  }

  const inputStyle = {
    width:"100%", padding:"10px 14px", borderRadius:10,
    border:"1.5px solid #C4B5AE", background:"#FFFFFF",
    fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"#2B1911", outline:"none",
  };
  const labelStyle = { fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:6 };

  return (
    <SubScreenWrapper title="Contact Peach" onBack={onBack}>
      <p style={{ fontSize:".82rem", color:"#7D675E", marginBottom:20, lineHeight:1.6 }}>
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
        <div style={labelStyle}>message <span style={{ color:"#F56522" }}>*</span></div>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Describe your question or issue…"
          rows={5}
          style={{ ...inputStyle, resize:"vertical", minHeight:100 }}/>
      </div>

      {/* Email */}
      <div style={{ marginBottom:28 }}>
        <div style={labelStyle}>email <span style={{ color:"#7D675E", fontWeight:500 }}>(optional)</span></div>
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
    { icon:"💬", label:"Telegram", url:"https://t.me/peachtopeach" },
    { icon:"📖", label:"GitHub",   url:"https://github.com/Peach2Peach" },
  ];

  return (
    <SubScreenWrapper title="About Peach" onBack={onBack}>
      {/* Branding header */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 20px 28px", textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:16, background:"#FEEDE5",
          display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
          <PeachIcon size={36}/>
        </div>
        <div style={{ fontSize:"1.1rem", fontWeight:800, color:"#2B1911", marginBottom:4 }}>Peach Bitcoin Web</div>
        <div style={{ fontSize:".78rem", fontWeight:600, color:"#C4B5AE" }}>v0.1.0</div>
      </div>

      {/* Description */}
      <SettingsSection title="About">
        <div style={{ padding:"14px 16px" }}>
          <p style={{ fontSize:".82rem", color:"#7D675E", lineHeight:1.6, margin:0 }}>
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

      <div style={{ textAlign:"center", fontSize:".72rem", color:"#C4B5AE", fontWeight:600, marginTop:24 }}>
        Made with 🍑 · Open source
      </div>
    </SubScreenWrapper>
  );
}
