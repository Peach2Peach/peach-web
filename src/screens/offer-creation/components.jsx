// ─── OFFER CREATION — SUB-COMPONENTS ────────────────────────────────────────
// Extracted from peach-offer-creation.jsx
// Contains: getSteps, LivePreview, AmountSlider (merged Buy+Sell), PMModal
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { SatsAmount, IcoBtc } from "../../components/BitcoinAmount.jsx";
import { QRCodeSVG } from "qrcode.react";
import {
  SAT,
  fmt,
  satsToFiatRaw as satsToFiat,
  fmtFiat as fmtEur,
  formatTradeId,
  toPeaches,
  BTC_PRICE_FALLBACK,
} from "../../utils/format.js";
import { IS_PHONE, buildMobileActionDeepLink } from "../../utils/mobileAction.js";
import { PhoneIcon } from "../../components/MobilePendingButton.jsx";
import { InfoDot, BadgesInfoPopup } from "../../components/InfoPopup.jsx";
import { getTopbarPeachId } from "../../components/Navbars.jsx";
import Avatar from "../../components/Avatar.jsx";
import PeachRating from "../../components/PeachRating.jsx";
import { methodDisplayName } from "../../data/paymentMethodMeta.js";
import { useCurrency } from "../../components/AppLayout.jsx";

export const CURRENCY_SYMBOL = {
  EUR: "€", GBP: "£", USD: "$", CHF: "CHF", JPY: "¥", SEK: "kr", NOK: "kr", DKK: "kr",
};
export function currSym(c) { return CURRENCY_SYMBOL[c] || c; }
function stripPmIndex(id) { return String(id || "").replace(/[-_]\d+$/, ""); }

// ─── CONSTANTS (shared with index.jsx) ──────────────────────────────────────

// Offer amounts are bounded by a fixed CHF band (regulatory, denominated in
// CHF). Both ends are derived live from the BTC/CHF market price and rounded
// *inward* to the nearest sat — the floor ceils up, the cap floors down —
// so the realised range never falls outside [MIN_CHF, MAX_CHF]. The cap in any
// other currency is derived from /market/prices (CHF → target).
export const MIN_CHF = 10;
export const MAX_CHF = 800;
export const SATS_STEP = 1;
// The minimum is rounded up to the nearest 10k sats, then clamped to the hard
// 20 000-sat floor the server enforces regardless of the CHF band, so the live
// floor can never dip under a value the server would reject.
export const MIN_SATS_STEP = 10_000;
export const SERVER_MIN_SATS = 20_000;
// Falls back to BTC_PRICE_FALLBACK (EUR-like, within ~5% of CHF) during the
// brief window before /market/prices resolves, so the slider and form
// validation stay usable on first render.
export const minSatsAtLimit = (chfPrice) =>
  Math.max(
    SERVER_MIN_SATS,
    Math.ceil((MIN_CHF / (chfPrice || BTC_PRICE_FALLBACK)) * SAT / MIN_SATS_STEP) * MIN_SATS_STEP,
  );
export const maxSatsAtLimit = (chfPrice) =>
  Math.floor((MAX_CHF / (chfPrice || BTC_PRICE_FALLBACK)) * SAT / SATS_STEP) * SATS_STEP;
export const limitInCurrency = (allPrices, currency) => {
  const chf = allPrices?.CHF;
  const target = allPrices?.[currency];
  if (!chf || !target) return null;
  return MAX_CHF * (target / chf);
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

// Steps: 0 = Configure, 1 = Review, 2 = Escrow (sell only)
export function getSteps(type) {
  return type === "sell"
    ? ["Configure", "Review", "Escrow"]
    : ["Configure", "Review"];
}

// ─── LIVE PREVIEW ───────────────────────────────────────────────────────────

export function LivePreview({
  type,
  form,
  offerMethods,
  offerCurrencies,
  activeCurrency,
  activeBtcPrice,
}) {
  // Preview reflects the offer's own denomination — follow the picked currency
  // when provided (driven by the currency pills under Payment methods), else
  // fall back to the first PM currency.
  const { allPrices } = useCurrency();
  const previewCurrency = activeCurrency ?? offerCurrencies[0] ?? "EUR";
  const previewBtcPrice = activeBtcPrice ?? allPrices?.[previewCurrency] ?? 0;

  const isSell = type === "sell";
  const p = parseFloat(form.premium) || 0;
  const effP = previewBtcPrice * (1 + p / 100);
  const hasAmt = form.amtFixed > 0;
  const hasPay = offerMethods.length > 0;
  const hasPrem = form.premium !== "";
  const empty = !hasAmt && !hasPay && !hasPrem;

  const peachId = getTopbarPeachId() || "PEACH00000000";
  const auth = typeof window !== "undefined" ? window.__PEACH_AUTH__ : null;
  const profile = auth?.profile || null;
  const userPubKey = auth?.peachId || profile?.publicKey || "";
  const userTrades = profile?.trades ?? 0;
  const userRep = profile?.rating != null ? toPeaches(profile.rating) : 0;
  const userBadges = profile?.medals ?? profile?.badges ?? [];

  const sym = currSym(previewCurrency);
  const rate = Math.round(effP);
  const rateStr = `${rate.toLocaleString("fr-FR")} ${sym}`;
  const fiatVal = hasAmt ? `${sym}${fmtEur(satsToFiat(form.amtFixed, effP))}` : "—";

  // Premium color: seller perspective → high premium = good (green)
  const premCls = p === 0 ? "prem-zero" : isSell ? (p > 0 ? "prem-good" : "prem-bad") : (p < 0 ? "prem-good" : "prem-bad");

  const showOfferBadges = form.instantMatch || form.experienceLevel;
  const [badgesHelpOpen, setBadgesHelpOpen] = useState(false);

  return (
    <div>
      <div className="preview-label">Market preview</div>
      {empty ? (
        <div className="placeholder">
          <div style={{ fontSize: "1.8rem", opacity: 0.3 }}>🍑</div>
          <div style={{ fontSize: ".72rem", fontWeight: 600 }}>
            Fill in the form to preview
            <br />
            your offer
          </div>
        </div>
      ) : (
        <div className="offer-card">
          {/* Row 1: PeachID */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span className="user-peach-id">{peachId}</span>
          </div>

          {/* Row 2: avatar + rating + trades + user badges | instant-trade / experience badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar peachId={userPubKey} size={32} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <PeachRating rep={userRep} size={14} trades={userTrades} />
              {userTrades > 0 && <span className="rep-trades">({userTrades})</span>}
              {userBadges.includes("supertrader") && <span className="badge badge-super" style={{cursor:"pointer"}} onClick={() => setBadgesHelpOpen(true)}>🏆</span>}
              {userBadges.includes("fast") && <span className="badge badge-fast" style={{cursor:"pointer"}} onClick={() => setBadgesHelpOpen(true)}>⚡</span>}
            </div>
            {showOfferBadges && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <div className="action-cell-badges">
                  {form.instantMatch && <span className="auto-badge">⚡ Instant Trade</span>}
                  {form.experienceLevel === "experiencedUsersOnly" && <span className="exp-badge">👤 Experienced only</span>}
                  {form.experienceLevel === "newUsersOnly" && <span className="exp-badge">🆕 New users</span>}
                </div>
              </div>
            )}
          </div>

          {/* Row 3: rate (left) · sats amount (right) */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: ".9rem", fontWeight: 800, color: "var(--black)" }}>{rateStr}</span>
            {hasAmt
              ? <SatsAmount sats={form.amtFixed} />
              : <span style={{ color: "var(--black-25)", fontSize: ".9rem", fontWeight: 700 }}>—</span>}
          </div>

          {/* Row 4: premium (left) · fiat (right) */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span className={premCls} style={{ fontSize: ".9rem" }}>
              {p > 0 ? "+" : ""}{p.toFixed(2)}%
            </span>
            <span style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--black)" }}>{fiatVal}</span>
          </div>

          {/* Row 5: method + currency chips */}
          {(offerMethods.length > 0 || offerCurrencies.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {offerMethods.map((m) => (
                <span key={m} className="method-chip">{methodDisplayName(stripPmIndex(m))}</span>
              ))}
              {offerCurrencies.map((c) => (
                <span key={c} className="currency-chip">{c}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {badgesHelpOpen && <BadgesInfoPopup onClose={() => setBadgesHelpOpen(false)} />}
    </div>
  );
}

// ─── AMOUNT SLIDER (unified buy + sell) ─────────────────────────────────────

export function AmountSlider({ form, setF, btcPrice, activeCurrency, activeBtcPrice }) {
  // Limit math is sats-based and currency-independent (anchored to CHF live).
  // Display values follow the offer's picked currency when provided, otherwise
  // fall back to the topbar's selectedCurrency.
  const { allPrices, selectedCurrency } = useCurrency();
  const displayCurrency = activeCurrency ?? selectedCurrency;
  const displayBtcPrice = activeBtcPrice ?? btcPrice;
  const minSats = minSatsAtLimit(allPrices?.CHF);
  const maxSats = maxSatsAtLimit(allPrices?.CHF);
  const val = form.amtFixed || minSats;
  const span = Math.max(1, maxSats - minSats);
  const pct = ((val - minSats) / span) * 100;

  const currentFiat = satsToFiat(val, displayBtcPrice);
  const pctOfLimit = maxSats ? val / maxSats : 0;

  const barColor = pctOfLimit < 0.9 ? "var(--success)" : "var(--warning)";

  const sym = currSym(displayCurrency);
  const limitInSel = limitInCurrency(allPrices, displayCurrency);

  // Editable sats input state
  const [inputVal, setInputVal] = useState(String(val));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // Sync display when value changes externally (slider drag)
  useEffect(() => {
    if (!focused) setInputVal(String(val));
  }, [val, focused]);

  // Peach-format parts — computed from live input when typing, committed val otherwise
  const displayNum = focused ? parseInt(inputVal, 10) || 0 : val;
  const satsStr = val.toLocaleString("fr-FR");
  const liveDigits = Math.max(1, displayNum.toString().length);
  const greyPart = "0," + "0".repeat(Math.max(0, 8 - liveDigits));

  function handleInputChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setInputVal(raw);
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= minSats && n <= maxSats) {
      setF("amtFixed", n);
    }
  }

  function handleBlur() {
    setFocused(false);
    let n = parseInt(inputVal, 10);
    if (isNaN(n) || n < minSats) n = minSats;
    if (n > maxSats) n = maxSats;
    setInputVal(String(n));
    setF("amtFixed", n);
  }

  return (
    <>
      {/* Editable sats pill + fiat pill */}
      <div className="amt-pills">
        <div
          className={`amt-pill sats-pill${focused ? " focused" : ""}`}
          onClick={() => {
            if (!focused) {
              setInputVal(String(val));
              setFocused(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
        >
          <IcoBtc size={15} />
          <span className="amt-pill-grey">{greyPart}</span>
          {focused ? (
            <input
              ref={inputRef}
              className="amt-pill-input"
              type="text"
              inputMode="numeric"
              autoFocus
              value={inputVal}
              style={{ width: `${Math.max(inputVal.length, 1)}ch` }}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.target.blur();
              }}
            />
          ) : (
            <span className="amt-pill-black">{satsStr}</span>
          )}
          <span className="amt-pill-black">Sats</span>
        </div>
        <div className="amt-pill fiat-pill">
          <span className="amt-pill-fiat">≈ {sym}{fmtEur(currentFiat)}</span>
        </div>
      </div>

      {/* Slider */}
      <div className="amt-slider-wrap">
        <div className="amt-slider-track" />
        <div
          className="amt-slider-fill"
          style={{ left: 0, right: `${100 - pct}%` }}
        />
        <input
          type="range"
          className="amt-slider"
          min={minSats}
          max={maxSats}
          step={SATS_STEP}
          value={val}
          onChange={(e) => setF("amtFixed", +e.target.value)}
        />
      </div>

      {/* Labels */}
      <div className="amt-labels">
        <span>{fmt(minSats)} sats</span>
        <span style={{ color: "var(--black-25)" }}>{MIN_CHF}–{MAX_CHF} CHF band</span>
        <span>{fmt(maxSats)} sats</span>
      </div>

      {/* Limit bar */}
      <div className="limit-bar-wrap">
        <div className="limit-bar-label">
          <span>Daily limit usage</span>
          <span
            style={{
              color: pctOfLimit >= 0.9 ? "var(--warning)" : "var(--black-65)",
            }}
          >
            {sym}{Math.round(currentFiat).toLocaleString()} / {sym}
            {limitInSel != null ? Math.round(limitInSel).toLocaleString() : "—"}
          </span>
        </div>
        <div className="limit-bar-track">
          <div
            className="limit-bar-fill"
            style={{
              width: `${Math.min(pctOfLimit * 100, 100)}%`,
              background: barColor,
            }}
          />
        </div>
      </div>
    </>
  );
}

// ─── MULTI-OFFER CONTROL ────────────────────────────────────────────────────

export function MultiOfferControl({ enabled, count, onToggle, onCountChange, onInfoClick }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div className="check-row" onClick={onToggle}>
        <div
          className="check-box"
          style={{
            border: `2px solid ${enabled ? "var(--primary)" : "var(--black-10)"}`,
            background: enabled ? "var(--primary-mild)" : "var(--surface)",
          }}
        >
          {enabled && "✓"}
        </div>
        <div>
          <div style={{ fontSize: ".8rem", fontWeight: 700 }}>
            Create multiple offers
            {onInfoClick && (
              <InfoDot ariaLabel="About multiple offers" onClick={onInfoClick}/>
            )}
          </div>
          <div
            style={{
              fontSize: ".7rem",
              color: "var(--black-65)",
              fontWeight: 500,
            }}
          >
            Publish identical copies of this offer
          </div>
        </div>
      </div>
      {enabled && (
        <div className="multi-counter" style={{ marginLeft: 32, marginTop: 8 }}>
          <button
            className="multi-counter-btn"
            disabled={count <= 2}
            onClick={(e) => {
              e.stopPropagation();
              onCountChange(Math.max(2, count - 1));
            }}
          >
            −
          </button>
          <span className="multi-counter-val">×{count}</span>
          <button
            className="multi-counter-btn"
            disabled={count >= 10}
            onClick={(e) => {
              e.stopPropagation();
              onCountChange(Math.min(10, count + 1));
            }}
          >
            +
          </button>
          <span
            style={{
              fontSize: ".7rem",
              color: "var(--black-65)",
              fontWeight: 500,
              marginLeft: 10,
            }}
          >
            All {count} copies will be identical
          </span>
        </div>
      )}
    </div>
  );
}

// ─── MULTI-ESCROW FUNDING ──────────────────────────────────────────────────

export function MultiEscrowFunding({
  results,
  selectedIdx,
  onSelectIdx,
  amtFixed,
  effP,
  post,
  navigate,
  reset,
  allFunded,
  activeCurrency,
}) {
  const [copiedKey, setCopiedKey] = useState(null); // "addr-0", "uri-2", etc.
  const [taskState, setTaskState] = useState({}); // offerId → 'sending' | 'sent' | 'failed'
  const [qrWithAmount, setQrWithAmount] = useState(true);
  const { selectedCurrency } = useCurrency();
  const displayCurrency = activeCurrency ?? selectedCurrency;

  const validResults = results.filter(
    (r) => r.status !== "failed" && r.escrowAddress,
  );
  const selected = validResults[selectedIdx] || validResults[0];

  function isDispatchable(r) {
    return (
      r.offerId &&
      r.fundingStatus !== "FUNDED" &&
      r.fundingStatus !== "MEMPOOL" &&
      taskState[r.offerId] !== "sending" &&
      taskState[r.offerId] !== "sent"
    );
  }
  const pendingTargets = validResults.filter(isDispatchable);
  const anySending = Object.values(taskState).includes("sending");
  const anyFailed = Object.values(taskState).includes("failed");

  function copyAddr(addr, idx) {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedKey(`addr-${idx}`);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function copyWithAmount(addr, idx) {
    const uri = `bitcoin:${addr}?amount=${(amtFixed / 1e8).toFixed(8)}`;
    navigator.clipboard.writeText(uri).catch(() => {});
    setCopiedKey(`uri-${idx}`);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleSendToMobile() {
    const targets = validResults.filter(isDispatchable);
    if (!targets.length) return;

    const offerIds = targets.map((r) => r.offerId);

    setTaskState((prev) => {
      const next = { ...prev };
      offerIds.forEach((id) => {
        next[id] = "sending";
      });
      return next;
    });

    try {
      const res = await post("/offer/fundMultipleEscrowPendingAction", {
        offerIds,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
      }
      setTaskState((prev) => {
        const next = { ...prev };
        offerIds.forEach((id) => {
          next[id] = "sent";
        });
        return next;
      });
    } catch (e) {
      console.error(`[MultiEscrow] fundMultipleEscrowPendingAction failed:`, e);
      setTaskState((prev) => {
        const next = { ...prev };
        offerIds.forEach((id) => {
          next[id] = "failed";
        });
        return next;
      });
    }
  }

  function statusClass(r) {
    if (r.fundingStatus === "FUNDED") return "funded";
    if (r.fundingStatus === "MEMPOOL") return "mempool";
    if (r.status === "failed") return "error";
    return "waiting";
  }

  function statusLabel(r) {
    if (r.fundingStatus === "FUNDED") return "Funded";
    if (r.fundingStatus === "MEMPOOL") return "Mempool";
    if (r.status === "failed") return "Failed";
    return "Waiting";
  }

  // ── ALL FUNDED SUCCESS ──
  if (allFunded) {
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        gap:16,paddingTop:48,textAlign:"center",animation:"stepFwd .4s ease both"}}>
        <div className="success-icon">✓</div>
        <div style={{fontSize:"1.2rem",fontWeight:800,color:"var(--success)"}}>
          All {validResults.length} offers published
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          fontSize: ".84rem",
          color: "var(--black-65)",
          fontWeight: 500,
          lineHeight: 1.6,
          marginBottom: 20,
        }}
      >
        Fund {validResults.length} escrow addresses to activate your offers. You
        can fund them all in a single transaction with multiple outputs.
      </div>

      {/* ── PERSISTENT QR CODE ── */}
      {selected && (
        <div className="multi-escrow-qr">
          <div style={{textAlign:"center",marginBottom:14}}>
            <label className="field-label" style={{marginBottom:6,display:"block"}}>Amount to send</label>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
              <SatsAmount sats={amtFixed} fontSize="1.6rem"/>
              <span style={{fontSize:".88rem",color:"var(--black-65)",fontWeight:600}}>
                ≈ {currSym(displayCurrency)}{fmtEur(satsToFiat(amtFixed,effP))}
              </span>
            </div>
          </div>
          <div
            style={{
              padding: 12,
              background: "white",
              borderRadius: 12,
              border: "1px solid var(--black-10)",
              display: "inline-block",
            }}
          >
            {selected.fundingStatus === "MEMPOOL" ||
            selected.fundingStatus === "FUNDED" ? (
              <div
                style={{
                  width: 140,
                  height: 140,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    background: "var(--success)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "2.4rem",
                    fontWeight: 800,
                    boxShadow: "0 8px 32px rgba(101,165,25,.3)",
                  }}
                >
                  ✓
                </div>
              </div>
            ) : (
              <QRCodeSVG
                value={
                  qrWithAmount
                    ? `bitcoin:${selected.escrowAddress}?amount=${(amtFixed / 1e8).toFixed(8)}`
                    : selected.escrowAddress
                }
                size={140}
                level="L"
                bgColor="#ffffff"
                fgColor="#2B1911"
              />
            )}
          </div>
          {selected.fundingStatus !== "MEMPOOL" &&
            selected.fundingStatus !== "FUNDED" && (
              <>
                {/* Address only / Address + amount toggle */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0,
                      background: "var(--black-5)",
                      borderRadius: 999,
                      padding: 3,
                      fontSize: ".72rem",
                      fontWeight: 700,
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        border: "none",
                        borderRadius: 999,
                        padding: "4px 14px",
                        cursor: "pointer",
                        fontFamily: "Baloo 2, cursive",
                        fontSize: ".72rem",
                        fontWeight: 700,
                        background: !qrWithAmount ? "white" : "transparent",
                        color: !qrWithAmount ? "#2B1911" : "var(--black-65)",
                        boxShadow: !qrWithAmount
                          ? "0 1px 3px rgba(0,0,0,.1)"
                          : "none",
                        transition: "all .15s",
                      }}
                      onClick={() => setQrWithAmount(false)}
                    >
                      Address only
                    </button>
                    <button
                      type="button"
                      style={{
                        border: "none",
                        borderRadius: 999,
                        padding: "4px 14px",
                        cursor: "pointer",
                        fontFamily: "Baloo 2, cursive",
                        fontSize: ".72rem",
                        fontWeight: 700,
                        background: qrWithAmount ? "white" : "transparent",
                        color: qrWithAmount ? "#2B1911" : "var(--black-65)",
                        boxShadow: qrWithAmount
                          ? "0 1px 3px rgba(0,0,0,.1)"
                          : "none",
                        transition: "all .15s",
                      }}
                      onClick={() => setQrWithAmount(true)}
                    >
                      Address + amount
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: ".68rem",
                    color: "var(--black-65)",
                    textAlign: "center",
                    lineHeight: 1.5,
                    marginTop: 6,
                  }}
                >
                  {qrWithAmount
                    ? "QR includes amount — most wallets will fill it in automatically"
                    : "QR contains address only — enter the amount manually in your wallet"}
                </div>
              </>
            )}
          <div className="multi-escrow-qr-label">
            Address {selectedIdx + 1} of {validResults.length}
          </div>
        </div>
      )}

      {/* ── ADDRESS LIST ── */}
      <div className="multi-escrow-list">
        {validResults.map((r, i) => {
          const isSel = i === selectedIdx;
          const isFunded = r.fundingStatus === "FUNDED";
          return (
            <div
              key={r.offerId || i}
              className={`multi-escrow-row${isSel ? " selected" : ""}${isFunded ? " funded" : ""}`}
              onClick={() => onSelectIdx(i)}
            >
              <div className="multi-escrow-radio" />
              <span className="multi-escrow-id">
                {formatTradeId(r.offerId, "offer")}
              </span>
              <div className="multi-escrow-addr">{r.escrowAddress || "—"}</div>
              <div className="multi-escrow-actions">
                <button
                  className="multi-escrow-copy-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyAddr(r.escrowAddress, i);
                  }}
                >
                  {copiedKey === `addr-${i}` ? "✓" : "Copy"}
                </button>
                <button
                  className="multi-escrow-copy-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyWithAmount(r.escrowAddress, i);
                  }}
                >
                  {copiedKey === `uri-${i}` ? "✓" : "Copy address + amount"}
                </button>
              </div>
              {taskState[r.offerId] && (
                <span
                  style={{
                    fontSize: ".68rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    marginRight: 4,
                    color:
                      taskState[r.offerId] === "sent"
                        ? "var(--success)"
                        : taskState[r.offerId] === "failed"
                          ? "var(--error)"
                          : "var(--black-65)",
                  }}
                >
                  {taskState[r.offerId] === "sending"
                    ? "📱…"
                    : taskState[r.offerId] === "sent"
                      ? "📱 sent"
                      : "📱 failed"}
                </span>
              )}
              <span className={`multi-escrow-status ${statusClass(r)}`}>
                {statusLabel(r)}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── SEND TO MOBILE ── */}

      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        {IS_PHONE && !pendingTargets.length && !anySending ? (
          <a
            className="btn-send-mobile"
            href={buildMobileActionDeepLink("fundEscrowMultiple")}
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <PhoneIcon />
            Open Peach App
          </a>
        ) : (
          <button
            className={`btn-send-mobile${!pendingTargets.length && !anySending ? " sent" : ""}`}
            onClick={handleSendToMobile}
            disabled={anySending || !pendingTargets.length}
          >
            {anySending ? (
              "Sending…"
            ) : !pendingTargets.length ? (
              <>
                <PhoneIcon />
                ✓ Sent to mobile
              </>
            ) : anyFailed ? (
              "Retry failed"
            ) : (
              "Send to mobile and fund all"
            )}
          </button>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
        <button
          className="btn-save-fund-later"
          onClick={() =>
            navigate("/trades", { state: { tab: "pending", refresh: true } })
          }
        >
          save and fund later
        </button>
      </div>
    </>
  );
}

export function ReviewPills({ form, multiEnabled, multiCount }) {
  const pills = [
    { label: "⚡ Instant Trade", active: form.instantMatch },
    { label: "No New Users", active: form.noNewUsers },
    { label: "Min Rep 4.5", active: form.minReputation },
    { label: "Fast Trader", active: form.instantMatchBadges.includes("fastTrader") },
    { label: "Super Trader", active: form.instantMatchBadges.includes("superTrader") },
    { label: form.experienceLevel === "newUsersOnly" ? "New Users Only"
            : form.experienceLevel === "experiencedUsersOnly" ? "Experienced Only"
            : "Experience Filter",
      active: !!form.experienceLevel },
    { label: `×${multiCount} Copies`, active: multiEnabled },
  ];
  return (
    <div style={{marginTop:12,maxWidth:480,marginLeft:"auto",marginRight:"auto"}}>
      <div style={{fontSize:".72rem",fontWeight:700,color:"var(--black-65)",
        textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>
        Advanced options
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {pills.map(({ label, active }) => (
          <span key={label} className={`review-pill ${active ? "active" : "inactive"}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
