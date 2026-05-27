// ─── SHARED CUSTOM PAYOUT ADDRESS WIZARD ─────────────────────────────────────
// 2-step wizard: enter BTC address → BIP322 signature → save.
// Self-contained component used by Settings (inline) and Offer Creation (modal).
// Props: auth, onClose, onDone(data|null), asModal (boolean).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  fetchSavedCustomPayoutAddress,
  syncCustomPayoutAddressToServer,
} from "../utils/customPayoutAddressSync.js";
import { validateBtcAddress, validateBIP322Signature } from "../peach-validators.js";
import { BITCOIN_NETWORK } from "../utils/network.js";
import { getSigningPeachId } from "../utils/format.js";
import {
  CopyBtn, PrimaryBtn, FieldError, makeBlurHandler,
  IconCopy, IconTrash,
} from "../screens/settings/components.jsx";

const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

function WizardHeader({ title, onBack }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
      <button onClick={onBack} style={{
        display:"flex", alignItems:"center", justifyContent:"center",
        width:34, height:34, borderRadius:8, border:"none",
        background:"transparent", cursor:"pointer", color:"var(--black-65)", flexShrink:0,
      }}
      onMouseEnter={e => e.currentTarget.style.background="var(--black-5)"}
      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
        <IconChevronLeft/>
      </button>
      <h1 style={{ fontSize:"1.3rem", fontWeight:800, color:"var(--black)", letterSpacing:"-0.02em", margin:0 }}>{title}</h1>
    </div>
  );
}

export default function PayoutAddressWizard({ auth, onClose, onDone, asModal = false }) {
  const btcNetwork = BITCOIN_NETWORK;
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [sigCryptoValid, setSigCryptoValid] = useState(null); // null | true | false
  const [verifying, setVerifying] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [removeSuccess, setRemoveSuccess] = useState(false);
  const handleBlur = makeBlurHandler(setErrors);
  const peachId = getSigningPeachId(auth?.peachId);
  const signMessage = `I confirm that only I, ${peachId}, control the address ${address}`;

  const addressValid = address.trim().length > 0
    && validateBtcAddress(address, btcNetwork).valid;

  useEffect(() => {
    if (!auth?.token || !auth?.pgpPrivKey) return;
    let cancelled = false;
    (async () => {
      const saved = await fetchSavedCustomPayoutAddress(auth);
      if (cancelled || !saved) return;
      if (saved.label)           setLabel(saved.label);
      if (saved.address)         setAddress(saved.address);
      if (saved.bip322Signature) setSignature(saved.bip322Signature);
    })();
    return () => { cancelled = true; };
  }, [auth?.token, auth?.pgpPrivKey, auth?.baseUrl, btcNetwork]);

  // Live cryptographic verification of the signature against (address, signMessage).
  // bip322-js is heavy, so dynamic-import it inside the effect — the chunk only
  // loads when the user is actually in the wizard with a pasted signature.
  useEffect(() => {
    const sig = signature.trim();
    if (!sig || !address.trim()) { setSigCryptoValid(null); setVerifying(false); return; }
    const shape = validateBIP322Signature(sig);
    if (!shape.valid) { setSigCryptoValid(null); setVerifying(false); return; }

    let cancelled = false;
    setVerifying(true);
    (async () => {
      try {
        const { isValidBitcoinSignature } = await import("../utils/bitcoinSignatureVerify.js");
        const ok = isValidBitcoinSignature({ message: signMessage, address, signature: sig });
        if (cancelled) return;
        setSigCryptoValid(ok);
        setErrors(p => ({ ...p, sig: ok ? null : "Signature does not match this address and message" }));
      } catch {
        if (cancelled) return;
        setSigCryptoValid(false);
        setErrors(p => ({ ...p, sig: "Could not verify signature" }));
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => { cancelled = true; };
  }, [signature, address, signMessage]);

  function handleAddressBlur() {
    if (!address.trim()) { setErrors(p => ({ ...p, address: null })); return; }
    handleBlur("address", address, validateBtcAddress, btcNetwork);
  }

  async function handleRemove() {
    setErrors(p => ({ ...p, address: null, sig: null }));
    setSubmitting(true);
    try {
      if (auth) {
        const ok = await syncCustomPayoutAddressToServer(
          { address: null, label: null, confirmationPhrase: null, bip322Signature: null },
          auth,
        );
        if (!ok) {
          setErrors(p => ({ ...p, address: "Server error — try again" }));
          setSubmitting(false);
          return;
        }
      }
      setLabel("");
      setAddress("");
      setSignature("");
      if (onDone) onDone(null);
      setRemoveSuccess(true);
      setTimeout(() => setRemoveSuccess(false), 1500);
    } catch {
      setErrors(p => ({ ...p, address: "Network error — check your connection" }));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    const sigCheck = validateBIP322Signature(signature);
    if (!sigCheck.valid) { setErrors(p => ({ ...p, sig: sigCheck.error })); return; }

    setSubmitting(true);
    setErrors(p => ({ ...p, sig: null }));

    try {
      // Final cryptographic guard — protects against the user clicking CONFIRM
      // before the live-verify effect has finished.
      const { isValidBitcoinSignature } = await import("../utils/bitcoinSignatureVerify.js");
      const cryptoValid = isValidBitcoinSignature({
        message: signMessage,
        address,
        signature: signature.trim(),
      });
      if (!cryptoValid) {
        setErrors(p => ({ ...p, sig: "Signature does not match this address and message" }));
        setSigCryptoValid(false);
        setSubmitting(false);
        return;
      }

      if (auth) {
        const ok = await syncCustomPayoutAddressToServer(
          {
            address,
            label: label || null,
            confirmationPhrase: signMessage,
            bip322Signature: signature,
          },
          auth,
        );
        if (!ok) {
          setErrors(p => ({ ...p, sig: "Server error — try again" }));
          setSubmitting(false);
          return;
        }
      } else {
        await new Promise(r => setTimeout(r, 800));
      }
      setSubmitting(false);
      if (onDone) onDone({ address, label: label || null, bip322Signature: signature, confirmationPhrase: signMessage });
      setShowSuccess(true);
    } catch (e) {
      setSubmitting(false);
      setErrors(p => ({ ...p, sig: "Network error — check your connection" }));
    }
  }

  // ── Render helpers ──

  function renderSuccess() {
    return (
      <>
        <WizardHeader title="Custom Payout Address" onBack={onClose}/>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", textAlign:"center" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"var(--success-bg)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize:"1.1rem", fontWeight:800, color:"var(--black)", marginBottom:8 }}>Signature valid</div>
          <div style={{ fontSize:".88rem", color:"var(--black-65)", lineHeight:1.5 }}>Custom payout address added.</div>
          <div style={{ marginTop:32, width:"100%" }}>
            <PrimaryBtn label="DONE" onClick={onClose}/>
          </div>
        </div>
      </>
    );
  }

  function renderStep2() {
    const shapeOk = signature.trim() && validateBIP322Signature(signature).valid;
    const sigValid = shapeOk && sigCryptoValid === true && !errors.sig;
    return (
      <>
        <WizardHeader title="Sign Your Address" onBack={() => setStep(1)}/>
        <p style={{ fontSize:".82rem", color:"var(--black-65)", marginBottom:20, lineHeight:1.6 }}>
          Prove you control this address by signing the message below with its private key, then paste the signature. Use your wallet's "Sign Message" feature.
        </p>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--black)", marginBottom:6 }}>your address</div>
          <div style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid var(--black-10)", background:"var(--black-5)", fontSize:".78rem", fontFamily:"monospace", wordBreak:"break-all", lineHeight:1.5, display:"flex", alignItems:"flex-start", gap:8 }}>
            <span style={{ flex:1 }}>{address}</span>
            <CopyBtn text={address}/>
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--black)", marginBottom:6 }}>message</div>
          <div style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid var(--black-10)", background:"var(--black-5)", fontSize:".76rem", fontFamily:"monospace", wordBreak:"break-all", lineHeight:1.5, display:"flex", alignItems:"flex-start", gap:8 }}>
            <span style={{ flex:1 }}>{signMessage}</span>
            <CopyBtn text={signMessage}/>
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--black)", marginBottom:6 }}>signature</div>
          <div style={{ position:"relative" }}>
            <input value={signature} onChange={e => { setSignature(e.target.value); setSigCryptoValid(null); setErrors(p => ({ ...p, sig: null })); }} onBlur={() => {
              if (!signature.trim()) return;
              const shape = validateBIP322Signature(signature);
              if (!shape.valid) setErrors(p => ({ ...p, sig: shape.error }));
            }} placeholder="signature"
              style={{ width:"100%", padding:"10px 40px 10px 14px", borderRadius:10, border: errors.sig ? "1.5px solid var(--error)" : sigValid ? "1.5px solid var(--primary)" : "1.5px solid var(--black-25)", background:"var(--surface)", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"var(--black)", outline:"none" }}/>
            <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)" }}>
              <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setSignature(t); setSigCryptoValid(null); setErrors(p => ({ ...p, sig: null })); } catch {} }}
                style={{ border:"none", background:"transparent", cursor:"pointer", color:"var(--primary)", padding:4 }}>
                <IconCopy size={16}/>
              </button>
            </div>
          </div>
          <FieldError error={errors.sig}/>
          {sigValid && (
            <div style={{ marginTop:8, fontSize:".8rem", fontWeight:800, color:"var(--success)", letterSpacing:".04em" }}>SIGNATURE VALID ✓</div>
          )}
          {verifying && !errors.sig && (
            <div style={{ marginTop:8, fontSize:".78rem", color:"var(--black-65)" }}>Verifying signature…</div>
          )}
        </div>

        <div style={{ background:"var(--primary-mild)", border:"1.5px solid var(--primary)", borderRadius:10, padding:"12px 14px", marginBottom:24 }}>
          <p style={{ fontSize:".76rem", color:"var(--black-65)", lineHeight:1.5, margin:0 }}>
            <span style={{ fontWeight:800, color:"var(--primary)" }}>Note:</span> Signatures are verified locally in your browser before save.
          </p>
        </div>

        <PrimaryBtn label={submitting ? "SAVING…" : "CONFIRM"} onClick={handleConfirm} disabled={!sigValid || submitting || verifying}/>
      </>
    );
  }

  function renderStep1() {
    return (
      <>
        <WizardHeader title="Custom Payout Address" onBack={onClose}/>
        <p style={{ fontSize:".82rem", color:"var(--black-65)", marginBottom:20, lineHeight:1.6 }}>
          Set an external Bitcoin wallet to automatically receive your sats after each completed trade. You must prove ownership of the address with a BIP322 signature.
        </p>

        <div style={{ fontSize:".75rem", fontWeight:700, color:"var(--black)", marginBottom:8 }}>set custom payout address</div>

        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="address label"
          style={{ width:"100%", padding:"10px 14px", borderRadius:10, marginBottom:10, border:"1.5px solid var(--black-25)", background:"var(--surface)", fontFamily:"'Baloo 2',cursive", fontSize:".85rem", color:"var(--black)", outline:"none" }}/>

        <div style={{ position:"relative", marginBottom: addressValid ? 8 : (errors.address ? 0 : 24) }}>
          <input value={address} onChange={e => { setAddress(e.target.value); setErrors(p => ({ ...p, address: null })); }} onBlur={handleAddressBlur}
            placeholder={btcNetwork === "regtest" ? "bcrt1q …" : "bc1q …"}
            style={{ width:"100%", padding:"10px 72px 10px 14px", borderRadius:10, border: errors.address ? "2px solid var(--error)" : addressValid ? "2px solid var(--primary)" : "1.5px solid var(--black-25)", background:"var(--surface)", fontFamily:"monospace", fontSize:".85rem", color:"var(--black)", outline:"none" }}/>
          <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", display:"flex", gap:4 }}>
            <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setAddress(t); setErrors(p => ({ ...p, address: null })); } catch {} }}
              style={{ border:"none", background:"transparent", cursor:"pointer", color:"var(--primary)", padding:4 }}>
              <IconCopy size={16}/>
            </button>
          </div>
        </div>
        {errors.address && <div style={{ marginBottom:16 }}><FieldError error={errors.address}/></div>}

        {removeSuccess && (
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <span style={{ fontSize:".8rem", fontWeight:800, color:"var(--success)", letterSpacing:".04em" }}>ADDRESS REMOVED ✓</span>
          </div>
        )}

        {addressValid && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginBottom:20 }}>
            <span style={{ fontSize:".8rem", fontWeight:800, color:"var(--success)", letterSpacing:".04em" }}>ADDRESS VALID ✓</span>
            <button onClick={handleRemove} disabled={submitting} style={{ display:"flex", alignItems:"center", gap:5, border:"none", background:"transparent", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.5 : 1, color:"var(--black)", fontFamily:"'Baloo 2',cursive", fontSize:".78rem", fontWeight:700, textDecoration:"underline", textTransform:"uppercase", letterSpacing:".04em" }}>
              {submitting ? "REMOVING…" : <>REMOVE WALLET <IconTrash size={14}/></>}
            </button>
          </div>
        )}

        <PrimaryBtn label="NEXT" onClick={() => setStep(2)} disabled={!addressValid || !!errors.address || submitting}/>
      </>
    );
  }

  // ── Main render ──

  const content = showSuccess ? renderSuccess() : step === 2 ? renderStep2() : renderStep1();

  if (asModal) {
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:700,
        background:"rgba(43,25,17,.55)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{
          background:"var(--surface)", borderRadius:16,
          padding:"28px 24px", maxWidth:480, width:"100%",
          maxHeight:"90vh", overflowY:"auto",
          boxShadow:"0 20px 60px rgba(0,0,0,.25)",
          animation:"modalIn .18s ease",
        }}
        onClick={e => e.stopPropagation()}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
