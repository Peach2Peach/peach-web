import { useState, useEffect } from "react";
// ⚠️ react-router-dom removed for Claude.ai preview. Restore import for local dev.
import { useNavigate } from "react-router-dom";

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const PeachIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 352 353" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect y="0.38" width="352" height="352" rx="58.13" fill="#FFF9F6"/>
    <path d="M151.8 45.5c11.2-1.2 21.1 5.35 24.2 16.02.54 1.88.82 3.89.88 5.86.13 4.2.05 8.41.05 12.62 0 .39-.33.69-.72.7-3.07.11-6.08-.02-9.02-1-9.21-3.03-15.33-11.47-15.42-21.35-.04-4-.01-8.01 0-12.01" fill="#05A85A"/>
    <path d="M205.3 64.23c.99 8.75-5.26 16.21-13.69 16.46-4.77.14-9.15-3.93-7.14-8.26.95-2.06 2.42-3.88 4.47-5.44 2.3-1.76 4.93-2.69 7.82-2.74 2.83-.04 5.66 0 8.54 0" fill="#05A85A"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M276 155.69c0 49.73-43.64 96.87-97.47 96.87-19.52 0-37.71-6.2-52.95-16.48v49.48c0 12.29-9.96 22.26-22.26 22.26s-22.26-9.97-22.26-22.26V157.39h.02c-.01-.57-.02-1.13-.02-1.7 0-43.02 32.67-72.02 76.33-68.64 14.01 1.09 28.26 1.09 42.27 0 43.67-3.39 76.34 25.62 76.34 68.64zM125.61 163.8v-.39c.1-24.1 19.36-39.92 44.44-36.17 5.13.77 10.37.77 15.49 0 25.15-3.77 44.44 12.15 44.44 36.35 0 26.64-23.36 51.89-52.19 51.89-28.75 0-52.07-25.13-52.18-51.68z" fill="url(#pg)"/>
    <defs>
      <radialGradient id="pg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(276 88) rotate(159) scale(220 130)">
        <stop stopColor="#FFA24C"/>
        <stop offset=".5" stopColor="#FF7A50"/>
        <stop offset="1" stopColor="#FF4D42"/>
      </radialGradient>
    </defs>
  </svg>
);

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconMarket   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,14 7,9 11,12 18,5"/><polyline points="13,5 18,5 18,10"/></svg>;
const IconTrades   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 7h10M13 4l3 3-3 3"/><path d="M15 13H5M7 10l-3 3 3 3"/></svg>;
const IconCreate   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>;
const IconSettings = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>;
const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="18" height="13" rx="2"/><line x1="1" y1="9" x2="19" y2="9"/><line x1="5" y1="14" x2="8" y2="14"/></svg>;
const IconChevronLeft  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,2 4,7 9,12"/></svg>;
const IconChevronRight = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="5,2 10,7 5,12"/></svg>;
const IconBurger       = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="4.5" x2="16" y2="4.5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13.5" x2="16" y2="13.5"/></svg>;
const IconCopy = ({ size=16 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="11" height="11" rx="2"/><path d="M3 13V3h10"/></svg>;
const IconTrash = ({ size=16 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="5,7 5,17 15,17 15,7"/><line x1="3" y1="7" x2="17" y2="7"/><line x1="8" y1="3" x2="12" y2="3"/></svg>;
const IconCamera = ({ size=16 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7.5C2 6.4 2.9 5.5 4 5.5h1.5l1.5-2h6l1.5 2H16c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-8z"/><circle cx="10" cy="11" r="2.5"/></svg>;
const IconExternalLink = ({ size=14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3H3a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V8"/><polyline points="9,2 12,2 12,5"/><line x1="7" y1="7" x2="12" y2="2"/></svg>;
const IconShield = ({ size=20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="#F56522" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L3 5v5c0 4.4 3 8.2 7 9 4-.8 7-4.6 7-9V5l-7-3z"/></svg>;

const NAV_ITEMS = [
  { id:"home",     label:"Home",     icon:()=><PeachIcon size={20}/> },
  { id:"market",   label:"Market",   icon:()=><IconMarket/> },
  { id:"trades",   label:"Trades",   icon:()=><IconTrades/> },
  { id:"create",   label:"Create",   icon:()=><IconCreate/> },
  { id:"payment-methods", label:"Payments", icon:()=><IconCreditCard/> },
  { id:"settings", label:"Settings", icon:()=><IconSettings/> },
];
const NAV_ROUTES = { home:"/home", market:"/market", trades:"/trades", create:"/offer/new", settings:"/settings", "payment-methods":"/payment-methods" };

const IcoBtc = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}>
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M22.2 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.1-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8.9l-.8 3.3c.1 0 .2 0 .3.1-.1 0-.2-.1-.3-.1L11.4 20c-.1.3-.4.7-1 .5 0 0-1.2-.3-1.2-.3l-.8 1.8 2 .5c.4.1.7.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.2 1.4.3l-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.03-3.2-1.5-3.9 1.1-.25 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.6.8 4.1 2.9zm.5-5.3c-.45 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.8.6 3.4 2.5z" fill="white"/>
  </svg>
);

// ─── SIDENAV ─────────────────────────────────────────────────────────────────
function SideNav({ active, collapsed, onToggle, mobileOpen, onClose, onNavigate, mobilePriceSlot }) {
  return (
    <>
      <div className={`sidenav-backdrop${mobileOpen?" open":""}`} onClick={onClose}/>
      <nav className={`sidenav${collapsed?" sidenav-collapsed":""}${mobileOpen?" sidenav-mobile-open":""}`}>
        <button className="sidenav-toggle" onClick={onToggle} title={collapsed?"Expand":"Collapse"}>
          {collapsed ? <IconChevronRight/> : <IconChevronLeft/>}
        </button>
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button key={id} className={`sidenav-item${active===id?" sidenav-active":""}`}
            onClick={() => { if (onNavigate && NAV_ROUTES[id]) onNavigate(NAV_ROUTES[id]); }}>
            <span className="sidenav-icon">{icon()}</span>
            <span className="sidenav-label">{label}</span>
          </button>
        ))}
        {mobilePriceSlot && <div className="sidenav-price-slot">{mobilePriceSlot}</div>}
      </nav>
    </>
  );
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      width:44, height:26, borderRadius:999, border:"none",
      background: checked ? "#F56522" : "#C4B5AE",
      cursor:"pointer", position:"relative", transition:"background .2s", flexShrink:0, padding:0,
    }}>
      <span style={{
        position:"absolute", top:3, left: checked ? 21 : 3,
        width:20, height:20, borderRadius:"50%", background:"#FFFFFF",
        boxShadow:"0 1px 4px rgba(0,0,0,.2)", transition:"left .2s", display:"block",
      }}/>
    </button>
  );
}

// ─── SETTINGS ROW ─────────────────────────────────────────────────────────────
function SettingsRow({ label, description, icon, right, warning, onClick, noBorder }) {
  return (
    <div onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:14, padding:"14px 20px",
      borderBottom: noBorder ? "none" : "1px solid #F4EEEB",
      cursor: onClick ? "pointer" : "default", transition:"background .12s",
      borderRadius: noBorder ? "0 0 12px 12px" : 0,
    }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.background="#FFF9F6"; }}
    onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}>
      {icon && (
        <div style={{ width:36, height:36, borderRadius:10, background:"#F4EEEB", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"1rem" }}>
          {icon}
        </div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:".9rem", fontWeight:600, color: warning ? "#DF321F" : "#2B1911", lineHeight:1.3 }}>{label}</div>
        {description && <div style={{ fontSize:".75rem", color:"#7D675E", marginTop:2, fontWeight:400 }}>{description}</div>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        {right}
        {warning && <span style={{ fontSize:"1.1rem" }}>⚠️</span>}
        {onClick && <span style={{ color:"#C4B5AE" }}><IconChevronRight/></span>}
      </div>
    </div>
  );
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SettingsSection({ title, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:".72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#F56522", marginBottom:8, paddingLeft:4 }}>
        {title}
      </div>
      <div style={{ background:"#FFFFFF", border:"1px solid #EAE3DF", borderRadius:12, overflow:"hidden" }}>
        {children}
      </div>
    </div>
  );
}

// ─── SUB-SCREEN WRAPPER ───────────────────────────────────────────────────────
function SubScreenWrapper({ title, onBack, children }) {
  return (
    <div className="settings-scroll">
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
        <button onClick={onBack} style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          width:34, height:34, borderRadius:8, border:"none",
          background:"transparent", cursor:"pointer", color:"#7D675E", flexShrink:0,
        }}
        onMouseEnter={e => e.currentTarget.style.background="#F4EEEB"}
        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
          <IconChevronLeft/>
        </button>
        <h1 style={{ fontSize:"1.3rem", fontWeight:800, color:"#2B1911", letterSpacing:"-0.02em", margin:0 }}>{title}</h1>
      </div>
      {children}
    </div>
  );
}

// ─── SHARED: COPY BUTTON ──────────────────────────────────────────────────────
function CopyBtn({ text, size=16 }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    try { navigator.clipboard.writeText(text); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} title="Copy" style={{ border:"none", background:"transparent", cursor:"pointer", color: copied ? "#65A519" : "#F56522", padding:4, borderRadius:6, display:"flex", alignItems:"center" }}>
      {copied ? <span style={{ fontSize:".7rem", fontWeight:700 }}>✓</span> : <IconCopy size={size}/>}
    </button>
  );
}

// ─── SHARED: PRIMARY BUTTON ───────────────────────────────────────────────────
function PrimaryBtn({ label, onClick, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      width:"100%", padding:"13px 20px", borderRadius:999, border:"none",
      background: disabled ? "#C4B5AE" : "linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",
      color:"#FFFFFF", fontFamily:"'Baloo 2',cursive", fontSize:".85rem",
      fontWeight:800, letterSpacing:".06em", textTransform:"uppercase",
      cursor: disabled ? "not-allowed" : "pointer",
    }}>
      {label}
    </button>
  );
}

// ─── SHARED: OUTLINE BUTTON ───────────────────────────────────────────────────
function OutlineBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:"100%", padding:"12px 20px", borderRadius:999,
      border:"2px solid #F56522", background:"transparent",
      color:"#F56522", fontFamily:"'Baloo 2',cursive", fontSize:".85rem",
      fontWeight:800, letterSpacing:".06em", textTransform:"uppercase", cursor:"pointer",
    }}>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-SCREENS
// ─────────────────────────────────────────────────────────────────────────────

function ProfileSubScreen({ onBack }) {
  const peachId = "PEACH03CF9E9A";
  const pubkey  = "03CF9E9A9DFB2951CEFC6107BCD63D963D85A00C50FCB93B7240C54C8E4053EEFA";
  const badges  = ["supertrader ⭐", "fast trader ⚡", "early adopter 🐣"];
  const rating  = 5.0;
  const volumes = [
    { label:"daily traded volume",              current:0,    max:1095,   currency:"EUR" },
    { label:"monthly anonymous traded volume:", current:0,    max:1095,   currency:"EUR" },
    { label:"yearly traded volume:",            current:4218, max:109501, currency:"EUR" },
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
          <div style={{ fontSize:".88rem", fontWeight:700, color:"#2B1911" }}>02/09/2025 (183 days ago)</div>
        </div>
        <div>
          <div style={{ fontSize:".72rem", color:"#7D675E" }}>disputes:</div>
          <div style={{ fontSize:".88rem", fontWeight:700, color:"#2B1911" }}>2 opened &nbsp; 0 won &nbsp; 0 lost &nbsp; 0 resolved</div>
        </div>
        <div>
          <div style={{ fontSize:".72rem", color:"#7D675E" }}>number of trades:</div>
          <div style={{ fontSize:".88rem", fontWeight:700, color:"#2B1911" }}>40</div>
        </div>
      </div>
    </SubScreenWrapper>
  );
}

function ReferralsSubScreen({ onBack }) {
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

function BackupsSubScreen({ onBack }) {
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

function NetworkFeesSubScreen({ onBack }) {
  const [feeRates, setFeeRates] = useState({ fast:1, medium:1, slow:1 });
  const [selected, setSelected] = useState("medium");
  const [customVal, setCustomVal] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    async function fetchFees() {
      try {
        const res = await fetch("https://api.peachbitcoin.com/v1/estimateFees");
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

  const canSave = !saved && (selected !== "custom" || (customVal && parseInt(customVal) > 0));

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
                  onChange={e => { setCustomVal(e.target.value); setSelected("custom"); setSaved(false); }}
                  onClick={e => e.stopPropagation()}
                  placeholder="0" type="number" min="1"
                  style={{ width:60, padding:"4px 8px", borderRadius:6, border:"1.5px solid #C4B5AE", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"#2B1911", outline:"none", background:"#FFFFFF" }}
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
      </div>
      <PrimaryBtn label="FEE RATE SET" onClick={() => setSaved(true)} disabled={!canSave}/>
    </SubScreenWrapper>
  );
}

function TxBatchingSubScreen({ onBack }) {
  const [batching, setBatching] = useState(false);
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
        <Toggle checked={batching} onChange={setBatching}/>
      </div>
      <div style={{ background:"#F4EEEB", borderRadius:10, padding:"12px 16px" }}>
        <p style={{ fontSize:".76rem", color:"#7D675E", lineHeight:1.5, margin:0 }}>
          Transaction batching (GroupHug) combines multiple payouts into a single Bitcoin transaction, reducing on-chain fees per payout. When disabled, your escrow payout is broadcast immediately as its own transaction.
        </p>
      </div>
    </SubScreenWrapper>
  );
}

// ─── REFUND ADDRESS (multi-step) ──────────────────────────────────────────────
function RefundAddressSubScreen({ onBack }) {
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [addressSet, setAddressSet] = useState(false);
  const [signature, setSignature] = useState("");
  const peachId = "peach03cf9e9a";
  const signMessage = `I confirm that only I, ${peachId}, control the address ${address}`;

  function handleAddressBlur() {
    if (address.trim().length > 10) setAddressSet(true);
  }
  function handleRemove() { setLabel(""); setAddress(""); setAddressSet(false); }

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
            <input value={signature} onChange={e => setSignature(e.target.value)} placeholder="signature"
              style={{ width:"100%", padding:"10px 40px 10px 14px", borderRadius:10, border:"1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>
            <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)" }}>
              <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setSignature(t); } catch {} }}
                style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
                <IconCopy size={16}/>
              </button>
            </div>
          </div>
        </div>

        <PrimaryBtn label="CONFIRM" onClick={() => onBack()} disabled={!signature.trim()}/>
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

      <div style={{ position:"relative", marginBottom: addressSet ? 8 : 24 }}>
        <input value={address} onChange={e => { setAddress(e.target.value); setAddressSet(false); }} onBlur={handleAddressBlur}
          placeholder="bc1q …"
          style={{ width:"100%", padding:"10px 72px 10px 14px", borderRadius:10, border: addressSet ? "2px solid #F56522" : "1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"monospace", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>
        <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", display:"flex", gap:4 }}>
          <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setAddress(t); if(t.length>10) setAddressSet(true); } catch {} }}
            style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
            <IconCopy size={16}/>
          </button>
          <button style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
            <IconCamera size={16}/>
          </button>
        </div>
      </div>

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

      <PrimaryBtn label="NEXT" onClick={() => setStep(2)} disabled={!address.trim() || address.trim().length < 10}/>
    </SubScreenWrapper>
  );
}

// ─── CUSTOM PAYOUT WALLET (multi-step) ───────────────────────────────────────
function PayoutWalletSubScreen({ onBack }) {
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [addressSet, setAddressSet] = useState(false);
  const [signature, setSignature] = useState("");
  const peachId = "peach03cf9e9a";
  const signMessage = `I confirm that only I, ${peachId}, control the address ${address}`;

  function handleAddressBlur() { if (address.trim().length > 10) setAddressSet(true); }
  function handleRemove() { setLabel(""); setAddress(""); setAddressSet(false); }

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

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"#2B1911", marginBottom:6 }}>signature</div>
          <div style={{ position:"relative" }}>
            <input value={signature} onChange={e => setSignature(e.target.value)} placeholder="signature"
              style={{ width:"100%", padding:"10px 40px 10px 14px", borderRadius:10, border:"1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>
            <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)" }}>
              <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setSignature(t); } catch {} }}
                style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
                <IconCopy size={16}/>
              </button>
            </div>
          </div>
        </div>

        <div style={{ background:"#FEEDE5", border:"1.5px solid #F56522", borderRadius:10, padding:"12px 14px", marginBottom:24 }}>
          <p style={{ fontSize:".76rem", color:"#7D675E", lineHeight:1.5, margin:0 }}>
            <span style={{ fontWeight:800, color:"#F56522" }}>Note:</span> BIP322 signature verification is required. This is verified server-side when saving your payout address.
          </p>
        </div>

        <PrimaryBtn label="CONFIRM" onClick={() => onBack()} disabled={!signature.trim()}/>
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

      <div style={{ position:"relative", marginBottom: addressSet ? 8 : 24 }}>
        <input value={address} onChange={e => { setAddress(e.target.value); setAddressSet(false); }} onBlur={handleAddressBlur}
          placeholder="bc1q …"
          style={{ width:"100%", padding:"10px 72px 10px 14px", borderRadius:10, border: addressSet ? "2px solid #F56522" : "1.5px solid #C4B5AE", background:"#FFFFFF", fontFamily:"monospace", fontSize:".85rem", color:"#2B1911", outline:"none" }}/>
        <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", display:"flex", gap:4 }}>
          <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setAddress(t); if(t.length>10) setAddressSet(true); } catch {} }}
            style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
            <IconCopy size={16}/>
          </button>
          <button style={{ border:"none", background:"transparent", cursor:"pointer", color:"#F56522", padding:4 }}>
            <IconCamera size={16}/>
          </button>
        </div>
      </div>

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

      <PrimaryBtn label="NEXT" onClick={() => setStep(2)} disabled={!address.trim() || address.trim().length < 10}/>
    </SubScreenWrapper>
  );
}

function BlockUsersSubScreen({ onBack }) {
  const [blocked, setBlocked] = useState([
    { id:"PEACH8F2A1B3C", since:"2025-01-14" },
    { id:"PEACH4D9E7F2A", since:"2025-02-28" },
  ]);

  return (
    <SubScreenWrapper title="Blocked Users" onBack={onBack}>
      {blocked.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 20px", color:"#7D675E", fontSize:".85rem" }}>
          <div style={{ fontSize:"2rem", marginBottom:12 }}>🚫</div>
          You haven't blocked any users.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {blocked.map(u => (
            <div key={u.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderRadius:12, background:"#FFFFFF", border:"1px solid #EAE3DF" }}>
              <div>
                <div style={{ fontSize:".85rem", fontWeight:700, color:"#2B1911" }}>{u.id}</div>
                <div style={{ fontSize:".72rem", color:"#7D675E", marginTop:2 }}>
                  Blocked on {new Date(u.since).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                </div>
                <button style={{ marginTop:4, border:"none", background:"transparent", padding:0, cursor:"pointer", color:"#F56522", fontFamily:"'Baloo 2',cursive", fontSize:".72rem", fontWeight:700, textDecoration:"underline" }}>
                  See previous trades
                </button>
              </div>
              <button onClick={() => setBlocked(prev => prev.filter(x => x.id !== u.id))}
                style={{ padding:"7px 16px", borderRadius:999, border:"1.5px solid #EAE3DF", background:"#F4EEEB", fontFamily:"'Baloo 2',cursive", fontSize:".75rem", fontWeight:700, color:"#7D675E", cursor:"pointer" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="#F56522"; e.currentTarget.style.color="#F56522"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="#EAE3DF"; e.currentTarget.style.color="#7D675E"; }}>
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop:20, padding:"12px 16px", background:"#F4EEEB", borderRadius:10 }}>
        <p style={{ fontSize:".75rem", color:"#7D675E", lineHeight:1.5, margin:0 }}>
          Blocked users cannot match with your offers. Unblocking makes them visible in the market again.
        </p>
      </div>
    </SubScreenWrapper>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --primary:#F56522;--primary-dark:#C45104;
    --primary-bg:#FFF9F6;--primary-mild:#FEEDE5;
    --grad:linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C);
    --success:#65A519;--success-bg:#F2F9E7;
    --error:#DF321F;--error-bg:#FFF0EE;
    --black:#2B1911;--black-75:#624D44;--black-65:#7D675E;
    --black-25:#C4B5AE;--black-10:#EAE3DF;--black-5:#F4EEEB;
    --surface:#FFFFFF;--font:'Baloo 2',cursive;--topbar:56px;
  }
  html{font-size:120%}
  body{font-family:var(--font);background:var(--primary-bg);color:var(--black)}
  .app{display:flex;flex-direction:column;min-height:100vh}

  .topbar{position:fixed;top:0;left:0;right:0;height:var(--topbar);background:var(--surface);
    border-bottom:1px solid var(--black-10);display:flex;align-items:center;
    padding:0 20px;gap:12px;z-index:200}
  .logo-wordmark{font-size:1.22rem;font-weight:800;letter-spacing:-0.02em;
    background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .topbar-price{display:flex;align-items:center;gap:8px;background:linear-gradient(90deg,#FFBFA8,#FFD5BF);border-radius:999px;padding:5px 6px 5px 10px;font-size:0.78rem;font-weight:600;color:var(--black);flex-shrink:0}
  .topbar-price-main{font-weight:800;color:var(--black);white-space:nowrap}
  .topbar-price-sats{font-weight:500;color:var(--black-65);white-space:nowrap}
  .topbar-cur-select{position:relative;display:flex;align-items:center;gap:4px;background:rgba(255,255,255,0.45);border-radius:999px;padding:2px 9px;cursor:pointer}
  .cur-select-inner{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:.78rem;width:100%}
  .cur-select-arrow{display:flex;align-items:center;pointer-events:none;color:var(--black-65);flex-shrink:0}
  .cur-select-label{font-size:.76rem;font-weight:800;color:var(--black);pointer-events:none}
  .topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px}
  .avatar-peachid{display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 10px;border-radius:999px;transition:background .14s}
  .avatar-peachid:hover{background:var(--black-5)}
  .sidenav-price-slot{display:none;margin-top:auto;padding:12px 8px 8px;width:100%;border-top:1px solid var(--black-10)}
  .mobile-price-pill{display:flex;align-items:center;gap:8px;background:linear-gradient(90deg,#FFBFA8,#FFD5BF);border-radius:12px;padding:10px 10px 10px 12px}
  .mobile-price-text{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0}
  .mobile-price-main{font-size:.82rem;font-weight:800;color:var(--black);white-space:nowrap}
  .mobile-price-sats{font-size:.68rem;font-weight:500;color:var(--black-65);white-space:nowrap}
  .mobile-cur-select{flex-shrink:0}
  .avatar{width:34px;height:34px;border-radius:50%;background:var(--grad);display:flex;
    align-items:center;justify-content:center;font-size:.72rem;font-weight:800;color:white;
    cursor:pointer;position:relative;flex-shrink:0}
  .avatar-badge{position:absolute;top:-3px;right:-3px;background:var(--error);color:white;
    font-size:.55rem;font-weight:800;width:14px;height:14px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;border:2px solid var(--surface)}
  .peach-id{font-size:.72rem;font-weight:800;letter-spacing:.06em;color:var(--black-75);font-family:var(--font);white-space:nowrap}

  .sidenav{position:fixed;top:var(--topbar);left:0;bottom:0;
    width:68px;background:var(--surface);border-right:1px solid var(--black-10);
    z-index:150;display:flex;flex-direction:column;align-items:center;
    padding:8px 0;gap:2px;transition:width .2s cubic-bezier(.4,0,.2,1);overflow:hidden}
  .sidenav-collapsed{width:44px}
  .sidenav-toggle{width:100%;height:32px;display:flex;align-items:center;justify-content:flex-end;
    padding-right:10px;border:none;background:transparent;cursor:pointer;
    color:var(--black-25);flex-shrink:0;transition:color .14s;margin-bottom:4px}
  .sidenav-toggle:hover{color:var(--black-65)}
  .sidenav-item{width:calc(100% - 16px);display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:3px;padding:8px 4px;border-radius:10px;
    border:none;background:transparent;cursor:pointer;color:var(--black-65);
    font-family:var(--font);transition:all .14s;flex-shrink:0}
  .sidenav-item:hover{background:var(--black-5);color:var(--black)}
  .sidenav-active{background:var(--primary-mild)!important;color:var(--primary-dark)!important}
  .sidenav-icon{display:flex;align-items:center;justify-content:center;height:22px;flex-shrink:0}
  .sidenav-label{font-size:.57rem;font-weight:700;letter-spacing:.02em;text-transform:uppercase;
    white-space:nowrap;overflow:hidden;transition:opacity .15s,max-height .2s;max-height:20px;opacity:1}
  .sidenav-collapsed .sidenav-label{opacity:0;max-height:0;pointer-events:none}
  .sidenav-backdrop{display:none;position:fixed;inset:0;z-index:149;background:rgba(43,25,17,.4)}
  .sidenav-backdrop.open{display:block}
  .burger-btn{display:none;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:8px;border:none;
    background:transparent;cursor:pointer;color:var(--black-65);flex-shrink:0;transition:background .14s}
  .burger-btn:hover{background:var(--black-5)}

  .settings-scroll{margin-top:var(--topbar);padding:32px 24px 80px;max-width:640px;margin-left:auto;margin-right:auto}
  .settings-page-title{font-size:1.5rem;font-weight:800;color:var(--black);margin-bottom:28px;letter-spacing:-0.02em}
  .version-footer{text-align:center;padding:20px 0 8px;font-size:.72rem;color:var(--black-25);font-weight:500}

  @media(max-width:768px){
    .topbar-price{display:none}
    .sidenav-price-slot{display:block}
    .peach-id{display:none}
    .settings-scroll{padding:24px 16px 80px}
  }
  @media(max-width:767px){
    .sidenav{width:220px;left:0;transform:translateX(-100%);
      transition:transform .25s cubic-bezier(.4,0,.2,1);z-index:500;
      align-items:flex-start;box-shadow:none}
    .sidenav-collapsed{width:220px}
    .sidenav.sidenav-mobile-open{transform:translateX(0);box-shadow:6px 0 28px rgba(43,25,17,.16)}
    .sidenav-item{width:calc(100% - 16px);flex-direction:row;justify-content:flex-start;gap:12px;padding:10px 14px}
    .sidenav-collapsed .sidenav-item{width:calc(100% - 16px)}
    .sidenav-label,.sidenav-collapsed .sidenav-label{opacity:1!important;max-height:none!important;font-size:.8rem;text-transform:none;font-weight:600;letter-spacing:0}
    .sidenav-toggle{display:none}
    .burger-btn{display:flex}
    .page-wrap{margin-left:0!important}
  }
`;

// ─── PLACEHOLDER SUB-SCREENS ─────────────────────────────────────────────────

function ComingSoonPlaceholder({ title, icon, description, onBack }) {
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

function AccountSessionsSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Account & Sessions" icon="🔐"
    description="View your active web sessions, revoke access, and check your mobile app link status."
    onBack={onBack}/>;
}

function NotificationsSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Notifications" icon="🔔"
    description="Configure which notifications you receive: trade matches, escrow funded, payment sent, disputes, and price alerts."
    onBack={onBack}/>;
}

function PinCodeSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Pin Code" icon="🔑"
    description="Set, change, or remove a numeric PIN to protect access to the web app."
    onBack={onBack}/>;
}

function LanguageSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Language" icon="🌐"
    description="Choose your preferred language. Peach Web will support English, French, German, Spanish, and Italian."
    onBack={onBack}/>;
}

function NodeSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Use Your Own Node" icon="🖧"
    description="Connect to your own Bitcoin or Electrum node for maximum privacy and sovereignty."
    onBack={onBack}/>;
}

function ContactSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="Contact Peach" icon="💬"
    description="Get in touch with the Peach team for support, feedback, or partnership inquiries."
    onBack={onBack}/>;
}

function AboutSubScreen({ onBack }) {
  return <ComingSoonPlaceholder title="About Peach" icon="ℹ️"
    description="Peach Bitcoin Web · v0.1.0 — Version info, licenses, legal notices, and links."
    onBack={onBack}/>;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState("main");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [allPrices,           setAllPrices]           = useState({ EUR: 87432 });
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? 87432);
  const [diagnostics, setDiagnostics] = useState(true);
  const [darkMode,     setDarkMode]    = useState(false);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('https://api.peachbitcoin.com/v1/market/prices');
        const data = await res.json();
        if (data && typeof data === "object") {
          setAllPrices(data);
          setAvailableCurrencies(Object.keys(data).sort());
        }
      } catch {}
    }
    fetchPrices();
    const iv = setInterval(fetchPrices, 30000);
    return () => clearInterval(iv);
  }, []);

  const satsPerCur = Math.round(100_000_000 / btcPrice);
  const sideMargin = sidebarCollapsed ? 44 : 68;

  function renderContent() {
    if (currentView === "profile")      return <ProfileSubScreen     onBack={() => setCurrentView("main")}/>;
    if (currentView === "referrals")    return <ReferralsSubScreen   onBack={() => setCurrentView("main")}/>;
    if (currentView === "backups")      return <BackupsSubScreen     onBack={() => setCurrentView("main")}/>;
    if (currentView === "network-fees") return <NetworkFeesSubScreen onBack={() => setCurrentView("main")}/>;
    if (currentView === "tx-batching")  return <TxBatchingSubScreen  onBack={() => setCurrentView("main")}/>;
    if (currentView === "refund")       return <RefundAddressSubScreen onBack={() => setCurrentView("main")}/>;
    if (currentView === "payout")       return <PayoutWalletSubScreen  onBack={() => setCurrentView("main")}/>;
    if (currentView === "block-users")  return <BlockUsersSubScreen  onBack={() => setCurrentView("main")}/>;
    if (currentView === "account-sessions") return <AccountSessionsSubScreen onBack={() => setCurrentView("main")}/>;
    if (currentView === "notifications")    return <NotificationsSubScreen    onBack={() => setCurrentView("main")}/>;
    if (currentView === "pin")              return <PinCodeSubScreen          onBack={() => setCurrentView("main")}/>;
    if (currentView === "language")         return <LanguageSubScreen         onBack={() => setCurrentView("main")}/>;
    if (currentView === "node")             return <NodeSubScreen             onBack={() => setCurrentView("main")}/>;
    if (currentView === "contact")          return <ContactSubScreen          onBack={() => setCurrentView("main")}/>;
    if (currentView === "about")            return <AboutSubScreen            onBack={() => setCurrentView("main")}/>;

    return (
      <div className="settings-scroll">
        <h1 className="settings-page-title">Settings</h1>

        <SettingsSection title="Account">
          <SettingsRow icon="👤" label="My Profile"
            description="Reputation, badges, and trading history"
            onClick={() => setCurrentView("profile")}/>
          <SettingsRow icon="🔐" label="Account & Sessions"
            description="Active sessions and security"
            onClick={() => setCurrentView("account-sessions")}/>
          <SettingsRow icon="🎁" label="Referrals"
            description="Invite friends and earn rewards"
            onClick={() => setCurrentView("referrals")}/>
          <SettingsRow icon="💾" label="Backups"
            description="Back up your account on the mobile app"
            warning={true}
            onClick={() => setCurrentView("backups")}/>
          <SettingsRow icon="🚫" label="Blocked Users"
            description="Manage users you've blocked"
            onClick={() => setCurrentView("block-users")}
            noBorder/>
        </SettingsSection>

        <SettingsSection title="Trading & Bitcoin">
          <SettingsRow icon="💳" label="Payment Methods"
            description="Add or manage your accepted payment methods"
            onClick={() => navigate("/payment-methods")}/>
          <SettingsRow icon="⛏️" label="Network Fees"
            description="Set your preferred on-chain fee rate"
            onClick={() => setCurrentView("network-fees")}/>
          <SettingsRow icon="📦" label="Transaction Batching"
            description="Combine payouts to save on fees"
            onClick={() => setCurrentView("tx-batching")}/>
          <SettingsRow icon="↩️" label="Refund Address"
            description="Bitcoin address for trade cancellations"
            onClick={() => setCurrentView("refund")}/>
          <SettingsRow icon="📤" label="Custom Payout Address"
            description="Send your sats to an external wallet automatically"
            onClick={() => setCurrentView("payout")}
            noBorder/>
        </SettingsSection>

        <SettingsSection title="App & Notifications">
          <SettingsRow icon="🔔" label="Notifications"
            description="Trade updates, matches, and alerts"
            onClick={() => setCurrentView("notifications")}/>
          <SettingsRow icon="🔑" label="Pin Code"
            description="Protect the app with a PIN"
            onClick={() => setCurrentView("pin")}/>
          <SettingsRow icon="🌐" label="Language"
            description="English"
            onClick={() => setCurrentView("language")}/>
          <SettingsRow icon="🌙" label="Dark Mode"
            right={<Toggle checked={darkMode} onChange={setDarkMode}/>}/>
          <SettingsRow icon="🔧" label="Diagnostics"
            description="Share anonymous usage data to help improve the app"
            right={<Toggle checked={diagnostics} onChange={setDiagnostics}/>}
            noBorder/>
        </SettingsSection>

        <SettingsSection title="Advanced & Support">
          <SettingsRow icon="🖧" label="Use Your Own Node"
            description="Connect to a custom Bitcoin node"
            onClick={() => setCurrentView("node")}/>
          <SettingsRow icon="💬" label="Contact Peach"
            description="Get help from the Peach team"
            onClick={() => setCurrentView("contact")}/>
          <SettingsRow icon="ℹ️" label="About Peach"
            description="Version, licenses, and legal info"
            onClick={() => setCurrentView("about")}
            noBorder/>
        </SettingsSection>

        <div className="version-footer">Peach Bitcoin Web · v0.1.0 · Made with 🍑</div>
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <header className="topbar">
          <button className="burger-btn" onClick={() => setSidebarMobileOpen(o => !o)}><IconBurger/></button>
          <PeachIcon size={28}/>
          <span className="logo-wordmark">Peach</span>
          <div className="topbar-price">
            <IcoBtc size={18}/>
            <span className="topbar-price-main">{btcPrice.toLocaleString("fr-FR")} {selectedCurrency}</span>
            <span className="topbar-price-sats">{satsPerCur.toLocaleString()} sats / {selectedCurrency.toLowerCase()}</span>
            <div className="topbar-cur-select">
              <span className="cur-select-label">{selectedCurrency}</span>
              <svg className="cur-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:"none",flexShrink:0}}><polyline points="1,1 5,5 9,1"/></svg>
              <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="cur-select-inner">
                {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="topbar-right">
            <div className="avatar-peachid">
              <span className="peach-id">PEACH08476D23</span>
              <div className="avatar">PW<div className="avatar-badge">2</div></div>
            </div>
          </div>
        </header>

        <SideNav
          active="settings"
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          mobileOpen={sidebarMobileOpen}
          onClose={() => setSidebarMobileOpen(false)}
          onNavigate={navigate}
          mobilePriceSlot={
            <div className="mobile-price-pill">
              <IcoBtc size={16}/>
              <div className="mobile-price-text">
                <span className="mobile-price-main">{btcPrice.toLocaleString("fr-FR")} {selectedCurrency}</span>
                <span className="mobile-price-sats">{satsPerCur.toLocaleString()} sats / {selectedCurrency.toLowerCase()}</span>
              </div>
              <div className="topbar-cur-select mobile-cur-select">
                <span className="cur-select-label">{selectedCurrency}</span>
                <svg className="cur-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:"none",flexShrink:0}}><polyline points="1,1 5,5 9,1"/></svg>
                <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="cur-select-inner">
                  {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          }
        />

        <div className="page-wrap" style={{ marginLeft: sideMargin }}>
          {renderContent()}
        </div>
      </div>
    </>
  );
}
