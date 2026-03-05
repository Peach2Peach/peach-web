// ─── PEACH WEB — INPUT VALIDATORS ─────────────────────────────────────────────
// Pure functions. No React dependency. Each returns { valid, error }.
// For Claude.ai preview: paste inline at top of each screen file.
// For GitHub build: import { validateBtcAddress, ... } from "./peach-validators.js";
// ──────────────────────────────────────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════════════════════
// BITCOIN ADDRESS — FULL CHECKSUM VERIFICATION (all 4 formats)
//
// P2PKH  (1…):   base58check, version 0x00, 25 decoded bytes
// P2SH   (3…):   base58check, version 0x05, 25 decoded bytes
// bech32  (bc1q…): bech32 polymod checksum (BIP173), witness v0
// bech32m (bc1p…): bech32m polymod checksum (BIP350), witness v1 (Taproot)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── SHA-256 (compact pure-JS implementation) ────────────────────────────────
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
  let H0=0x6a09e667, H1=0xbb67ae85, H2=0x3c6ef372, H3=0xa54ff53a,
      H4=0x510e527f, H5=0x9b05688c, H6=0x1f83d9ab, H7=0x5be0cd19;
  const len = msgBytes.length;
  const bitLen = len * 8;
  const padded = new Uint8Array(Math.ceil((len + 9) / 64) * 64);
  padded.set(msgBytes);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen, false);

  const W = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rr(W[i-15],7) ^ rr(W[i-15],18) ^ (W[i-15]>>>3);
      const s1 = rr(W[i-2],17) ^ rr(W[i-2],19)  ^ (W[i-2]>>>10);
      W[i] = (W[i-16] + s0 + W[i-7] + s1) | 0;
    }
    let a=H0, b=H1, c=H2, d=H3, e=H4, f=H5, g=H6, h=H7;
    for (let i = 0; i < 64; i++) {
      const S1 = rr(e,6) ^ rr(e,11) ^ rr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA256_K[i] + W[i]) | 0;
      const S0 = rr(a,2) ^ rr(a,13) ^ rr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    H0=(H0+a)|0; H1=(H1+b)|0; H2=(H2+c)|0; H3=(H3+d)|0;
    H4=(H4+e)|0; H5=(H5+f)|0; H6=(H6+g)|0; H7=(H7+h)|0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  [H0,H1,H2,H3,H4,H5,H6,H7].forEach((v,i) => odv.setUint32(i*4, v, false));
  return out;
}

// ─── BASE58CHECK (P2PKH + P2SH) ─────────────────────────────────────────────
const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP = new Uint8Array(128).fill(255);
for (let i = 0; i < 58; i++) B58_MAP[B58_ALPHABET.charCodeAt(i)] = i;

function base58Decode(str) {
  let zeros = 0;
  for (let i = 0; i < str.length && str[i] === '1'; i++) zeros++;
  const size = Math.ceil(str.length * 733 / 1000) + 1;
  const buf = new Uint8Array(size);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c >= 128 || B58_MAP[c] === 255) return null;
    let carry = B58_MAP[c];
    for (let j = size - 1; j >= 0; j--) {
      carry += 58 * buf[j];
      buf[j] = carry & 0xff;
      carry >>= 8;
    }
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
  const payload = decoded.slice(0, 21);
  const checksum = decoded.slice(21, 25);
  const hash = sha256(sha256(payload));
  return hash[0]===checksum[0] && hash[1]===checksum[1] &&
         hash[2]===checksum[2] && hash[3]===checksum[3];
}

// ─── BECH32 / BECH32M (SegWit v0 + Taproot) ─────────────────────────────────
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_CONST  = 1;           // BIP173
const BECH32M_CONST = 0x2bc830a3;  // BIP350

function bech32Polymod(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (let i = 0; i < values.length; i++) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[i];
    for (let j = 0; j < 5; j++) {
      if ((top >> j) & 1) chk ^= GEN[j];
    }
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
  const a = lower;
  const pos = a.lastIndexOf("1");
  if (pos < 1 || pos + 7 > a.length || a.length > 90) return null;
  const hrp = a.slice(0, pos);
  const dataStr = a.slice(pos + 1);
  const data = [];
  for (let i = 0; i < dataStr.length; i++) {
    const idx = BECH32_CHARSET.indexOf(dataStr[i]);
    if (idx === -1) return null;
    data.push(idx);
  }
  const expHrp = bech32HrpExpand(hrp);
  const polymod = bech32Polymod(expHrp.concat(data));
  let encoding = null;
  if (polymod === BECH32_CONST)  encoding = "bech32";
  if (polymod === BECH32M_CONST) encoding = "bech32m";
  if (!encoding) return null;
  return { hrp, data: data.slice(0, data.length - 6), encoding };
}

function convertBits(data, fromBits, toBits, pad) {
  let acc = 0, bits = 0;
  const out = [];
  const maxv = (1 << toBits) - 1;
  for (let i = 0; i < data.length; i++) {
    acc = (acc << fromBits) | data[i];
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      out.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) out.push((acc << (toBits - bits)) & maxv);
  } else {
    if (bits >= fromBits) return null;
    if ((acc << (toBits - bits)) & maxv) return null;
  }
  return out;
}

function verifySegwitAddress(addr) {
  const dec = bech32Decode(addr);
  if (!dec || dec.hrp !== "bc") return { ok: false, error: "Invalid bech32 encoding or checksum" };

  const witnessVer = dec.data[0];
  if (witnessVer > 16) return { ok: false, error: "Witness version must be 0–16" };

  const programBits = convertBits(dec.data.slice(1), 5, 8, false);
  if (!programBits || programBits.length < 2 || programBits.length > 40)
    return { ok: false, error: "Invalid witness program length" };

  if (witnessVer === 0) {
    if (dec.encoding !== "bech32")
      return { ok: false, error: "Witness v0 must use bech32 encoding" };
    if (programBits.length !== 20 && programBits.length !== 32)
      return { ok: false, error: "Witness v0 program must be 20 or 32 bytes" };
  } else {
    if (dec.encoding !== "bech32m")
      return { ok: false, error: `Witness v${witnessVer} must use bech32m encoding` };
  }

  return { ok: true };
}


// ─── PUBLIC: validateBtcAddress ──────────────────────────────────────────────
export function validateBtcAddress(addr) {
  if (!addr || !addr.trim()) return { valid: false, error: "Address is required" };
  const a = addr.trim();

  // P2PKH (version 0x00)
  if (a.startsWith("1")) {
    if (a.length < 25 || a.length > 34)
      return { valid: false, error: "P2PKH address must be 25–34 characters" };
    if (!verifyBase58Check(a, 0x00))
      return { valid: false, error: "Invalid P2PKH address (checksum failed)" };
    return { valid: true, error: null };
  }

  // P2SH (version 0x05)
  if (a.startsWith("3")) {
    if (a.length < 25 || a.length > 34)
      return { valid: false, error: "P2SH address must be 25–34 characters" };
    if (!verifyBase58Check(a, 0x05))
      return { valid: false, error: "Invalid P2SH address (checksum failed)" };
    return { valid: true, error: null };
  }

  // bech32 / bech32m (bc1…)
  if (a.toLowerCase().startsWith("bc1")) {
    if (a.toLowerCase() !== a)
      return { valid: false, error: "Bech32 address must be lowercase" };
    const result = verifySegwitAddress(a);
    if (!result.ok)
      return { valid: false, error: result.error };
    return { valid: true, error: null };
  }

  return { valid: false, error: "Address must start with 1, 3, or bc1" };
}


/**
 * IBAN — format check only (no mod-97 checksum)
 *
 * Rules:
 * - 2-letter country code (uppercase)
 * - 2 check digits
 * - Up to 30 alphanumeric characters
 * - Total length: 15–34 (shortest real IBAN is Norway at 15)
 * - Spaces are stripped before validation
 */
const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

export function validateIBAN(raw) {
  if (!raw || !raw.trim()) return { valid: false, error: "IBAN is required" };
  const clean = raw.replace(/\s/g, "").toUpperCase();

  if (clean.length < 15 || clean.length > 34) return { valid: false, error: "IBAN must be 15–34 characters" };
  if (!IBAN_RE.test(clean))                    return { valid: false, error: "Invalid IBAN format (expected: CC00 + alphanumeric)" };

  return { valid: true, error: null };
}


/**
 * Phone number — E.164 format
 *
 * Rules:
 * - Must start with "+"
 * - 7–15 digits after the "+"
 * - Spaces, dashes, and dots are stripped before validation
 *
 * When a payment method provides a country-specific placeholder (e.g. +34 for Bizum),
 * the caller can optionally pass `expectedPrefix` to enforce it.
 */
const DIGITS_ONLY_RE = /^\d{7,15}$/;

export function validatePhone(raw, expectedPrefix) {
  if (!raw || !raw.trim()) return { valid: false, error: "Phone number is required" };
  const clean = raw.replace(/[\s\-().]/g, "");

  if (!clean.startsWith("+")) return { valid: false, error: "Must start with + (international format)" };

  const digits = clean.slice(1);
  if (!DIGITS_ONLY_RE.test(digits)) return { valid: false, error: "Phone number must be 7–15 digits after +" };

  if (expectedPrefix && !clean.startsWith(expectedPrefix)) {
    return { valid: false, error: `Expected country prefix ${expectedPrefix}` };
  }

  return { valid: true, error: null };
}


/**
 * BIP322 signature — base64 format check
 *
 * Full cryptographic verification is server-side.
 * Client-side check: non-empty, valid base64 string.
 */
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export function validateBIP322Signature(raw) {
  if (!raw || !raw.trim()) return { valid: false, error: "Signature is required" };
  const clean = raw.trim();

  if (clean.length < 20)        return { valid: false, error: "Signature too short" };
  if (!BASE64_RE.test(clean))   return { valid: false, error: "Signature must be valid base64" };

  return { valid: true, error: null };
}


/**
 * Custom fee rate — integer ≥ 1 sat/vB
 */
export function validateFeeRate(raw) {
  if (raw === "" || raw === null || raw === undefined) return { valid: false, error: "Fee rate is required" };

  const n = Number(raw);
  if (!Number.isInteger(n))  return { valid: false, error: "Must be a whole number" };
  if (n < 1)                 return { valid: false, error: "Minimum 1 sat/vB" };
  if (n > 150)               return { valid: false, error: "Maximum 150 sat/vB" };

  return { valid: true, error: null };
}


// ─── HELPER: universal onBlur handler factory ─────────────────────────────────
// Usage in React:
//   const [errors, setErrors] = useState({});
//   const handleBlur = makeBlurHandler(setErrors);
//   <input onBlur={() => handleBlur("address", value, validateBtcAddress)} />
//   <FieldError error={errors.address} />

export function makeBlurHandler(setErrors) {
  return (fieldKey, value, validatorFn, ...extraArgs) => {
    const result = validatorFn(value, ...extraArgs);
    setErrors(prev => ({
      ...prev,
      [fieldKey]: result.valid ? null : result.error,
    }));
    return result.valid;
  };
}
