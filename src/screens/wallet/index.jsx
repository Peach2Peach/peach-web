import { useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useCurrency } from "../../components/AppLayout.jsx";
import { useWallet } from "../../hooks/useWallet.js";
import { getEsploraNet } from "../../utils/wallet.js";
import { CSS } from "./styles.js";
import {
  BalanceHero,
  FreshReceiveCard,
  UsedAddressRow,
  TxRow,
  QRPopup,
  PrivacyBanner,
  isPrivacyBannerDismissed,
  CapHitHint,
  IconWatchEye,
  IconHelp,
} from "./components.jsx";

import peachWalletPng from "../../assets/peach-wallet.png";
const WALLET_ILLUSTRATION = peachWalletPng;

const INITIAL_TX_DISPLAY = 25;
const TX_PAGE = 25;

export default function PeachWallet() {
  const { isLoggedIn, handleLogin } = useAuth();
  const { btcPrice, selectedCurrency } = useCurrency();
  const wallet = useWallet();

  const [qrAddress, setQrAddress] = useState(null);
  const [showUsed, setShowUsed] = useState(false);
  const [txLimit, setTxLimit] = useState(INITIAL_TX_DISPLAY);
  const [showPrivacy, setShowPrivacy] = useState(() => !isPrivacyBannerDismissed());

  const usedReceive = useMemo(
    () => wallet.receive.filter((a) => a.used),
    [wallet.receive],
  );
  const freshReceive = useMemo(
    () => wallet.receive.find((a) => !a.used) ?? null,
    [wallet.receive],
  );

  const net = wallet.xpub ? getEsploraNet(wallet.xpub) : "mainnet";

  return (
    <>
      <style>{CSS}</style>

      <main className="page-wrap">
        <div className="page-header">
          <div>
            <div className="page-title-row">
              <span className="page-title">Wallet</span>
              <span className="page-title-icon" title="Watch-only wallet" aria-label="Watch-only wallet">
                <IconWatchEye/>
              </span>
              <button
                type="button"
                className="page-title-icon is-button"
                onClick={() => setShowPrivacy(true)}
                title="What is a watch-only wallet?"
                aria-label="What is a watch-only wallet?"
              >
                <IconHelp/>
              </button>
            </div>
            <div className="page-subtitle">Watch-only — signing happens on your phone.</div>
          </div>
        </div>

        {showPrivacy && <PrivacyBanner onDismiss={() => setShowPrivacy(false)}/>}

        <div className="w-hero-row">
          <BalanceHero
            balance={wallet.balance}
            fiatRate={btcPrice}
            fiatCurrency={selectedCurrency}
            scannedAt={wallet.scannedAt}
            isScanning={wallet.status === "scanning"}
            isQuickSyncing={wallet.isQuickSyncing}
            onQuickRefresh={wallet.quickRefresh}
            onFullRefresh={wallet.fullRefresh}
          />
          <div className="w-hero-illustration">
            {WALLET_ILLUSTRATION ? (
              <img src={WALLET_ILLUSTRATION} alt="A peach character calmly watching a sealed Bitcoin safe — watch-only wallet"/>
            ) : (
              <div className="w-hero-illustration-placeholder">
                Illustration<br/>slot
              </div>
            )}
          </div>
        </div>

        {wallet.capHit && <CapHitHint onFullRefresh={wallet.fullRefresh}/>}

        {wallet.status === "scanning" && wallet.scanProgress && (
          <div className="w-progress">
            <span className="w-refresh-icon spinning"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/></svg></span>
            Scanning… receive {wallet.scanProgress.receive} · change {wallet.scanProgress.change}
          </div>
        )}

        {wallet.status === "error" && (
          <div className="w-error-banner">
            Couldn't reach the Peach Bitcoin node. Try again in a moment.
            <button className="w-refresh" onClick={wallet.fullRefresh}>Retry</button>
          </div>
        )}

        {/* ── Receive addresses ── */}
        {wallet.status === "ready" && (
          <section className="w-section">
            <div className="w-section-title">
              <span className="w-section-title-text">Receive addresses</span>
              <span className="w-count-tag">{usedReceive.length} used · 1 fresh</span>
            </div>

            <FreshReceiveCard entry={freshReceive} onQR={setQrAddress}/>

            {usedReceive.length > 0 && (
              <>
                <button className="w-collapse" onClick={() => setShowUsed((v) => !v)}>
                  {showUsed ? "▾" : "▸"} {usedReceive.length} used addresses
                </button>
                {showUsed && (
                  <div className="w-used-list">
                    {usedReceive.map((a) => (
                      <UsedAddressRow key={a.address} entry={a} net={net}/>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Tx history ── */}
        {wallet.status === "ready" && (
          <section className="w-section">
            <div className="w-section-title">
              <span className="w-section-title-text">Transaction history</span>
              <span className="w-count-tag">{wallet.txs.length}</span>
            </div>

            {wallet.txs.length === 0 ? (
              <div className="w-empty">
                <div className="w-empty-icon">📭</div>
                <div className="w-empty-title">No transactions yet</div>
                <div className="w-empty-desc">
                  Once you receive or send Bitcoin on this wallet, transactions will appear here.
                </div>
              </div>
            ) : (
              <>
                <div className="w-tx-list">
                  {wallet.txs.slice(0, txLimit).map((tx) => (
                    <TxRow key={tx.txid} tx={tx} tipHeight={wallet.tipHeight} net={net}/>
                  ))}
                </div>
                {txLimit < wallet.txs.length && (
                  <button
                    className="w-collapse"
                    style={{ marginTop: 10 }}
                    onClick={() => setTxLimit((n) => n + TX_PAGE)}
                  >
                    Show {Math.min(TX_PAGE, wallet.txs.length - txLimit)} more
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </main>

      {qrAddress && <QRPopup address={qrAddress} onClose={() => setQrAddress(null)}/>}

      {!isLoggedIn && (
        <div className="auth-screen-overlay">
          <div className="auth-popup">
            <div className="auth-popup-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><rect x="5" y="12" width="18" height="13" rx="3"/><path d="M9 12V9a5 5 0 0 1 10 0v3"/><circle cx="14" cy="19" r="1.5" fill="var(--primary)"/></svg>
            </div>
            <div className="auth-popup-title">Authentication required</div>
            <div className="auth-popup-sub">Please authenticate to view your wallet</div>
            <button className="auth-popup-btn" onClick={handleLogin}>Log in</button>
          </div>
        </div>
      )}
    </>
  );
}
