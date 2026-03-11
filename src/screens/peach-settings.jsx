import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SideNav, Topbar, formatPeachId } from "../components/Navbars.jsx";
import { IcoBtc } from "../components/BitcoinAmount.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useApi } from "../hooks/useApi.js";

// ─── INPUT VALIDATORS (inline for Claude.ai preview; import from peach-validators.js for GitHub build) ──

// ─── SHA-256 (compact pure-JS) ───────────────────────────────────────────────
const SHA256_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);
function sha256(msgBytes) {
  const rr = (v, n) => (v >>> n) | (v << (32 - n));
  let H0=0x6a09e667,H1=0xbb67ae85,H2=0x3c6ef372,H3=0xa54ff53a,
      H4=0x510e527f,H5=0x9b05688c,H6=0x1f83d9ab,H7=0x5be0cd19;
  const len = msgBytes.length, bitLen = len * 8;
  const padded = new Uint8Array(Math.ceil((len + 9) / 64) * 64);
  padded.set(msgBytes); padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen, false);
  const W = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rr(W[i-15],7)^rr(W[i-15],18)^(W[i-15]>>>3);
      const s1 = rr(W[i-2],17)^rr(W[i-2],19)^(W[i-2]>>>10);
      W[i] = (W[i-16]+s0+W[i-7]+s1)|0;
    }
    let a=H0,b=H1,c=H2,d=H3,e=H4,f=H5,g=H6,h=H7;
    for (let i = 0; i < 64; i++) {
      const S1=rr(e,6)^rr(e,11)^rr(e,25), ch=(e&f)^(~e&g), t1=(h+S1+ch+SHA256_K[i]+W[i])|0;
      const S0=rr(a,2)^rr(a,13)^rr(a,22), maj=(a&b)^(a&c)^(b&c), t2=(S0+maj)|0;
      h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;
    }
    H0=(H0+a)|0;H1=(H1+b)|0;H2=(H2+c)|0;H3=(H3+d)|0;
    H4=(H4+e)|0;H5=(H5+f)|0;H6=(H6+g)|0;H7=(H7+h)|0;
  }
  const out = new Uint8Array(32), odv = new DataView(out.buffer);
  [H0,H1,H2,H3,H4,H5,H6,H7].forEach((v,i) => odv.setUint32(i*4, v, false));
  return out;
}

// ─── Base58Check ─────────────────────────────────────────────────────────────
const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP = new Uint8Array(128).fill(255);
for (let i = 0; i < 58; i++) B58_MAP[B58_ALPHABET.charCodeAt(i)] = i;
function base58Decode(str) {
  let zeros = 0;
  for (let i = 0; i < str.length && str[i]==='1'; i++) zeros++;
  const size = Math.ceil(str.length * 733 / 1000) + 1;
  const buf = new Uint8Array(size);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c >= 128 || B58_MAP[c] === 255) return null;
    let carry = B58_MAP[c];
    for (let j = size - 1; j >= 0; j--) { carry += 58*buf[j]; buf[j] = carry & 0xff; carry >>= 8; }
    if (carry !== 0) return null;
  }
  let start = 0;
  while (start < size && buf[start] === 0) start++;
  const result = new Uint8Array(zeros + (size - start));
  result.set(buf.subarray(start), zeros);
  return result;
}
function verifyBase58Check(addr, expectedVersion) {
  const decoded = base58Decode(addr);
  if (!decoded || decoded.length !== 25) return false;
  if (decoded[0] !== expectedVersion) return false;
  const hash = sha256(sha256(decoded.slice(0, 21)));
  return hash[0]===decoded[21] && hash[1]===decoded[22] && hash[2]===decoded[23] && hash[3]===decoded[24];
}

// ─── Bech32 / Bech32m ───────────────────────────────────────────────────────
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
function bech32Polymod(values) {
  const GEN = [0x3b6a57b2,0x26508e6d,0x1ea119fa,0x3d4233dd,0x2a1462b3];
  let chk = 1;
  for (let i = 0; i < values.length; i++) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[i];
    for (let j = 0; j < 5; j++) { if ((top >> j) & 1) chk ^= GEN[j]; }
  }
  return chk;
}
function bech32HrpExpand(hrp) {
  const out = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}
function bech32Decode(addr) {
  const lower = addr.toLowerCase();
  if (lower !== addr && addr.toUpperCase() !== addr) return null;
  const a = lower, pos = a.lastIndexOf("1");
  if (pos < 1 || pos + 7 > a.length || a.length > 90) return null;
  const hrp = a.slice(0, pos), dataStr = a.slice(pos + 1), data = [];
  for (let i = 0; i < dataStr.length; i++) {
    const idx = BECH32_CHARSET.indexOf(dataStr[i]);
    if (idx === -1) return null;
    data.push(idx);
  }
  const polymod = bech32Polymod(bech32HrpExpand(hrp).concat(data));
  let encoding = null;
  if (polymod === 1) encoding = "bech32";
  if (polymod === 0x2bc830a3) encoding = "bech32m";
  if (!encoding) return null;
  return { hrp, data: data.slice(0, data.length - 6), encoding };
}
function convertBits(data, fromBits, toBits, pad) {
  let acc = 0, bits = 0; const out = [], maxv = (1 << toBits) - 1;
  for (let i = 0; i < data.length; i++) {
    acc = (acc << fromBits) | data[i]; bits += fromBits;
    while (bits >= toBits) { bits -= toBits; out.push((acc >> bits) & maxv); }
  }
  if (pad) { if (bits > 0) out.push((acc << (toBits - bits)) & maxv); }
  else { if (bits >= fromBits) return null; if ((acc << (toBits - bits)) & maxv) return null; }
  return out;
}
function verifySegwitAddress(addr) {
  const dec = bech32Decode(addr);
  if (!dec || dec.hrp !== "bc") return { ok: false, error: "Invalid bech32 encoding or checksum" };
  const witnessVer = dec.data[0];
  if (witnessVer > 16) return { ok: false, error: "Witness version must be 0–16" };
  const prog = convertBits(dec.data.slice(1), 5, 8, false);
  if (!prog || prog.length < 2 || prog.length > 40) return { ok: false, error: "Invalid witness program length" };
  if (witnessVer === 0) {
    if (dec.encoding !== "bech32") return { ok: false, error: "Witness v0 must use bech32 encoding" };
    if (prog.length !== 20 && prog.length !== 32) return { ok: false, error: "Witness v0 program must be 20 or 32 bytes" };
  } else {
    if (dec.encoding !== "bech32m") return { ok: false, error: `Witness v${witnessVer} must use bech32m encoding` };
  }
  return { ok: true };
}

// ─── Validators ──────────────────────────────────────────────────────────────
function validateBtcAddress(addr) {
  if (!addr || !addr.trim()) return { valid: false, error: "Address is required" };
  const a = addr.trim();
  if (a.startsWith("1")) {
    if (a.length < 25 || a.length > 34) return { valid: false, error: "P2PKH address must be 25–34 characters" };
    if (!verifyBase58Check(a, 0x00)) return { valid: false, error: "Invalid P2PKH address (checksum failed)" };
    return { valid: true, error: null };
  }
  if (a.startsWith("3")) {
    if (a.length < 25 || a.length > 34) return { valid: false, error: "P2SH address must be 25–34 characters" };
    if (!verifyBase58Check(a, 0x05)) return { valid: false, error: "Invalid P2SH address (checksum failed)" };
    return { valid: true, error: null };
  }
  if (a.toLowerCase().startsWith("bc1")) {
    if (a.toLowerCase() !== a) return { valid: false, error: "Bech32 address must be lowercase" };
    const result = verifySegwitAddress(a);
    if (!result.ok) return { valid: false, error: result.error };
    return { valid: true, error: null };
  }
  return { valid: false, error: "Address must start with 1, 3, or bc1" };
}

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
function validateBIP322Signature(raw) {
  if (!raw || !raw.trim()) return { valid: false, error: "Signature is required" };
  const clean = raw.trim();
  if (clean.length < 20) return { valid: false, error: "Signature too short" };
  if (!BASE64_RE.test(clean)) return { valid: false, error: "Signature must be valid base64" };
  return { valid: true, error: null };
}

function validateFeeRate(raw) {
  if (raw === "" || raw === null || raw === undefined) return { valid: false, error: "Fee rate is required" };
  const n = Number(raw);
  if (!Number.isInteger(n)) return { valid: false, error: "Must be a whole number" };
  if (n < 1) return { valid: false, error: "Minimum 1 sat/vB" };
  if (n > 150) return { valid: false, error: "Maximum 150 sat/vB" };
  return { valid: true, error: null };
}

function makeBlurHandler(setErrors) {
  return (fieldKey, value, validatorFn, ...extraArgs) => {
    const result = validatorFn(value, ...extraArgs);
    setErrors(prev => ({ ...prev, [fieldKey]: result.valid ? null : result.error }));
    return result.valid;
  };
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconCopy = ({ size=16 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="11" height="11" rx="2"/><path d="M3 13V3h10"/></svg>;
const IconTrash = ({ size=16 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="5,7 5,17 15,17 15,7"/><line x1="3" y1="7" x2="17" y2="7"/><line x1="8" y1="3" x2="12" y2="3"/></svg>;
const IconCamera = ({ size=16 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7.5C2 6.4 2.9 5.5 4 5.5h1.5l1.5-2h6l1.5 2H16c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-8z"/><circle cx="10" cy="11" r="2.5"/></svg>;
const IconExternalLink = ({ size=14 }) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3H3a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V8"/><polyline points="9,2 12,2 12,5"/><line x1="7" y1="7" x2="12" y2="2"/></svg>;
const IconShield = ({ size=20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="#F56522" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L3 5v5c0 4.4 3 8.2 7 9 4-.8 7-4.6 7-9V5l-7-3z"/></svg>;


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

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

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

// ─── SHARED: FIELD ERROR ─────────────────────────────────────────────────────
function FieldError({ error }) {
  if (!error) return null;
  return (
    <div style={{ fontSize:".72rem", fontWeight:600, color:"#DF321F", marginTop:4, marginBottom:4, paddingLeft:2 }}>
      {error}
    </div>
  );
}

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
  const auth = window.__PEACH_AUTH__;
  const peachId = auth?.peachId ? formatPeachId(auth.peachId) : "PEACH03CF9E9A";
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
  const { get } = useApi();
  const [feeRates, setFeeRates] = useState({ fast:1, medium:1, slow:1 });
  const [selected, setSelected] = useState("medium");
  const [customVal, setCustomVal] = useState("");
  const [saved, setSaved] = useState(true);
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
  const canSave = !saved && customValid;

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
      <PrimaryBtn label="FEE RATE SET" onClick={() => setSaved(true)} disabled={!canSave}/>
    </SubScreenWrapper>
  );
}

function TxBatchingSubScreen({ onBack }) {
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

// ─── REFUND ADDRESS (multi-step) ──────────────────────────────────────────────
function RefundAddressSubScreen({ onBack }) {
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

// ─── CUSTOM PAYOUT WALLET (multi-step) ───────────────────────────────────────
function PayoutWalletSubScreen({ onBack }) {
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
  .settings-scroll{margin-top:var(--topbar);padding:32px 24px 80px;max-width:640px;margin-left:auto;margin-right:auto}
  .settings-page-title{font-size:1.5rem;font-weight:800;color:var(--black);margin-bottom:28px;letter-spacing:-0.02em}
  .version-footer{text-align:center;padding:20px 0 8px;font-size:.72rem;color:var(--black-25);font-weight:500}

  @media(max-width:768px){
    .topbar-price{display:none}
    .sidenav-price-slot{display:block}
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

  // ── AUTH STATE ──
  const { isLoggedIn, handleLogin, handleLogout, showAvatarMenu, setShowAvatarMenu } = useAuth();
  const { get } = useApi();
  useEffect(() => {
    if (!showAvatarMenu) return;
    const close = (e) => { if (!e.target.closest(".avatar-menu-wrap")) setShowAvatarMenu(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAvatarMenu]);

  const [allPrices,           setAllPrices]           = useState({ EUR: 87432 });
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? 87432);
  const [diagnostics, setDiagnostics] = useState(true);
  const [darkMode,     setDarkMode]    = useState(false);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await get('/market/prices');
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
        <Topbar
          onBurgerClick={() => setSidebarMobileOpen(o => !o)}
          isLoggedIn={isLoggedIn}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          showAvatarMenu={showAvatarMenu}
          setShowAvatarMenu={setShowAvatarMenu}
          btcPrice={btcPrice}
          selectedCurrency={selectedCurrency}
          availableCurrencies={availableCurrencies}
          onCurrencyChange={c => setSelectedCurrency(c)}
        />

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

        {/* ── AUTH POPUP (when logged out) ── */}
        {!isLoggedIn && (
          <div className="auth-screen-overlay">
            <div className="auth-popup">
              <div className="auth-popup-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><rect x="5" y="12" width="18" height="13" rx="3"/><path d="M9 12V9a5 5 0 0 1 10 0v3"/><circle cx="14" cy="19" r="1.5" fill="var(--primary)"/></svg>
              </div>
              <div className="auth-popup-title">Authentication required</div>
              <div className="auth-popup-sub">Please authenticate to access your settings and preferences</div>
              <button className="auth-popup-btn" onClick={handleLogin}>Log in</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
