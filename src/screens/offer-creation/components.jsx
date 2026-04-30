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
} from "../../utils/format.js";

// ─── CONSTANTS (shared with index.jsx) ──────────────────────────────────────

export const CHF_EUR = 0.96; // TODO: fetch live rate from /market/prices
export const LIMIT_EUR = 1000 * CHF_EUR; // ≈ 960 EUR — daily trading limit
export const MIN_SATS = 20_000;
export const maxSatsAtPrice = (price) => Math.floor((LIMIT_EUR / price) * SAT);

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
  btcPrice,
  offerMethods,
  offerCurrencies,
}) {
  const isBuy = type === "buy";
  const prem = parseFloat(form.premium) || 0;
  const effP = btcPrice * (1 + prem / 100);
  const hasAmt = isBuy ? form.amtFixed > 0 : form.amtFixed > 0;
  const hasPay = offerMethods.length > 0;
  const hasPrem = form.premium !== "";
  const empty = !hasAmt && !hasPay && !hasPrem;

  let fiatStr = "—";
  if (hasAmt) {
    fiatStr = `≈ €${fmtEur(satsToFiat(form.amtFixed, effP))}`;
  }
  let premCls = "pt-n";
  const p = parseFloat(form.premium) || 0;
  if (p !== 0)
    premCls = isBuy ? (p < 0 ? "pt-g" : "pt-r") : p > 0 ? "pt-g" : "pt-r";

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
        <div className={`prev-card ${isBuy ? "buy-top" : "sell-top"}`}>
          {/* Row 1: Your offer badge left · Buy/Sell button right */}
          <div className="prev-top">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="prev-avatar">
                PW
                <div className="prev-dot" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: ".76rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span style={{ color: "var(--btc)" }}>★</span>4.7
                  <span
                    style={{
                      fontSize: ".65rem",
                      color: "var(--black-65)",
                      fontWeight: 500,
                      marginLeft: 2,
                    }}
                  >
                    (23)
                  </span>
                </div>
                <div
                  style={{
                    fontSize: ".58rem",
                    fontWeight: 800,
                    color: "var(--primary-dark)",
                    background: "var(--primary-mild)",
                    borderRadius: 999,
                    padding: "1px 6px",
                    marginTop: 2,
                    display: "inline-block",
                  }}
                >
                  Your offer
                </div>
              </div>
            </div>
            <button
              style={{
                padding: "5px 16px",
                borderRadius: 999,
                border: "none",
                fontFamily: "var(--font)",
                fontSize: ".76rem",
                fontWeight: 800,
                cursor: "default",
                background: isBuy ? "var(--error-bg)" : "var(--success-bg)",
                color: isBuy ? "var(--error)" : "var(--success)",
              }}
            >
              {isBuy ? "Sell" : "Buy"}
            </button>
          </div>

          {/* Row 2: left spacer · right = stacked amounts */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "4px 0 8px",
            }}
          >
            <div style={{ flex: 1 }} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
                flexShrink: 0,
              }}
            >
              {hasAmt ? (
                <SatsAmount sats={form.amtFixed} />
              ) : (
                <span
                  style={{
                    color: "var(--black-25)",
                    fontSize: ".9rem",
                    fontWeight: 700,
                  }}
                >
                  —
                </span>
              )}
              {hasAmt && (
                <span
                  style={{
                    fontSize: ".78rem",
                    fontWeight: 600,
                    color: "var(--black-65)",
                  }}
                >
                  {fiatStr}
                </span>
              )}
              {hasPrem && p !== 0 && (
                <span
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 700,
                    color: isBuy
                      ? p < 0
                        ? "var(--success)"
                        : "var(--error)"
                      : p > 0
                        ? "var(--success)"
                        : "var(--error)",
                  }}
                >
                  {p > 0 ? "+" : ""}
                  {p.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Row 3: tags */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
              paddingBottom: 4,
            }}
          >
            {hasPrem && (
              <span className={`pt ${premCls}`}>
                {p === 0 ? "0%" : (p > 0 ? "+" : "") + p.toFixed(1) + "%"}
              </span>
            )}
            {offerMethods.slice(0, 3).map((m) => (
              <span key={m} className="pt pt-m">
                {m}
              </span>
            ))}
            {offerCurrencies.slice(0, 3).map((c) => (
              <span key={c} className="pt pt-c">
                {c}
              </span>
            ))}
            {form.instantMatch && (
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: 999,
                  fontSize: ".6rem",
                  fontWeight: 800,
                  background: "var(--grad)",
                  color: "white",
                  border: "none",
                }}
              >
                ⚡ Instant Trade
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AMOUNT SLIDER (unified buy + sell) ─────────────────────────────────────

export function AmountSlider({ form, setF, btcPrice }) {
  const maxSats = maxSatsAtPrice(btcPrice);
  const val = form.amtFixed || MIN_SATS;
  const pct = ((val - MIN_SATS) / (maxSats - MIN_SATS)) * 100;

  const currentFiat = satsToFiat(val, btcPrice);
  const pctOfLimit = currentFiat / LIMIT_EUR;
  const nearLimit = pctOfLimit >= 0.9;

  const pctRiseToLimit = nearLimit ? (LIMIT_EUR / currentFiat - 1) * 100 : null;

  const barColor = pctOfLimit < 0.9 ? "var(--success)" : "var(--warning)";

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
    if (!isNaN(n) && n >= MIN_SATS && n <= maxSats) {
      setF("amtFixed", n);
    }
  }

  function handleBlur() {
    setFocused(false);
    let n = parseInt(inputVal, 10);
    if (isNaN(n) || n < MIN_SATS) n = MIN_SATS;
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
          <span className="amt-pill-fiat">≈ €{fmtEur(currentFiat)}</span>
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
          min={MIN_SATS}
          max={maxSats}
          step={1}
          value={val}
          onChange={(e) => setF("amtFixed", +e.target.value)}
        />
      </div>

      {/* Labels */}
      <div className="amt-labels">
        <span>{fmt(MIN_SATS)} sats</span>
        <span style={{ color: "var(--black-25)" }}>≤ 1 000 CHF limit</span>
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
            €{Math.round(currentFiat).toLocaleString()} / €
            {Math.round(LIMIT_EUR).toLocaleString()}
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

      {/* Near-limit warning */}
      {nearLimit && (
        <div className="limit-warn">
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
          <span>
            Careful — this offer will be withdrawn from the market if the
            Bitcoin price rises by <strong>{pctRiseToLimit.toFixed(1)}%</strong>
            .
          </span>
        </div>
      )}
    </>
  );
}

// ─── MULTI-OFFER CONTROL ────────────────────────────────────────────────────

export function MultiOfferControl({ enabled, count, onToggle, onCountChange }) {
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
}) {
  const [copiedKey, setCopiedKey] = useState(null); // "addr-0", "uri-2", etc.
  const [taskState, setTaskState] = useState({}); // offerId → 'sending' | 'sent' | 'failed'
  const [qrWithAmount, setQrWithAmount] = useState(true);

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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          paddingTop: 32,
          textAlign: "center",
          animation: "stepFwd .4s ease both",
        }}
      >
        <div className="success-icon">✓</div>
        <div
          style={{
            fontSize: "1.4rem",
            fontWeight: 800,
            color: "var(--success)",
          }}
        >
          All {validResults.length} offers are live!
        </div>
        <p
          style={{
            fontSize: ".88rem",
            color: "var(--black-65)",
            lineHeight: 1.65,
            maxWidth: 340,
          }}
        >
          Your {validResults.length} sell offers for{" "}
          <strong style={{ color: "var(--black)" }}>
            {fmt(amtFixed)} sats
          </strong>{" "}
          each are now visible in the market.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate("/market")}
            style={{
              padding: "10px 28px",
              borderRadius: 999,
              border: "1.5px solid var(--black-10)",
              background: "transparent",
              color: "var(--black-65)",
              cursor: "pointer",
              fontFamily: "var(--font)",
              fontSize: ".88rem",
              fontWeight: 700,
            }}
          >
            View in market
          </button>
          <button
            onClick={reset}
            style={{
              padding: "10px 28px",
              borderRadius: 999,
              background: "var(--grad)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font)",
              fontSize: ".88rem",
              fontWeight: 800,
              boxShadow: "0 2px 12px rgba(245,101,34,.3)",
            }}
          >
            Create another offer
          </button>
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
        <button
          className={`btn-send-mobile${!pendingTargets.length && !anySending ? " sent" : ""}`}
          onClick={handleSendToMobile}
          disabled={anySending || !pendingTargets.length}
        >
          {anySending
            ? "Sending…"
            : !pendingTargets.length
              ? "✓ Sent to mobile"
              : anyFailed
                ? "Retry failed"
                : "Send to mobile and fund all"}
        </button>
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
