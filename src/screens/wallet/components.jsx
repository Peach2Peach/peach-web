import { QRCodeSVG } from "qrcode.react";
import { SatsAmount } from "../../components/BitcoinAmount.jsx";

// ── Icons ────────────────────────────────────────────────────────────────────
export const IconWallet = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2z"/>
    <path d="M3 7a2 2 0 0 1 2-2h11"/>
    <circle cx="17" cy="13" r="1.2" fill="currentColor"/>
  </svg>
);

export const IconRefresh = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M3 21v-5h5"/>
  </svg>
);

export const IconCopy = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="11" height="11" rx="2"/>
    <path d="M5 15V6a2 2 0 0 1 2-2h9"/>
  </svg>
);

export const IconQR = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <path d="M14 14h3v3M20 14v3M14 20h3M20 20h.01"/>
  </svg>
);

export const IconExternal = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4h6v6"/>
    <path d="M20 4 10 14"/>
    <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>
  </svg>
);

// Watch-only indicator next to the page title — muted grey eye.
export const IconWatchEye = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--black-65)"
    stroke="var(--black-65)" strokeWidth="1.6" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
    <circle cx="12" cy="12" r="3" fill="var(--surface)" stroke="var(--surface)"/>
    <circle cx="12" cy="12" r="1.4" fill="var(--black)" stroke="none"/>
  </svg>
);

// Info button next to the page title — opens the privacy disclosure.
export const IconHelp = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.5"/>
    <path d="M9.5 9.2a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6"/>
    <circle cx="12" cy="16.5" r="0.6" fill="#3b82f6" stroke="none"/>
  </svg>
);

// ── Format helpers ───────────────────────────────────────────────────────────
function truncMiddle(s, head = 10, tail = 8) {
  if (!s || s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function relTime(unixSeconds) {
  if (!unixSeconds) return "just now";
  const diff = Math.max(0, Date.now() / 1000 - unixSeconds);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Explorer base URL for tx/address links. Mirrors the pattern from
// MatchesPopup.jsx — bcrt → Peach electrum web view; mainnet → mempool.space.
function explorerBase(net) {
  if (net === "regtest") return "https://electrum-regtest.peachbitcoin.com";
  if (net === "testnet") return "https://mempool.space/testnet";
  return "https://mempool.space";
}

export function txExplorerUrl(txid, net) {
  return `${explorerBase(net)}/tx/${txid}`;
}

export function addressExplorerUrl(addr, net) {
  return `${explorerBase(net)}/address/${addr}`;
}

// ── Privacy banner ───────────────────────────────────────────────────────────
// One-shot disclosure about server-side address queries. Dismissal persists in
// localStorage so it doesn't reappear after logout or session expiry. Copy is
// verbatim — do not edit without owner sign-off.
const PRIVACY_DISMISSED_KEY = "peach_wallet_privacy_dismissed_v1";

export function isPrivacyBannerDismissed() {
  try {
    return localStorage.getItem(PRIVACY_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function PrivacyBanner({ onDismiss }) {
  function handleDismiss() {
    try { localStorage.setItem(PRIVACY_DISMISSED_KEY, "1"); } catch {}
    onDismiss?.();
  }
  return (
    <div className="w-privacy" role="status">
      <span className="w-privacy-icon">🔒</span>
      <div className="w-privacy-body">
        <div className="w-privacy-title">This is a Watch-only Wallet</div>
        <div className="w-privacy-text">
          Your addresses are queried to show your balance and history. Your private keys never leave your phone. You will need to confirm spending transactions in your mobile. 
        </div>
      </div>
      <button type="button" className="w-privacy-close" onClick={handleDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

// ── Copy-to-clipboard ───────────────────────────────────────────────────────
export function CopyButton({ text, label = "Copy address" }) {
  function onClick() {
    try {
      navigator.clipboard?.writeText(text);
    } catch {
      // Best-effort — old browsers without the Clipboard API just no-op.
    }
  }
  return (
    <button type="button" className="w-icon-btn" onClick={onClick} title={label} aria-label={label}>
      <IconCopy/>
    </button>
  );
}

// ── QR popup ────────────────────────────────────────────────────────────────
export function QRPopup({ address, onClose }) {
  return (
    <div className="w-qr-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-qr-card" onClick={(e) => e.stopPropagation()}>
        <div className="w-qr-frame">
          <QRCodeSVG value={address} size={220} level="M" fgColor="#2B1911" bgColor="#ffffff"/>
        </div>
        <div className="w-qr-addr">{address}</div>
        <button className="w-qr-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ── Balance hero ─────────────────────────────────────────────────────────────
export function BalanceHero({
  balance, fiatRate, fiatCurrency, scannedAt,
  isScanning, isQuickSyncing,
  onQuickRefresh, onFullRefresh,
}) {
  const sats = balance?.confirmed ?? 0;
  const pending = balance?.pending ?? 0;
  const fiat =
    fiatRate && sats > 0
      ? ((sats / 100_000_000) * fiatRate).toLocaleString("fr-FR", {
          maximumFractionDigits: 2,
        })
      : null;
  const busy = isScanning || isQuickSyncing;

  return (
    <div className="w-hero">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="w-hero-label">Balance</div>
          <div className="w-hero-amount">
            <SatsAmount sats={sats} size="lg"/>
          </div>
          {fiat && (
            <div className="w-hero-fiat">≈ {fiat} {fiatCurrency}</div>
          )}
          {pending > 0 && (
            <div className="w-hero-pending">
              <span className="w-hero-pending-label">+ pending:</span>
              <SatsAmount sats={pending} size="sm"/>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <button className="w-refresh" onClick={onQuickRefresh} disabled={busy} title="Quick refresh — check for new activity">
            <span className={"w-refresh-icon" + (isQuickSyncing ? " spinning" : "")}>
              <IconRefresh/>
            </span>
            <span>{isQuickSyncing ? "Syncing…" : "Refresh"}</span>
          </button>
          <button className="w-refresh-secondary" onClick={onFullRefresh} disabled={busy} title="Full rescan — re-derive every address from scratch">
            <span className={"w-refresh-icon" + (isScanning ? " spinning" : "")}>
              <IconRefresh/>
            </span>
            <span>{isScanning ? "Scanning…" : "Full rescan"}</span>
          </button>
          <span className="w-updated">
            {scannedAt ? `Updated ${relTime(scannedAt / 1000)}` : "Not scanned yet"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Cap-hit hint banner ─────────────────────────────────────────────────────
// Surfaces when a quick refresh extended its probe to the cap and the chain
// tail was still used — meaning there's more activity than the cheap check
// can catch up on. Nudges the user to run a Full Rescan.
export function CapHitHint({ onFullRefresh }) {
  return (
    <div className="w-caphint" role="status">
      <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚡</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: ".82rem", color: "var(--black)" }}>
          More activity than the quick sync can catch up on
        </div>
        <div style={{ fontSize: ".76rem", color: "var(--black-65)", marginTop: 2, lineHeight: 1.55 }}>
          Run a Full Rescan to reconcile every address.
        </div>
      </div>
      <button type="button" className="w-refresh-secondary" onClick={onFullRefresh}>
        Full rescan
      </button>
    </div>
  );
}

// ── Fresh receive card ──────────────────────────────────────────────────────
export function FreshReceiveCard({ entry, onQR }) {
  if (!entry) return null;
  return (
    <div className="w-fresh-card">
      <div className="w-fresh-label">Next fresh address (chain {entry.chain}/{entry.index})</div>
      <div className="w-fresh-row">
        <div className="w-addr">{entry.address}</div>
        <div className="w-addr-actions">
          <CopyButton text={entry.address} label="Copy address"/>
          <button type="button" className="w-icon-btn" onClick={() => onQR(entry.address)} title="Show QR" aria-label="Show QR">
            <IconQR/>
          </button>
        </div>
      </div>
      <div className="w-fresh-path">m/84'/{"{coin}"}/0'/0/{entry.index}</div>
    </div>
  );
}

// ── Used-address row ────────────────────────────────────────────────────────
export function UsedAddressRow({ entry, net }) {
  const received = entry.info?.chain_stats?.funded_txo_sum ?? 0;
  return (
    <div className="w-used-row">
      <div className="w-used-idx">0/{entry.index}</div>
      <div className="w-used-addr" title={entry.address}>{truncMiddle(entry.address, 14, 10)}</div>
      <div className="w-used-amt"><SatsAmount sats={received} size="sm"/></div>
      <a className="w-tx-link" href={addressExplorerUrl(entry.address, net)} target="_blank" rel="noreferrer" title="Open in explorer">
        <IconExternal/>
      </a>
    </div>
  );
}

// ── Tx row ──────────────────────────────────────────────────────────────────
export function TxRow({ tx, tipHeight, net }) {
  const isIn = tx.net >= 0;
  const absSats = Math.abs(tx.net);
  const confirmations =
    tx.confirmed && tipHeight && tx.blockHeight
      ? Math.max(0, tipHeight - tx.blockHeight + 1)
      : 0;
  return (
    <div className="w-tx-row">
      <div className={"w-tx-icon " + (isIn ? "w-tx-in" : "w-tx-out")}>
        {isIn ? "↓" : "↑"}
      </div>
      <div className="w-tx-body">
        <div className="w-tx-amt">
          {isIn ? "+" : "−"} <SatsAmount sats={absSats} size="sm"/>
        </div>
        <div className="w-tx-meta">
          {tx.confirmed ? (
            <>
              <span>{confirmations} conf</span>
              <span className="w-tx-meta-sep">·</span>
              <span>{relTime(tx.blockTime)}</span>
            </>
          ) : (
            <span className="w-tx-unconf">Unconfirmed</span>
          )}
          <span className="w-tx-meta-sep">·</span>
          <span style={{ fontFamily: "monospace" }}>{truncMiddle(tx.txid, 8, 8)}</span>
          <a className="w-tx-link" href={txExplorerUrl(tx.txid, net)} target="_blank" rel="noreferrer" title="Open in explorer">
            <IconExternal/>
          </a>
        </div>
      </div>
    </div>
  );
}
